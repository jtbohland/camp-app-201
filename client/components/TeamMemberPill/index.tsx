import { getRoleStyle } from "@/lib/roles.js";
import { getCountryStyle } from "@/lib/countryUtils.js";

type Props = {
  firstName: string;
  lastName: string;
  points: number;
  role: string | null;
  country: string | null;
  isMe: boolean;
};

/** Team tile name pill: country flag + name + points, colored by the cAMPer's role (no role text). */
export default function TeamMemberPill({ firstName, lastName, points, role, country, isMe }: Props) {
  const pill = getRoleStyle(role).pill;
  const flag = getCountryStyle(country)?.flag;
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${pill} ${isMe ? "font-semibold ring-1 ring-current" : ""}`}
      title={country ?? undefined}
    >
      {flag && <span aria-hidden="true">{flag}</span>}
      {firstName} {lastName.charAt(0)}.
      <span className="opacity-70 text-[10px]">{points}</span>
    </span>
  );
}
