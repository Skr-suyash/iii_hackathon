import { useState, useEffect, useCallback } from "react";
import client from "@/api/client";

export function useMarketData(interval = 30000) {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPrices = useCallback(async () => {
    try {
      const { data } = await client.get("/market/prices");
      setStocks(data.stocks || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
    const timer = setInterval(fetchPrices, interval);
    return () => clearInterval(timer);
  }, [fetchPrices, interval]);

  return { stocks, loading, error, refetch: fetchPrices };
}

export function useStockDetail(symbol) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!symbol) return;
    setLoading(true);
    client.get(`/market/${symbol}`)
      .then(({ data }) => setData(data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [symbol]);

  return { data, loading };
}
