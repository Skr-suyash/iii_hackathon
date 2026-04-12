"""NovaTrade — Portfolio optimization service using PyPortfolioOpt.

Provides Efficient Frontier optimization (Max Sharpe, Min Volatility,
Target Return), discrete share allocation, and rebalance trade computation.
"""

import logging
import numpy as np
import pandas as pd
import yfinance as yf
from pypfopt.expected_returns import mean_historical_return
from pypfopt.risk_models import CovarianceShrinkage
from pypfopt.efficient_frontier import EfficientFrontier
from pypfopt.hierarchical_portfolio import HRPOpt
from pypfopt import expected_returns
from pypfopt.discrete_allocation import DiscreteAllocation, get_latest_prices
from pypfopt import objective_functions

from config import STOCK_UNIVERSE

logger = logging.getLogger("novatrade.optimize")


# ---------------------------------------------------------------------------
# Price data helper
# ---------------------------------------------------------------------------
def _fetch_price_dataframe(tickers: list[str], period: str = "1y") -> pd.DataFrame:
    """Fetch adjusted close prices for multiple tickers into a DataFrame."""
    data = yf.download(tickers, period=period, auto_adjust=True, progress=False)
    if isinstance(data.columns, pd.MultiIndex):
        prices = data["Close"]
    else:
        # Single ticker — reshape
        prices = data[["Close"]]
        prices.columns = tickers

    # Drop columns with too many NaNs, forward-fill remainder
    prices = prices.dropna(axis=1, thresh=int(len(prices) * 0.8))
    prices = prices.ffill().dropna()
    return prices


# ---------------------------------------------------------------------------
# Core optimization
# ---------------------------------------------------------------------------
def optimize_portfolio(
    tickers: list[str],
    objective: str = "max_sharpe",
    target_return: float | None = None,
    total_value: float | None = None,
    current_holdings: dict | None = None,
    current_prices: dict | None = None,
    risk_free_rate: float = 0.02,
    period: str = "1y",
) -> dict:
    """Run MPT optimization and return weights, performance, and rebalance trades.

    Parameters
    ----------
    tickers : list[str]
        Ticker symbols to include in optimization.
    objective : str
        "max_sharpe", "min_volatility", "efficient_return", or "hrp".
    target_return : float, optional
        Required when objective is "efficient_return" (e.g. 0.20 for 20%).
    total_value : float, optional
        Total portfolio value for discrete allocation.
    current_holdings : dict, optional
        {symbol: quantity} for computing rebalance trades.
    current_prices : dict, optional
        {symbol: current_price} for rebalance cost estimates.
    risk_free_rate : float
        Annualized risk-free rate (default 2%).
    period : str
        yfinance lookback period.

    Returns
    -------
    dict with weights, performance, discrete_allocation, rebalance_trades,
    and current_vs_optimal comparison.
    """
    if len(tickers) < 2:
        return {"error": "Need at least 2 tickers for optimization"}

    # 1. Fetch historical prices
    prices_df = _fetch_price_dataframe(tickers, period)
    valid_tickers = list(prices_df.columns)

    if len(valid_tickers) < 2:
        return {"error": "Not enough valid price data — need at least 2 tickers with history"}

    # 2. Expected returns + covariance
    mu = mean_historical_return(prices_df)
    S = CovarianceShrinkage(prices_df).ledoit_wolf()

    try:
        if objective == "hrp":
            rets = expected_returns.returns_from_prices(prices_df)
            hrp = HRPOpt(rets)
            hrp.optimize()
            weights = hrp.clean_weights()
            perf = hrp.portfolio_performance(risk_free_rate=risk_free_rate)
        else:
            ef = EfficientFrontier(mu, S, weight_bounds=(0, 1))
            ef.add_objective(objective_functions.L2_reg, gamma=0.1)  # Encourage diversification
            if objective == "min_volatility":
                ef.min_volatility()
            elif objective == "efficient_return" and target_return is not None:
                ef.efficient_return(target_return=target_return)
            else:
                # Default: max Sharpe
                ef.max_sharpe(risk_free_rate=risk_free_rate)
            weights = ef.clean_weights()
            perf = ef.portfolio_performance(verbose=False, risk_free_rate=risk_free_rate)
    except Exception as e:
        logger.warning("Optimization failed for objective=%s: %s", objective, e)
        return {"error": f"Optimization failed: {str(e)}"}

    result: dict = {
        "weights": {k: round(v, 4) for k, v in weights.items()},
        "performance": {
            "expected_annual_return": round(float(perf[0]), 4),
            "annual_volatility": round(float(perf[1]), 4),
            "sharpe_ratio": round(float(perf[2]), 4),
        },
    }

    # 5. Discrete allocation
    if total_value and total_value > 0:
        try:
            latest_prices = get_latest_prices(prices_df)
            da = DiscreteAllocation(weights, latest_prices, total_portfolio_value=total_value)
            allocation, leftover = da.lp_portfolio()
            result["discrete_allocation"] = {k: int(v) for k, v in allocation.items()}
            result["leftover_cash"] = round(float(leftover), 2)
        except Exception as e:
            logger.warning("Discrete allocation failed: %s", e)
            result["discrete_allocation"] = {}
            result["leftover_cash"] = 0

    # 6. Rebalance trades
    if current_holdings and current_prices and total_value:
        result["rebalance_trades"] = _compute_rebalance_trades(
            weights, current_holdings, current_prices, total_value
        )

    # 7. Current vs optimal comparison
    if current_holdings and current_prices:
        result["current_vs_optimal"] = _build_comparison(
            weights, current_holdings, current_prices
        )

    return result


