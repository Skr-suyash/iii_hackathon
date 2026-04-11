import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import client from "@/api/client";

export default function HistoryPage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get("/transactions?limit=100")
      .then(({ data }) => setTransactions(data.transactions || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="flex items-center h-10 px-4 border-b border-border bg-sidebar shrink-0">
          <span className="text-sm font-semibold">Transaction History</span>
        </div>
        <div className="p-4">
          <Skeleton className="h-64 rounded-sm" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center h-10 px-4 border-b border-border bg-sidebar shrink-0">
        <span className="text-sm font-semibold">Transaction History</span>
        <span className="ml-2 text-xs text-muted-foreground">({transactions.length} records)</span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {transactions.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
            No transactions yet. Your trade history will appear here.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent text-[10px]">
                <TableHead className="h-7">Date</TableHead>
                <TableHead className="h-7">Symbol</TableHead>
                <TableHead className="h-7">Type</TableHead>
                <TableHead className="text-right h-7">Quantity</TableHead>
                <TableHead className="text-right h-7">Price</TableHead>
                <TableHead className="text-right h-7">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((t) => (
                <TableRow key={t.id} className="text-xs">
                  <TableCell className="text-muted-foreground py-1.5">
                    {new Date(t.timestamp).toLocaleDateString("en-US", {
                      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell className="font-semibold py-1.5">{t.symbol}</TableCell>
                  <TableCell className="py-1.5">
                    <Badge variant={t.type === "BUY" ? "profit" : "loss"} className="text-[10px] px-1.5 py-0">
                      {t.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right mono py-1.5">{t.quantity}</TableCell>
                  <TableCell className="text-right mono py-1.5">${t.price?.toFixed(2)}</TableCell>
                  <TableCell className={cn("text-right mono font-medium py-1.5", t.type === "BUY" ? "text-loss" : "text-profit")}>
                    ${t.total?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
