"""Response models for AI endpoints."""

from typing import List

from pydantic import BaseModel, Field


class AIResponse(BaseModel):
    """Standardized AI response payload."""

    answer: str = Field(..., description="Final assistant answer")
    sources: List[str] = Field(
        default_factory=list, description="Referenced source URLs")
    model: str = Field(default="gemini", description="Underlying model family")
