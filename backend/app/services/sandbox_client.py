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
        except httpx.HTTPStatusError as exc:
            detail = ""
            try:
                body = exc.response.json()
                if isinstance(body, dict) and body.get("detail"):
                    detail = f": {body['detail']}"
            except (ValueError, TypeError):
                pass
            raise SandboxUnavailableError(f"Sandbox render failed for target: {url}{detail}") from exc
        except (httpx.HTTPError, ValueError) as exc:
            raise SandboxUnavailableError(f"Sandbox render failed for target: {url}: {exc}") from exc
