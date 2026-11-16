type Props = {
  icon: string;
  title: string;
  hint: string;
  values: string[];
  placeholders: string[];
  tone: "amber" | "green";
  onChange: (index: number, value: string) => void;
};

const TONES = {
  amber: { num: "text-amber-400", input: "border-amber-200 focus:ring-amber-300" },
  green: { num: "text-green-500", input: "border-green-200 focus:ring-green-300" },
};

/** Three numbered lines (Glow or Grow). */
export default function FeedbackLines({ icon, title, hint, values, placeholders, tone, onChange }: Props) {
  const t = TONES[tone];
  const filled = values.filter((v) => v.trim()).length;
  return (
    <div>
      <h4 className="mb-2 flex items-center gap-2 text-sm font-bold">
        <span className="text-lg">{icon}</span> {title}
        <span className="text-xs font-normal text-muted-foreground">— {hint}</span>
        <span className={`ml-auto text-xs font-medium ${filled === values.length ? "text-emerald-600" : "text-muted-foreground"}`}>
          {filled}/{values.length}
        </span>
      </h4>
      <div className="space-y-2">
        {values.map((val, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className={`w-4 text-xs font-bold ${t.num}`}>{i + 1}.</span>
            <input
              type="text"
              value={val}
              maxLength={1000}
              onChange={(e) => onChange(i, e.target.value)}
              placeholder={placeholders[i]}
              className={`flex-1 rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 ${t.input}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
