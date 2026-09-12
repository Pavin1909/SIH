from app.services.email_parser import html_to_text, parse_email
from app.services.url_extractor import extract_urls_and_domains


RAW_EMAIL = b"""From: Sender <sender@example.com>\nTo: analyst@example.net, second@example.net\nSubject: Account notice\nX-Trace: one\nX-Trace: two\nMIME-Version: 1.0\nContent-Type: multipart/alternative; boundary=abc\n\n--abc\nContent-Type: text/plain; charset=utf-8\n\nReview https://example.com/login.\n--abc\nContent-Type: text/html; charset=utf-8\n\n<html><body><h1>Review</h1><script>ignore()</script><a href=\"https://example.com/login\">account</a></body></html>\n--abc--\n"""


def test_parse_email_extracts_safe_mime_fields() -> None:
    parsed = parse_email(RAW_EMAIL)
    assert parsed.sender == "Sender <sender@example.com>"
    assert parsed.recipients == ["analyst@example.net", "second@example.net"]
    assert parsed.subject == "Account notice"
    assert parsed.headers["X-Trace"] == ["one", "two"]
    assert "Review" in parsed.text_body
    assert "ignore" in parsed.html_body


def test_html_to_text_removes_script_content() -> None:
    assert html_to_text("<p>Hello</p><script>secret()</script><p>World</p>") == "Hello\nWorld"


def test_url_extraction_returns_unique_urls_and_domains() -> None:
    result = extract_urls_and_domains("See https://Example.com/a, then https://example.com/a.")
    assert result == [("https://Example.com/a", "example.com")]
