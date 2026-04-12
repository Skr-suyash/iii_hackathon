"""NovaTrade — AI Copilot service with Groq integration."""

import json
import logging
import httpx

from sqlalchemy.orm import Session
from models import User, Holding, PendingOrder
from groq import AsyncGroq
from config import (
    GROQ_API_KEY, GROQ_MODEL, GROQ_TEMPERATURE,
    MAX_TOOL_CALLS_PER_TURN, CONVERSATION_MEMORY_SIZE,
    SYSTEM_PROMPT, INTENT_FALLBACK_PROMPT, STOCK_UNIVERSE,
)
from tools.tool_schemas import TOOLS
from tools.tool_executor import execute_tool

logger = logging.getLogger("novatrade.copilot")


async def chat_stream(
    db: Session,
    user: User,
    message: str,
    conversation: list[dict],
):
    """Process a copilot chat message and stream the response using Groq."""

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
            client = AsyncGroq(api_key=GROQ_API_KEY)
            response = await client.chat.completions.create(
                model=GROQ_MODEL,
                messages=messages,
                temperature=GROQ_TEMPERATURE,
                tools=TOOLS,
                tool_choice="auto"
            )
        except Exception as e:
            logger.error("Groq call failed: %s", e)
            # Try fallback intent parsing natively
            fallback_res = await _fallback_response(db, user, message, tool_calls_made)
            for tc in fallback_res.get("tool_calls_made", []):
                yield f"data: {json.dumps({'type': 'tool_call', 'tool': tc['tool'], 'args': tc['args']})}\n\n"
            yield f"data: {json.dumps({'type': 'chunk', 'content': fallback_res['response']})}\n\n"
            return

        msg = response.choices[0].message
        
        if not msg.tool_calls:
            # No tool calls — return the text response
            yield f"data: {json.dumps({'type': 'chunk', 'content': msg.content or 'I am not sure how to help with that.'})}\n\n"
            return

        # Explicitly remove None values to keep the conversation array clean for Groq
        messages.append(msg.model_dump(exclude_none=True))

        # Execute each tool call
        for tc in msg.tool_calls:
            tool_name = tc.function.name
            try:
                tool_args = json.loads(tc.function.arguments)
            except Exception:
                tool_args = {}

            logger.info("Tool call: %s(%s)", tool_name, json.dumps(tool_args))

            yield f"data: {json.dumps({'type': 'tool_call', 'tool': tool_name, 'args': tool_args})}\n\n"

            tool_result = await execute_tool(db, user, tool_name, tool_args)

            tool_calls_made.append({
                "tool": tool_name,
                "args": tool_args,
                "result": tool_result,
            })

            # Append tool result matching the tool_call_id
            messages.append({
                "role": "tool",
                "tool_call_id": tc.id,
                "name": tool_name,
                "content": json.dumps(tool_result),
            })

    # Max tool calls exceeded — ask LLM to summarize
    messages.append({
        "role": "user",
        "content": "Please summarize what you've found so far based on the tool results above.",
    })

    try:
        stream = await client.chat.completions.create(
            model=GROQ_MODEL,
            messages=messages,
            temperature=GROQ_TEMPERATURE,
            stream=True
        )
        async for chunk in stream:
            content = chunk.choices[0].delta.content
            if content:
                yield f"data: {json.dumps({'type': 'chunk', 'content': content})}\n\n"
    except Exception as e:
        logger.error("Groq streaming failed: %s", e)
        yield f"data: {json.dumps({'type': 'chunk', 'content': ' I had trouble formatting the response. Please try again.'})}\n\n"


async def _fallback_response(
    db: Session, user: User, message: str, existing_calls: list
) -> dict:
    """Fallback: use intent parsing if native function calling fails."""
    try:
        prompt = INTENT_FALLBACK_PROMPT.format(user_message=message)
        client = AsyncGroq(api_key=GROQ_API_KEY)
        response = await client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
            response_format={"type": "json_object"}
        )
        content = response.choices[0].message.content or ""

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
        "response": "I'm having trouble connecting to the AI model. Please check your GROQ_API_KEY.",
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

    def format_conditions(cond_json):
        try:
            conds = json.loads(cond_json)
            if not conds: return "no conditions"
            return " AND ".join(f"{c['indicator']} {c['condition']} {c['value']}" for c in conds)
        except Exception:
            return "invalid conditions"

    pending_summary = ", ".join(
        f"[ID: {o.id}] {o.action.upper()} {int(o.quantity)} {o.symbol} when {format_conditions(o.conditions)}"
        for o in orders
    ) or "None"

    market_universe = ", ".join(STOCK_UNIVERSE.keys())

    prompt = SYSTEM_PROMPT.replace("{market_universe}", market_universe)
    prompt = prompt.replace("{balance}", f"{user.balance:,.2f}")
    prompt = prompt.replace("{holdings_summary}", holdings_summary)
    prompt = prompt.replace("{pending_orders}", pending_summary)
    prompt = prompt.replace("{alerts}", "None")  # simplified for hackathon

    return prompt
