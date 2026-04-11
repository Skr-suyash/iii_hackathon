import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useMarketData } from "@/hooks/useMarketData";

export default function StockSelector({ value, onChange }) {
  const { stocks } = useMarketData();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = stocks.filter(
    (s) =>
      s.symbol.toLowerCase().includes(query.toLowerCase()) ||
      s.name.toLowerCase().includes(query.toLowerCase())
  );

  const selected = stocks.find((s) => s.symbol === value);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search stock..."
          value={open ? query : selected ? `${selected.symbol} — ${selected.name}` : query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
        />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-full bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {filtered.map((s) => (
            <button
              key={s.symbol}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-accent transition-colors cursor-pointer",
                s.symbol === value && "bg-accent"
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(s.symbol);
                setQuery("");
                setOpen(false);
              }}
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold">{s.symbol}</span>
                <span className="text-muted-foreground text-xs">{s.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="mono text-xs">${s.price?.toFixed(2)}</span>
                <span className={cn("mono text-xs", s.change_pct >= 0 ? "text-profit" : "text-loss")}>
                  {s.change_pct >= 0 ? "+" : ""}{s.change_pct?.toFixed(2)}%
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
