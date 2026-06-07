"""Gemini API client service used by all AI endpoints."""

from __future__ import annotations

import asyncio
import json
import logging
import re
from json import JSONDecodeError
from typing import Any, Dict, Iterable, List, Optional, Tuple

from google import genai
from google.genai import errors as genai_errors
from google.genai import types

from app.config import Settings

logger = logging.getLogger(__name__)

_URL_PATTERN = re.compile(r"https?://[^\s\]\)\"'>,]+")


class GeminiServiceError(RuntimeError):
    """Raised when Gemini API operations fail."""

    def __init__(self, message: str, *, status_code: int = 502) -> None:
        super().__init__(message)
        self.status_code = status_code


class GeminiClient:
    """Thin async wrapper around the Gemini Python SDK."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._client = genai.Client(api_key=settings.gemini_api_key)
        self._model = settings.gemini_model

    @property
    def model_name(self) -> str:
        """Return the configured Gemini model name."""

        return self._model

    async def generate_analysis_report(self, analysis_type: str, dataset_text: str) -> str:
        """Generate a raw markdown analysis report for uploaded data."""
        prompt = (
            f"You are an Expert Environmental Health & Safety (EHS) Data Analyst. "
            f"The user has uploaded an industrial dataset classified as **{analysis_type}**. "
            f"Your job is to analyze this raw data and cross-reference every metric against **EPA**, **Cal/OSHA**, and **EU** screening levels. "
            f"Output a professional Markdown report outlining: 1. A summary of the dataset. 2. A beautiful table of any Regulatory Exceedances. 3. Immediate recommended actions.\n\n"
            f"Dataset:\n{dataset_text}"
        )
        try:
            response = await asyncio.to_thread(
                self._client.models.generate_content,
                model=self._model,
                contents=prompt,
            )
            return self._extract_text(response)
        except Exception as exc:
            logger.exception("Failed to generate analysis report.")
            raise GeminiServiceError("AI analysis failed to generate.") from exc

    async def generate_grounded_answer(
        self,
        *,
        tool_name: str,
        user_prompt: str,
        allowed_sources: Iterable[str],
        task_instructions: str,
    ) -> Tuple[str, List[str]]:
        """Generate an answer and normalized citations for a task."""

        source_list = sorted(set(allowed_sources))
        system_prompt = self._build_system_prompt(
            tool_name=tool_name,
            task_instructions=task_instructions,
            allowed_sources=source_list,
        )

        request = (
            "Follow the instructions strictly. Return only valid JSON.\n"
            "User question:\n"
            f"{user_prompt.strip()}"
        )

        config = self._build_generation_config(system_prompt, use_tools=True)

        logger.info("Calling Gemini model for tool=%s", tool_name)
        try:
            response = await asyncio.to_thread(
                self._client.models.generate_content,
                model=self._model,
                contents=request,
                config=config,
            )
        except genai_errors.ClientError as exc:
            status_code_raw = getattr(exc, "status_code", 502)
            try:
                status_code = int(status_code_raw or 502)
            except (TypeError, ValueError):
                status_code = 502
            if status_code == 429 or "RESOURCE_EXHAUSTED" in str(exc).upper():
                logger.warning(
                    "Gemini 429 for tool=%s with URL/search tools; retrying once without tools",
                    tool_name,
                )
                try:
                    fallback_config = self._build_generation_config(
                        system_prompt, use_tools=False)
                    response = await asyncio.to_thread(
                        self._client.models.generate_content,
                        model=self._model,
                        contents=request,
                        config=fallback_config,
                    )
                    logger.info(
                        "Gemini fallback succeeded for tool=%s", tool_name)
                    answer, sources = self._parse_response(
                        response, fallback_sources=source_list)
                    return answer, sources
                except genai_errors.ClientError as fallback_exc:
                    mapped_error = self._map_client_error(fallback_exc)
                    logger.warning(
                        "Gemini fallback client error for tool=%s status=%s message=%s",
                        tool_name,
                        mapped_error.status_code,
                        mapped_error,
                    )
                    raise mapped_error from fallback_exc

            mapped_error = self._map_client_error(exc)
            logger.warning(
                "Gemini client error for tool=%s status=%s message=%s",
                tool_name,
                mapped_error.status_code,
                mapped_error,
            )
            raise mapped_error from exc
        except Exception as exc:  # noqa: BLE001
            logger.exception("Gemini API call failed for tool=%s", tool_name)
            raise GeminiServiceError("Gemini API request failed") from exc

        answer, sources = self._parse_response(
            response, fallback_sources=source_list)
        return answer, sources

    def _build_generation_config(
        self,
        system_prompt: str,
        *,
        use_tools: bool,
    ) -> types.GenerateContentConfig:
        """Create model configuration with URL-aware tool preferences."""

        tool_list: List[types.Tool] = []

        if use_tools:
            # Prefer URL context and search tools when available in the current SDK.
            try:
                if hasattr(types, "UrlContext"):
                    tool_list.append(types.Tool(
                        url_context=types.UrlContext()))
                if hasattr(types, "GoogleSearch"):
                    tool_list.append(types.Tool(
                        google_search=types.GoogleSearch()))
            except (AttributeError, TypeError, ValueError):
                logger.warning(
                    "Unable to configure Gemini tools; continuing without them")

        return types.GenerateContentConfig(
            system_instruction=system_prompt,
            temperature=0.2,
            max_output_tokens=2048 if use_tools else 1024,
            tools=tool_list or None,
        )

    def _build_system_prompt(
        self,
        *,
        tool_name: str,
        task_instructions: str,
        allowed_sources: List[str],
    ) -> str:
        """Build a strict instruction prompt for grounded answers."""

        sources_block = "\n".join(f"- {source}" for source in allowed_sources)
        return (
            "You are an environmental compliance and funding research assistant.\n"
            "Your role is to provide accurate, well-structured answers grounded in reliable sources.\n\n"

            f"Tool Name: {tool_name}\n"
            f"Task Instructions: {task_instructions}\n\n"

            "Grounding and Source Policy:\n"
            "1. Prioritize official and authoritative sources listed below.\n"
            "2. Only include sources that were actually used to construct the answer.\n"
            "3. If information is uncertain, incomplete, or conflicting, clearly state the uncertainty.\n"
            "4. Do NOT invent sources, URLs, statistics, or claims.\n"
            "5. Prefer government, institutional, or official program pages when possible.\n\n"

            "Answer Formatting Rules:\n"
            "1. The 'answer' field must be written in Markdown.\n"
            "2. Use headings, bullet points, and bold text where appropriate for readability.\n"
            "3. Include practical guidance, best practices, or actionable steps when relevant.\n"
            "4. Do NOT include raw URLs inside the answer body.\n\n"

            "Source Rules:\n"
            "1. The 'sources' array must contain only direct URLs used for grounding the answer.\n"
            "2. Every source must be a real and accessible webpage.\n"
            "3. Do not include sources that were not used.\n"
            "4. Do not fabricate or guess URLs.\n\n"

            "Output Format (STRICT):\n"
            "Return ONLY valid JSON matching this schema:\n"
            "{\"answer\": string, \"sources\": string[]}\n\n"

            "Preferred Official Sources:\n"
            f"{sources_block}\n"

        )

    def _parse_response(self, response: Any, fallback_sources: List[str]) -> Tuple[str, List[str]]:
        """Return raw model text and collect URL citations."""

        raw_text = self._extract_text(response)
        if not raw_text.strip():
            raise GeminiServiceError("Gemini returned an empty response")

        answer = raw_text
        source_candidates: List[str] = []
        citation_sources = self._normalize_urls(
            self._extract_citation_urls_from_response(response)
        )

        # Keep compatibility with older prompt format that may still return JSON.
        payload = self._safe_json_parse(raw_text)
        if payload:
            source_candidates.extend(payload.get("sources", []))
            payload_answer = payload.get("answer")
            if isinstance(payload_answer, str):
                answer = payload_answer
                source_candidates.extend(self._extract_urls(payload_answer))

        source_candidates.extend(self._extract_urls(raw_text))
        # If Gemini grounding metadata provides citations, use those exact links only.
        sources = citation_sources or self._normalize_urls(source_candidates)

        # Keep only preferred source domains if citations are missing.
        if not sources:
            sources = self._best_effort_source_hints(answer, fallback_sources)
        return answer, sources

    def _map_client_error(self, exc: genai_errors.ClientError) -> GeminiServiceError:
        """Map Gemini SDK client errors to API-safe service errors."""

        status_code = int(getattr(exc, "status_code", 502) or 502)
        message = str(exc)
        upper_message = message.upper()

        if status_code == 429 or "RESOURCE_EXHAUSTED" in upper_message:
            return GeminiServiceError(
                "Gemini quota or rate limit exceeded. Retry later or increase quota.",
                status_code=429,
            )
        if status_code in {400, 401, 403, 404}:
            return GeminiServiceError("Gemini request rejected by provider.", status_code=502)
        if status_code >= 500:
            return GeminiServiceError("Gemini provider is temporarily unavailable.", status_code=502)

        return GeminiServiceError("Gemini API request failed", status_code=502)

    def _extract_text(self, response: Any) -> str:
        """Extract plain text content from SDK response."""

        text = getattr(response, "text", None)
        if isinstance(text, str) and text.strip():
            return text

        candidates = getattr(response, "candidates", None) or []
        chunks: List[str] = []
        for candidate in candidates:
            content = getattr(candidate, "content", None)
            parts = getattr(content, "parts", None) or []
            for part in parts:
                part_text = getattr(part, "text", None)
                if isinstance(part_text, str) and part_text.strip():
                    chunks.append(part_text)
        return "\n".join(chunks).strip()

    def _safe_json_parse(self, raw_text: str) -> Optional[Dict[str, Any]]:
        """Attempt to parse JSON, including fenced-code responses."""

        for candidate in (raw_text, self._strip_fences(raw_text)):
            try:
                value = json.loads(candidate)
            except (TypeError, JSONDecodeError):
                continue
            if isinstance(value, dict):
                return value
        return None

    def _strip_fences(self, text: str) -> str:
        """Strip markdown fences from model output."""

        stripped = text.strip()
        if stripped.startswith("```") and stripped.endswith("```"):
            lines = stripped.splitlines()
            if len(lines) >= 3:
                return "\n".join(lines[1:-1]).strip()
        return stripped

    def _normalize_urls(self, urls: Iterable[Any]) -> List[str]:
        """Normalize and deduplicate URL values."""

        seen = set()
        normalized: List[str] = []
        for value in urls:
            if not isinstance(value, str):
                continue
            candidate = value.strip()
            if not candidate.startswith(("http://", "https://")):
                continue
            if candidate not in seen:
                seen.add(candidate)
                normalized.append(candidate)
        return normalized

    def _extract_urls(self, text: str) -> List[str]:
        """Extract URL-like strings from plain text."""

        return _URL_PATTERN.findall(text)

    def _extract_citation_urls_from_response(self, response: Any) -> List[str]:
        """Extract citation URLs from Gemini response metadata when available."""

        collected: List[str] = []
        candidates = getattr(response, "candidates", None) or []
        for candidate in candidates:
            # Grounding metadata often contains the URLs used by search/url tools.
            metadata = getattr(candidate, "grounding_metadata", None)
            if metadata is not None:
                collected.extend(self._extract_urls_from_any(metadata))

            content = getattr(candidate, "content", None)
            parts = getattr(content, "parts", None) or []
            for part in parts:
                citation_metadata = getattr(part, "citation_metadata", None)
                if citation_metadata is not None:
                    collected.extend(
                        self._extract_urls_from_any(citation_metadata))
        return collected

    def _extract_urls_from_any(self, value: Any) -> List[str]:
        """Recursively collect URL strings from dict-like, list-like, or object values."""

        if value is None:
            return []

        if isinstance(value, str):
            candidate = value.strip()
            if candidate.startswith(("http://", "https://")):
                return [candidate]
            return self._extract_urls(value)

        if isinstance(value, dict):
            urls: List[str] = []
            for key in ("url", "uri", "source", "link", "web", "web_uri"):
                direct = value.get(key)
                if isinstance(direct, str) and direct.strip().startswith(("http://", "https://")):
                    urls.append(direct.strip())
            for child in value.values():
                urls.extend(self._extract_urls_from_any(child))
            return urls

        if isinstance(value, (list, tuple, set)):
            urls: List[str] = []
            for child in value:
                urls.extend(self._extract_urls_from_any(child))
            return urls

        to_dict = getattr(value, "to_dict", None)
        if callable(to_dict):
            return self._extract_urls_from_any(to_dict())

        model_dump = getattr(value, "model_dump", None)
        if callable(model_dump):
            return self._extract_urls_from_any(model_dump())

        obj_dict = getattr(value, "__dict__", None)
        if isinstance(obj_dict, dict):
            return self._extract_urls_from_any(obj_dict)

        return self._extract_urls(str(value))

    def _best_effort_source_hints(self, answer: str, allowed_sources: List[str]) -> List[str]:
        """Pick likely matching allowed sources if explicit URLs are unavailable."""

        lower_answer = answer.lower()
        matches = [source for source in allowed_sources if self._source_host(
            source) in lower_answer]
        return matches[:6]

    def _source_host(self, source: str) -> str:
        """Extract a loose host token for matching."""

        host = source.replace("https://", "").replace("http://", "")
        return host.split("/")[0].lower()
