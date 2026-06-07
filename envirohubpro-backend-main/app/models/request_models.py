"""Request models for AI endpoints."""

from pydantic import BaseModel, Field


class PromptRequest(BaseModel):
    """Single prompt request payload."""

    prompt: str = Field(..., min_length=3,
                        description="Natural language user question")
