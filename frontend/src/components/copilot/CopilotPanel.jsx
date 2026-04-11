import { useState, useRef, useEffect } from "react";
import { Send, Sparkles } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ChatMessage from "./ChatMessage";
import client from "@/api/client";

const SUGGESTIONS = [
  "How's my portfolio?",
  "Find oversold stocks",
  "What should I buy?",
  "Analyze my risk",
];

export default function CopilotPanel() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  async function sendMessage(text) {
    const msg = text || inputValue.trim();
    if (!msg || isLoading) return;

    setInputValue("");
    const userMsg = { role: "user", content: msg };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const conversation = messages.slice(-10).map(({ role, content }) => ({ role, content }));
      const { data } = await client.post("/copilot/chat", {
        message: msg,
        conversation,
      });
      const assistantMsg = {
        role: "assistant",
        content: data.response,
        tools: data.tool_calls_made || [],
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I'm having trouble connecting. Make sure the backend and Ollama are running.",
          tools: [],
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="flex flex-col h-full w-[var(--copilot-width)] bg-copilot border-l border-border shrink-0">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3.5 border-b border-border">
        <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <h2 className="font-semibold text-sm text-foreground">AI Copilot</h2>
        <Badge variant="secondary" className="text-[10px] ml-auto">
          Gemma 4 · Local
        </Badge>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-1">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">NovaTrade AI</h3>
            <p className="text-xs text-muted-foreground mb-6">
              Your local AI trading copilot. Ask me anything about stocks, trades, or your portfolio.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTIONS.map((s) => (
                <Button
                  key={s}
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => sendMessage(s)}
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <ChatMessage key={i} {...msg} />
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-copilot-bubble rounded-lg rounded-bl-sm px-4 py-3 max-w-[85%]">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce-dot" style={{ animationDelay: "0s" }} />
                <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce-dot" style={{ animationDelay: "0.16s" }} />
                <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce-dot" style={{ animationDelay: "0.32s" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask your AI copilot..."
          className="flex-1 text-sm"
          disabled={isLoading}
        />
        <Button
          size="icon"
          onClick={() => sendMessage()}
          disabled={isLoading || !inputValue.trim()}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
