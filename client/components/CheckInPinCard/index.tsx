import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";

type Props = { pin: string | null | undefined };

/** Shows the cAMPer's 4-digit check-in PIN. */
export default function CheckInPinCard({ pin }: Props) {
  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Icon icon="key-round" className="w-5 h-5 text-camp-amber" />
        Your Check-in PIN
      </h2>
      <div className="flex items-center gap-4">
        <div className="px-5 py-3 bg-muted rounded-xl border border-border">
          <span className="text-2xl font-mono font-bold tracking-[0.3em] text-foreground">{pin ?? "----"}</span>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">Use this 4-digit PIN when checking back in after breaks.</p>
          <p className="text-xs text-muted-foreground/70">Keep it secret — it proves it's really you!</p>
        </div>
      </div>
    </Card>
  );
}
