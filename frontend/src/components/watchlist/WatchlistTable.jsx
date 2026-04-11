import { useState, useEffect } from "react";
import { Plus, Trash2, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SentimentBadge from "@/components/common/SentimentBadge";
import EmptyState from "@/components/common/EmptyState";
import { cn } from "@/lib/utils";
import client from "@/api/client";

export default function WatchlistTable() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  async function fetchWatchlist() {
    try {
      const { data } = await client.get("/watchlist");
      setItems(data.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchWatchlist();
  }, []);

  async function removeItem(symbol) {
    try {
      await client.delete(`/watchlist/${symbol}`);
      setItems((prev) => prev.filter((i) => i.symbol !== symbol));
    } catch (err) {
      console.error(err);
    }
  }

  if (!loading && items.length === 0) {
    return (
      <Card>
        <CardContent className="p-0">
          <EmptyState icon={Eye} title="Watchlist is empty" description="Add stocks to your watchlist to track them" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Watchlist</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Symbol</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Change</TableHead>
              <TableHead>Sentiment</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.symbol}>
                <TableCell className="font-semibold">{item.symbol}</TableCell>
                <TableCell className="text-muted-foreground text-xs">{item.name}</TableCell>
                <TableCell className="text-right mono">${item.price?.toFixed(2)}</TableCell>
                <TableCell className={cn("text-right mono", item.change_pct >= 0 ? "text-profit" : "text-loss")}>
                  {item.change_pct >= 0 ? "+" : ""}{item.change_pct?.toFixed(2)}%
                </TableCell>
                <TableCell>
                  <SentimentBadge sentiment={item.sentiment} />
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeItem(item.symbol)}>
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
