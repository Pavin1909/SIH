import re
from urllib.parse import urlparse


_URL_RE = re.compile(r"(?i)(?<![\w@])https?://[^\s<>\"']+")
_TRAILING = ".,;:!?)]}>\"'"


def extract_urls_and_domains(*values: str | None) -> list[tuple[str, str]]:
    found: dict[str, tuple[str, str]] = {}
    for value in values:
        if not value:
            continue
        for candidate in _URL_RE.findall(value):
            url = candidate.rstrip(_TRAILING)
            parsed = urlparse(url)
            domain = (parsed.hostname or "").lower().rstrip(".")
            if domain and parsed.scheme in {"http", "https"}:
                canonical = parsed._replace(scheme=parsed.scheme.lower(), netloc=parsed.netloc.lower()).geturl()
                found.setdefault(canonical, (url, domain))
    return list(found.values())
