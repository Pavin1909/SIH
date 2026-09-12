import httpx

from app.core.config import Settings


class SandboxUnavailableError(RuntimeError):
    pass


class SandboxClient:
    def __init__(self, settings: Settings) -> None:
        self.endpoint = settings.sandbox_url.rstrip("/")
        self.timeout = settings.sandbox_timeout_seconds

    async def render(self, url: str) -> dict:
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(f"{self.endpoint}/render", json={"url": url})
                response.raise_for_status()
                return response.json()
        except (httpx.HTTPError, ValueError) as exc:
            raise SandboxUnavailableError(f"Sandbox render failed for target: {url}") from exc
