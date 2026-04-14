# 🌌 NovaTrade
**The AI-Powered Open-Source Trading Copilot**

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![Python](https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54)
![Ollama](https://img.shields.io/badge/ollama-000000?style=for-the-badge&logo=ollama&logoColor=white)

> Chat with your portfolio. Execute complex trades with natural language. Entirely local and private.

---

## ✨ Features

- **🤖 Local AI Copilot:** Powered by **Gemma 4** via **Ollama**, completely offline and secure. Talk to the AI to execute market orders, analyze the market, or get personalized portfolio feedback.
- **⚡ Conditional & Algorithmic Trading:** Go beyond market/limit orders. Tell the system to *"buy AAPL when RSI drops below 30"* or *"sell when the price crosses the 50-day SMA"*—the background condition monitor handles the rest.
- **📈 Advanced Analytics:** Real-time P&L tracking, automated sector diversification charting, active risk scoring, and interactive stock chart embeds via TradingView.
- **🚀 Blazing Fast:** Built with modern React optimizations (Stale-While-Revalidate caching, Route-based Code Splitting) ensuring 0ms page loads after the initial visit.
- **📊 Interactive Market Scanners:** Auto-fetching of the latest stock technicals with built-in computations for RSI, SMA, and EDA. AI-powered market sentiment analysis keeps you ahead of the curve.

---

## 🏗️ Technology Stack

| Component | Technology | 
| --------- | ---------- |
| **Frontend UI** | React 18, Vite, Tailwind CSS v4, shadcn/ui, Recharts |
| **Backend API** | FastAPI, Python 3, SQLAlchemy, SQLite |
| **Local AI Engine** | Ollama (Local LLM Server), Gemma 4 🧠 |
| **Authentication**| JWT (JSON Web Tokens) with local session caching |

---

## 🚦 Getting Started

### 1. Requirements

- Node.js & npm
- Python 3.9+
- [Ollama](https://ollama.com/) (Must be running locally with the `gemma4` model installed)

### 2. Booting the Backend (API + AI Setup)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Start the FastAPI server
uvicorn main:app --reload
```

### 3. Booting the Frontend 

```bash
cd frontend
npm install
npm run dev
```

The app will be accessible at `http://localhost:5173`. 

---

## 🛠️ Project Structure

- `/frontend` - Vite/React web client. Implements all visual dashboards, SWR caching, and websocket listeners.
- `/backend` - FastAPI server. Handles database operations, JWT authentication, user transactions, condition monitoring, and AI Tool Executor abstractions. 

---
