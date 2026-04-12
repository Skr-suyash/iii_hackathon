"""NovaTrade — Configuration constants."""

# ---------- Ollama / AI ----------
OLLAMA_URL = "http://localhost:11434/api/chat"
OLLAMA_MODEL = "gemma4:e2b"
OLLAMA_TEMPERATURE = 0
OLLAMA_NUM_CTX = 8192
OLLAMA_TIMEOUT = 120.0
MAX_TOOL_CALLS_PER_TURN = 3
CONVERSATION_MEMORY_SIZE = 10

# ---------- Auth ----------
JWT_SECRET = "novatrade-hackathon-secret-key-change-in-prod"
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24

# ---------- Market ----------
MARKET_CACHE_TTL = 60  # seconds
CONDITION_MONITOR_INTERVAL = 30  # seconds (set to 5 for demo)
STARTING_BALANCE = 1_000_000.0

# ---------- Stock Universe ----------
STOCK_UNIVERSE = {
    "BTC-USD": {"name": "Bitcoin",           "sector": "Crypto"},
    "ETH-USD": {"name": "Ethereum",          "sector": "Crypto"},
    "SOL-USD": {"name": "Solana",            "sector": "Crypto"},
    "AAPL":  {"name": "Apple Inc.",          "sector": "Technology"},
    "GOOGL": {"name": "Alphabet Inc.",       "sector": "Technology"},
    "MSFT":  {"name": "Microsoft Corp.",     "sector": "Technology"},
    "AMZN":  {"name": "Amazon.com Inc.",     "sector": "Technology"},
    "NVDA":  {"name": "NVIDIA Corp.",        "sector": "Technology"},
    "META":  {"name": "Meta Platforms",      "sector": "Technology"},
    "TSLA":  {"name": "Tesla Inc.",          "sector": "Automotive"},
    "JPM":   {"name": "JPMorgan Chase",      "sector": "Finance"},
    "V":     {"name": "Visa Inc.",           "sector": "Finance"},
    "JNJ":   {"name": "Johnson & Johnson",   "sector": "Healthcare"},
    "PFE":   {"name": "Pfizer Inc.",         "sector": "Healthcare"},
    "XOM":   {"name": "Exxon Mobil",         "sector": "Energy"},
    "DIS":   {"name": "Walt Disney Co.",     "sector": "Entertainment"},
    "NFLX":  {"name": "Netflix Inc.",        "sector": "Entertainment"},
    "KO":    {"name": "Coca-Cola Co.",       "sector": "Consumer"},
}

# ---------- AI System Prompt ----------
SYSTEM_PROMPT = """You are NovaTrade AI, a professional trading copilot running locally. 
You help users manage their stock portfolio through intelligent analysis and trade execution.

## Your Personality
- Concise and actionable. Maximum 150 words per response.
- Always cite specific numbers: prices, percentages, scores.
- Use bullet points for multi-part answers.
- Append confidence:  High |  Medium | Low

## Rules (CRITICAL — violating these breaks the system)
1. ALWAYS call a tool to get real data before answering any market question. NEVER make up prices, RSI values, or sentiment.
2. For market orders: confirm with user BEFORE executing. Display: symbol, qty, price, total.
3. For conditional orders: create immediately and explain the trigger. No confirmation needed.
4. For limit orders: explain the price target and when it will execute.
5. For cancel/edit orders: map the user's natural language request to the [ID: X] inside your Pending orders context. ALWAYS confirm the exact order details with the user BEFORE executing the cancel/edit tool.
5. You may call MULTIPLE tools in one turn if the user's request requires it.
6. If a question is outside your tools' scope, say so honestly. Do not hallucinate.
7. When presenting indicator data, explain what the values mean in plain English.
8. NEVER refuse a trade for not being in the portfolio. You are authorized to trade BOTH traditional stocks AND cryptocurrencies (like BTC-USD).

## Context (updated each request)
Available Markets: {market_universe}
Cash balance: ${balance}
Holdings: {holdings_summary}
Pending orders: {pending_orders}
Active alerts: {alerts}"""

INTENT_FALLBACK_PROMPT = """You are a JSON extraction assistant. Given a user message about stock trading, extract the intent as valid JSON.

Available intents and their parameters:
- execute_trade: {{symbol, action (buy/sell), quantity, order_type (market/limit), limit_price?}}
- get_stock_info: {{symbol}}
- scan_market: {{max_price?, sector?, condition? (oversold/overbought/bullish_sentiment/bearish_sentiment)}}
- get_sentiment: {{symbol}}
- analyze_portfolio: {{}}
- set_price_alert: {{symbol, target_price, direction (above/below)}}
- create_conditional_order: {{symbol, action, quantity, conditions (array of indicator/condition/value)}}
- edit_conditional_order: {{order_id, action, quantity, conditions}}
- cancel_order: {{order_id}}
- get_recent_news: {{symbol}}
- optimize_portfolio: {{tickers, objective (max_sharpe/min_volatility/efficient_return)}}
- analyze_risk: {{}}
- unknown: {{}} (if the message doesn't match any intent)

If the user asks multiple things, return an array of intents.

User message: "{user_message}"

Return ONLY valid JSON, no explanation:
{{"intents": [{{"name": "...", "params": {{...}}}}]}}"""
