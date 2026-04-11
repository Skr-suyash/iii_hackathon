import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import WatchlistTable from "@/components/watchlist/WatchlistTable";
import client from "@/api/client";

export default function WatchlistPage() {
  const [addSymbol, setAddSymbol] = useState("");
  const [refresh, setRefresh] = useState(0);

  async function handleAdd(e) {
    e.preventDefault();
    if (!addSymbol.trim()) return;
    try {
      await client.post("/watchlist", { symbol: addSymbol.trim().toUpperCase() });
      setAddSymbol("");
      setRefresh((r) => r + 1);
      window.location.reload(); // Simple refresh for watchlist
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Watchlist</h1>
        <form onSubmit={handleAdd} className="flex gap-2">
          <Input
            placeholder="Add symbol (e.g. MSFT)"
            value={addSymbol}
            onChange={(e) => setAddSymbol(e.target.value)}
            className="w-48"
          />
          <Button type="submit" size="sm">
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </form>
      </div>
      <WatchlistTable key={refresh} />
    </div>
  );
}