# ---------------------------------------------------------------------------
# Efficient frontier curve
# ---------------------------------------------------------------------------
def generate_efficient_frontier(
    tickers: list[str],
    n_points: int = 50,
    period: str = "1y",
    risk_free_rate: float = 0.02,
) -> dict:
    """Generate the efficient frontier curve and key portfolio points.

    Returns frontier curve points, individual asset risk/return,
    and the max-Sharpe and min-volatility portfolio positions.
    """
    if len(tickers) < 2:
        return {"error": "Need at least 2 tickers"}

    prices_df = _fetch_price_dataframe(tickers, period)
    valid_tickers = list(prices_df.columns)

    if len(valid_tickers) < 2:
        return {"error": "Not enough valid price data"}

    mu = mean_historical_return(prices_df)
    S = CovarianceShrinkage(prices_df).ledoit_wolf()

    # Individual asset positions
    individuals = []
    for ticker in valid_tickers:
        ret = float(mu[ticker])
        vol = float(np.sqrt(S.loc[ticker, ticker]))
        individuals.append({
            "ticker": ticker,
            "return": round(ret, 4),
            "volatility": round(vol, 4),
        })

    # Frontier curve: sweep target returns
    min_ret = float(mu.min())
    max_ret = float(mu.max())
    frontier: list[dict] = []

    for target in np.linspace(min_ret, max_ret, n_points):
        try:
            ef = EfficientFrontier(mu, S, weight_bounds=(0, 1))
            ef.efficient_return(target_return=float(target))
            p = ef.portfolio_performance(verbose=False, risk_free_rate=risk_free_rate)
            frontier.append({
                "return": round(float(p[0]), 4),
                "volatility": round(float(p[1]), 4),
            })
        except Exception:
            continue

    # Max Sharpe point
    try:
        ef_sharpe = EfficientFrontier(mu, S, weight_bounds=(0, 1))
        ef_sharpe.max_sharpe(risk_free_rate=risk_free_rate)
        sp = ef_sharpe.portfolio_performance(verbose=False, risk_free_rate=risk_free_rate)
        max_sharpe_point = {"return": round(float(sp[0]), 4), "volatility": round(float(sp[1]), 4)}
    except Exception:
        max_sharpe_point = None

    # Min volatility point
    try:
        ef_min = EfficientFrontier(mu, S, weight_bounds=(0, 1))
        ef_min.min_volatility()
        mp = ef_min.portfolio_performance(verbose=False, risk_free_rate=risk_free_rate)
        min_vol_point = {"return": round(float(mp[0]), 4), "volatility": round(float(mp[1]), 4)}
    except Exception:
        min_vol_point = None

    return {
        "frontier": frontier,
        "individual_assets": individuals,
        "max_sharpe_point": max_sharpe_point,
        "min_vol_point": min_vol_point,
    }


# ---------------------------------------------------------------------------
# Rebalance helpers
# ---------------------------------------------------------------------------
def _compute_rebalance_trades(
    optimal_weights: dict,
    current_holdings: dict,
    current_prices: dict,
    total_value: float,
) -> list[dict]:
    """Calculate the buy/sell trades needed to move from current to optimal."""
    trades: list[dict] = []
    all_symbols = set(list(optimal_weights.keys()) + list(current_holdings.keys()))

    for symbol in all_symbols:
        target_weight = optimal_weights.get(symbol, 0)
        price = current_prices.get(symbol, 0)
        if price <= 0:
            continue

        current_qty = current_holdings.get(symbol, 0)
        target_value = total_value * target_weight
        target_qty = int(target_value / price)
        delta = target_qty - current_qty

        if delta == 0:
            continue

        trades.append({
            "symbol": symbol,
            "action": "buy" if delta > 0 else "sell",
            "quantity": abs(delta),
            "estimated_cost" if delta > 0 else "estimated_proceeds": round(abs(delta) * price, 2),
        })

    # Sort: sells first (to free up cash), then buys
    trades.sort(key=lambda t: (0 if t["action"] == "sell" else 1, t["symbol"]))
    return trades


def _build_comparison(
    optimal_weights: dict,
    current_holdings: dict,
    current_prices: dict,
) -> dict:
    """Build current vs optimal weight comparison for every ticker."""
    total_value = sum(
        current_holdings.get(s, 0) * current_prices.get(s, 0)
        for s in set(list(optimal_weights.keys()) + list(current_holdings.keys()))
    )
    if total_value == 0:
        return {}

    comparison: dict = {}
    all_symbols = set(list(optimal_weights.keys()) + list(current_holdings.keys()))

    for symbol in all_symbols:
        current_val = current_holdings.get(symbol, 0) * current_prices.get(symbol, 0)
        current_pct = round(current_val / total_value, 4) if total_value > 0 else 0
        optimal_pct = round(optimal_weights.get(symbol, 0), 4)
        comparison[symbol] = {
            "current_pct": current_pct,
            "optimal_pct": optimal_pct,
            "delta_pct": round(optimal_pct - current_pct, 4),
        }

    return comparison
