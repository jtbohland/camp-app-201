import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  type AgendaItem,
  GRID_START_MIN,
  GRID_END_MIN,
  timeToMinutes,
  minutesToTime,
  formatTime,
} from "@/components/DaySchedule";
import { findSlotConflict } from "@/lib/agendaRules";

type Props = {
  item: AgendaItem | null;
  allItems: AgendaItem[];
  /** Library default length for this session, if it came from the Session Bank. */
  defaultMinutes: number | null;
  /** Session Bank titles, so a rename can say whether it creates or reuses a library session. */
  bankTitles: string[];
  saving: boolean;
  onCancel: () => void;
  onSave: (item: AgendaItem, startTime: string, endTime: string, title: string) => void;
};

const START_OPTIONS: number[] = [];
for (let m = GRID_START_MIN; m < GRID_END_MIN; m += 15) START_OPTIONS.push(m);

const LENGTH_OPTIONS: number[] = [];
for (let m = 5; m <= 240; m += 5) LENGTH_OPTIONS.push(m);

function lengthLabel(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m} min`;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}

/**
 * Changes one scheduled tile's name and timing. The original Session Bank session is not touched;
 * a new name is added to the Session Bank as its own session.
 */
export default function EditAgendaItemDialog({ item, allItems, defaultMinutes, bankTitles, saving, onCancel, onSave }: Props) {
  const [startMin, setStartMin] = useState(GRID_START_MIN);
  const [length, setLength] = useState(30);
  const [title, setTitle] = useState("");

  useEffect(() => {
    if (!item) return;
    const s = timeToMinutes(item.start_time);
    setStartMin(s);
    setLength(timeToMinutes(item.end_time) - s);
    setTitle(item.title);
  }, [item]);

  const trimmedTitle = title.trim();
  const renamed = !!item && trimmedTitle !== item.title.trim();
  const inLibrary = useMemo(
    () => bankTitles.some((t) => t.trim().toLowerCase() === trimmedTitle.toLowerCase()),
    [bankTitles, trimmedTitle]
  );

  // Keep odd existing values (e.g. 8:40 start, 52 min) selectable.
  const startOptions = useMemo(
    () => (START_OPTIONS.includes(startMin) ? START_OPTIONS : [...START_OPTIONS, startMin].sort((a, b) => a - b)),
    [startMin]
  );
  const lengthOptions = useMemo(
    () => (LENGTH_OPTIONS.includes(length) ? LENGTH_OPTIONS : [...LENGTH_OPTIONS, length].sort((a, b) => a - b)),
    [length]
  );

  const endMin = startMin + length;
  const conflict = item ? findSlotConflict(allItems, item.day_number, startMin, endMin, item.id) : null;

  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit session</DialogTitle>
          <DialogDescription>
            Only changes this tile on this day. The Session Bank original stays the same.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Session name</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} className="text-sm" />
          {renamed && trimmedTitle && (
            <p className="flex items-start gap-1 text-xs text-camp-green">
              <Icon icon="library" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                {inLibrary
                  ? `"${trimmedTitle}" is already in the Session Bank, so this tile will use it.`
                  : `"${trimmedTitle}" will be added to the Session Bank as a new session.`}{" "}
                "{item?.title}" stays in the library as is.
              </span>
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Start time</Label>
            <Select value={String(startMin)} onValueChange={(v) => setStartMin(Number(v))}>
              <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-64">
                {startOptions.map((m) => (
                  <SelectItem key={m} value={String(m)}>{formatTime(minutesToTime(m))}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Length</Label>
            <Select value={String(length)} onValueChange={(v) => setLength(Number(v))}>
              <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-64">
                {lengthOptions.map((m) => (
                  <SelectItem key={m} value={String(m)}>{lengthLabel(m)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-1 text-xs">
          <p className="text-muted-foreground">
            Ends at <span className="font-medium text-foreground">{formatTime(minutesToTime(Math.min(endMin, 24 * 60 - 1)))}</span>
            {defaultMinutes !== null && !renamed && (
              <>
                {" · "}Library default: {lengthLabel(defaultMinutes)}
                {length !== defaultMinutes && (
                  <button
                    type="button"
                    className="ml-1.5 text-camp-green hover:underline"
                    onClick={() => setLength(defaultMinutes)}
                  >
                    Reset
                  </button>
                )}
              </>
            )}
          </p>
          {conflict && (
            <p className="flex items-center gap-1 text-destructive">
              <Icon icon="circle-alert" className="h-3.5 w-3.5" />
              {conflict}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
          <Button
            onClick={() => item && onSave(item, minutesToTime(startMin), minutesToTime(endMin), trimmedTitle)}
            disabled={saving || !!conflict || !trimmedTitle}
            className="bg-camp-green hover:bg-camp-green/90 text-white"
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
