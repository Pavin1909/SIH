import asyncio
import base64
import ipaddress
import logging
import socket
from urllib.parse import urlparse

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from playwright.async_api import Browser, async_playwright

logging.basicConfig(level="INFO")
logger = logging.getLogger(__name__)
app = FastAPI(title="SandBoxTrace isolated browser sandbox", version="2.0.0")


class RenderRequest(BaseModel):
    url: str = Field(min_length=8, max_length=4096)
    timeout_ms: int = Field(default=15000, ge=1000, le=30000)
    max_html_bytes: int = Field(default=2_000_000, ge=10_000, le=10_000_000)


def validate_target(url: str) -> None:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise ValueError("Only absolute HTTP(S) URLs are allowed")
    try:
        addresses = socket.getaddrinfo(parsed.hostname, parsed.port or (443 if parsed.scheme == "https" else 80), type=socket.SOCK_STREAM)
    except socket.gaierror as exc:
        raise ValueError("Target hostname could not be resolved") from exc
    resolved = {item[4][0] for item in addresses}
    public_addresses = []
    for address in resolved:
        ip = ipaddress.ip_address(address)
        if not (ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast):
            public_addresses.append(ip)
    if not public_addresses:
        raise ValueError("Private, local, link-local, reserved, and multicast targets are blocked")


async def collect_page(browser: Browser, request: RenderRequest) -> dict:
    validate_target(request.url)
    context = await browser.new_context(service_workers="block", java_script_enabled=True, ignore_https_errors=False)
    page = await context.new_page()
    requests: list[dict] = []
    redirect_chain = [request.url]
    domains: set[str] = set()

    async def record_response(response) -> None:
        parsed = urlparse(response.url)
        if parsed.hostname:
            domains.add(parsed.hostname.lower())
        requests.append({"url": response.url, "status": response.status, "resource_type": response.request.resource_type})

    page.on("response", record_response)

    async def guard_request(route) -> None:
        try:
            validate_target(route.request.url)
            await route.continue_()
        except ValueError:
            await route.abort("blockedbyclient")

    await page.route("**/*", guard_request)
    try:
        response = await page.goto(request.url, wait_until="domcontentloaded", timeout=request.timeout_ms)
        await page.wait_for_timeout(500)
        current_url = page.url
        redirect = response.request.redirected_from if response else None
        chain: list[str] = []
        while redirect is not None:
            chain.append(redirect.url)
            redirect = redirect.redirected_from
        redirect_chain = list(reversed(chain)) + [request.url]
        if current_url != request.url:
            redirect_chain.append(current_url)
        html = await page.content()
        if len(html.encode("utf-8")) > request.max_html_bytes:
            html = html.encode("utf-8")[: request.max_html_bytes].decode("utf-8", errors="ignore")
        screenshot = await page.screenshot(type="png", full_page=True)
        dom_signals = await page.evaluate("""() => ({
          password_fields: document.querySelectorAll('input[type="password"]').length,
          forms: document.forms.length,
          external_form_actions: [...document.forms].filter(form => {
            try { return new URL(form.action || location.href).hostname !== location.hostname; } catch (_) { return false; }
          }).length,
          iframes: document.querySelectorAll('iframe').length,
          hidden_elements: document.querySelectorAll('[hidden], [style*="display:none"]').length,
          external_links: [...document.links].filter(link => { try { return new URL(link.href).hostname !== location.hostname; } catch (_) { return false; } }).length
        })""")
        javascript_signals = await page.evaluate("""() => ({
          script_count: document.scripts.length,
          inline_script_count: [...document.scripts].filter(script => !script.src).length,
          external_script_urls: [...document.scripts].map(script => script.src).filter(Boolean),
          obfuscation_tokens: (document.documentElement.innerHTML.match(/eval\\(|atob\\(|fromCharCode|unescape\\(/gi) || []).length
        })""")
        return {
            "initial_url": request.url,
            "final_url": current_url,
            "title": await page.title(),
            "http_status": response.status if response else None,
            "redirect_chain": redirect_chain,
            "requests": requests,
            "domains": sorted(domains),
            "html": html,
            "screenshot_base64": base64.b64encode(screenshot).decode("ascii"),
            "dom_signals": dom_signals,
            "javascript_signals": javascript_signals,
        }
    finally:
        await context.close()


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/render")
async def render(request: RenderRequest) -> dict:
    try:
        async with async_playwright() as playwright:
            browser = await playwright.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
            try:
                return await asyncio.wait_for(collect_page(browser, request), timeout=request.timeout_ms / 1000 + 5)
            finally:
                await browser.close()
    except (ValueError, asyncio.TimeoutError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Sandbox render failed")
        raise HTTPException(status_code=502, detail="Sandbox could not render the target") from exc
