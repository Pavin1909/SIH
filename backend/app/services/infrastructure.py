import socket
import ipaddress
from dataclasses import dataclass
from urllib.parse import urlparse

import dns.resolver
import httpx

from app.core.config import Settings


@dataclass(frozen=True)
class InfrastructureResult:
    status: str
    observations: list[dict]


class InfrastructureEnricher:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def enrich(self, url: str, domains: list[str]) -> InfrastructureResult:
        observations: list[dict] = []
        for domain in sorted(set(domains) | ({urlparse(url).hostname.lower()} if urlparse(url).hostname else set())):
            ips = self._resolve_ips(domain)
            mail_servers = self._resolve_mx(domain)
            if not ips:
                observations.append({"domain": domain, "status": "dns_unavailable", "source": "dns", "raw": {"mail_servers": mail_servers}})
                continue
            for ip in ips:
                record = {"domain": domain, "ip": ip, "source": "dns", "status": "ok", "raw": {"mail_servers": mail_servers}}
                live_geoip = await self._geoip(ip)
                geoip_raw = live_geoip.pop("raw", None)
                record.update(live_geoip)
                if geoip_raw:
                    record["raw"] = {**record.get("raw", {}), **geoip_raw}
                observations.append(record)
        return InfrastructureResult("ok" if observations else "unavailable", observations)

    async def _geoip(self, ip: str) -> dict:
        try:
            address = ipaddress.ip_address(ip)
            if not address.is_global:
                return {"geoip_status": "private_or_reserved"}
        except ValueError:
            return {"geoip_status": "invalid_ip"}
        if self.settings.geoip_provider != "ipinfo" or not self.settings.ipinfo_token:
            return {"geoip_status": "geoip_unavailable", "enrichment_status": "ipinfo_not_configured"}
        return await self._ipinfo(ip)

    @staticmethod
    def _resolve_ips(domain: str) -> list[str]:
        try:
            return sorted({item[4][0] for item in socket.getaddrinfo(domain, 443, type=socket.SOCK_STREAM)})
        except OSError:
            return []

    @staticmethod
    def _resolve_mx(domain: str) -> list[str]:
        try:
            return sorted(str(answer.exchange).rstrip(".") for answer in dns.resolver.resolve(domain, "MX"))
        except (dns.exception.DNSException, OSError):
            return []

    async def _ipinfo(self, ip: str) -> dict:
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                response = await client.get(f"https://ipinfo.io/{ip}/json", headers={"Authorization": f"Bearer {self.settings.ipinfo_token}"})
                response.raise_for_status()
                data = response.json()
            privacy = data.get("privacy") or {}
            latitude = longitude = None
            if isinstance(data.get("loc"), str) and "," in data["loc"]:
                latitude_text, longitude_text = data["loc"].split(",", 1)
                latitude, longitude = float(latitude_text), float(longitude_text)
            return {
                "asn": data.get("org", "").split(" ", 1)[0] or None,
                "asn_org": data.get("org"),
                "isp": data.get("org"),
                "hosting_provider": data.get("org"),
                "country": data.get("country"),
                "region": data.get("region"),
                "city": data.get("city"),
                "latitude": latitude,
                "longitude": longitude,
                "timezone": data.get("timezone"),
                "vpn": privacy.get("vpn"),
                "tor": privacy.get("tor"),
                "proxy": privacy.get("proxy"),
                "raw": data,
                "enrichment_status": "ok",
                "geoip_status": "ok",
            }
        except (httpx.HTTPError, ValueError) as exc:
            return {"enrichment_status": "error", "geoip_status": "geoip_unavailable", "raw": {"error": str(exc)}}
