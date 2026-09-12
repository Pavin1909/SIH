from dataclasses import dataclass
from email import policy
from email.utils import getaddresses
from email.message import Message
from email.parser import BytesParser
from html.parser import HTMLParser
from html import unescape


@dataclass(frozen=True)
class ParsedEmail:
    sender: str | None
    recipients: list[str]
    subject: str | None
    headers: dict[str, str | list[str]]
    text_body: str
    html_body: str | None


class _HTMLTextParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self._ignored_depth = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() in {"script", "style", "noscript", "template"}:
            self._ignored_depth += 1
        elif self._ignored_depth == 0 and tag.lower() in {"br", "p", "div", "li", "tr", "h1", "h2", "h3", "h4", "h5", "h6"}:
            self.parts.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() in {"script", "style", "noscript", "template"} and self._ignored_depth:
            self._ignored_depth -= 1
        elif self._ignored_depth == 0 and tag.lower() in {"p", "div", "li", "tr", "h1", "h2", "h3", "h4", "h5", "h6"}:
            self.parts.append("\n")

    def handle_data(self, data: str) -> None:
        if self._ignored_depth == 0:
            self.parts.append(data)


def html_to_text(html: str) -> str:
    parser = _HTMLTextParser()
    parser.feed(html)
    parser.close()
    lines = [" ".join(unescape(part).split()) for part in "".join(parser.parts).splitlines()]
    return "\n".join(line for line in lines if line).strip()


def _decode_part(part: Message) -> str:
    content = part.get_payload(decode=True)
    if content is None:
        payload = part.get_payload()
        return payload if isinstance(payload, str) else ""
    charset = part.get_content_charset() or "utf-8"
    return content.decode(charset, errors="replace")


def parse_email(raw_email: bytes) -> ParsedEmail:
    message = BytesParser(policy=policy.default).parsebytes(raw_email)
    headers: dict[str, str | list[str]] = {}
    for name, value in message.items():
        existing = headers.get(name)
        decoded = str(value)
        if existing is None:
            headers[name] = decoded
        elif isinstance(existing, list):
            existing.append(decoded)
        else:
            headers[name] = [existing, decoded]

    recipients = []
    for header_name in ("to", "cc", "bcc"):
        values = [str(value) for value in message.get_all(header_name, [])]
        recipients.extend(address for _, address in getaddresses(values) if address)

    text_parts: list[str] = []
    html_parts: list[str] = []
    parts = message.walk() if message.is_multipart() else [message]
    for part in parts:
        if part.is_multipart() or part.get_content_disposition() == "attachment":
            continue
        content_type = part.get_content_type()
        content = _decode_part(part)
        if content_type == "text/plain":
            text_parts.append(content)
        elif content_type == "text/html":
            html_parts.append(content)

    return ParsedEmail(
        sender=message.get("from"),
        recipients=recipients,
        subject=message.get("subject"),
        headers=headers,
        text_body="\n".join(text_parts).strip(),
        html_body="\n".join(html_parts).strip() or None,
    )
