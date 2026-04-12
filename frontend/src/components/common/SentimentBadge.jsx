import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const CONFIGS = {
  bullish: { emoji: "🟢", variant: "profit", label: "Bullish" },
  bearish: { emoji: "🔴", variant: "loss", label: "Bearish" },
  neutral: { emoji: "🟡", variant: "warning", label: "Neutral" },
  loading: { emoji: "⏳", variant: "outline", label: "Analyzing..." },
};

export default function SentimentBadge({ sentiment, className }) {
  const config = CONFIGS[sentiment] || CONFIGS.neutral;
  return (
    <Badge variant={config.variant} className={cn("text-xs", className)}>
      {config.emoji} {config.label}
    </Badge>
  );
}
