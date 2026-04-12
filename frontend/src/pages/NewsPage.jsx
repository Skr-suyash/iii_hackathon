import { useState, useEffect } from "react";
import client from "@/api/client";
import { cn } from "@/lib/utils";
import { Clock, ExternalLink, Globe2, Briefcase } from "lucide-react";

function timeAgo(timestamp) {
  if (!timestamp) return "Recently";
  const seconds = Math.floor(Date.now() / 1000 - timestamp);
  
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval >= 1) return Math.floor(interval) + " minutes ago";
  return "Just now";
}

function NewsCard({ article }) {
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col bg-[#0b0c10] border border-border hover:border-primary/50 transition-colors duration-200 rounded-lg overflow-hidden group h-full"
    >
      <div className="relative w-full pt-[56.25%] bg-muted/20 overflow-hidden shrink-0">
        {article.thumbnail ? (
          <img
            src={article.thumbnail}
            alt={article.title}
            className="absolute top-0 left-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}
        
        {/* Fallback pattern if no thumbnail or error loading */}
        <div 
          className="absolute top-0 left-0 w-full h-full items-center justify-center bg-gradient-to-br from-[#1a1b26] to-[#0f1015]"
          style={{ display: article.thumbnail ? 'none' : 'flex' }}
        >
          <Globe2 className="w-12 h-12 text-muted/30" />
        </div>
      </div>

      <div className="flex flex-col flex-1 p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-primary tracking-wider">
              {article.related_symbol || "MARKET"}
            </span>
            <span className="text-xs text-muted-foreground font-medium">
              • {article.publisher}
            </span>
          </div>
          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-3 mb-3 flex-1 group-hover:text-primary transition-colors">
          {article.title}
        </h3>

        <div className="flex items-center text-xs text-muted-foreground mt-auto">
          <Clock className="w-3 h-3 mr-1.5" />
          {timeAgo(article.published_at)}
        </div>
      </div>
    </a>
  );
}

function NewsSkeleton() {
  return (
    <div className="flex flex-col bg-[#0b0c10] border border-border rounded-lg overflow-hidden h-full animate-pulse">
      <div className="w-full pt-[56.25%] bg-muted/20" />
      <div className="flex flex-col flex-1 p-4">
        <div className="w-1/3 h-3 bg-muted/30 rounded mb-3" />
        <div className="w-full h-4 bg-muted/30 rounded mb-2" />
        <div className="w-5/6 h-4 bg-muted/30 rounded mb-4 flex-1" />
        <div className="w-1/4 h-3 bg-muted/20 rounded mt-auto" />
      </div>
    </div>
  );
}

export default function NewsPage() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("market"); // "market" or "portfolio"

  useEffect(() => {
    let active = true;
    setLoading(true);
    setNews([]);

    client.get(`/news?filter_type=${filterType}`)
      .then(({ data }) => {
        if (active) {
          setNews(data.items || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch news:", err);
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [filterType]);

  return (
    <div className="flex flex-col h-full bg-[#06070a] text-foreground overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border shrink-0 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Globe2 className="w-5 h-5 text-primary" />
            Market Intelligence
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Real-time financial news powered by Yahoo Finance
          </p>
        </div>

        <div className="flex items-center gap-1 bg-[#0b0c10] p-1 rounded-sm border border-border shadow-sm">
          <button
            onClick={() => setFilterType("market")}
            className={cn(
              "flex items-center justify-center gap-2 px-6 py-1.5 text-xs uppercase font-bold rounded-sm transition-all duration-200",
              filterType === "market" 
                ? "bg-primary/20 text-primary shadow-sm" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted/10"
            )}
          >
            <Globe2 className="w-3.5 h-3.5" />
            Global Markets
          </button>
          <button
            onClick={() => setFilterType("portfolio")}
            className={cn(
              "flex items-center justify-center gap-2 px-6 py-1.5 text-xs uppercase font-bold rounded-sm transition-all duration-200",
              filterType === "portfolio" 
                ? "bg-primary/20 text-primary shadow-sm" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted/10"
            )}
          >
            <Briefcase className="w-3.5 h-3.5" />
            My Portfolio
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <NewsSkeleton key={i} />
            ))}
          </div>
        ) : news.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {news.map((item) => (
              <NewsCard key={item.id} article={item} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-[#0b0c10]/50 border border-border/50 rounded-lg">
            <Globe2 className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-sm font-semibold text-foreground">No News Found</h3>
            <p className="text-xs text-muted-foreground mt-2 max-w-sm">
              We couldn't find any recent articles matching your selected criteria. Try switching back to Global Markets.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
