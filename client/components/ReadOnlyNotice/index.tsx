import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";

/** Placeholder for editing tools while a counselor is viewing a past cohort. */
export default function ReadOnlyNotice({ what }: { what: string }) {
  return (
    <Card className="p-8 text-center max-w-lg mx-auto">
      <Icon icon="lock" className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
      <p className="text-sm font-medium text-foreground">{what} can't be changed while viewing a past cohort.</p>
      <p className="text-xs text-muted-foreground mt-1">
        Switch back to the active cohort to make changes.
      </p>
    </Card>
  );
}
