"""Funding lookup AI tool implementation."""

from typing import List, Tuple

from app.services.gemini_client import GeminiClient

FUNDING_SOURCES: List[str] = [
    "https://www.grants.ca.gov",
    "https://fundingwizard.arb.ca.gov",
    "https://resilientca.org",
    "https://waterboards.ca.gov",
    "https://resources.ca.gov/grants",
    "https://calrecycle.ca.gov/grants",
    "https://www.grants.gov",
    "https://www.epa.gov/grants",
    "https://sam.gov",
    "https://faast.waterboards.ca.gov",
    "https://water.ca.gov/grants",
    "https://www.fire.ca.gov/grants",
    "https://www.energy.ca.gov/solicitations",
    "https://www.caclimateinvestments.ca.gov",
]


async def run_funding_lookup(client: GeminiClient, prompt: str) -> Tuple[str, List[str]]:
    """Return funding opportunities with eligibility, amount, and links."""

    instructions = (
        "Search environmental funding opportunities and produce:\n"
        "- relevant funding programs\n"
        "- likely eligibility criteria\n"
        "- indicative funding amounts when available\n"
        "- official application URLs"
    )
    return await client.generate_grounded_answer(
        tool_name="Funding Lookup",
        user_prompt=prompt,
        allowed_sources=FUNDING_SOURCES,
        task_instructions=instructions,
    )
