"""Background worker entry point for inbound email processing."""

from __future__ import annotations

import argparse
import logging
import os
import signal
import sys
import time
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime, timezone
from email import message_from_bytes
from email.header import decode_header
from email.message import Message
from email.utils import parsedate_to_datetime
import imaplib
from typing import Iterator, Optional

from .database import SessionLocal, init_db
from .inbox import InboundEmail, InboundEmailProcessor, InboxClient
from .repositories import Repositories

logger = logging.getLogger(__name__)


class IMAPInboxClient(InboxClient):
    """Simple IMAP-backed inbox client for polling unread messages."""

    def __init__(
        self,
        host: str,
        username: str,
        password: str,
        *,
        folder: str = "INBOX",
        port: Optional[int] = None,
        use_ssl: bool = True,
    ) -> None:
        self.host = host
        self.username = username
        self.password = password
        self.folder = folder
        self.port = port
        self.use_ssl = use_ssl
        self._conn: Optional[imaplib.IMAP4] = None
        self._connect()

    def _connect(self) -> None:
        if self._conn:
            try:
                self._conn.logout()
            except Exception:  # pragma: no cover - defensive shutdown
                pass
        if self.use_ssl:
            port = self.port or 993
            self._conn = imaplib.IMAP4_SSL(self.host, port)
        else:
            port = self.port or 143
            self._conn = imaplib.IMAP4(self.host, port)
        self._conn.login(self.username, self.password)
        self._conn.select(self.folder)

    def _ensure_connection(self) -> imaplib.IMAP4:
        if self._conn is None:
            self._connect()
        return self._conn  # type: ignore[return-value]

    def fetch_unread(self) -> list[InboundEmail]:
        conn = self._ensure_connection()
        status, data = conn.uid("search", None, "UNSEEN")
        if status != "OK" or not data:
            return []
        uid_list = data[0].split()
        messages: list[InboundEmail] = []
        for uid in uid_list:
            status, payload = conn.uid("fetch", uid, "(RFC822)")
            if status != "OK" or not payload or not payload[0]:
                logger.warning("Failed to fetch message %s", uid.decode())
                continue
            raw = payload[0][1]
            if raw is None:
                continue
            message = message_from_bytes(raw)
            body = _extract_text_body(message)
            received_at = _parse_date_header(message)
            messages.append(
                InboundEmail(
                    message_id=uid.decode(),
                    subject=_decode_header_value(message.get("Subject")),
                    body=body,
                    received_at=received_at,
                )
            )
        return messages

    def mark_processed(self, message_id: str) -> None:
        conn = self._ensure_connection()
        status, _ = conn.uid("store", message_id.encode(), "+FLAGS", "(\\Seen)")
        if status != "OK":
            logger.warning("Failed to mark message %s as processed", message_id)

    def close(self) -> None:
        if self._conn is not None:
            try:
                self._conn.close()
            except Exception:
                pass
            try:
                self._conn.logout()
            except Exception:
                pass
            self._conn = None


def _decode_header_value(value: Optional[str]) -> str:
    if not value:
        return ""
    parts = decode_header(value)
    decoded = []
    for part, encoding in parts:
        if isinstance(part, bytes):
            decoded.append(part.decode(encoding or "utf-8", errors="ignore"))
        else:
            decoded.append(part)
    return "".join(decoded).strip()


def _extract_text_body(message: Message) -> str:
    if message.is_multipart():
        for part in message.walk():
            if part.get_content_type() == "text/plain" and part.get_content_disposition() in (None, "inline"):
                payload = part.get_payload(decode=True)
                if payload is not None:
                    return payload.decode(part.get_content_charset() or "utf-8", errors="ignore").strip()
    else:
        payload = message.get_payload(decode=True)
        if payload is not None:
            return payload.decode(message.get_content_charset() or "utf-8", errors="ignore").strip()
    return ""


def _parse_date_header(message: Message) -> datetime:
    header = message.get("Date")
    if header:
        try:
            parsed = parsedate_to_datetime(header)
        except (TypeError, ValueError):
            parsed = None
        if parsed is not None:
            if parsed.tzinfo is not None:
                parsed = parsed.astimezone(timezone.utc).replace(tzinfo=None)
            return parsed
    return datetime.utcnow()


def run_processor_once(client: InboxClient) -> int:
    session = SessionLocal()
    try:
        repos = Repositories(session)
        processor = InboundEmailProcessor(repos, client)
        return processor.process_new_messages()
    finally:
        session.close()


@dataclass
class RunnerConfig:
    interval_seconds: int
    host: str
    username: str
    password: str
    folder: str = "INBOX"
    port: Optional[int] = None
    use_ssl: bool = True


class InboundEmailProcessorRunner:
    def __init__(self, client: InboxClient, interval_seconds: int) -> None:
        self.client = client
        self.interval_seconds = interval_seconds
        self._shutdown = False

    def run(self) -> None:
        logger.info("Starting inbound email processor loop (interval=%s seconds)", self.interval_seconds)
        while not self._shutdown:
            try:
                processed = run_processor_once(self.client)
                if processed:
                    logger.info("Processed %s inbound messages", processed)
            except Exception:
                logger.exception("Error while processing inbound email")
            self._wait()

    def _wait(self) -> None:
        slept = 0
        while slept < self.interval_seconds and not self._shutdown:
            time.sleep(1)
            slept += 1

    def stop(self) -> None:
        self._shutdown = True


def _configure_logging() -> None:
    logging.basicConfig(level=logging.INFO, stream=sys.stdout)


def load_config_from_env() -> RunnerConfig:
    try:
        host = os.environ["IMAP_HOST"]
        username = os.environ["IMAP_USERNAME"]
        password = os.environ["IMAP_PASSWORD"]
    except KeyError as exc:  # pragma: no cover - configuration validation
        raise RuntimeError(f"Missing required environment variable: {exc.args[0]}") from exc
    interval = int(os.environ.get("INBOUND_EMAIL_POLL_INTERVAL", "60"))
    folder = os.environ.get("IMAP_FOLDER", "INBOX")
    port = os.environ.get("IMAP_PORT")
    use_ssl = os.environ.get("IMAP_USE_SSL", "true").lower() != "false"
    return RunnerConfig(
        interval_seconds=max(1, interval),
        host=host,
        username=username,
        password=password,
        folder=folder,
        port=int(port) if port else None,
        use_ssl=use_ssl,
    )


@contextmanager
def _imap_client_from_config(config: RunnerConfig) -> Iterator[IMAPInboxClient]:
    client = IMAPInboxClient(
        host=config.host,
        username=config.username,
        password=config.password,
        folder=config.folder,
        port=config.port,
        use_ssl=config.use_ssl,
    )
    try:
        yield client
    finally:
        client.close()


def main(argv: Optional[list[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Run the inbound email processor loop")
    parser.add_argument("--once", action="store_true", help="Process messages a single time and exit")
    args = parser.parse_args(argv)

    _configure_logging()
    init_db()
    config = load_config_from_env()

    with _imap_client_from_config(config) as client:
        runner = InboundEmailProcessorRunner(client, config.interval_seconds)

        if args.once:
            processed = run_processor_once(client)
            logger.info("Processed %s inbound messages", processed)
            return 0

        def handle_signal(signum, frame):  # pragma: no cover - signal handling
            logger.info("Received signal %s; shutting down inbound email processor", signum)
            runner.stop()

        signal.signal(signal.SIGTERM, handle_signal)
        signal.signal(signal.SIGINT, handle_signal)

        runner.run()

    return 0


if __name__ == "__main__":  # pragma: no cover - CLI entry point
    raise SystemExit(main())
