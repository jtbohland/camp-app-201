import { memo } from "react";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Icon } from "@/components/ui/icon";

type Session = {
  id: number;
  title: string;
  session_type: string;
  start_time: string;
  end_time: string;
};

type SessionRating = {
  rating: number;
  usefulness: number;
  comment: string;
};

type SessionScorecardProps = {
  session: Session;
  value: SessionRating;
  onChange: (val: SessionRating) => void;
};

const EMOJIS = [
  { value: 1, emoji: "😢", label: "Poor" },
  { value: 2, emoji: "🥱", label: "Boring" },
  { value: 3, emoji: "😮‍💨", label: "Meh" },
  { value: 4, emoji: "😃", label: "Good" },
  { value: 5, emoji: "🤩", label: "Amazing" },
];

const USEFULNESS = [
  { value: 1, label: "Not useful", color: "bg-red-100 border-red-300 text-red-700" },
  { value: 2, label: "Slightly", color: "bg-orange-100 border-orange-300 text-orange-700" },
  { value: 3, label: "Moderate", color: "bg-yellow-100 border-yellow-300 text-yellow-700" },
  { value: 4, label: "Useful", color: "bg-emerald-100 border-emerald-300 text-emerald-700" },
  { value: 5, label: "Very useful", color: "bg-green-100 border-green-300 text-green-700" },
];

const TYPE_BADGES: Record<string, string> = {
  core: "bg-emerald-100 text-emerald-700",
  challenger: "bg-blue-100 text-blue-700",
  workshop: "bg-purple-100 text-purple-700",
  value: "bg-teal-100 text-teal-700",
  presentation: "bg-amber-100 text-amber-700",
  executive: "bg-yellow-100 text-yellow-800",
  social: "bg-pink-100 text-pink-700",
  session: "bg-emerald-100 text-emerald-700",
};

function formatTime(t: string): string {
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const dh = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${dh}:${m} ${ampm}`;
}

function SessionScorecard({ session, value, onChange }: SessionScorecardProps) {
  const badgeClass = TYPE_BADGES[session.session_type] ?? TYPE_BADGES.session;

  return (
    <Card className="p-4">
      {/* Session header */}
      <div className="flex items-start justify-between gap-2 mb-4">
        <div>
          <h3 className="font-semibold text-sm">{session.title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatTime(session.start_time)} – {formatTime(session.end_time)}
          </p>
        </div>
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${badgeClass}`}>
          {session.session_type}
        </span>
      </div>

      {/* Q1: How would you rate this session? (Emoji) */}
      <div className="mb-4">
        <p className="text-xs font-medium text-muted-foreground mb-2">How would you rate this session?</p>
        <div className="flex items-center gap-1">
          {EMOJIS.map((e) => (
            <button
              key={e.value}
              type="button"
              onClick={() => onChange({ ...value, rating: e.value })}
              className={`flex flex-col items-center gap-0.5 p-2 rounded-lg border-2 transition-all flex-1 ${
                value.rating === e.value
                  ? "border-primary bg-primary/5 scale-105"
                  : "border-transparent hover:border-border hover:bg-muted/30"
              }`}
            >
              <span className="text-2xl">{e.emoji}</span>
              <span className="text-[9px] text-muted-foreground leading-tight">{e.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Q2: How useful is this for your role? */}
      <div className="mb-3">
        <p className="text-xs font-medium text-muted-foreground mb-2">How useful is this for your role?</p>
        <div className="flex items-center gap-1">
          {USEFULNESS.map((u) => (
            <button
              key={u.value}
              type="button"
              onClick={() => onChange({ ...value, usefulness: u.value })}
              className={`flex-1 py-1.5 px-1 rounded-lg border text-[10px] font-medium text-center transition-all ${
                value.usefulness === u.value
                  ? `${u.color} border-2 scale-105`
                  : "border-border text-muted-foreground hover:bg-muted/30"
              }`}
            >
              {u.label}
            </button>
          ))}
        </div>
      </div>

      {/* Optional comment */}
      <details className="group">
        <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground flex items-center gap-1">
          <Icon icon="message-circle" className="w-3 h-3" />
          Add a comment (optional)
        </summary>
        <Textarea
          placeholder="Any specific feedback on this session..."
          value={value.comment}
          onChange={(e) => onChange({ ...value, comment: e.target.value })}
          rows={2}
          className="mt-2 text-sm"
        />
      </details>
    </Card>
  );
}

export default memo(SessionScorecard);
