1. every window except the trading graph should be togglable (open and close)
2. shift everything made in the dashboard page to the trade page. 
3. craete a new holdings and dashboard page. (The first image uploaded is the holdings page).
the dasboard page should only have information about the user's holdings and portfolio and trade profits, pie charts and everything related to personal portfolio.

4. the side navigation panel icons are not alighned properly please align them
5. The top navigation buttons like 1D, 5D, 1M, 6M, 1Y, 5Y, MAX should be aligned properly and should be functional which it
6. The fullscreen button should work

-------------------------------
# DASHBOARD DESIGN PLAN"

Based on the baseline from your screenshot, here is the finalized, high-impact list of parameters to include in your dashboard, organized by "Dashboard Tiers."

### Tier 1: Core Performance (The "Must-Haves")
These are the standard stats shown in your image, plus two essential additions.
* *Total Returns:* Cumulative gain/loss (%).
* *Sharpe Ratio:* Risk-adjusted return. (Rule of thumb: >2.0 is good, >3.0 is excellent).
* *Max Drawdown (MDD):* The largest "peak-to-valley" drop. Shows the worst possible timing for an investor.
* *Volatility ($\sigma$):* Standard deviation of daily returns. 
* *Turnover:* How often you swap positions. (High turnover = high transaction costs).
* *Return on Investment (ROI):* (Current Value - Initial Investment) / Initial Investment * 100

### Tier 3: Strategy Diagnostics (The "Hackathon Edge")
These parameters explain why the portfolio is performing the way it is.
* *Win Rate:* Percentage of trades that were profitable.
* *Profit Factor:* Gross Profits / Gross Losses. (Anything >1.5 is very strong).

---

### Suggested Dashboard Layout
To make your project visually impressive for the judges, structure the UI like this:

| Section | Visual Element | Parameters |
| :--- | :--- | :--- |
| *Header Cards* | Large Numeric "Gauges" | *Returns, Sharpe, Max Drawdown, Fitness* |
| *Main Chart* | Equity Curve Line Chart | Cumulative Returns vs. Benchmark |
| *Risk Panel* | Risk Radar or Bar Chart | *VaR, Beta, Sortino, Margin* |
| *Trade Stats* | Small Table/Icons | *Win Rate, Profit Factor, Turnover* |

------------------------------------

# HOLDINGS PAGE 

1. contains just the stocks that i hold in the format which is attached in the second image