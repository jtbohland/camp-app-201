import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ITEM_TYPES, type HubMember } from "@/lib/teamHub";

export type NewPost = {
  item_type: string;
  title: string;
  content: string | null;
  link_url: string | null;
  assignee_id: number | null;
};

type Props = {
  members: HubMember[];
  saving: boolean;
  /** Pre-selected type, e.g. "task" from the Home to-do list. */
  defaultType?: string;
  onSubmit: (post: NewPost) => Promise<boolean>;
  onCancel: () => void;
};

const PLACEHOLDERS: Record<string, string> = {
  note: "What did you learn or decide?",
  idea: "What should the team try?",
  task: "What needs to get done?",
  resource: "What is this link and why does it matter?",
  doc: "Name of the deck or doc",
};

/** Form for a new Team Hub post. Links and to-do owners are optional. */
export default function HubComposer({ members, saving, defaultType = "note", onSubmit, onCancel }: Props) {
  const [type, setType] = useState(defaultType);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [link, setLink] = useState("");
  const [assignee, setAssignee] = useState<number | null>(null);

  const needsLink = type === "resource" || type === "doc";
  const canSave = title.trim().length > 0 && (!needsLink || link.trim().length > 0) && !saving;

  const submit = async () => {
    if (!canSave) return;
    const ok = await onSubmit({
      item_type: type,
      title: title.trim(),
      content: content.trim() || null,
      link_url: link.trim() || null,
      assignee_id: type === "task" ? assignee : null,
    });
    if (ok) {
      setTitle("");
      setContent("");
      setLink("");
      setAssignee(null);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card/80 p-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {ITEM_TYPES.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setType(t.key)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                type === t.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon icon={t.icon} className="h-3.5 w-3.5" /> {t.label}
            </button>
          ))}
        </div>

        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={PLACEHOLDERS[type] ?? "Title"}
          maxLength={200}
          autoFocus
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void submit(); } }}
        />

        {(needsLink || type !== "task") && (
          <Input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder={needsLink ? "Paste the link (Google Slides, Doc, Glean, …)" : "Link (optional)"}
            maxLength={2000}
          />
        )}

        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={type === "task" ? "Details (optional)" : "Details, takeaways, or context (optional)"}
          rows={3}
          maxLength={5000}
        />

        {type === "task" && members.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Owner:</span>
            {members.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setAssignee(assignee === m.id ? null : m.id)}
                className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                  assignee === m.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {m.first_name} {m.last_name.charAt(0)}.
              </button>
            ))}
          </div>
        )}

        {(type === "note" || type === "idea") && (
          <p className="text-[11px] text-muted-foreground">
            Notes and ideas with some substance (30+ characters) earn Hub Post XP, up to 2 a day.
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
          <Button size="sm" onClick={submit} disabled={!canSave}>
            {saving ? "Posting…" : "Post to Hub"}
          </Button>
        </div>
      </div>
    </div>
  );
}
