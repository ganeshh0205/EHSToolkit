"""Regulatory lookup AI tool implementation."""

from typing import List, Tuple

from app.services.gemini_client import GeminiClient

REGULATORY_SOURCES: List[str] = [
    "https://calepa.ca.gov",
    "https://arb.ca.gov",
    "https://dtsc.ca.gov",
    "https://waterboards.ca.gov",
    "https://calrecycle.ca.gov",
    "https://oehha.ca.gov",
    "https://oal.ca.gov/publications/ccr/",
    "https://arb.ca.gov/air-districts",
    "https://ecfr.gov",
    "https://www.epa.gov",
    "https://www.osha.gov",
    "https://federalregister.gov",
]


async def run_regulatory_lookup(client: GeminiClient, prompt: str) -> Tuple[str, List[str]]:
    """Return compliance guidance and citations from regulatory sources."""

    instructions = (
        "Analyze the environmental compliance question and produce:\n"
        "- a plain-language rule summary\n"
        "- practical compliance best practices\n"
        "- direct citations to official regulatory URLs"
    )
    return await client.generate_grounded_answer(
        tool_name="Regulatory Lookup",
        user_prompt=prompt,
        allowed_sources=REGULATORY_SOURCES,
        task_instructions=instructions,
    )
