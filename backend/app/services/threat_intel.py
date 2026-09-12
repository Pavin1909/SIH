from dataclasses import dataclass
import base64
import socket
from urllib.parse import urlparse

import httpx

from app.core.config import Settings


@dataclass(frozen=True)
class ProviderResult:
    provider: str
    status: str
    response: dict


class ThreatIntelClient:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def lookup(self, url: str, domains: list[str]) -> list[ProviderResult]:
        results: list[ProviderResult] = []
        async with httpx.AsyncClient(timeout=self.settings.threat_intel_timeout_seconds) as client:
            if self.settings.virustotal_api_key:
                results.append(await self._virustotal(client, url))
            else:
                results.append(ProviderResult("virustotal", "not_configured", {}))
            if self.settings.urlscan_api_key:
                results.append(await self._urlscan(client, url))
            else:
                results.append(ProviderResult("urlscan", "not_configured", {}))
            if self.settings.abuseipdb_api_key:
                results.append(await self._abuseipdb(client, url))
            else:
                results.append(ProviderResult("abuseipdb", "not_configured", {}))
        return results

    async def _virustotal(self, client: httpx.AsyncClient, url: str) -> ProviderResult:
        try:
            url_id = base64.urlsafe_b64encode(url.encode("utf-8")).decode("ascii").rstrip("=")
            response = await client.get(f"https://www.virustotal.com/api/v3/urls/{url_id}", headers={"x-apikey": self.settings.virustotal_api_key})
            response.raise_for_status()
            return ProviderResult("virustotal", "ok", response.json())
        except httpx.HTTPError as exc:
            return ProviderResult("virustotal", "error", {"error": str(exc)})

    async def _urlscan(self, client: httpx.AsyncClient, url: str) -> ProviderResult:
        try:
            response = await client.get("https://urlscan.io/api/v1/search/", params={"q": f"page.url:{url}"}, headers={"API-Key": self.settings.urlscan_api_key})
            response.raise_for_status()
            return ProviderResult("urlscan", "ok", response.json())
        except httpx.HTTPError as exc:
            return ProviderResult("urlscan", "error", {"error": str(exc)})

    async def _abuseipdb(self, client: httpx.AsyncClient, url: str) -> ProviderResult:
        hostname = urlparse(url).hostname
        if not hostname:
            return ProviderResult("abuseipdb", "error", {"error": "URL has no hostname"})
        try:
            addresses = {item[4][0] for item in socket.getaddrinfo(hostname, None, type=socket.SOCK_STREAM)}
            if not addresses:
                return ProviderResult("abuseipdb", "no_ip", {})
            response = await client.get("https://api.abuseipdb.com/api/v2/check", params={"ipAddress": sorted(addresses)[0], "maxAgeInDays": 90}, headers={"Key": self.settings.abuseipdb_api_key, "Accept": "application/json"})
            response.raise_for_status()
            return ProviderResult("abuseipdb", "ok", response.json())
        except (OSError, httpx.HTTPError) as exc:
            return ProviderResult("abuseipdb", "error", {"error": str(exc)})
