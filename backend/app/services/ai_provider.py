"""Shared AI provider utilities for image analysis."""

from __future__ import annotations

import asyncio
import base64
import json

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.user_api_keys import UserApiKeys


def parse_ai_json(text: str, fallback: dict | None = None) -> dict:
    """Extract JSON from AI model response."""
    try:
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            return json.loads(text[start:end])
    except Exception:
        pass
    return fallback or {}


async def get_provider(db: AsyncSession, user_id: int) -> tuple[str | None, str | None]:
    """Return (provider, api_key) by priority: Anthropic -> OpenAI -> xAI."""
    result = await db.execute(
        select(UserApiKeys).where(UserApiKeys.user_id == user_id)
    )
    user_keys = result.scalar_one_or_none()

    if user_keys:
        if user_keys.anthropic_key:
            return "anthropic", user_keys.anthropic_key
        if user_keys.openai_key:
            return "openai", user_keys.openai_key
        if user_keys.xai_key:
            return "xai", user_keys.xai_key
    if settings.anthropic_api_key:
        return "anthropic", settings.anthropic_api_key
    return None, None


async def analyze_image(
    provider: str,
    api_key: str,
    image_bytes: bytes,
    media_type: str,
    system_prompt: str,
    user_prompt: str,
) -> str:
    """Send image to AI provider and return raw text response."""
    b64 = base64.standard_b64encode(image_bytes).decode("utf-8")

    if provider == "anthropic":
        return await _call_anthropic(api_key, b64, media_type, system_prompt, user_prompt)
    elif provider == "openai":
        return await _call_openai(api_key, b64, media_type, system_prompt, user_prompt, "gpt-4o-mini")
    else:
        return await _call_openai(
            api_key, b64, media_type, system_prompt, user_prompt,
            "grok-2-vision-1212", "https://api.x.ai/v1",
        )


async def _call_anthropic(
    api_key: str, b64: str, media_type: str,
    system_prompt: str, user_prompt: str,
) -> str:
    import anthropic as anthropic_sdk

    client = anthropic_sdk.Anthropic(api_key=api_key)

    def _sync():
        msg = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=4096,
            system=system_prompt,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {"type": "base64", "media_type": media_type, "data": b64},
                    },
                    {"type": "text", "text": user_prompt},
                ],
            }],
        )
        return msg.content[0].text

    return await asyncio.to_thread(_sync)


async def _call_openai(
    api_key: str, b64: str, media_type: str,
    system_prompt: str, user_prompt: str,
    model: str = "gpt-4o-mini",
    base_url: str | None = None,
) -> str:
    from openai import OpenAI

    kwargs = {"api_key": api_key}
    if base_url:
        kwargs["base_url"] = base_url
    client = OpenAI(**kwargs)

    def _sync():
        resp = client.chat.completions.create(
            model=model,
            max_tokens=4096,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:{media_type};base64,{b64}"},
                        },
                        {"type": "text", "text": user_prompt},
                    ],
                },
            ],
        )
        return resp.choices[0].message.content

    return await asyncio.to_thread(_sync)
