import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApiData } from "@/hooks/useApiData";
import { useApi } from "@/hooks/useApi";
import { toast } from "sonner";

type Camper = { id: number; first_name: string; last_name: string };

type Props = {
  camperId: number;
  cohortMembers: Camper[];
};

export default function CampSpiritVote({ camperId, cohortMembers }: Props) {
  const [nomineeId, setNomineeId] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { data: voteData, refetch } = useApiData("GetSpiritVoteResults", {
    camper_id: camperId,
  }, { enabled: camperId > 0 });

  const alreadyVoted = voteData?.my_vote_cast != null;
  const { run: submitVote, loading } = useApi("SubmitSpiritVote");

  // Filter out self and counselors (cohortMembers already excludes counselors if passed correctly)
  const eligibleNominees = cohortMembers.filter((m) => m.id !== camperId);

  const handleSubmit = useCallback(async () => {
    if (!nomineeId) { toast.error("Please select a cAMPer"); return; }
    try {
      await submitVote({
        voter_id: camperId,
        nominee_id: nomineeId,
        note: note.trim() || null,
      });
      setSubmitted(true);
      toast.success("🏕️ Your Camp Spirit vote is in!");
      refetch();
    } catch (err) {
      const message = err && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message) : String(err);
      toast.error("Failed: " + message);
    }
  }, [nomineeId, camperId, note, submitVote, refetch]);

  if (submitted || alreadyVoted) {
    const votedFor = eligibleNominees.find((m) => m.id === (voteData?.my_vote_cast?.nominee_id ?? nomineeId));
    return (
      <Card className="p-5 bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
            <Icon icon="check-circle-2" className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-bold text-emerald-900">Camp Spirit Vote Submitted!</h3>
            <p className="text-xs text-emerald-700">
              You voted for <strong>{votedFor ? `${votedFor.first_name} ${votedFor.last_name}` : "a cAMPer"}</strong>
            </p>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          Results will be revealed on the final day. Thank you for recognizing your peers! 🏕️
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-5 border-2 border-emerald-300 bg-gradient-to-br from-emerald-50/80 to-teal-50/50">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">🏕️</span>
        <div>
          <h3 className="font-bold text-emerald-900">Camp Spirit Award</h3>
          <p className="text-xs text-muted-foreground">
            Vote for the cAMPer who brought the best energy, positivity, and team spirit!
          </p>
        </div>
      </div>

      <div className="bg-amber-50/80 border border-amber-200 rounded-lg px-3 py-2 mb-4">
        <p className="text-[11px] text-amber-800">
          <strong>💡 Why today?</strong> We vote the day before the last day so the winner is announced
          during tomorrow's closing ceremony alongside cAMP-V-P and team awards!
        </p>
      </div>

      {/* Nominee selector */}
      <div className="mb-3">
        <label className="text-sm font-medium text-foreground mb-1.5 block">
          Who deserves the Camp Spirit Award?
        </label>
        <Select onValueChange={(v) => setNomineeId(Number(v))}>
          <SelectTrigger className="bg-white">
            <SelectValue placeholder="Select a cAMPer..." />
          </SelectTrigger>
          <SelectContent>
            {eligibleNominees.map((m) => (
              <SelectItem key={m.id} value={String(m.id)}>
                {m.first_name} {m.last_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Optional note */}
      <div className="mb-4">
        <label className="text-sm font-medium text-foreground mb-1.5 block">
          Kind words <Badge variant="outline" className="text-[9px] ml-1">Optional</Badge>
        </label>
        <Textarea
          placeholder="Why do they deserve it? Your note will be shared anonymously..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="text-sm bg-white"
        />
      </div>

      <Button
        onClick={handleSubmit}
        disabled={loading || !nomineeId}
        className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold"
      >
        {loading ? (
          <><Icon icon="loader-2" className="w-4 h-4 animate-spin mr-2" />Submitting...</>
        ) : (
          <>🏕️ Cast My Vote</>
        )}
      </Button>
    </Card>
  );
}
