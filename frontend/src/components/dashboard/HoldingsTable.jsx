import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import EmptyState from "@/components/common/EmptyState";
import { TrendingUp } from "lucide-react";

export default function HoldingsTable({ holdings = [] }) {
  if (holdings.length === 0) {
    return (
      <Card>
        <CardContent className="p-0">
          <EmptyState icon={TrendingUp} title="No holdings yet" description="Buy some stocks to see them here" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Holdings</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Symbol</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Avg Price</TableHead>
              <TableHead className="text-right">Current</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead className="text-right">P&L</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {holdings.map((h) => (
              <TableRow key={h.symbol}>
                <TableCell className="font-semibold">{h.symbol}</TableCell>
                <TableCell className="text-muted-foreground text-xs">{h.name}</TableCell>
                <TableCell className="text-right mono">{h.quantity}</TableCell>
                <TableCell className="text-right mono">${h.avg_price?.toFixed(2)}</TableCell>
                <TableCell className="text-right mono">${h.current_price?.toFixed(2)}</TableCell>
                <TableCell className="text-right mono">${h.value?.toLocaleString("en-US", { minimumFractionDigits: 2 })}</TableCell>
                <TableCell className={cn("text-right mono font-medium", h.pnl >= 0 ? "text-profit" : "text-loss")}>
                  {h.pnl >= 0 ? "+" : ""}{h.pnl_pct?.toFixed(2)}%
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
