"""NovaTrade — 7 tool JSON schemas for Ollama function calling."""

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "execute_trade",
            "description": "Execute a market order (immediate) or limit order (queued until price target hit) for the user. Use this when the user wants to buy or sell stocks NOW or at a specific price.",
            "parameters": {
                "type": "object",
                "properties": {
                    "symbol": {"type": "string", "description": "Stock ticker symbol, e.g. AAPL, NVDA, TSLA"},
                    "action": {"type": "string", "enum": ["buy", "sell"], "description": "Whether to buy or sell"},
                    "quantity": {"type": "integer", "description": "Number of shares"},
                    "order_type": {"type": "string", "enum": ["market", "limit"], "description": "market = execute now at current price, limit = execute when price reaches target"},
                    "limit_price": {"type": "number", "description": "Target price for limit orders. Required when order_type is limit."},
                },
                "required": ["symbol", "action", "quantity"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_stock_info",
            "description": "Get current price, daily change, technical indicators (RSI, SMA, EMA), and key stats for a specific stock. Use this before recommending any trade.",
            "parameters": {
                "type": "object",
                "properties": {
                    "symbol": {"type": "string", "description": "Stock ticker symbol"},
                },
                "required": ["symbol"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "scan_market",
            "description": "Scan all available stocks filtered by price range, sector, or technical condition. Use this when user asks 'what should I buy' or 'find me oversold stocks'.",
            "parameters": {
                "type": "object",
                "properties": {
                    "max_price": {"type": "number", "description": "Maximum stock price filter"},
                    "sector": {"type": "string", "description": "Sector filter, e.g. Technology, Healthcare, Finance"},
                    "condition": {"type": "string", "enum": ["oversold", "overbought", "bullish_sentiment", "bearish_sentiment"], "description": "Technical or sentiment condition filter"},
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_sentiment",
            "description": "Get AI-analyzed news sentiment for a stock. Returns bullish/neutral/bearish with confidence and key headlines.",
            "parameters": {
                "type": "object",
                "properties": {
                    "symbol": {"type": "string", "description": "Stock ticker symbol"},
                },
                "required": ["symbol"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "analyze_portfolio",
            "description": "Analyze the user's complete portfolio: holdings, P&L, risk score, sector diversification, and concentration risk. Use when user asks 'how is my portfolio' or 'what's my risk'.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "set_price_alert",
            "description": "Set a notification alert when a stock crosses a price threshold. Does NOT execute a trade, just alerts the user.",
            "parameters": {
                "type": "object",
                "properties": {
                    "symbol": {"type": "string", "description": "Stock ticker symbol"},
                    "target_price": {"type": "number", "description": "Price to trigger alert at"},
                    "direction": {"type": "string", "enum": ["above", "below"], "description": "Alert when price goes above or below target"},
                },
                "required": ["symbol", "target_price", "direction"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_conditional_order",
            "description": "Create an order that automatically executes when a technical indicator condition is met. Supports price targets, RSI levels, SMA crossovers, and EMA crossovers. Use this when user says things like 'buy when RSI drops below 30' or 'sell when price crosses above the 50-day SMA'.",
            "parameters": {
                "type": "object",
                "properties": {
                    "symbol": {"type": "string", "description": "Stock ticker symbol"},
                    "action": {"type": "string", "enum": ["buy", "sell"]},
                    "quantity": {"type": "integer", "description": "Number of shares"},
                    "indicator": {"type": "string", "enum": ["price", "rsi", "ema_crossover", "sma"], "description": "Which indicator to monitor"},
                    "condition": {"type": "string", "enum": ["above", "below", "crosses_above", "crosses_below"], "description": "Trigger condition"},
                    "value": {"type": "number", "description": "Threshold: price in $, RSI 0-100, or SMA/EMA period"},
                },
                "required": ["symbol", "action", "quantity", "indicator", "condition", "value"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "optimize_portfolio",
            "description": "Run Modern Portfolio Theory optimization on the user's portfolio using the Efficient Frontier (Markowitz model). Computes optimal allocation weights. Supports 3 objectives: maximize Sharpe ratio (best risk-adjusted return), minimize volatility (safest portfolio), or target a specific annual return. Use when user asks 'optimize my portfolio', 'what's the best allocation', 'rebalance my holdings', or 'reduce my risk'.",
            "parameters": {
                "type": "object",
                "properties": {
                    "tickers": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of ticker symbols to include. If empty, uses current holdings.",
                    },
                    "objective": {
                        "type": "string",
                        "enum": ["max_sharpe", "min_volatility", "efficient_return"],
                        "description": "max_sharpe = best risk-adjusted return, min_volatility = lowest risk, efficient_return = target a specific return.",
                    },
                    "target_return": {
                        "type": "number",
                        "description": "Target annual return (e.g. 0.20 for 20%). Only for efficient_return objective.",
                    },
                },
                "required": ["objective"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "analyze_risk",
            "description": "Run ML-powered risk analysis on the user's portfolio. Uses K-Means clustering and PCA to discover hidden correlations between holdings (beyond simple sector labels). Returns a risk score 0-100, identifies over-concentrated behavioral clusters, and suggests specific stocks to improve diversification. Use when user asks 'how risky is my portfolio', 'am I diversified enough', 'what's my concentration risk', or 'which stocks should I add for safety'.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
            },
        },
    },
]
