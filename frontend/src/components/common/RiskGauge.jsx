import { useEffect, useState } from "react";

export default function RiskGauge({ score = 0 }) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => setAnimatedScore(score), 100);
    return () => clearTimeout(timeout);
  }, [score]);

  const radius = 60;
  const stroke = 8;
  const circumference = Math.PI * radius; // half circle
  const progress = (animatedScore / 100) * circumference;

  const getColor = (s) => {
    if (s <= 33) return "hsl(142, 71%, 45%)";     // green
    if (s <= 66) return "hsl(38, 92%, 50%)";       // amber
    return "hsl(0, 84%, 60%)";                      // red
  };

  const getLabel = (s) => {
    if (s <= 33) return "Low Risk";
    if (s <= 66) return "Moderate";
    return "High Risk";
  };

  return (
    <div className="flex flex-col items-center">
      <svg width="160" height="100" viewBox="0 0 160 100">
        {/* Background arc */}
        <path
          d="M 10 90 A 60 60 0 0 1 150 90"
          fill="none"
          stroke="hsl(240, 18%, 16%)"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        {/* Progress arc */}
        <path
          d="M 10 90 A 60 60 0 0 1 150 90"
          fill="none"
          stroke={getColor(animatedScore)}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          style={{ transition: "stroke-dashoffset 1s ease-out, stroke 0.5s ease" }}
        />
      </svg>
      <div className="flex flex-col items-center -mt-12">
        <span className="text-3xl font-bold mono" style={{ color: getColor(animatedScore) }}>
          {Math.round(animatedScore)}
        </span>
        <span className="text-xs text-muted-foreground mt-0.5">
          {getLabel(animatedScore)}
        </span>
      </div>
    </div>
  );
}
