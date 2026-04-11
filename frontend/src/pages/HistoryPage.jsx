import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/common/EmptyState";
import { History } from "lucide-react";
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
      <div className="space-y-6">
        <h1 className="text-xl font-bold">Transaction History</h1>
        <Skeleton className="h-96 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Transaction History</h1>

      {transactions.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState icon={History} title="No transactions yet" description="Your trade history will appear here" />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Date</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-muted-foreground text-xs">
                      {new Date(t.timestamp).toLocaleDateString("en-US", {
                        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell className="font-semibold">{t.symbol}</TableCell>
                    <TableCell>
                      <Badge variant={t.type === "BUY" ? "profit" : "loss"} className="text-xs">
                        {t.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right mono">{t.quantity}</TableCell>
                    <TableCell className="text-right mono">${t.price?.toFixed(2)}</TableCell>
                    <TableCell className={cn("text-right mono font-medium", t.type === "BUY" ? "text-loss" : "text-profit")}>
                      ${t.total?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
