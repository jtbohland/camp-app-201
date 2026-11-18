import { Icon } from "@/components/ui/icon";

export type AwardLeaders = {
  camp_vp_ids: number[];
  spirit_ids: number[];
  spirit_votes: number;
  wheel_dealer_ids: number[];
};

interface Props {
  camperId: number;
  leaders: AwardLeaders | undefined;
}

/** Counselor-only live award pills: who is leading each award right now (updates as the leaderboard moves). */
export default function AwardLeaderPills({ camperId, leaders }: Props) {
  if (!leaders) return null;
  const isVp = leaders.camp_vp_ids.includes(camperId);
  const isSpirit = leaders.spirit_ids.includes(camperId);
  const isDealer = leaders.wheel_dealer_ids.includes(camperId);
  if (!isVp && !isSpirit && !isDealer) return null;

  return (
    <>
      {isVp && (
        <span
          className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800"
          title="Currently #1 in individual points. Live: can change until cAMP closes."
        >
          <Icon icon="crown" className="h-3 w-3" />
          cAMP-V-P
        </span>
      )}
      {isSpirit && (
        <span
          className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700"
          title={`Currently leads the Camp Spirit vote (${leaders.spirit_votes} vote${leaders.spirit_votes === 1 ? "" : "s"}). Counselors only: hidden from cAMPers until the podium reveal.`}
        >
          <Icon icon="sparkles" className="h-3 w-3" />
          Most Spirited
        </span>
      )}
      {isDealer && (
        <span
          className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-700"
          title="Currently #1 on the Wheel & Deal leaderboard (smallest self-vs-room gap). Live: can change until cAMP closes."
        >
          <Icon icon="refresh-cw" className="h-3 w-3" />
          Wheel Dealer
        </span>
      )}
    </>
  );
}
