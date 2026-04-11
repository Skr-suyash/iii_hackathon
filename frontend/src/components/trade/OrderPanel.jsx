import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import client from "@/api/client";

export default function OrderPanel({ symbol, currentPrice, onOrderPlaced }) {
  const [action, setAction] = useState("buy");
  const [quantity, setQuantity] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const [indicator, setIndicator] = useState("");
  const [condition, setCondition] = useState("");
  const [condValue, setCondValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const qty = parseInt(quantity) || 0;
  const total = qty * (currentPrice || 0);

  async function submitMarketOrder() {
    if (!symbol || qty <= 0) return;
    setLoading(true);
    setMessage(null);
    try {
      const { data } = await client.post("/trade", { symbol, action, quantity: qty });
      setMessage({ type: data.success ? "success" : "error", text: data.message });
      if (data.success) {
        setQuantity("");
        onOrderPlaced?.();
      }
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.detail || "Order failed" });
    } finally {
      setLoading(false);
    }
  }

  async function submitLimitOrder() {
    if (!symbol || qty <= 0 || !limitPrice) return;
    setLoading(true);
    setMessage(null);
    try {
      const { data } = await client.post("/trade", {
        symbol, action, quantity: qty, order_type: "limit", limit_price: parseFloat(limitPrice),
      });
      setMessage({ type: data.success ? "success" : "error", text: data.message });
      if (data.success) {
        setQuantity("");
        setLimitPrice("");
        onOrderPlaced?.();
      }
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.detail || "Order failed" });
    } finally {
      setLoading(false);
    }
  }

  async function submitConditionalOrder() {
    if (!symbol || qty <= 0 || !indicator || !condition || !condValue) return;
    setLoading(true);
    setMessage(null);
    try {
      const { data } = await client.post("/orders", {
        symbol, action, quantity: qty, indicator, condition, value: parseFloat(condValue),
      });
      setMessage({ type: data.success ? "success" : "error", text: data.message });
      if (data.success) {
        setQuantity("");
        setCondValue("");
        onOrderPlaced?.();
      }
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.detail || "Order failed" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-5">
        <Tabs defaultValue="market">
          <TabsList className="grid w-full grid-cols-3 bg-muted">
            <TabsTrigger value="market">Market</TabsTrigger>
            <TabsTrigger value="limit">Limit</TabsTrigger>
            <TabsTrigger value="conditional">Conditional</TabsTrigger>
          </TabsList>

          {/* BUY/SELL toggle — shared across tabs */}
          <div className="grid grid-cols-2 gap-2 mt-4">
            <Button
              variant={action === "buy" ? "buy" : "outline"}
              onClick={() => setAction("buy")}
              className="w-full"
            >
              Buy
            </Button>
            <Button
              variant={action === "sell" ? "sell" : "outline"}
              onClick={() => setAction("sell")}
              className="w-full"
            >
              Sell
            </Button>
          </div>

          {/* Market Order */}
          <TabsContent value="market" className="space-y-3 mt-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Quantity</label>
              <Input
                type="number"
                className="mono"
                placeholder="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min="1"
              />
            </div>
            <div className="flex justify-between text-sm px-1">
              <span className="text-muted-foreground">Price</span>
              <span className="mono">${currentPrice?.toFixed(2) || "—"}</span>
            </div>
            <div className="flex justify-between text-sm px-1">
              <span className="text-muted-foreground">Total</span>
              <span className="mono font-medium">${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
            </div>
            <Button
              variant={action === "buy" ? "buy" : "sell"}
              className="w-full"
              disabled={loading || !symbol || qty <= 0}
              onClick={submitMarketOrder}
            >
              {loading ? "Executing..." : `${action.toUpperCase()} ${symbol || "—"}`}
            </Button>
          </TabsContent>

          {/* Limit Order */}
          <TabsContent value="limit" className="space-y-3 mt-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Quantity</label>
              <Input type="number" className="mono" placeholder="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} min="1" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Limit Price</label>
              <Input type="number" className="mono" placeholder="0.00" value={limitPrice} onChange={(e) => setLimitPrice(e.target.value)} step="0.01" />
            </div>
            <Button
              variant={action === "buy" ? "buy" : "sell"}
              className="w-full"
              disabled={loading || !symbol || qty <= 0 || !limitPrice}
              onClick={submitLimitOrder}
            >
              {loading ? "Placing..." : `Place Limit ${action.toUpperCase()}`}
            </Button>
          </TabsContent>

          {/* Conditional Order */}
          <TabsContent value="conditional" className="space-y-3 mt-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Quantity</label>
              <Input type="number" className="mono" placeholder="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} min="1" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Indicator</label>
              <Select value={indicator} onValueChange={setIndicator}>
                <SelectTrigger><SelectValue placeholder="Select indicator" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="price">Price</SelectItem>
                  <SelectItem value="rsi">RSI (14)</SelectItem>
                  <SelectItem value="sma">50-day SMA</SelectItem>
                  <SelectItem value="ema_crossover">EMA Crossover (12/26)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Condition</label>
              <Select value={condition} onValueChange={setCondition}>
                <SelectTrigger><SelectValue placeholder="Select condition" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="above">Above</SelectItem>
                  <SelectItem value="below">Below</SelectItem>
                  <SelectItem value="crosses_above">Crosses Above</SelectItem>
                  <SelectItem value="crosses_below">Crosses Below</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Value</label>
              <Input type="number" className="mono" placeholder="0" value={condValue} onChange={(e) => setCondValue(e.target.value)} step="0.01" />
            </div>
            <Button className="w-full" disabled={loading || !symbol || qty <= 0 || !indicator || !condition || !condValue} onClick={submitConditionalOrder}>
              {loading ? "Creating..." : "Create Conditional Order"}
            </Button>
          </TabsContent>
        </Tabs>

        {/* Message */}
        {message && (
          <div className={cn(
            "mt-3 text-xs p-2 rounded-md",
            message.type === "success" ? "bg-profit-muted text-profit" : "bg-loss-muted text-loss"
          )}>
            {message.text}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
