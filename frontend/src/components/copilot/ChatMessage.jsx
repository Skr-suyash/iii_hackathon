import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const TOOL_ICONS = {
  execute_trade: "💹",
  get_stock_info: "📊",
  scan_market: "🔍",
  get_sentiment: "💬",
  analyze_portfolio: "📈",
  set_price_alert: "🔔",
  create_conditional_order: "⚡",
};

export default function ChatMessage({ role, content, tools }) {
  // Simple parser to handle **bold** and `code` text
  const renderContent = (text) => {
    if (typeof text !== "string") return text;
    // Split by **...** or `...`
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code key={i} className="bg-black/20 text-blue-300 rounded px-1 py-0.5 text-[0.85em] font-mono">
            {part.slice(1, -1)}
          </code>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className={cn("flex mb-3", role === "user" ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-lg px-4 py-2.5 text-sm leading-relaxed",
          role === "user"
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-copilot-bubble text-copilot-foreground rounded-bl-sm"
        )}
      >
        {/* Render content with basic markdown-like formatting */}
        <div className="whitespace-pre-wrap break-words">
          {renderContent(content)}
        </div>

        {/* Tool call badges */}
        {tools?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-white/10">
            {tools.map((t, i) => (
              <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">
                {TOOL_ICONS[t.tool] || "🔧"} {t.tool.replace(/_/g, " ")}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
