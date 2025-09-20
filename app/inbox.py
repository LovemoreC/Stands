"""Inbound email processing for customer profiles."""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from datetime import datetime
from typing import Iterable, Protocol, Sequence

from .models import CustomerProfile
from .repositories import Repositories

logger = logging.getLogger(__name__)


@dataclass
class InboundEmail:
    """Representation of an inbound email message."""

    message_id: str
    subject: str
    body: str
    received_at: datetime


class InboxClient(Protocol):
    """Minimal protocol for retrieving messages from an email inbox."""

    def fetch_unread(self) -> Sequence[InboundEmail]:
        """Return unread messages that should be processed."""

    def mark_processed(self, message_id: str) -> None:
        """Mark a message as processed to prevent re-processing."""


ACCOUNT_NUMBER_PATTERN = re.compile(r"account\s*number[:\s]*([A-Z0-9-]+)", re.IGNORECASE)


def extract_account_number(body: str) -> str | None:
    """Attempt to extract an account number from an email body."""

    if not body:
        return None
    match = ACCOUNT_NUMBER_PATTERN.search(body)
    if match:
        return match.group(1).strip()
    fallback = re.search(r"\b([0-9]{6,})\b", body)
    if fallback:
        return fallback.group(1)
    return None


class InboundEmailProcessor:
    """Process inbound messages and maintain customer profiles."""

    def __init__(self, repos: Repositories, client: InboxClient):
        self.repos = repos
        self.client = client

    def process_new_messages(self) -> int:
        """Poll the inbox, creating or updating customer profiles."""

        messages = self.client.fetch_unread()
        processed = 0
        for message in messages:
            account_number = extract_account_number(message.body)
            if not account_number:
                logger.debug("Skipping message %s without account number", message.message_id)
                self.client.mark_processed(message.message_id)
                continue
            logger.info(
                "Processing inbound message %s for account %s",
                message.message_id,
                account_number,
            )
            self._create_or_update_profile(account_number, message.received_at)
            self.client.mark_processed(message.message_id)
            processed += 1
        return processed

    def _create_or_update_profile(self, account_number: str, received_at: datetime) -> CustomerProfile:
        account = self._find_account(account_number)
        loan_ids: list[int] = []
        agreement_ids: list[int] = []
        realtor = None
        if account:
            loan_ids = self._loan_ids_for_account(account.id)
            agreement_ids = self._agreement_ids_for_loans(loan_ids)
            realtor = account.realtor

        existing = self.repos.customer_profiles.get(account_number)
        now = datetime.utcnow()
        if existing:
            updates = {
                "last_inbound_email_at": received_at,
                "updated_at": now,
            }
            if account:
                updates.update(
                    {
                        "account_opening_id": account.id,
                        "realtor": realtor,
                        "loan_application_ids": loan_ids,
                        "agreement_ids": agreement_ids,
                    }
                )
            profile = existing.model_copy(update=updates)
        else:
            profile = CustomerProfile(
                id=account_number,
                account_number=account_number,
                account_opening_id=account.id if account else None,
                realtor=realtor,
                loan_application_ids=loan_ids,
                agreement_ids=agreement_ids,
                last_inbound_email_at=received_at,
                deletion_requested=False,
                deletion_requested_at=None,
                deletion_requested_by=None,
                deletion_approved_at=None,
                deletion_approved_by=None,
                created_at=now,
                updated_at=now,
            )
        self.repos.customer_profiles.add(profile)
        return profile

    def _find_account(self, account_number: str):
        for account in self.repos.account_openings.list():
            if account.account_number == account_number:
                return account
        return None

    def _loan_ids_for_account(self, account_id: int) -> list[int]:
        return sorted(
            {
                loan.id
                for loan in self.repos.loan_applications.list()
                if loan.account_id == account_id
            }
        )

    def _agreement_ids_for_loans(self, loan_ids: Iterable[int]) -> list[int]:
        loan_id_set = set(loan_ids)
        if not loan_id_set:
            return []
        return sorted(
            {
                agreement.id
                for agreement in self.repos.agreements.list()
                if agreement.loan_application_id in loan_id_set
            }
        )
