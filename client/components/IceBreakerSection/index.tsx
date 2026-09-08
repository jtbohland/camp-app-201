import { useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const ICE_BREAKER_QUESTIONS = [
  "What's the most interesting job you've ever had (even if it's not career-related)?",
  "What's one skill you'd love to learn?",
  "What's your favorite way to spend a weekend?",
  "What's the furthest you've ever traveled from home? (Destination, not miles/kms)",
  "What's one thing you're really good at (hobby, skill, etc.)?",
  "What's one thing you're passionate about?",
  "If you could have any superpower, what would it be and why?",
  "What's your favorite book, movie, or TV show?",
  "What's the most unusual food you've ever eaten?",
  "What's your go-to karaoke song (even if you don't do karaoke)?",
  "What's your favorite animal?",
  "What's your favorite board game or video game?",
  "If you were stranded on a desert island, what three things would you bring?",
  "Do you have any pets? If so, what kind?",
  "What's your favorite ice cream flavor?",
  "What's one thing we haven't asked about here that you'd like to share with us?",
];

export { ICE_BREAKER_QUESTIONS };

type Props = {
  answers: Record<string, string>;
  onChange: (answers: Record<string, string>) => void;
};

export default function IceBreakerSection({ answers, onChange }: Props) {
  const handleChange = useCallback((idx: number, value: string) => {
    onChange({ ...answers, [`q${idx}`]: value });
  }, [answers, onChange]);

  const answeredCount = ICE_BREAKER_QUESTIONS.filter((_, i) => answers[`q${i}`]?.trim()).length;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Icon icon="message-circle" className="w-5 h-5 text-camp-amber" />
          Ice Breaker Questions
        </h2>
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
          answeredCount === ICE_BREAKER_QUESTIONS.length
            ? "bg-camp-green/10 text-camp-green"
            : "bg-muted text-muted-foreground"
        }`}>
          {answeredCount}/{ICE_BREAKER_QUESTIONS.length} answered
        </span>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Your answers power team activities during cAMP — have fun with them! All questions are required.
      </p>
      <div className="flex flex-col gap-4">
        {ICE_BREAKER_QUESTIONS.map((question, idx) => (
          <div key={idx} className="flex flex-col gap-1.5">
            <Label className="text-sm">
              {idx + 1}. {question} <span className="text-destructive">*</span>
            </Label>
            <Textarea
              placeholder="Your answer..."
              value={answers[`q${idx}`] ?? ""}
              onChange={(e) => handleChange(idx, e.target.value)}
              className="min-h-[60px]"
            />
          </div>
        ))}
      </div>
    </Card>
  );
}
