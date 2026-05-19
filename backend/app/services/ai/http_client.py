"""Shared async HTTP client for OpenAI-compatible chat completion APIs."""

import json

import httpx


async def call_openai_compatible_api(
    base_url: str,
    api_key: str,
    model: str,
    messages: list[dict],
    include_auth: bool = True,
    max_tokens: int = 512,
    timeout: float = 60.0,
) -> str:
    """POST to {base_url}/chat/completions and return the response content string.

    Adds an Authorization header only when include_auth=True and the key is not
    the sentinel value "not-needed" (used by Ollama).
    Raises RuntimeError with a clear message on any HTTP or network error.
    """
    headers = {"Content-Type": "application/json"}
    if include_auth and api_key and api_key != "not-needed":
        headers["Authorization"] = f"Bearer {api_key}"

    payload = {
        "model": model,
        "messages": messages,
        "max_tokens": max_tokens,
    }

    async with httpx.AsyncClient(timeout=timeout) as client:
        try:
            response = await client.post(
                f"{base_url}/chat/completions",
                json=payload,
                headers=headers,
            )
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise RuntimeError(
                f"API returned {exc.response.status_code}: {exc.response.text[:200]}"
            ) from exc
        except httpx.HTTPError as exc:
            raise RuntimeError(f"API request failed: {exc}") from exc

    try:
        data = response.json()
        content = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError) as e:
        raise RuntimeError(
            f"Unexpected response shape from AI provider. "
            f"Expected choices[0].message.content, got: {json.dumps(data)[:200]}"
        ) from e
    return content
