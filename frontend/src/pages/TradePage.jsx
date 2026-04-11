import { useState, useCallback } from "react";
import { useStockDetail } from "@/hooks/useMarketData";
import StockSelector from "@/components/trade/StockSelector";
import TradingChart from "@/components/trade/TradingChart";
import OrderPanel from "@/components/trade/OrderPanel";
import PendingOrders from "@/components/trade/PendingOrders";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function TradePage() {
  const [symbol, setSymbol] = useState("AAPL");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { data: stockData, loading } = useStockDetail(symbol);

  const handleOrderPlaced = useCallback(() => {
    setRefreshTrigger((t) => t + 1);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Trade</h1>
      </div>

      {/* Stock selector */}
      <div className="max-w-md">
        <StockSelector value={symbol} onChange={setSymbol} />
      </div>

      {/* Stock info bar */}
      {stockData && (
        <Card>
          <CardContent className="p-4 flex items-center gap-6 flex-wrap">
            <div>
              <span className="text-lg font-bold">{stockData.symbol}</span>
              <span className="text-sm text-muted-foreground ml-2">{stockData.name}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-2xl font-bold mono">${stockData.price?.toFixed(2)}</span>
              <span className={cn("text-sm mono font-medium", stockData.change_pct >= 0 ? "text-profit" : "text-loss")}>
                {stockData.change_pct >= 0 ? "▲" : "▼"} {Math.abs(stockData.change_pct)?.toFixed(2)}%
              </span>
            </div>
            <div className="flex gap-3 text-xs text-muted-foreground ml-auto">
              {stockData.rsi && (
                <span>RSI: <span className="mono text-foreground">{stockData.rsi?.toFixed(1)}</span></span>
              )}
              {stockData.sma_50 && (
                <span>SMA50: <span className="mono text-foreground">${stockData.sma_50?.toFixed(2)}</span></span>
              )}
              <span>Vol: <span className="mono text-foreground">{(stockData.volume / 1e6)?.toFixed(1)}M</span></span>
              <Badge variant="secondary" className="text-xs">{stockData.sector}</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chart + order panel */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <TradingChart symbol={symbol} />
        </div>
        <div>
          <OrderPanel
            symbol={symbol}
            currentPrice={stockData?.price}
            onOrderPlaced={handleOrderPlaced}
          />
        </div>
      </div>

      {/* Pending orders */}
      <PendingOrders refreshTrigger={refreshTrigger} />
    </div>
  );
}
