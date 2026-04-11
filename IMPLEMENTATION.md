# NovaTrade — Implementation Plan (Final)

## Goal

Build a hackathon-winning AI-powered trading copilot platform. Users trade stocks via natural language conversation with an AI agent that can execute market orders, limit orders, and conditional indicator-based orders (RSI, EMA, SMA triggers). The AI runs locally via Gemma 4 on Ollama — zero cloud dependencies.

> [!IMPORTANT]
> **Reference the [strategy report](file:///C:/Users/vivek/.gemini/antigravity/brain/fce4ce0e-a263-4314-84aa-d4d0652ac8f9/novatrade_final_strategy.md) for architecture rationale, traps to avoid, and demo scripting.** This document is the *how* — that document is the *why*.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend Framework | Vite + React 18 |
| Styling | Tailwind CSS v4 |
| Component Library | shadcn/ui |
| Charts | TradingView Embed + Recharts |
| Icons | Lucide React (bundled with shadcn) |
| Animations | Framer Motion |
| HTTP Client | Axios |
| Routing | React Router v6 |
| Backend | FastAPI + Python |
| Database | SQLite + SQLAlchemy |
| AI | Ollama + Gemma 4 (local) |

---

## Project Structure

```
c:\Vivek_projects\III\
├── frontend/                             # Vite + React + Tailwind + shadcn
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js               # Tailwind theme extension
│   ├── components.json                  # shadcn/ui config
│   ├── package.json
│   ├── public/
│   │   └── favicon.svg
│   └── src/
│       ├── main.jsx                     # React entry point
│       ├── App.jsx                      # Router + layout shell
│       ├── index.css                    # Tailwind directives + shadcn theme variables
│       ├── lib/
│       │   └── utils.js                 # cn() helper (clsx + tailwind-merge)
│       ├── api/
│       │   └── client.js                # Axios instance + JWT interceptor
│       ├── context/
│       │   └── AuthContext.jsx          # JWT auth state + login/logout/signup
│       ├── hooks/
│       │   ├── useMarketData.js         # Poll /api/market/prices every 30s
│       │   └── usePortfolio.js          # Fetch + cache portfolio data
│       ├── components/
│       │   ├── ui/                      # shadcn/ui primitives (auto-generated)
│       │   │   ├── button.jsx
│       │   │   ├── card.jsx
│       │   │   ├── input.jsx
│       │   │   ├── badge.jsx
│       │   │   ├── table.jsx
│       │   │   ├── tabs.jsx
│       │   │   ├── select.jsx
│       │   │   ├── dialog.jsx
│       │   │   ├── dropdown-menu.jsx
│       │   │   ├── separator.jsx
│       │   │   ├── scroll-area.jsx
│       │   │   ├── tooltip.jsx
│       │   │   ├── avatar.jsx
│       │   │   └── skeleton.jsx
│       │   ├── layout/
│       │   │   ├── Sidebar.jsx          # Navigation sidebar
│       │   │   └── AppShell.jsx         # Sidebar + main + copilot panel
│       │   ├── common/
│       │   │   ├── StatCard.jsx         # Animated stat display (value, label, change%)
│       │   │   ├── SentimentBadge.jsx   # 🟢🟡🔴 badge using shadcn Badge
│       │   │   ├── RiskGauge.jsx        # SVG animated gauge 0-100
│       │   │   ├── EmptyState.jsx       # "No data yet" placeholder
│       │   │   └── OrderToast.jsx       # Notification toast for order fills (shadcn Sonner)
│       │   ├── copilot/
│       │   │   ├── CopilotPanel.jsx     # Always-visible right panel
│       │   │   └── ChatMessage.jsx      # Single message bubble
│       │   ├── trade/
│       │   │   ├── TradingChart.jsx     # TradingView embed wrapper
│       │   │   ├── OrderPanel.jsx       # Market/Limit/Conditional tabs (shadcn Tabs)
│       │   │   ├── PendingOrders.jsx    # Active limit/conditional orders (shadcn Table)
│       │   │   └── StockSelector.jsx    # Search/dropdown for stock picker
│       │   ├── dashboard/
│       │   │   ├── HoldingsTable.jsx    # Portfolio holdings with P&L (shadcn Table)
│       │   │   ├── PortfolioChart.jsx   # Recharts area chart
│       │   │   └── AllocationPie.jsx    # Recharts pie chart
│       │   └── watchlist/
│       │       └── WatchlistTable.jsx   # Watchlist with sparklines (shadcn Table)
│       └── pages/
│           ├── LoginPage.jsx
│           ├── DashboardPage.jsx
│           ├── TradePage.jsx
│           ├── WatchlistPage.jsx
│           └── HistoryPage.jsx
│
├── backend/                              # FastAPI + Python (unchanged)
│   ├── main.py                           # App entry, CORS, startup events
│   ├── requirements.txt
│   ├── config.py                         # Constants, stock universe, Ollama URL
│   ├── database.py                       # SQLite + SQLAlchemy setup
│   ├── models.py                         # SQLAlchemy ORM models
│   ├── auth.py                           # JWT creation/verification, password hashing
│   ├── routers/
│   │   ├── auth_router.py                # POST /signup, POST /login
│   │   ├── market_router.py              # GET /market/prices, GET /market/{symbol}
│   │   ├── trade_router.py               # POST /trade, GET /portfolio, GET /transactions
│   │   ├── watchlist_router.py           # GET/POST/DELETE /watchlist
│   │   ├── orders_router.py              # GET/POST/DELETE /orders (conditional + limit)
│   │   └── copilot_router.py             # POST /copilot/chat
│   ├── services/
│   │   ├── market_service.py             # yfinance fetch, caching, indicator computation
│   │   ├── trade_service.py              # Execute trades, validate balance/holdings
│   │   ├── copilot_service.py            # Ollama integration, function calling, tools
│   │   ├── condition_monitor.py          # Background task: evaluate pending orders
│   │   └── sentiment_service.py          # Sentiment via Gemma 4 (or FinBERT fallback)
│   ├── tools/                            # AI copilot tool implementations
│   │   ├── __init__.py
│   │   ├── tool_schemas.py               # 7 tool JSON schemas for Ollama
│   │   ├── tool_executor.py              # Routes tool_calls to implementations
│   │   ├── execute_trade.py
│   │   ├── get_stock_info.py
│   │   ├── scan_market.py
│   │   ├── get_sentiment.py
│   │   ├── analyze_portfolio.py
│   │   ├── set_price_alert.py
│   │   └── create_conditional_order.py
│   └── seed.py                           # Demo account seeder
│
└── README.md
```

> [!NOTE]
> **Key structural difference from vanilla CSS version:** No per-component `.css` files. All styling is handled via Tailwind utility classes inline in JSX + shadcn component variants. The only CSS file is `index.css` (Tailwind directives + theme variables).

---

## 1. Design System — Tailwind + shadcn Theme

### 1A. Tailwind Configuration

```js
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Map to shadcn CSS variables
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // NovaTrade-specific semantic colors
        profit: {
          DEFAULT: "hsl(var(--profit))",
          foreground: "hsl(var(--profit-foreground))",
          muted: "hsl(var(--profit-muted))",
        },
        loss: {
          DEFAULT: "hsl(var(--loss))",
          foreground: "hsl(var(--loss-foreground))",
          muted: "hsl(var(--loss-muted))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar))",
          foreground: "hsl(var(--sidebar-foreground))",
          border: "hsl(var(--sidebar-border))",
          accent: "hsl(var(--sidebar-accent))",
        },
        copilot: {
          DEFAULT: "hsl(var(--copilot))",
          foreground: "hsl(var(--copilot-foreground))",
          bubble: "hsl(var(--copilot-bubble))",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],  // 10px
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "slide-in-right": {
          from: { transform: "translateX(100%)", opacity: "0" },
          to: { transform: "translateX(0)", opacity: "1" },
        },
        "fade-up": {
          from: { transform: "translateY(8px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "count-up": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 0 0 hsl(var(--primary) / 0.4)" },
          "50%": { boxShadow: "0 0 12px 4px hsl(var(--primary) / 0.15)" },
        },
        "bounce-dot": {
          "0%, 80%, 100%": { transform: "scale(0)" },
          "40%": { transform: "scale(1)" },
        },
      },
      animation: {
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "fade-up": "fade-up 0.4s ease-out",
        "count-up": "count-up 0.5s ease-out",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "bounce-dot": "bounce-dot 1.4s infinite ease-in-out both",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
```

### 1B. Theme Variables (`index.css`)

```css
/* index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --radius: 0.625rem; /* 10px */
  }

  /* ============================================
     NovaTrade Dark Theme (default and only theme)
     ============================================ */
  .dark {
    /* --- shadcn core variables --- */
    --background: 240 15% 4%;          /* #08080c — app background */
    --foreground: 245 40% 95%;         /* #e8e8f4 — primary text */

    --card: 240 18% 7%;               /* #131320 — card surfaces */
    --card-foreground: 245 40% 95%;

    --popover: 240 18% 7%;
    --popover-foreground: 245 40% 95%;

    --primary: 217 91% 60%;           /* #3b82f6 — electric blue accent */
    --primary-foreground: 0 0% 100%;

    --secondary: 240 20% 14%;         /* #1a1a2e — secondary surfaces */
    --secondary-foreground: 245 40% 95%;

    --muted: 240 18% 16%;             /* #252540 — muted backgrounds */
    --muted-foreground: 240 15% 55%;  /* #7a7aa0 — muted text */

    --accent: 240 20% 14%;
    --accent-foreground: 245 40% 95%;

    --destructive: 0 84% 60%;         /* #ef4444 — red for sells/losses */
    --destructive-foreground: 0 0% 100%;

    --border: 0 0% 100% / 0.06;       /* subtle white border */
    --input: 0 0% 100% / 0.06;
    --ring: 217 91% 60%;              /* focus ring = primary blue */

    /* --- NovaTrade custom tokens --- */
    --profit: 142 71% 45%;            /* #22c55e — green */
    --profit-foreground: 142 69% 58%; /* #4ade80 — lighter green for text */
    --profit-muted: 142 71% 45% / 0.12;

    --loss: 0 84% 60%;                /* #ef4444 — red */
    --loss-foreground: 0 84% 71%;     /* #f87171 — lighter red for text */
    --loss-muted: 0 84% 60% / 0.12;

    --warning: 38 92% 50%;            /* #f59e0b — amber */
    --warning-foreground: 43 96% 56%; /* #fbbf24 */

    --sidebar: 240 18% 5%;            /* #0f0f18 */
    --sidebar-foreground: 240 15% 55%;
    --sidebar-border: 0 0% 100% / 0.06;
    --sidebar-accent: 217 91% 60%;

    --copilot: 240 18% 5%;
    --copilot-foreground: 245 40% 95%;
    --copilot-bubble: 240 18% 10%;

    /* --- Layout dimensions --- */
    --sidebar-width: 220px;
    --sidebar-collapsed-width: 64px;
    --copilot-width: 360px;
  }

  /* Force dark mode — NovaTrade is always dark */
  html {
    @apply dark;
  }
}

@layer base {
  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground font-sans text-sm antialiased overflow-hidden;
    font-feature-settings: "rlig" 1, "calt" 1;
  }

  /* Monospace for financial data */
  .mono {
    @apply font-mono;
    font-feature-settings: "tnum" 1;
  }

  /* Scrollbar styling */
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb {
    @apply rounded-full;
    background: hsl(240 18% 25%);
  }
  ::-webkit-scrollbar-thumb:hover {
    background: hsl(240 15% 35%);
  }
}

/* === UTILITY CLASSES === */
@layer utilities {
  .text-profit { color: hsl(var(--profit-foreground)); }
  .text-loss   { color: hsl(var(--loss-foreground)); }
  .bg-profit-muted { background: hsl(var(--profit-muted)); }
  .bg-loss-muted   { background: hsl(var(--loss-muted)); }

  /* Glow effects for interactive elements */
  .glow-blue  { box-shadow: 0 0 20px hsl(var(--primary) / 0.15); }
  .glow-green { box-shadow: 0 0 16px hsl(var(--profit) / 0.12); }
  .glow-red   { box-shadow: 0 0 16px hsl(var(--loss) / 0.12); }
}
```

### 1C. shadcn/ui Setup Commands

```bash
# Initialize Vite + React project
npx -y create-vite@latest ./ --template react

# Install Tailwind CSS v4
npm install -D tailwindcss @tailwindcss/vite

# Install shadcn/ui dependencies
npm install tailwindcss-animate class-variance-authority clsx tailwind-merge

# Create the cn() utility
# File: src/lib/utils.js
# import { clsx } from "clsx"
# import { twMerge } from "tailwind-merge"
# export function cn(...inputs) { return twMerge(clsx(inputs)) }

# Initialize shadcn
npx shadcn@latest init

# Install required shadcn components
npx shadcn@latest add button card input badge table tabs select dialog dropdown-menu separator scroll-area tooltip avatar skeleton sonner
```

### 1D. cn() Utility

```js
// src/lib/utils.js
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
```

### 1E. UI Consistency Rules

> [!IMPORTANT]
> **Every component MUST follow these rules to maintain visual consistency:**
> 1. **Colors**: Only use Tailwind theme classes (`text-foreground`, `bg-card`, `text-profit`, `text-loss`, etc.). Never write raw hex/HSL in JSX.
> 2. **Spacing**: Only use Tailwind spacing utilities (`p-4`, `gap-3`, `space-y-2`, etc.). Never write pixel values inline.
> 3. **Font sizes**: Only use Tailwind font-size utilities (`text-sm`, `text-lg`, `text-xl`, etc.).
> 4. **Border radius**: Only use Tailwind radius utilities (`rounded-lg`, `rounded-md`, `rounded-sm`).
> 5. **Financial numbers**: Always wrap in `<span className="mono">`. Use `text-profit` / `text-loss` for coloring.
> 6. **Cards**: Always use shadcn `<Card>` component. Extend with `className` prop.
> 7. **Inputs**: Always use shadcn `<Input>` component.
> 8. **Buttons**: Always use shadcn `<Button>` with variant (`default`, `secondary`, `destructive`, `outline`, `ghost`). Create custom buy/sell variants.
> 9. **Tables**: Always use shadcn `<Table>` components (`TableHeader`, `TableBody`, `TableRow`, `TableCell`).
> 10. **Badges**: Use shadcn `<Badge>` for status indicators, sentiment labels, order types.
> 11. **Tabs**: Use shadcn `<Tabs>` for order type switching (Market/Limit/Conditional).
> 12. **Transitions**: Use Tailwind transition utilities (`transition-colors`, `duration-150`, `ease-out`).
> 13. **Conditional classes**: Always use the `cn()` helper for dynamic class merging.

### 1F. Custom Button Variants for Trading

```jsx
// Extend shadcn Button with trading-specific variants
// in src/components/ui/button.jsx — add to buttonVariants:

const buttonVariants = cva(
  "...", // existing base styles
  {
    variants: {
      variant: {
        // ... existing shadcn variants (default, secondary, destructive, outline, ghost)
        buy: "bg-profit text-white hover:bg-profit/90 shadow-sm hover:glow-green",
        sell: "bg-loss text-white hover:bg-loss/90 shadow-sm hover:glow-red",
      },
      // ... existing sizes
    },
  }
);

// Usage:
// <Button variant="buy">Buy AAPL</Button>
// <Button variant="sell">Sell TSLA</Button>
```

### 1G. Typography (Google Fonts)

Add to `index.html` `<head>`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

---

## 2. Backend API Contracts

> [!NOTE]
> Backend is unchanged from the original plan. Reproduced here for completeness.

### Auth

| Method | Endpoint | Request Body | Response | Auth |
|---|---|---|---|---|
| POST | `/api/auth/signup` | `{username, email, password}` | `{token, user: {id, username, email, balance}}` | No |
| POST | `/api/auth/login` | `{email, password}` | `{token, user: {id, username, email, balance}}` | No |
| GET | `/api/auth/me` | — | `{id, username, email, balance}` | JWT |

### Market Data

| Method | Endpoint | Response | Auth |
|---|---|---|---|
| GET | `/api/market/prices` | `{stocks: [{symbol, name, price, change_pct, sector}]}` | JWT |
| GET | `/api/market/{symbol}` | `{symbol, name, price, change_pct, day_high, day_low, volume, market_cap, sector, rsi, sma_50, ema_12, ema_26, history: [{date, open, high, low, close, volume}]}` | JWT |

### Trading

| Method | Endpoint | Request Body | Response | Auth |
|---|---|---|---|---|
| POST | `/api/trade` | `{symbol, action, quantity, order_type?, limit_price?}` | `{success, order_id?, filled_price?, new_balance, message}` | JWT |
| GET | `/api/portfolio` | — | `{cash, total_value, total_pnl, pnl_pct, holdings: [{symbol, name, quantity, avg_price, current_price, value, pnl, pnl_pct}], risk_score, sector_breakdown: [{sector, pct}]}` | JWT |
| GET | `/api/transactions` | `?symbol=&type=&limit=` | `{transactions: [{id, symbol, type, quantity, price, total, timestamp}]}` | JWT |

### Watchlist

| Method | Endpoint | Request Body | Response | Auth |
|---|---|---|---|---|
| GET | `/api/watchlist` | — | `{items: [{symbol, name, price, change_pct, sentiment}]}` | JWT |
| POST | `/api/watchlist` | `{symbol}` | `{success}` | JWT |
| DELETE | `/api/watchlist/{symbol}` | — | `{success}` | JWT |

### Conditional & Limit Orders

| Method | Endpoint | Request Body | Response | Auth |
|---|---|---|---|---|
| GET | `/api/orders` | — | `{orders: [{id, symbol, action, quantity, indicator, condition, value, order_type, status, created_at}]}` | JWT |
| POST | `/api/orders` | `{symbol, action, quantity, indicator, condition, value}` | `{success, order_id, message}` | JWT |
| DELETE | `/api/orders/{id}` | — | `{success}` | JWT |

### AI Copilot

| Method | Endpoint | Request Body | Response | Auth |
|---|---|---|---|---|
| POST | `/api/copilot/chat` | `{message, conversation: [{role, content}]}` | `{response, tool_calls_made: [{tool, args, result}]}` | JWT |

### Debug (hidden, for demo triggering)

| Method | Endpoint | Response | Auth |
|---|---|---|---|
| POST | `/api/debug/trigger-order/{id}` | `{success, filled_price}` | No |

---

## 3. Database Schema

```python
# models.py — SQLAlchemy ORM Models

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    balance = Column(Float, default=1_000_000.0)  # $1M starting cash
    created_at = Column(DateTime, default=datetime.utcnow)

class Holding(Base):
    __tablename__ = "holdings"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    symbol = Column(String, nullable=False)
    quantity = Column(Float, nullable=False)
    avg_buy_price = Column(Float, nullable=False)
    __table_args__ = (UniqueConstraint("user_id", "symbol"),)

class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    symbol = Column(String, nullable=False)
    type = Column(String, nullable=False)      # "BUY" or "SELL"
    quantity = Column(Float, nullable=False)
    price = Column(Float, nullable=False)
    total = Column(Float, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

class Watchlist(Base):
    __tablename__ = "watchlist"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    symbol = Column(String, nullable=False)
    added_at = Column(DateTime, default=datetime.utcnow)
    __table_args__ = (UniqueConstraint("user_id", "symbol"),)

class PendingOrder(Base):
    __tablename__ = "pending_orders"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    symbol = Column(String, nullable=False)
    action = Column(String, nullable=False)       # "buy" or "sell"
    quantity = Column(Float, nullable=False)
    indicator = Column(String, nullable=False)     # "price", "rsi", "sma", "ema_crossover"
    condition = Column(String, nullable=False)     # "above", "below", "crosses_above", "crosses_below"
    value = Column(Float, nullable=False)
    order_type = Column(String, default="conditional") # "conditional" or "limit"
    status = Column(String, default="pending")     # "pending", "filled", "cancelled"
    created_at = Column(DateTime, default=datetime.utcnow)
    filled_at = Column(DateTime, nullable=True)
    filled_price = Column(Float, nullable=True)
```

---

## 4. AI Copilot — Prompting Strategy

### 4A. Ollama Configuration

```python
# config.py
OLLAMA_URL = "http://localhost:11434/api/chat"
OLLAMA_MODEL = "gemma4"
OLLAMA_TEMPERATURE = 0          # Deterministic for tool calling
OLLAMA_NUM_CTX = 8192           # Context window
OLLAMA_TIMEOUT = 15.0           # Kill if too slow
MAX_TOOL_CALLS_PER_TURN = 3    # Prevent infinite loops
CONVERSATION_MEMORY_SIZE = 10   # Keep last N messages
```

### 4B. System Prompt (Carefully Crafted)

Research-backed prompting techniques applied:
- **Role anchoring** with clear personality constraints
- **Structured output instructions** with explicit format examples
- **Chain-of-thought encouragement** ("briefly explain your reasoning")
- **Negative constraints** ("never make up data", "never exceed 150 words")
- **Dynamic context injection** (portfolio state injected per request)

```python
SYSTEM_PROMPT = """You are NovaTrade AI, a professional trading copilot running locally. 
You help users manage their stock portfolio through intelligent analysis and trade execution.

## Your Personality
- Concise and actionable. Maximum 150 words per response.
- Always cite specific numbers: prices, percentages, scores.
- Use bullet points for multi-part answers.
- Append confidence: 🟢 High | 🟡 Medium | 🔴 Low

## Rules (CRITICAL — violating these breaks the system)
1. ALWAYS call a tool to get real data before answering any market question. NEVER make up prices, RSI values, or sentiment.
2. For market orders: confirm with user BEFORE executing. Display: symbol, qty, price, total.
3. For conditional orders: create immediately and explain the trigger. No confirmation needed.
4. For limit orders: explain the price target and when it will execute.
5. You may call MULTIPLE tools in one turn if the user's request requires it.
6. If a question is outside your tools' scope, say so honestly. Do not hallucinate.
7. When presenting indicator data, explain what the values mean in plain English.

## Context (updated each request)
Cash balance: ${balance}
Holdings: {holdings_summary}
Pending orders: {pending_orders}
Active alerts: {alerts}"""
```

### 4C. Tool Schemas (Ollama Format)

```python
# tools/tool_schemas.py

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
                    "limit_price": {"type": "number", "description": "Target price for limit orders. Required when order_type is limit."}
                },
                "required": ["symbol", "action", "quantity"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_stock_info",
            "description": "Get current price, daily change, technical indicators (RSI, SMA, EMA), and key stats for a specific stock. Use this before recommending any trade.",
            "parameters": {
                "type": "object",
                "properties": {
                    "symbol": {"type": "string", "description": "Stock ticker symbol"}
                },
                "required": ["symbol"]
            }
        }
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
                    "condition": {"type": "string", "enum": ["oversold", "overbought", "bullish_sentiment", "bearish_sentiment"], "description": "Technical or sentiment condition filter"}
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_sentiment",
            "description": "Get AI-analyzed news sentiment for a stock. Returns bullish/neutral/bearish with confidence and key headlines.",
            "parameters": {
                "type": "object",
                "properties": {
                    "symbol": {"type": "string", "description": "Stock ticker symbol"}
                },
                "required": ["symbol"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "analyze_portfolio",
            "description": "Analyze the user's complete portfolio: holdings, P&L, risk score, sector diversification, and concentration risk. Use when user asks 'how is my portfolio' or 'what's my risk'.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
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
                    "direction": {"type": "string", "enum": ["above", "below"], "description": "Alert when price goes above or below target"}
                },
                "required": ["symbol", "target_price", "direction"]
            }
        }
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
                    "value": {"type": "number", "description": "Threshold: price in $, RSI 0-100, or SMA/EMA period"}
                },
                "required": ["symbol", "action", "quantity", "indicator", "condition", "value"]
            }
        }
    }
]
```

### 4D. Fallback: Manual Intent Parsing

If Gemma 4's native function calling is flaky, use this prompt to extract structured intent:

```python
INTENT_FALLBACK_PROMPT = """You are a JSON extraction assistant. Given a user message about stock trading, extract the intent as valid JSON.

Available intents and their parameters:
- execute_trade: {symbol, action (buy/sell), quantity, order_type (market/limit), limit_price?}
- get_stock_info: {symbol}
- scan_market: {max_price?, sector?, condition? (oversold/overbought/bullish_sentiment/bearish_sentiment)}
- get_sentiment: {symbol}
- analyze_portfolio: {}
- set_price_alert: {symbol, target_price, direction (above/below)}
- create_conditional_order: {symbol, action, quantity, indicator (price/rsi/ema_crossover/sma), condition (above/below/crosses_above/crosses_below), value}
- unknown: {} (if the message doesn't match any intent)

If the user asks multiple things, return an array of intents.

User message: "{user_message}"

Return ONLY valid JSON, no explanation:
{{"intents": [{{"name": "...", "params": {{...}}}}]}}"""
```

### 4E. Copilot Request Pipeline

```
User message arrives
        │
        ▼
┌─────────────────────┐
│ 1. Inject context   │  Build system prompt with current balance,
│    into system prompt│  holdings, pending orders
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│ 2. Call Ollama with  │  Send messages + tools to /api/chat
│    function calling  │  temperature=0, stream=false
└────────┬────────────┘
         │
    ┌────┴────┐
    │         │
tool_calls?  text response
    │              │
    ▼              ▼
┌──────────┐  ┌──────────────┐
│3. Execute│  │ Return to    │
│   tool   │  │ user as-is   │
│ server-  │  └──────────────┘
│ side     │
└────┬─────┘
     │
     ▼
┌──────────────┐
│4. Feed result│  Append tool result to messages,
│  back to LLM │  call Ollama again
└────┬─────────┘
     │
     ▼
┌──────────────┐
│5. LLM formats│  Model creates human-friendly
│  final answer│  response using tool data
└────┬─────────┘
     │
     ▼
  Return to user

Loop limit: MAX_TOOL_CALLS_PER_TURN = 3
If exceeded: return partial results + "I've gathered some data. Here's what I found so far..."
```

### 4F. Prompting Best Practices Applied

| Technique | Where Applied | Why |
|---|---|---|
| **Temperature = 0** | Ollama config | Deterministic tool selection — model follows schemas precisely |
| **Rich tool descriptions** | Tool schemas | Model selects correct tool based on description matching — descriptive names + detailed descriptions |
| **Few-shot in system prompt** | Not needed | Gemma 4 with tool calling handles this natively; adding examples bloats context |
| **Negative constraints** | System prompt rules 1, 6 | Prevents hallucination — "NEVER make up prices" |
| **Dynamic context injection** | System prompt footer | Model sees current portfolio state — enables personalized responses |
| **Response length limit** | "Maximum 150 words" | Prevents rambling, keeps demo snappy |
| **Structured output format** | Confidence indicators | 🟢🟡🔴 makes responses scannable |
| **Chain-of-thought** | Rule 7 "explain what values mean" | Model explains its reasoning, builds judge trust |
| **Validation layer** | `tool_executor.py` | All tool results pass through Pydantic validation before returning to LLM |
| **Graceful degradation** | Fallback prompt (4D) | If function calling fails, manual intent parsing keeps the copilot working |

---

## 5. Frontend Component Specs

### 5A. AppShell (Layout)

```
┌───────────────────────────────────────────────────────────┐
│ Sidebar │         Main Content Area         │ CopilotPanel│
│ (fixed) │        (scrollable)               │   (fixed)   │
│ 220px   │     calc(100% - 220px - 360px)    │   360px     │
│         │                                   │             │
│ Logo    │  <Outlet /> (react-router)        │  Chat msgs  │
│ Nav     │                                   │  Input bar  │
│ items   │                                   │             │
└───────────────────────────────────────────────────────────┘
```

Implementation with Tailwind:
```jsx
// AppShell.jsx
export function AppShell() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <Sidebar className="w-[var(--sidebar-width)] shrink-0" />
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
      <CopilotPanel className="w-[var(--copilot-width)] shrink-0 border-l border-border" />
    </div>
  );
}
```

- **Sidebar**: Fixed left, `w-[var(--sidebar-width)]`. Logo at top, 5 nav links with Lucide icons (LayoutDashboard, TrendingUp, Eye, History, MessageSquare), active state = left border accent + `bg-accent`.
- **CopilotPanel**: Fixed right, `w-[var(--copilot-width)]`. Always visible on desktop. ScrollArea for messages + sticky input bar.
- **Main**: `flex-1 overflow-y-auto`. Each page renders here via React Router `<Outlet>`.

### 5B. Sidebar

```jsx
// Sidebar.jsx — using cn() + Lucide icons
const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: TrendingUp,      label: "Trade",     path: "/trade" },
  { icon: Eye,             label: "Watchlist",  path: "/watchlist" },
  { icon: History,         label: "History",    path: "/history" },
];

// Each NavLink:
<NavLink
  to={item.path}
  className={({ isActive }) =>
    cn(
      "flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium transition-colors",
      isActive
        ? "bg-primary/10 text-primary border-l-2 border-primary"
        : "text-muted-foreground hover:text-foreground hover:bg-muted"
    )
  }
>
  <item.icon className="h-5 w-5" />
  {item.label}
</NavLink>
```

### 5C. Key Component Patterns with shadcn

#### `StatCard` — Dashboard stat display (uses shadcn `Card`)
```jsx
import { Card, CardContent } from "@/components/ui/card";

// Props: { label, value, change, prefix="$", isMoney=true }
// - value animates from 0 on mount (count-up via requestAnimationFrame)
// - change > 0 → text-profit, change < 0 → text-loss

<Card className="bg-card border-border hover:border-border/50 transition-colors">
  <CardContent className="p-5">
    <p className="text-sm text-muted-foreground">{label}</p>
    <p className="text-2xl font-bold mono mt-1">
      {prefix}{animatedValue.toLocaleString()}
    </p>
    <span className={cn("text-sm mono", change >= 0 ? "text-profit" : "text-loss")}>
      {change >= 0 ? "▲" : "▼"} {Math.abs(change).toFixed(2)}%
    </span>
  </CardContent>
</Card>
```

#### `SentimentBadge` — uses shadcn `Badge`
```jsx
import { Badge } from "@/components/ui/badge";

const variants = {
  bullish: "bg-profit-muted text-profit border-profit/20",
  bearish: "bg-loss-muted text-loss border-loss/20",
  neutral: "bg-warning/10 text-warning border-warning/20",
};

<Badge variant="outline" className={cn("font-medium", variants[sentiment])}>
  {sentiment === "bullish" ? "🟢" : sentiment === "bearish" ? "🔴" : "🟡"} {sentiment}
</Badge>
```

#### `RiskGauge` — SVG animated gauge (custom, not shadcn)
```jsx
// Props: { score } (0-100)
// - SVG arc gauge: 0-33 stroke-profit, 34-66 stroke-warning, 67-100 stroke-loss
// - Animated on mount via CSS transition on stroke-dashoffset
// - Score number in center, label below ("Low Risk" / "Moderate" / "High Risk")
// This is a custom SVG component — no shadcn equivalent
```

#### `TradingChart` — TradingView widget embed
```jsx
// Props: { symbol }
// - Creates TradingView widget with:
//   - theme: "dark"
//   - style: "1" (candlestick)
//   - studies: ["RSI@tv-basicstudies", "MACD@tv-basicstudies"]
//   - interval: "D"
//   - allow_symbol_change: false (we control symbol)
//   - hide_top_toolbar: false
//   - timezone: "Asia/Kolkata"
// - Container: <Card className="overflow-hidden h-[500px]">
// - Re-creates widget when symbol prop changes (cleanup old script)
// - Falls back to Recharts line chart if TradingView fails to load
```

#### `OrderPanel` — Trade page order form (uses shadcn `Tabs`, `Select`, `Input`, `Button`)
```jsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

<Card>
  <CardContent className="p-5">
    <Tabs defaultValue="market">
      <TabsList className="grid w-full grid-cols-3 bg-muted">
        <TabsTrigger value="market">Market</TabsTrigger>
        <TabsTrigger value="limit">Limit</TabsTrigger>
        <TabsTrigger value="conditional">Conditional</TabsTrigger>
      </TabsList>

      <TabsContent value="market" className="space-y-4 mt-4">
        {/* BUY/SELL toggle */}
        <div className="grid grid-cols-2 gap-2">
          <Button variant={action === "buy" ? "buy" : "outline"} onClick={...}>Buy</Button>
          <Button variant={action === "sell" ? "sell" : "outline"} onClick={...}>Sell</Button>
        </div>
        <Input type="number" placeholder="Quantity" className="mono" />
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Total</span>
          <span className="mono">${total.toLocaleString()}</span>
        </div>
        <Button variant={action === "buy" ? "buy" : "sell"} className="w-full">
          Execute {action.toUpperCase()}
        </Button>
      </TabsContent>

      <TabsContent value="conditional" className="space-y-4 mt-4">
        {/* Indicator + Condition dropdowns via shadcn Select */}
        <Select>
          <SelectTrigger><SelectValue placeholder="Indicator" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="price">Price</SelectItem>
            <SelectItem value="rsi">RSI (14)</SelectItem>
            <SelectItem value="sma">50-day SMA</SelectItem>
            <SelectItem value="ema_crossover">EMA Crossover (12/26)</SelectItem>
          </SelectContent>
        </Select>
        <Select>
          <SelectTrigger><SelectValue placeholder="Condition" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="above">Above</SelectItem>
            <SelectItem value="below">Below</SelectItem>
            <SelectItem value="crosses_above">Crosses Above</SelectItem>
            <SelectItem value="crosses_below">Crosses Below</SelectItem>
          </SelectContent>
        </Select>
        <Input type="number" placeholder="Value" className="mono" />
        <Button className="w-full">Create Conditional Order</Button>
      </TabsContent>
    </Tabs>
  </CardContent>
</Card>
```

#### `HoldingsTable` — Dashboard portfolio table (uses shadcn `Table`)
```jsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

<Card>
  <CardContent className="p-0">
    <Table>
      <TableHeader>
        <TableRow className="border-border hover:bg-transparent">
          <TableHead className="text-muted-foreground">Symbol</TableHead>
          <TableHead className="text-right">Qty</TableHead>
          <TableHead className="text-right">Avg Price</TableHead>
          <TableHead className="text-right">Current</TableHead>
          <TableHead className="text-right">P&L</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {holdings.map(h => (
          <TableRow key={h.symbol} className="border-border">
            <TableCell className="font-semibold">{h.symbol}</TableCell>
            <TableCell className="text-right mono">{h.quantity}</TableCell>
            <TableCell className="text-right mono">${h.avg_price.toFixed(2)}</TableCell>
            <TableCell className="text-right mono">${h.current_price.toFixed(2)}</TableCell>
            <TableCell className={cn("text-right mono font-medium", h.pnl >= 0 ? "text-profit" : "text-loss")}>
              {h.pnl >= 0 ? "+" : ""}{h.pnl_pct.toFixed(2)}%
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </CardContent>
</Card>
```

#### `PendingOrders` — Active orders list (uses shadcn `Table` + `Badge`)
```jsx
// Columns: Symbol | Type | Action | Indicator | Condition | Value | Status | Actions
// - Type column: <Badge variant="outline">conditional</Badge> or <Badge variant="outline">limit</Badge>
// - Action column: <Badge className="bg-profit-muted text-profit">BUY</Badge> or loss variant
// - Status: <Badge variant="secondary">pending</Badge> / <Badge className="bg-profit-muted text-profit">filled</Badge>
// - Actions: <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4" /></Button>
```

#### `CopilotPanel` — Always-visible chat
```jsx
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Sparkles } from "lucide-react";

// State: { messages[], inputValue, isLoading }
// Layout:
<div className="flex flex-col h-full bg-copilot">
  {/* Header */}
  <div className="flex items-center gap-2 p-4 border-b border-border">
    <Sparkles className="h-5 w-5 text-primary" />
    <h2 className="font-semibold">AI Copilot</h2>
    <Badge variant="secondary" className="text-2xs">Gemma 4 Local</Badge>
  </div>

  {/* Messages */}
  <ScrollArea className="flex-1 p-4">
    {messages.map(msg => <ChatMessage key={msg.id} {...msg} />)}
    {isLoading && <TypingIndicator />}
  </ScrollArea>

  {/* Suggested prompts (shown when empty) */}
  {messages.length === 0 && (
    <div className="px-4 pb-2 flex flex-wrap gap-2">
      {["How's my portfolio?", "Find oversold stocks", "What should I buy?"].map(p => (
        <Button key={p} variant="outline" size="sm" className="text-xs" onClick={() => send(p)}>
          {p}
        </Button>
      ))}
    </div>
  )}

  {/* Input */}
  <div className="p-4 border-t border-border flex gap-2">
    <Input
      value={inputValue}
      onChange={(e) => setInputValue(e.target.value)}
      placeholder="Ask your AI copilot..."
      className="flex-1"
      onKeyDown={(e) => e.key === "Enter" && send()}
    />
    <Button size="icon" onClick={send} disabled={isLoading}>
      <Send className="h-4 w-4" />
    </Button>
  </div>
</div>
```

#### `ChatMessage` — Single message bubble
```jsx
// Props: { role, content, tools }
<div className={cn(
  "flex mb-3",
  role === "user" ? "justify-end" : "justify-start"
)}>
  <div className={cn(
    "max-w-[85%] rounded-lg px-4 py-2.5 text-sm",
    role === "user"
      ? "bg-primary text-primary-foreground rounded-br-sm"
      : "bg-copilot-bubble text-copilot-foreground rounded-bl-sm"
  )}>
    {content}
    {/* Tool call badges */}
    {tools?.length > 0 && (
      <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-border/50">
        {tools.map(t => (
          <Badge key={t.tool} variant="secondary" className="text-2xs">
            {toolIcons[t.tool]} {t.tool}
          </Badge>
        ))}
      </div>
    )}
  </div>
</div>
```

#### `LoginPage` — Auth page
```jsx
// Centered card with glassmorphism effect
<div className="flex items-center justify-center h-screen bg-background">
  <Card className="w-[400px] bg-card/80 backdrop-blur-xl border-border shadow-2xl">
    <CardHeader className="text-center space-y-1">
      <h1 className="text-2xl font-bold tracking-tight">NovaTrade</h1>
      <p className="text-sm text-muted-foreground">AI-Powered Trading Copilot</p>
    </CardHeader>
    <CardContent className="space-y-4">
      <Input placeholder="Email" type="email" />
      <Input placeholder="Password" type="password" />
      <Button className="w-full" variant="default">Sign In</Button>
      <Separator />
      <Button className="w-full" variant="outline">Create Account</Button>
    </CardContent>
  </Card>
</div>
```

---

## 6. Condition Monitor Spec

```python
# services/condition_monitor.py

# Runs as asyncio background task, started in main.py @app.on_event("startup")
# Interval: 30 seconds (reduced to 5s during demo)
# 
# For each pending order:
#   1. Fetch latest indicator value from MARKET_CACHE
#   2. Compare against order.condition and order.value
#   3. If triggered:
#      a. Execute the trade via trade_service
#      b. Update order status to "filled"  
#      c. Push notification to user (store in notifications table or in-memory)
#   4. For crossover detection (SMA, EMA):
#      - Store previous_value in-memory dict
#      - Detect sign change: prev <= threshold AND current > threshold (or vice versa)
#
# Indicator computations (all use pandas on cached yfinance history):
#   - RSI(14): Wilder's smoothing method  
#   - SMA(N): Simple rolling mean of close prices
#   - EMA(N): Exponential weighted mean of close prices
#   - EMA Crossover: Compare EMA(short_period) vs EMA(26)
```

---

## 7. Stock Universe

```python
# config.py
STOCK_UNIVERSE = {
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
```

---

## 8. Demo Seed Data

```python
# seed.py — Run before demo
def seed():
    user = create_user("demo", "demo@novatrade.ai", "demo123")
    user.balance = 352_168.00

    # Mix of profit and loss positions
    holdings = [
        ("AAPL",  150, 172.50),   # In profit
        ("NVDA",  50,  680.00),   # In profit  
        ("TSLA",  80,  265.00),   # In loss
        ("GOOGL", 60,  165.00),   # In profit
        ("DIS",   200, 118.50),   # In loss
    ]
    
    # Realistic transaction history (last 7 days)
    transactions = [
        ("AAPL",  "BUY",  100, 168.20, 7),
        ("NVDA",  "BUY",  50,  680.00, 5),
        ("AAPL",  "BUY",  50,  180.10, 3),
        ("TSLA",  "BUY",  80,  265.00, 2),
        ("GOOGL", "BUY",  60,  165.00, 2),
        ("DIS",   "BUY",  200, 118.50, 1),
    ]

    # Watchlist
    watchlist = ["MSFT", "AMZN", "JPM", "NFLX"]
    
    # One pending conditional order (close to triggering for demo)
    pending_order = PendingOrder(
        user_id=user.id, symbol="AAPL", action="buy",
        quantity=25, indicator="rsi", condition="below",
        value=35, order_type="conditional", status="pending"
    )
```

---

## 9. Frontend Dependencies

```json
{
  "dependencies": {
    "react": "^18",
    "react-dom": "^18",
    "react-router-dom": "^6",
    "axios": "^1",
    "recharts": "^2",
    "framer-motion": "^11",
    "lucide-react": "^0.400",
    "@radix-ui/react-dialog": "^1",
    "@radix-ui/react-dropdown-menu": "^2",
    "@radix-ui/react-select": "^2",
    "@radix-ui/react-tabs": "^1",
    "@radix-ui/react-tooltip": "^1",
    "@radix-ui/react-scroll-area": "^1",
    "@radix-ui/react-separator": "^1",
    "@radix-ui/react-avatar": "^1",
    "@radix-ui/react-slot": "^1",
    "class-variance-authority": "^0.7",
    "clsx": "^2",
    "tailwind-merge": "^2",
    "sonner": "^1"
  },
  "devDependencies": {
    "tailwindcss": "^4",
    "@tailwindcss/vite": "^4",
    "tailwindcss-animate": "^1"
  }
}
```

- **@radix-ui/react-***: Headless UI primitives that power shadcn components (accessible, unstyled)
- **class-variance-authority**: Component variant system (buttonVariants, badgeVariants, etc.)
- **clsx + tailwind-merge**: The `cn()` helper for conditional class merging without conflicts
- **sonner**: Toast notifications (shadcn's recommended toast library)
- **tailwindcss-animate**: Animation utilities for Tailwind (used by shadcn components)
- **react-router-dom**: Client-side routing (5 pages)
- **axios**: HTTP client with JWT interceptor
- **recharts**: Portfolio area chart, allocation pie chart, sparklines
- **framer-motion**: Page transitions, stat card count-up, risk gauge animation
- **lucide-react**: Icons (consistent icon set, bundled with shadcn)

---

## 10. Backend Dependencies

```
# requirements.txt
fastapi==0.115.*
uvicorn[standard]==0.30.*
sqlalchemy==2.0.*
yfinance==0.2.*
python-jose[cryptography]==3.3.*
passlib[bcrypt]==1.7.*
httpx==0.27.*
pandas==2.2.*
pydantic==2.7.*
```

---

## 11. shadcn Component → NovaTrade Usage Map

| shadcn Component | Where Used | Customization |
|---|---|---|
| `Button` | Order execution, nav, copilot send | Custom `buy`/`sell` variants added |
| `Card` | StatCard, OrderPanel, HoldingsTable, Chart container, Login | Default dark theme, hover border effect |
| `Input` | Order quantity, limit price, copilot chat input, login fields | Mono font for number inputs |
| `Badge` | Sentiment labels, order types, tool call indicators, status | Custom profit/loss/warning color variants |
| `Table` | Holdings, transactions, watchlist, pending orders | Mono font for price columns, profit/loss coloring |
| `Tabs` | Order type switcher (Market/Limit/Conditional) | 3-column grid layout |
| `Select` | Stock picker, indicator dropdown, condition dropdown | Dark theme popover |
| `ScrollArea` | Copilot message list, main content area | Custom thin scrollbar |
| `Dialog` | Trade confirmation modal, order details | Glassmorphism backdrop |
| `DropdownMenu` | User menu (logout), row actions | Standard dark theme |
| `Separator` | Between form sections, login page | Default border color |
| `Tooltip` | Stat labels, icon-only buttons | Dark background variant |
| `Avatar` | User avatar in sidebar, chat messages | Initials fallback |
| `Skeleton` | Loading states for prices, portfolio, chart | Pulse animation |
| `Sonner (Toast)` | Order fill notifications, trade confirmations, errors | Custom profit/loss styling |

---

## Proposed Changes Summary

### [NEW] Frontend (`c:\Vivek_projects\III\frontend\`)
- Vite + React app with 5 pages, 15+ components
- **Tailwind CSS v4** for all styling — no per-component CSS files
- **shadcn/ui** component library — 14 primitives for consistent UI
- Custom `buy`/`sell` button variants and `profit`/`loss`/`warning` color tokens
- TradingView embed for charts, Recharts for dashboard
- Copilot chat panel always visible

### [NEW] Backend (`c:\Vivek_projects\III\backend\`)
- FastAPI with 14 API endpoints across 6 routers
- SQLite database with 5 tables
- Ollama/Gemma 4 integration with 7 function-calling tools
- Condition Monitor background task for indicator-based orders
- Market data caching with yfinance

---

## Verification Plan

### Automated Tests
1. Start backend: `cd backend && uvicorn main:app --reload`
2. Start frontend: `cd frontend && npm run dev`
3. Verify Ollama: `curl http://localhost:11434/api/tags` (should list gemma4)
4. Test auth flow: signup → login → protected routes work
5. Test trade flow: buy 10 AAPL → portfolio updates → transaction appears
6. Test copilot: "What should I buy?" → model calls scan_market → returns formatted response
7. Test conditional order: "Buy AAPL when RSI drops below 30" → order appears in pending → trigger via debug endpoint → order fills

### Browser Testing
- Open all 5 pages, verify no console errors
- Verify shadcn components render with correct dark theme
- Verify TradingView chart loads with RSI + MACD indicators
- Verify copilot responds within 15 seconds
- Verify stat cards animate on dashboard load
- Verify limit/conditional order creation and status display
- Verify toast notifications appear on order fills
