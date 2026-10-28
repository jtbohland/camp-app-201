import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";

/** Shown to someone who was removed and registered again, until a counselor restores them. */
export default function RejoinPendingNotice() {
  return (
    <div className="flex items-center justify-center min-h-full p-8 overflow-auto">
      <Card className="max-w-md w-full p-8 text-center border shadow-sm">
        <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
          <Icon icon="hourglass" className="w-6 h-6 text-amber-700" />
        </div>
        <h2 className="text-xl font-bold mb-2">You're on the list</h2>
        <p className="text-sm text-muted-foreground">
          Thanks for registering again. A cAMP counselor will confirm your spot. Once they do, your
          profile and points come back and the app opens up. Check back soon.
        </p>
      </Card>
    </div>
  );
}
