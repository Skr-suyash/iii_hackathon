import { useEffect, useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function StatCard({ label, value, change, prefix = "$", isMoney = true }) {
  const [displayValue, setDisplayValue] = useState(0);
  const animRef = useRef(null);

  useEffect(() => {
    const duration = 800;
    const start = performance.now();
    const startVal = 0;
    const endVal = value;

    function animate(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(startVal + (endVal - startVal) * eased);
      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      }
    }

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [value]);

  const formatted = isMoney
    ? `${prefix}${displayValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : displayValue.toFixed(1);

  return (
    <Card className="hover:border-border/80 transition-all duration-200">
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground mb-1">{label}</p>
        <p className="text-2xl font-bold mono animate-count-up">{formatted}</p>
        {change !== undefined && (
          <span
            className={cn(
              "text-sm mono font-medium mt-1 inline-block",
              change >= 0 ? "text-profit" : "text-loss"
            )}
          >
            {change >= 0 ? "▲" : "▼"} {Math.abs(change).toFixed(2)}%
          </span>
        )}
      </CardContent>
    </Card>
  );
}
