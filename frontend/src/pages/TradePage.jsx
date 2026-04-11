import { useState, useCallback } from "react";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useStockDetail } from "@/hooks/useMarketData";
import TopToolbar from "@/components/layout/TopToolbar";
import RightPanel from "@/components/layout/RightPanel";
import TradingChart from "@/components/trade/TradingChart";
import HoldingsTable from "@/components/dashboard/HoldingsTable";
import OrderPanel from "@/components/trade/OrderPanel";
import PendingOrders from "@/components/trade/PendingOrders";
import AllocationPie from "@/components/dashboard/AllocationPie";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export default function TradePage() {
  const [symbol, setSymbol] = useState("AAPL");
  const [timeframe, setTimeframe] = useState("1D");
  const [activeIndicators, setActiveIndicators] = useState(["MACD@tv-basicstudies"]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [bottomPanelOpen, setBottomPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const { portfolio, loading } = usePortfolio();
  const { data: stockData } = useStockDetail(symbol);

  const handleOrderPlaced = useCallback(() => {
    setRefreshTrigger((t) => t + 1);
  }, []);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top toolbar */}
      <TopToolbar
        symbol={symbol}
        onSymbolChange={setSymbol}
        bottomPanelOpen={bottomPanelOpen}
        onToggleBottomPanel={() => setBottomPanelOpen((v) => !v)}
        rightPanelOpen={rightPanelOpen}
        onToggleRightPanel={() => setRightPanelOpen((v) => !v)}
        activeTimeframe={timeframe}
        onTimeframeChange={setTimeframe}
        activeIndicators={activeIndicators}
        onToggleIndicator={(ind) => setActiveIndicators((prev) => 
          prev.includes(ind) ? prev.filter((i) => i !== ind) : [...prev, ind]
        )}
      />

      {/* Main content area */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Center: Chart + Bottom panels */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chart area */}
          <div className="flex-1 min-h-0 relative">
            <TradingChart symbol={symbol} timeframe={timeframe} activeIndicators={activeIndicators} />
          </div>

          {/* Bottom panel (togglable) */}
          {bottomPanelOpen && (
            <div className="h-[260px] shrink-0 border-t border-border bg-sidebar overflow-hidden">
              <Tabs defaultValue="portfolio" className="h-full flex flex-col">
                <div className="flex items-center border-b border-border px-2">
                  <TabsList className="bg-transparent h-8 gap-0 p-0">
                    <TabsTrigger
                      value="portfolio"
                      className="text-xs px-3 py-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary"
                    >
                      Portfolio
                    </TabsTrigger>
                    <TabsTrigger
                      value="orders"
                      className="text-xs px-3 py-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary"
                    >
                      Orders
                    </TabsTrigger>
                    <TabsTrigger
                      value="order-entry"
                      className="text-xs px-3 py-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary"
                    >
                      Order Entry
                    </TabsTrigger>
                    <TabsTrigger
                      value="allocation"
                      className="text-xs px-3 py-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary"
                    >
                      Allocation
                    </TabsTrigger>
                  </TabsList>

                  {/* Stat summary */}
                  {!loading && portfolio && (
                    <div className="ml-auto flex items-center gap-4 text-xs pr-2">
                      <div>
                        <span className="text-muted-foreground mr-1">Value:</span>
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
                      <div>
                        <span className="text-muted-foreground mr-1">Cash:</span>
                        <span className="mono font-semibold text-foreground">
                          ${portfolio.cash?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <TabsContent value="portfolio" className="flex-1 overflow-auto m-0">
                  <HoldingsTable holdings={portfolio?.holdings || []} />
                </TabsContent>

                <TabsContent value="orders" className="flex-1 overflow-auto m-0">
                  <PendingOrders refreshTrigger={refreshTrigger} />
                </TabsContent>

                <TabsContent value="order-entry" className="flex-1 overflow-auto m-0 p-3">
                  <div className="max-w-md">
                    <OrderPanel
                      symbol={symbol}
                      currentPrice={stockData?.price}
                      onOrderPlaced={handleOrderPlaced}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="allocation" className="flex-1 overflow-auto m-0 p-3">
                  <AllocationPie sectors={portfolio?.sector_breakdown || []} />
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>

        {/* Right panel (togglable) */}
        {rightPanelOpen && (
          <RightPanel
            symbol={symbol}
            stockData={stockData}
            onSelectSymbol={setSymbol}
          />
        )}
      </div>
    </div>
  );
}
