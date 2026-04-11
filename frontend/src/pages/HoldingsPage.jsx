import { usePortfolio } from "@/hooks/usePortfolio";
import { cn } from "@/lib/utils";
import { Briefcase, TrendingUp, TrendingDown } from "lucide-react";

function HoldingCard({ holding }) {
  const isPositive = (holding.pnl_pct || 0) >= 0;
  const initials = (holding.symbol || "??").slice(0, 2).toUpperCase();

  // Generate a deterministic color from the symbol
  const hue = [...holding.symbol].reduce((sum, c) => sum + c.charCodeAt(0), 0) % 360;

  return (
    <div className="flex items-center gap-3 px-4 py-3.5 bg-card border border-border rounded-sm hover:border-primary/30 transition-colors">
      {/* Symbol icon */}
      <div
        className="flex items-center justify-center w-10 h-10 rounded-md shrink-0 text-sm font-bold"
        style={{
          backgroundColor: `hsl(${hue}, 50%, 20%)`,
          color: `hsl(${hue}, 70%, 70%)`,
        }}
      >
        {initials}
      </div>

      {/* Name and ticker */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">
          {holding.name || holding.symbol}
        </p>
        <p className="text-xs text-muted-foreground">{holding.symbol}</p>
      </div>

      {/* Price and change */}
      <div className="text-right shrink-0">
        <p className="text-sm font-semibold mono text-foreground">
          ${holding.current_price?.toFixed(2) || "0.00"}
        </p>
        <div className={cn("flex items-center justify-end gap-0.5 text-xs mono font-medium", isPositive ? "text-profit" : "text-loss")}>
          {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {isPositive ? "+" : ""}{(holding.pnl_pct || 0).toFixed(2)}%
        </div>
      </div>
    </div>
  );
}

export default function HoldingsPage() {
  const { portfolio, loading } = usePortfolio();
  const holdings = portfolio?.holdings || [];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center h-10 px-4 border-b border-border bg-sidebar shrink-0">
        <Briefcase className="h-4 w-4 text-muted-foreground mr-2" />
        <span className="text-sm font-semibold">Holdings</span>
        {!loading && (
          <span className="ml-2 text-xs text-muted-foreground">
            ({holdings.length} {holdings.length === 1 ? "stock" : "stocks"})
          </span>
        )}
        {!loading && portfolio && (
          <div className="ml-auto flex items-center gap-4 text-xs">
            <div>
              <span className="text-muted-foreground mr-1">Total Value:</span>
              <span className="mono font-semibold text-foreground">
                ${portfolio.total_value?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground mr-1">P&L:</span>
              <span className={cn("mono font-semibold", (portfolio.pnl_pct ?? 0) >= 0 ? "text-profit" : "text-loss")}>
                {(portfolio.pnl_pct ?? 0) >= 0 ? "+" : ""}{portfolio.pnl_pct?.toFixed(2)}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Holdings list */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-sm text-muted-foreground">Loading holdings...</div>
          </div>
        ) : holdings.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Briefcase className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">No holdings yet</p>
            <p className="text-xs text-muted-foreground">Execute a trade to see your stocks here</p>
          </div>
        ) : (
          <div className="space-y-2 max-w-2xl mx-auto">
            {/* Summary bar */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-card border border-border rounded-sm p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Invested</p>
                <p className="text-sm font-bold mono text-foreground">
                  ${((portfolio.total_value || 0) - (portfolio.total_pnl || 0)).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-card border border-border rounded-sm p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Current Value</p>
                <p className="text-sm font-bold mono text-foreground">
                  ${portfolio.total_value?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-card border border-border rounded-sm p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Total P&L</p>
                <p className={cn("text-sm font-bold mono", (portfolio.total_pnl || 0) >= 0 ? "text-profit" : "text-loss")}>
                  {(portfolio.total_pnl || 0) >= 0 ? "+" : ""}${portfolio.total_pnl?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {/* Holding cards */}
            {holdings.map((h) => (
              <HoldingCard key={h.symbol} holding={h} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
