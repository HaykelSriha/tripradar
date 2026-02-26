"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

interface DealTimerProps {
  validUntil: string;
}

function getTimeLeft(validUntil: string): { h: number; m: number; s: number } | null {
  const diff = new Date(validUntil).getTime() - Date.now();
  if (diff <= 0) return null;
  const s = Math.floor(diff / 1000);
  return { h: Math.floor(s / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

function pad(n: number) { return String(n).padStart(2, "0"); }

export function DealTimer({ validUntil }: DealTimerProps) {
  const [time, setTime] = useState(() => getTimeLeft(validUntil));

  useEffect(() => {
    const id = setInterval(() => setTime(getTimeLeft(validUntil)), 1000);
    return () => clearInterval(id);
  }, [validUntil]);

  if (!time) {
    return (
      <span className="inline-flex items-center gap-1 text-2xs text-muted">
        <Clock className="w-3 h-3" />
        Expiré
      </span>
    );
  }

  const urgent = time.h === 0 && time.m < 30;

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono text-xs ${
        urgent ? "text-danger" : "text-secondary"
      }`}
    >
      <Clock className="w-3 h-3" />
      {time.h > 0 && `${pad(time.h)}h `}{pad(time.m)}m {pad(time.s)}s
    </span>
  );
}
