import { useState, useEffect, useMemo } from "react";
import { Icon } from "@/components/ui/icon";

type Props = {
  deadline: string; // ISO datetime string
};

function getTimeRemaining(deadline: string) {
  const total = new Date(deadline).getTime() - Date.now();
  if (total <= 0) return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };
  const seconds = Math.floor((total / 1000) % 60);
  const minutes = Math.floor((total / 1000 / 60) % 60);
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const days = Math.floor(total / (1000 * 60 * 60 * 24));
  return { total, days, hours, minutes, seconds, isPast: false };
}

export default function DeadlineCountdown({ deadline }: Props) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const remaining = useMemo(() => getTimeRemaining(deadline), [deadline, now]);

  if (!deadline) return null;

  if (remaining.isPast) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
        <Icon icon="alert-circle" className="w-4 h-4 text-red-500" />
        <span className="text-xs font-semibold text-red-500">Pre-work deadline has passed!</span>
      </div>
    );
  }

  const isUrgent = remaining.days === 0;
  const isWarning = remaining.days <= 2;

  return (
    <div className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${
      isUrgent ? "bg-red-500/10 border-red-500/20" :
      isWarning ? "bg-amber-500/10 border-amber-500/20" :
      "bg-camp-green/10 border-camp-green/20"
    }`}>
      <Icon icon="timer" className={`w-4 h-4 ${
        isUrgent ? "text-red-500" : isWarning ? "text-amber-500" : "text-camp-green"
      }`} />
      <div className="flex items-center gap-2">
        <span className={`text-xs font-medium ${
          isUrgent ? "text-red-500" : isWarning ? "text-amber-500" : "text-camp-green"
        }`}>
          Pre-work deadline:
        </span>
        <div className="flex items-center gap-1">
          {remaining.days > 0 && (
            <TimeUnit value={remaining.days} label="d" urgent={isUrgent} warning={isWarning} />
          )}
          <TimeUnit value={remaining.hours} label="h" urgent={isUrgent} warning={isWarning} />
          <TimeUnit value={remaining.minutes} label="m" urgent={isUrgent} warning={isWarning} />
          {remaining.days === 0 && (
            <TimeUnit value={remaining.seconds} label="s" urgent={isUrgent} warning={isWarning} />
          )}
        </div>
      </div>
      {remaining.days >= 2 && (
        <span className="text-[10px] text-camp-green ml-auto">Complete early for bonus points!</span>
      )}
    </div>
  );
}

function TimeUnit({ value, label, urgent, warning }: { value: number; label: string; urgent: boolean; warning: boolean }) {
  return (
    <span className={`font-mono text-xs font-bold ${
      urgent ? "text-red-500" : warning ? "text-amber-500" : "text-camp-green"
    }`}>
      {String(value).padStart(2, "0")}{label}
    </span>
  );
}
