import { useState, useCallback } from "react";
import { queryClient } from "@superblocksteam/library";
import { useApi } from "@/hooks/useApi";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { toast } from "sonner";

type Props = {
  onBack: () => void;
  onVerified: () => void;
};

export default function CounselorAccessForm({ onBack, onVerified }: Props) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const { run: verify, loading } = useApi("VerifyCounselor");

  const handleSubmit = useCallback(async () => {
    if (!password) return;
    try {
      const result = await verify({ password });
      if (!result?.success) {
        setError(true);
        return;
      }
      await Promise.all([
        queryClient.invalidateQueries("GetMyAccess"),
        queryClient.invalidateQueries("GetCurrentCamper"),
      ]);
      toast.success("Welcome, counselor! You now have full access.");
      onVerified();
    } catch (e) {
      const message = typeof e === "object" && e !== null && "message" in e
        ? String((e as { message: unknown }).message) : "Verification failed";
      toast.error(message);
    }
  }, [password, verify, onVerified]);

  return (
    <div className="flex items-center justify-center min-h-full p-8">
      <Card className="w-full max-w-sm p-8 relative">
        <button
          onClick={onBack}
          className="absolute top-4 left-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Icon icon="arrow-left" className="w-4 h-4" />
          Back
        </button>
        <div className="text-center mt-4 mb-6">
          <div className="w-14 h-14 rounded-full bg-camp-amber/15 flex items-center justify-center mx-auto mb-3">
            <Icon icon="shield" className="w-7 h-7 text-camp-amber" />
          </div>
          <h1 className="text-xl font-bold text-foreground">cAMP Counselor</h1>
          <p className="text-sm text-muted-foreground mt-1">Enter the counselor password to continue</p>
        </div>
        <div className="space-y-3">
          <Input
            type="password"
            placeholder="Counselor password"
            value={password}
            autoFocus
            onChange={(e) => { setPassword(e.target.value); setError(false); }}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            className={error ? "border-destructive" : ""}
          />
          {error && <p className="text-xs text-destructive">Incorrect password. Try again.</p>}
          <Button onClick={handleSubmit} disabled={loading || !password} className="w-full">
            {loading ? "Verifying..." : "Continue"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
