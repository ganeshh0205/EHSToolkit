"""General environmental AI assistant implementation."""

from typing import List, Tuple

from app.ai.funding import FUNDING_SOURCES
from app.ai.regulatory import REGULATORY_SOURCES
from app.services.gemini_client import GeminiClient

GENERAL_SOURCES: List[str] = sorted(set(REGULATORY_SOURCES + FUNDING_SOURCES))


async def run_general_assistant(client: GeminiClient, prompt: str) -> Tuple[str, List[str]]:
    """Return combined regulatory and funding guidance with citations."""

    instructions = (
        "Provide an integrated environmental strategy that includes:\n"
        "- regulatory considerations and likely compliance obligations\n"
        "- recommended funding or grant pathways\n"
        "- actionable next steps for implementation\n"
        "- official citations to the listed source URLs"
    )
    return await client.generate_grounded_answer(
        tool_name="General Environmental Assistant",
        user_prompt=prompt,
        allowed_sources=GENERAL_SOURCES,
        task_instructions=instructions,
    )
