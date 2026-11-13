import { Icon } from "@/components/ui/icon";
import { BOARD_SECTION, HOME_TAB, presKey, presTypeMeta, type HubPresentation } from "@/lib/teamHub";
import { DAY_NAMES } from "@/lib/presentationSchedule";

type Props = {
  active: string;
  presentations: HubPresentation[];
  postCounts: Map<string, number>;
  boardCount: number;
  onSelect: (key: string) => void;
};

/** Home · Team Board · one tab per scheduled presentation (grouped by day). */
export default function HubTabBar({ active, presentations, postCounts, boardCount, onSelect }: Props) {
  return (
    <div className="flex w-full min-w-0 max-w-full shrink-0 items-center gap-1 overflow-x-auto border-b border-border bg-muted/20 px-6 py-3">
      <TabButton active={active === HOME_TAB} onClick={() => onSelect(HOME_TAB)} icon="house" label="Home" />
      <TabButton active={active === BOARD_SECTION} onClick={() => onSelect(BOARD_SECTION)} icon="layout-list" label="Team Board" count={boardCount} />

      {presentations.map((p, idx) => {
        const key = presKey(p.id);
        const newDay = idx === 0 || presentations[idx - 1].day_number !== p.day_number;
        return (
          <div key={key} className="flex items-center gap-1">
            {newDay && (
              <span className="select-none whitespace-nowrap pl-2 pr-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
                Day {p.day_number}
              </span>
            )}
            <TabButton
              active={active === key}
              onClick={() => onSelect(key)}
              icon={presTypeMeta(p.presentation_type).icon}
              label={p.title}
              count={postCounts.get(key) ?? 0}
              locked={p.is_locked}
              title={`Day ${p.day_number}${DAY_NAMES[p.day_number] ? ` — ${DAY_NAMES[p.day_number]}` : ""}`}
            />
          </div>
        );
      })}

      {presentations.length === 0 && (
        <span className="flex items-center gap-1 px-3 py-2 text-sm italic text-muted-foreground/60">
          <Icon icon="info" className="h-3.5 w-3.5" />
          Session tabs appear here when counselors schedule presentations
        </span>
      )}
    </div>
  );
}

function TabButton({ active, onClick, icon, label, count = 0, locked, title }: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
  count?: number;
  locked?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      <Icon icon={icon as "house"} className="h-4 w-4" />
      <span className="max-w-[160px] truncate">{label}</span>
      {locked && <Icon icon="lock" className="h-3 w-3 opacity-60" />}
      {count > 0 && (
        <span className={`rounded-full px-1.5 py-0.5 text-xs ${active ? "bg-white/20" : "bg-muted"}`}>{count}</span>
      )}
    </button>
  );
}
