import { useState, useEffect } from "react";
import { Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/common/EmptyState";
import client from "@/api/client";
import { cn } from "@/lib/utils";

export default function PendingOrders({ refreshTrigger }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  async function fetchOrders() {
    try {
      const { data } = await client.get("/orders");
      setOrders(data.orders || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchOrders();
  }, [refreshTrigger]);

  async function cancelOrder(id) {
    try {
      await client.delete(`/orders/${id}`);
      fetchOrders();
    } catch (err) {
      console.error(err);
    }
  }

  if (!loading && orders.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Pending Orders</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Symbol</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Condition</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-semibold">{o.symbol}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">{o.order_type}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={o.action === "buy" ? "profit" : "loss"} className="text-xs">
                    {o.action.toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {o.conditions && o.conditions.length > 0 
                    ? o.conditions.map(c => `${c.indicator} ${c.condition.replace(/_/g, " ")} ${c.value}`).join(" AND ")
                    : "No condition"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={o.status === "filled" ? "profit" : o.status === "cancelled" ? "loss" : "secondary"}
                    className="text-xs"
                  >
                    {o.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {o.status === "pending" && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => cancelOrder(o.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
