"""NovaTrade — AI Copilot service with Ollama integration."""

import json
import logging
import httpx

from sqlalchemy.orm import Session
from models import User, Holding, PendingOrder
from config import (
    OLLAMA_URL, OLLAMA_MODEL, OLLAMA_TEMPERATURE, OLLAMA_NUM_CTX,
    OLLAMA_TIMEOUT, MAX_TOOL_CALLS_PER_TURN, CONVERSATION_MEMORY_SIZE,
    SYSTEM_PROMPT, INTENT_FALLBACK_PROMPT, STOCK_UNIVERSE,
)
from tools.tool_schemas import TOOLS
from tools.tool_executor import execute_tool

logger = logging.getLogger("novatrade.copilot")


async def chat(
    db: Session,
    user: User,
    message: str,
    conversation: list[dict],
) -> dict:
    """Process a copilot chat message. Returns response + tool calls made."""

    # Build dynamic system prompt with user context
    system_prompt = _build_system_prompt(db, user)

    # Trim conversation to last N messages
    trimmed = conversation[-CONVERSATION_MEMORY_SIZE:]

    messages = [
        {"role": "system", "content": system_prompt},
        *trimmed,
        {"role": "user", "content": message},
    ]

    tool_calls_made = []
    attempts = 0

    while attempts < MAX_TOOL_CALLS_PER_TURN:
        attempts += 1

        try:
            result = await _call_ollama(messages)
        except Exception as e:
            logger.error("Ollama call failed: %s", e)
            # Try fallback intent parsing
            return await _fallback_response(db, user, message, tool_calls_made)

        msg = result.get("message", {})

        # Check for tool calls
        tool_calls = msg.get("tool_calls", [])
        if not tool_calls:
            # No tool calls — return the text response
            return {
                "response": msg.get("content", "I'm not sure how to help with that."),
                "tool_calls_made": tool_calls_made,
            }

        # Execute each tool call
        for tc in tool_calls:
            func = tc.get("function", {})
            tool_name = func.get("name", "")
            tool_args = func.get("arguments", {})

            logger.info("Tool call: %s(%s)", tool_name, json.dumps(tool_args))

            tool_result = await execute_tool(db, user, tool_name, tool_args)

            tool_calls_made.append({
                "tool": tool_name,
                "args": tool_args,
                "result": tool_result,
            })

            # Append assistant message with tool call + tool result
            messages.append(msg)
            messages.append({
                "role": "tool",
                "content": json.dumps(tool_result),
            })

    # Max tool calls exceeded — ask LLM to summarize
    messages.append({
        "role": "user",
        "content": "Please summarize what you've found so far based on the tool results above.",
    })

    try:
        final_result = await _call_ollama(messages, include_tools=False)
        return {
            "response": final_result.get("message", {}).get("content", "I've gathered some data. Here's what I found so far..."),
            "tool_calls_made": tool_calls_made,
        }
    except Exception:
        return {
            "response": "I've gathered some data but had trouble formatting the response. Please try again.",
            "tool_calls_made": tool_calls_made,
        }


async def _call_ollama(messages: list[dict], include_tools: bool = True) -> dict:
    """Call Ollama's /api/chat endpoint."""
    payload = {
        "model": OLLAMA_MODEL,
        "messages": messages,
        "stream": False,
        "options": {
            "temperature": OLLAMA_TEMPERATURE,
            "num_ctx": OLLAMA_NUM_CTX,
        },
    }
    if include_tools:
        payload["tools"] = TOOLS

    async with httpx.AsyncClient(timeout=OLLAMA_TIMEOUT) as client:
        response = await client.post(OLLAMA_URL, json=payload)
        response.raise_for_status()
        return response.json()


async def _fallback_response(
    db: Session, user: User, message: str, existing_calls: list
) -> dict:
    """Fallback: use intent parsing if native function calling fails."""
    try:
        prompt = INTENT_FALLBACK_PROMPT.format(user_message=message)
        async with httpx.AsyncClient(timeout=OLLAMA_TIMEOUT) as client:
            response = await client.post(
                OLLAMA_URL,
                json={
                    "model": OLLAMA_MODEL,
                    "messages": [{"role": "user", "content": prompt}],
                    "stream": False,
                    "options": {"temperature": 0, "num_ctx": 2048},
                },
            )
            response.raise_for_status()
            content = response.json().get("message", {}).get("content", "")

            # Parse intents from JSON
            start = content.find("{")
            end = content.rfind("}") + 1
            if start != -1 and end > start:
                parsed = json.loads(content[start:end])
                intents = parsed.get("intents", [])

                results = []
                for intent in intents:
                    name = intent.get("name", "unknown")
                    params = intent.get("params", {})
                    if name != "unknown":
                        result = await execute_tool(db, user, name, params)
                        existing_calls.append({"tool": name, "args": params, "result": result})
                        results.append(f"**{name}**: {json.dumps(result)}")

                if results:
                    return {
                        "response": "Here's what I found:\n" + "\n".join(results),
                        "tool_calls_made": existing_calls,
                    }
    except Exception as e:
        logger.error("Fallback parsing failed: %s", e)

    return {
        "response": "I'm having trouble connecting to the AI model. Please make sure Ollama is running with `ollama run gemma4`.",
        "tool_calls_made": existing_calls,
    }


def _build_system_prompt(db: Session, user: User) -> str:
    """Inject current portfolio state into the system prompt."""
    holdings = db.query(Holding).filter(Holding.user_id == user.id).all()
    orders = (
        db.query(PendingOrder)
        .filter(PendingOrder.user_id == user.id, PendingOrder.status == "pending")
        .all()
    )

    holdings_summary = ", ".join(
        f"{h.symbol}: {int(h.quantity)} shares @ ${h.avg_buy_price:.2f}"
        for h in holdings
    ) or "None"

    pending_summary = ", ".join(
        f"{o.action.upper()} {int(o.quantity)} {o.symbol} when {o.indicator} {o.condition} {o.value}"
        for o in orders
    ) or "None"

    prompt = SYSTEM_PROMPT.replace("{balance}", f"{user.balance:,.2f}")
    prompt = prompt.replace("{holdings_summary}", holdings_summary)
    prompt = prompt.replace("{pending_orders}", pending_summary)
    prompt = prompt.replace("{alerts}", "None")  # simplified for hackathon

    return prompt
