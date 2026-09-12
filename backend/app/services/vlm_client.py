from dataclasses import dataclass
import json
import re

import httpx

from app.core.config import Settings


@dataclass(frozen=True)
class VLMResult:
    status: str
    response: dict


class VLMClient:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def analyze(self, screenshot_base64: str | None, forensic_context: dict | None = None) -> VLMResult:
        if self.settings.vlm_provider != "ollama":
            return VLMResult("vlm_unavailable", {"provider": self.settings.vlm_provider, "error": "unsupported_provider"})
        if not screenshot_base64:
            return VLMResult("no_screenshot", {"provider": "ollama"})
        image = screenshot_base64.split(",", 1)[1] if screenshot_base64.startswith("data:") else screenshot_base64
        context = json.dumps(forensic_context or {}, separators=(",", ":"), ensure_ascii=True)[:12000]
        prompt = (
            "Analyze this webpage screenshot for visual phishing and credential harvesting. "
            "Return only a JSON object with these boolean/number fields: "
            "visual_phishing, brand_impersonation, login_form, credential_harvesting_indicator, confidence. "
            "Use the browser forensic context as supporting evidence, not as a substitute for inspecting the screenshot.\n"
            f"Browser forensic context: {context}"
        )
        payload = {
            "model": self.settings.vlm_model,
            "stream": False,
            "format": "json",
            "options": {"temperature": 0},
            "messages": [{"role": "user", "content": prompt, "images": [image]}],
        }
        try:
            async with httpx.AsyncClient(timeout=self.settings.vlm_timeout_seconds) as client:
                response = await client.post(f"{self.settings.ollama_url}/api/chat", json=payload)
                if response.status_code == 404:
                    return VLMResult("vlm_unavailable", {"provider": "ollama", "status_code": 404, "error": "model_or_endpoint_not_found"})
                response.raise_for_status()
                return VLMResult("ok", self._parse_response(response.json(), self.settings.vlm_model))
        except httpx.TimeoutException:
            return VLMResult("timeout", {"provider": "ollama"})
        except httpx.HTTPStatusError as exc:
            details = {"provider": "ollama", "status_code": exc.response.status_code}
            try:
                body = exc.response.json()
                if isinstance(body, dict) and body.get("error"):
                    details["error"] = str(body["error"])[:500]
            except (ValueError, TypeError):
                pass
            return VLMResult("vlm_unavailable", details)
        except (httpx.HTTPError, ValueError, KeyError, TypeError) as exc:
            return VLMResult("vlm_unavailable", {"provider": "ollama", "error": str(exc)[:500]})

    @staticmethod
    def _parse_response(response: dict, model: str) -> dict:
        content = response["message"]["content"]
        if not isinstance(content, str):
            raise ValueError("Ollama VLM response content was not text")
        fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", content, re.DOTALL | re.IGNORECASE)
        candidate = fenced.group(1) if fenced else content[content.find("{"):content.rfind("}") + 1]
        if not candidate:
            raise ValueError("Ollama VLM response did not contain a JSON object")
        parsed = json.loads(candidate)
        if not isinstance(parsed, dict):
            raise ValueError("Ollama VLM response JSON was not an object")
        return {
            "visual_phishing": parsed.get("visual_phishing") is True,
            "brand_impersonation": parsed.get("brand_impersonation") is True,
            "login_form": parsed.get("login_form") is True,
            "credential_harvesting_indicator": parsed.get("credential_harvesting_indicator") is True,
            "confidence": float(parsed.get("confidence", 0.0)),
            "provider": "ollama",
            "model": model,
        }
