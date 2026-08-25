import { useState, useEffect, useCallback } from "react";
import { Icon } from "@/components/ui/icon";

type Executive = {
  id: number;
  name: string;
  title: string;
  photo_url: string | null;
  bio: string | null;
  linkedin_url: string | null;
  is_active: boolean;
};

type ExecutiveDialogProps = {
  open: boolean;
  onClose: () => void;
  onSave: (data: { name: string; title: string; photo_url: string; bio: string; linkedin_url: string }) => Promise<void>;
  executive?: Executive | null;
};

export default function ExecutiveDialog({ open, onClose, onSave, executive }: ExecutiveDialogProps) {
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [bio, setBio] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (executive) {
      setName(executive.name);
      setTitle(executive.title);
      setPhotoUrl(executive.photo_url ?? "");
      setBio(executive.bio ?? "");
      setLinkedinUrl(executive.linkedin_url ?? "");
    } else {
      setName("");
      setTitle("");
      setPhotoUrl("");
      setBio("");
      setLinkedinUrl("");
    }
  }, [executive, open]);

  const handleSubmit = useCallback(async () => {
    if (!name.trim() || !title.trim()) return;
    setSaving(true);
    try {
      await onSave({ name: name.trim(), title: title.trim(), photo_url: photoUrl.trim(), bio: bio.trim(), linkedin_url: linkedinUrl.trim() });
      onClose();
    } finally {
      setSaving(false);
    }
  }, [name, title, photoUrl, bio, linkedinUrl, onSave, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl w-full max-w-md mx-4 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {executive ? "Edit Executive" : "Add Executive"}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <Icon icon="x" className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="flex flex-col gap-4 p-5">
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="e.g. Sarah Chen"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Title / Role *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="e.g. VP of Engineering"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Photo URL</label>
            <input
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              placeholder="Short bio..."
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">LinkedIn URL</label>
            <input
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="https://linkedin.com/in/..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-foreground bg-muted rounded-lg hover:bg-muted/80 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || !title.trim() || saving}
            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? "Saving..." : executive ? "Update" : "Add Executive"}
          </button>
        </div>
      </div>
    </div>
  );
}
