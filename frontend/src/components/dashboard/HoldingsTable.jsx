import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export default function HoldingsTable({ holdings = [] }) {
  if (holdings.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
        No holdings yet. Execute a trade to see them here.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent text-[10px]">
          <TableHead className="h-7">Symbol</TableHead>
          <TableHead className="h-7">Name</TableHead>
          <TableHead className="text-right h-7">Qty</TableHead>
          <TableHead className="text-right h-7">Avg Price</TableHead>
          <TableHead className="text-right h-7">Current</TableHead>
          <TableHead className="text-right h-7">Value</TableHead>
          <TableHead className="text-right h-7">P&L</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {holdings.map((h) => (
          <TableRow key={h.symbol} className="text-xs">
            <TableCell className="font-semibold py-1.5">{h.symbol}</TableCell>
            <TableCell className="text-muted-foreground py-1.5">{h.name}</TableCell>
            <TableCell className="text-right mono py-1.5">{h.quantity}</TableCell>
            <TableCell className="text-right mono py-1.5">${h.avg_price?.toFixed(2)}</TableCell>
            <TableCell className="text-right mono py-1.5">${h.current_price?.toFixed(2)}</TableCell>
            <TableCell className="text-right mono py-1.5">${h.value?.toLocaleString("en-US", { minimumFractionDigits: 2 })}</TableCell>
            <TableCell className={cn("text-right mono font-medium py-1.5", h.pnl >= 0 ? "text-profit" : "text-loss")}>
              {h.pnl >= 0 ? "+" : ""}{h.pnl_pct?.toFixed(2)}%
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
