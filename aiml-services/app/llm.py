from __future__ import annotations
import os
from typing import Optional

try:
    from openai import OpenAI
except Exception:  # pragma: no cover
    OpenAI = None  # type: ignore


class LLMClient:
    """Thin wrapper around OpenAI (or compatible) LLMs.

    Expects environment variables:
    - OPENAI_API_KEY (required)
    - OPENAI_BASE_URL (optional, for compatible providers)
    - OPENAI_MODEL (optional, default: gpt-4o-mini)
    """

    def __init__(self) -> None:
        self.api_key = os.getenv("OPENAI_API_KEY")
        self.base_url = os.getenv("OPENAI_BASE_URL")
        self.model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        self._client = None
        if OpenAI and self.api_key:
            self._client = OpenAI(api_key=self.api_key, base_url=self.base_url) if self.base_url else OpenAI(api_key=self.api_key)

    def available(self) -> bool:
        return self._client is not None

    def generate(self, prompt: str) -> Optional[str]:
        if not self._client:
            return None
        # Use chat.completions for better instruction following
        resp = self._client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": "You are a helpful personal finance assistant."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.3,
            max_tokens=800,
        )
        content = resp.choices[0].message.content if resp and resp.choices else None
        return content
