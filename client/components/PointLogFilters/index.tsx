import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type PointLogFilterValues = {
  camperId: string; // "" = all
  dateFrom: string;
  dateTo: string;
  timeFrom: string;
  timeTo: string;
  points: string; // "" = all
};

export const EMPTY_POINT_LOG_FILTERS: PointLogFilterValues = {
  camperId: "",
  dateFrom: "",
  dateTo: "",
  timeFrom: "",
  timeTo: "",
  points: "",
};

type Props = {
  value: PointLogFilterValues;
  onChange: (next: PointLogFilterValues) => void;
  campers: { id: number; name: string }[];
  pointValues: number[];
};

const ALL = "__all";

/** cAMPer, date range, time-of-day range (PT) and point value filters for the Point Log. */
export default function PointLogFilters({ value, onChange, campers, pointValues }: Props) {
  const set = (patch: Partial<PointLogFilterValues>) => onChange({ ...value, ...patch });
  const active = Object.values(value).some(Boolean);

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6 items-end">
      <div className="col-span-2 md:col-span-1 xl:col-span-2">
        <Label className="text-xs text-muted-foreground mb-1 block">cAMPer</Label>
        <Select value={value.camperId || ALL} onValueChange={(v) => set({ camperId: v === ALL ? "" : v })}>
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="All cAMPers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All cAMPers</SelectItem>
            {campers.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name || `cAMPer #${c.id}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs text-muted-foreground mb-1 block">From date</Label>
        <Input type="date" value={value.dateFrom} onChange={(e) => set({ dateFrom: e.target.value })} className="bg-background" />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground mb-1 block">To date</Label>
        <Input type="date" value={value.dateTo} onChange={(e) => set({ dateTo: e.target.value })} className="bg-background" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">From time (PT)</Label>
          <Input type="time" value={value.timeFrom} onChange={(e) => set({ timeFrom: e.target.value })} className="bg-background" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">To time</Label>
          <Input type="time" value={value.timeTo} onChange={(e) => set({ timeTo: e.target.value })} className="bg-background" />
        </div>
      </div>
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Label className="text-xs text-muted-foreground mb-1 block">Points</Label>
          <Select value={value.points || ALL} onValueChange={(v) => set({ points: v === ALL ? "" : v })}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Any</SelectItem>
              {pointValues.map((p) => (
                <SelectItem key={p} value={String(p)}>
                  {p > 0 ? `+${p}` : p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {active && (
          <Button variant="ghost" size="icon" title="Clear filters" onClick={() => onChange(EMPTY_POINT_LOG_FILTERS)}>
            <Icon icon="x" className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
