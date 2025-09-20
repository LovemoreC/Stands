"""Email delivery helpers used by the application."""

from __future__ import annotations

import base64
import logging
import os
import smtplib
import ssl
from dataclasses import dataclass
from email.message import EmailMessage as _EmailMessage
from typing import Iterable, Optional, Protocol, Sequence

logger = logging.getLogger(__name__)


class EmailSendError(Exception):
    """Raised when an email could not be sent."""


@dataclass
class Attachment:
    filename: str
    content_type: str
    content: bytes


@dataclass
class MailRequest:
    to: Sequence[str]
    subject: str
    body: str
    attachments: Sequence[Attachment] = ()


class Mailer(Protocol):
    def send(self, request: MailRequest) -> None:  # pragma: no cover - protocol
        """Send the provided email request."""


def _split_content_type(content_type: str) -> tuple[str, str]:
    maintype, subtype = content_type.split("/", 1) if "/" in content_type else (
        content_type,
        "octet-stream",
    )
    maintype = maintype or "application"
    subtype = subtype or "octet-stream"
    return maintype, subtype


class SMTPMailer:
    """Mailer implementation backed by SMTP."""

    def __init__(
        self,
        host: str,
        port: int,
        *,
        username: Optional[str] = None,
        password: Optional[str] = None,
        from_address: Optional[str] = None,
        use_tls: bool = True,
        use_ssl: bool = False,
    ) -> None:
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.from_address = from_address or username
        self.use_tls = use_tls
        self.use_ssl = use_ssl

    def _connect(self) -> smtplib.SMTP:
        if self.use_ssl:
            context = ssl.create_default_context()
            return smtplib.SMTP_SSL(self.host, self.port, context=context)
        return smtplib.SMTP(self.host, self.port)

    def send(self, request: MailRequest) -> None:
        if not self.from_address:
            raise EmailSendError("SMTP mailer requires a from address")

        message = _EmailMessage()
        message["From"] = self.from_address
        message["To"] = ", ".join(request.to)
        message["Subject"] = request.subject
        message.set_content(request.body)

        for attachment in request.attachments:
            maintype, subtype = _split_content_type(attachment.content_type)
            message.add_attachment(
                attachment.content,
                maintype=maintype,
                subtype=subtype,
                filename=attachment.filename,
            )

        try:
            with self._connect() as server:
                server.ehlo()
                if self.use_tls and not self.use_ssl:
                    context = ssl.create_default_context()
                    server.starttls(context=context)
                    server.ehlo()
                if self.username and self.password:
                    server.login(self.username, self.password)
                server.send_message(message)
        except smtplib.SMTPException as exc:  # pragma: no cover - smtplib specifics
            raise EmailSendError(str(exc)) from exc


class LoggingMailer:
    """Fallback mailer that simply logs outgoing messages."""

    def __init__(self, logger_: logging.Logger) -> None:
        self._logger = logger_

    def send(self, request: MailRequest) -> None:
        self._logger.info(
            "LoggingMailer delivering email to %s with subject '%s' (%d attachments)",
            ", ".join(request.to),
            request.subject,
            len(request.attachments),
        )


def _parse_bool(value: Optional[str], default: bool) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _create_smtp_mailer() -> SMTPMailer:
    host = os.environ.get("SMTP_HOST")
    if not host:
        raise EmailSendError("SMTP_HOST environment variable is required for SMTP mailer")

    port = int(os.environ.get("SMTP_PORT", "587"))
    username = os.environ.get("SMTP_USERNAME")
    password = os.environ.get("SMTP_PASSWORD")
    from_address = os.environ.get("MAIL_FROM_ADDRESS") or os.environ.get("SMTP_FROM")
    use_tls = _parse_bool(os.environ.get("SMTP_USE_TLS"), True)
    use_ssl = _parse_bool(os.environ.get("SMTP_USE_SSL"), False)

    return SMTPMailer(
        host,
        port,
        username=username,
        password=password,
        from_address=from_address,
        use_tls=use_tls,
        use_ssl=use_ssl,
    )


def create_mailer_from_env() -> Mailer:
    provider = os.environ.get("MAIL_PROVIDER", "smtp").strip().lower()
    if provider == "smtp":
        try:
            return _create_smtp_mailer()
        except EmailSendError as exc:
            logger.warning("Falling back to LoggingMailer due to configuration error: %s", exc)
            return LoggingMailer(logger)
    if provider == "console":
        return LoggingMailer(logger)

    logger.warning("Unknown MAIL_PROVIDER '%s'; using LoggingMailer", provider)
    return LoggingMailer(logger)


_mailer: Optional[Mailer] = None


def get_mailer() -> Mailer:
    global _mailer
    if _mailer is None:
        _mailer = create_mailer_from_env()
    return _mailer


def set_mailer_for_testing(mailer: Optional[Mailer]) -> None:
    """Override the configured mailer. Only intended for tests."""

    global _mailer
    _mailer = mailer


def build_attachment(uploaded: "UploadedFile") -> Attachment:
    """Convert an UploadedFile pydantic model to an Attachment."""

    from .models import UploadedFile  # Local import to avoid circular dependency

    if not isinstance(uploaded, UploadedFile):  # pragma: no cover - defensive
        raise TypeError("build_attachment expects an UploadedFile instance")

    try:
        content = base64.b64decode(uploaded.content)
    except (TypeError, ValueError) as exc:
        raise EmailSendError("Invalid base64 content in uploaded file") from exc

    content_type = uploaded.content_type or "application/octet-stream"
    filename = uploaded.filename or "attachment"
    return Attachment(filename=filename, content_type=content_type, content=content)


def build_attachments(files: Iterable["UploadedFile"]) -> list[Attachment]:
    from .models import UploadedFile  # Local import to avoid circular dependency

    attachments: list[Attachment] = []
    for uploaded in files:
        if isinstance(uploaded, UploadedFile) and uploaded.content:
            attachments.append(build_attachment(uploaded))
    return attachments

