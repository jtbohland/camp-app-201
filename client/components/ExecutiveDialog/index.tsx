import { useState, useEffect, useCallback } from "react";
import { Icon } from "@/components/ui/icon";
import ProfilePhotoUpload from "@/components/ProfilePhotoUpload/index.js";
import SpeakerShareLink from "@/components/SpeakerShareLink/index.js";
import type { Executive } from "@/lib/speakers.js";

export type ExecutiveFormData = {
  name: string;
  title: string;
  photo_url: string;
  bio: string;
  linkedin_url: string;
  email: string;
  slack_name: string;
};

type ExecutiveDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Resolves with the saved speaker's id so the share link can be shown right away. */
  onSave: (data: ExecutiveFormData) => Promise<number | null>;
  executive?: Executive | null;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INPUT = "w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring";

export default function ExecutiveDialog({ open, onClose, onSave, executive }: ExecutiveDialogProps) {
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [bio, setBio] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [email, setEmail] = useState("");
  const [slackName, setSlackName] = useState("");
  const [saving, setSaving] = useState(false);
  /** After adding a new speaker, show their share link instead of closing. */
  const [justAddedId, setJustAddedId] = useState<number | null>(null);

  useEffect(() => {
    setJustAddedId(null);
    setName(executive?.name ?? "");
    setTitle(executive?.title ?? "");
    setPhotoUrl(executive?.photo_url ?? "");
    setBio(executive?.bio ?? "");
    setLinkedinUrl(executive?.linkedin_url ?? "");
    setEmail(executive?.email ?? "");
    setSlackName(executive?.slack_name ?? "");
  }, [executive, open]);

  const emailValid = EMAIL_RE.test(email.trim());
  const canSave = !!name.trim() && !!title.trim() && emailValid && !!slackName.trim();

  const handleSubmit = useCallback(async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const id = await onSave({
        name: name.trim(),
        title: title.trim(),
        photo_url: photoUrl.trim(),
        bio: bio.trim(),
        linkedin_url: linkedinUrl.trim(),
        email: email.trim().toLowerCase(),
        slack_name: slackName.trim().replace(/^@/, ""),
      });
      if (!executive && id) setJustAddedId(id);
      else onClose();
    } catch {
      // onSave already showed the error.
    } finally {
      setSaving(false);
    }
  }, [canSave, name, title, photoUrl, bio, linkedinUrl, email, slackName, onSave, onClose, executive]);

  if (!open) return null;

  // Speaker to show the share link for: the one being edited, or the one just added.
  const linkSpeaker: Executive | null = executive
    ? executive
    : justAddedId
      ? { id: justAddedId, name, title, photo_url: photoUrl, bio, linkedin_url: linkedinUrl, is_active: true, email, slack_name: slackName, link_copied_at: null }
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl w-full max-w-md mx-4 shadow-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {justAddedId ? "Speaker added" : executive ? "Edit Speaker" : "Add Speaker"}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Close">
            <Icon icon="x" className="w-5 h-5" />
          </button>
        </div>

        {justAddedId && linkSpeaker ? (
          <div className="flex flex-col gap-3 p-5">
            <p className="text-sm text-foreground">
              <span className="font-semibold">{name}</span> is in the speaker library. Send them this link so they can see the
              cohort, the agenda, and answer their Q&A.
            </p>
            <SpeakerShareLink executive={linkSpeaker} />
          </div>
        ) : (
          <div className="flex flex-col gap-4 p-5 overflow-y-auto">
            {executive && <SpeakerShareLink executive={executive} />}
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Name *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className={INPUT} placeholder="e.g. Sarah Chen" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Title / Role *</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className={INPUT} placeholder="e.g. VP of Engineering" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`${INPUT} ${email && !emailValid ? "border-destructive" : ""}`}
                  placeholder="sarah.chen@amplitude.com"
                />
                <p className="mt-1 text-[10px] text-muted-foreground">Gives them app access via the share link</p>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Slack name *</label>
                <input value={slackName} onChange={(e) => setSlackName(e.target.value)} className={INPUT} placeholder="@sarah.chen" />
                <p className="mt-1 text-[10px] text-muted-foreground">Shown to cAMPers so they can reach out</p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Photo</label>
              <div className="flex items-center gap-4">
                <ProfilePhotoUpload currentPhotoUrl={photoUrl || null} email="" name={name || "Speaker"} onChange={setPhotoUrl} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">
                    Click the photo or drag & drop an image to upload (PNG, JPG, or WebP; large photos are shrunk automatically. GIFs under 2MB).
                  </p>
                  {photoUrl && (
                    <button type="button" onClick={() => setPhotoUrl("")} className="mt-1 text-xs font-medium text-destructive hover:underline">
                      Remove photo
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Bio</label>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className={`${INPUT} resize-none`} placeholder="Short bio..." />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">LinkedIn URL</label>
              <input value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} className={INPUT} placeholder="https://linkedin.com/in/..." />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
          {justAddedId ? (
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90">
              Done
            </button>
          ) : (
            <>
              <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-foreground bg-muted rounded-lg hover:bg-muted/80 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!canSave || saving}
                className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving ? "Saving..." : executive ? "Update" : "Add Speaker"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
