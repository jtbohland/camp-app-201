import { useState, useCallback, useMemo } from "react";
import { useApi } from "@/hooks/useApi.js";
import { Icon } from "@/components/ui/icon";
import { toast } from "sonner";
import ImageUpload from "@/components/ImageUpload/index.js";

// 24 camping/nature-themed colors with descriptive names
const NATURE_PALETTE: { hex: string; name: string }[] = [
  { hex: "#2d6a4f", name: "Forest Green" },
  { hex: "#1b4332", name: "Deep Pine" },
  { hex: "#40916c", name: "Fern" },
  { hex: "#52b788", name: "Sage" },
  { hex: "#606c38", name: "Olive" },
  { hex: "#283618", name: "Moss" },
  { hex: "#d4a373", name: "Sandstone" },
  { hex: "#bc6c25", name: "Amber Trail" },
  { hex: "#dda15e", name: "Honey" },
  { hex: "#8b5e3c", name: "Bark" },
  { hex: "#6f4e37", name: "Campfire" },
  { hex: "#3a5a8c", name: "Mountain Blue" },
  { hex: "#2b4570", name: "Lake" },
  { hex: "#1d3557", name: "Twilight" },
  { hex: "#457b9d", name: "River" },
  { hex: "#6b4c9a", name: "Dusk Purple" },
  { hex: "#7b2d8b", name: "Wildflower" },
  { hex: "#9c4dcc", name: "Thistle" },
  { hex: "#c44536", name: "Ember" },
  { hex: "#8d2b23", name: "Redwood" },
  { hex: "#e76f51", name: "Sunset" },
  { hex: "#264653", name: "Deep Teal" },
  { hex: "#2a9d8f", name: "Evergreen" },
  { hex: "#555b6e", name: "Granite" },
];

type CreateTeamDialogProps = {
  onClose: () => void;
  onCreated: () => void;
  usedColors?: string[];
};

type LogoTab = "upload" | "generate";

export default function CreateTeamDialog({ onClose, onCreated, usedColors = [] }: CreateTeamDialogProps) {
  const [name, setName] = useState("");
  const [logoBase64, setLogoBase64] = useState("");
  const [color, setColor] = useState("");
  const [logoTab, setLogoTab] = useState<LogoTab>("upload");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiDescription, setAiDescription] = useState("");

  const { run: createTeam, loading } = useApi("CreateTeam");
  const { run: generateLogo, loading: generating } = useApi("GenerateTeamLogo");

  // Track which colors are taken
  const usedColorsLower = useMemo(() => usedColors.map(c => c.toLowerCase()), [usedColors]);

  // Auto-select first available color
  const availableColors = useMemo(() =>
    NATURE_PALETTE.filter(c => !usedColorsLower.includes(c.hex.toLowerCase())),
    [usedColorsLower]
  );

  // Set default color on mount
  useState(() => {
    if (!color && availableColors.length > 0) {
      setColor(availableColors[0].hex);
    }
  });

  const handleGenerate = useCallback(async () => {
    if (!aiPrompt.trim()) {
      toast.error("Enter a concept or theme for your logo");
      return;
    }
    if (!name.trim()) {
      toast.error("Enter a team name first");
      return;
    }
    try {
      const result = await generateLogo({
        teamName: name.trim(),
        prompt: aiPrompt.trim(),
        color: color || "#2d6a4f",
      });
      if (result?.logoDescription) {
        setAiDescription(result.logoDescription);
        toast.success("Logo concept generated! Use this as inspiration for your team logo.");
      }
    } catch (error) {
      const message = error && typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message) : String(error);
      toast.error("AI generation failed: " + message);
    }
  }, [aiPrompt, name, color, generateLogo]);

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) {
      toast.error("Team name is required");
      return;
    }
    if (!logoBase64) {
      toast.error("A team logo is required — upload an image or create one!");
      return;
    }
    if (!color) {
      toast.error("Pick a team color");
      return;
    }
    try {
      await createTeam({ name: name.trim(), logo_url: logoBase64, color });
      toast.success(`Team "${name}" created! 🏕️`);
      onCreated();
    } catch (error) {
      const message = error && typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message) : String(error);
      toast.error("Failed to create team: " + message);
    }
  }, [name, logoBase64, color, createTeam, onCreated]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-foreground mb-1">🏕️ Create Team</h2>
        <p className="text-xs text-muted-foreground mb-5">Every team needs a name, color, and logo to compete!</p>

        <div className="flex flex-col gap-5">
          {/* Team Name */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Team Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Trail Blazers"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* Team Color — expanded palette */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Team Color *</label>
            <div className="grid grid-cols-8 gap-1.5">
              {NATURE_PALETTE.map((c) => {
                const isTaken = usedColorsLower.includes(c.hex.toLowerCase());
                return (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => !isTaken && setColor(c.hex)}
                    disabled={isTaken}
                    title={isTaken ? `${c.name} (taken)` : c.name}
                    className={`w-7 h-7 rounded-full border-2 transition-all relative ${
                      color === c.hex
                        ? "border-foreground scale-110 ring-2 ring-primary/30"
                        : isTaken
                          ? "border-transparent opacity-25 cursor-not-allowed"
                          : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: c.hex }}
                  >
                    {isTaken && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <Icon icon="x" className="w-3 h-3 text-white/80" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {color && (
              <p className="text-xs text-muted-foreground mt-1">
                Selected: <span className="font-medium" style={{ color }}>{NATURE_PALETTE.find(c => c.hex === color)?.name ?? color}</span>
              </p>
            )}
          </div>

          {/* Team Logo — tabs for upload vs AI */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Team Logo *</label>
            <div className="flex gap-1 mb-3">
              <button
                type="button"
                onClick={() => setLogoTab("upload")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  logoTab === "upload"
                    ? "bg-primary/10 text-primary border border-primary/30"
                    : "text-muted-foreground hover:bg-muted border border-transparent"
                }`}
              >
                <Icon icon="upload" className="w-3.5 h-3.5" />
                Upload
              </button>
              <button
                type="button"
                onClick={() => setLogoTab("generate")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  logoTab === "generate"
                    ? "bg-purple-100 text-purple-700 border border-purple-300"
                    : "text-muted-foreground hover:bg-muted border border-transparent"
                }`}
              >
                <Icon icon="sparkles" className="w-3.5 h-3.5" />
                AI Assist
              </button>
            </div>

            {logoTab === "upload" && (
              <ImageUpload
                value={logoBase64}
                onChange={setLogoBase64}
                label=""
                hint="Drag & drop your team logo (PNG, JPG, GIF, WebP — max 2MB)"
                shape="square"
                maxSizeMB={2}
              />
            )}

            {logoTab === "generate" && (
              <div className="flex flex-col gap-3">
                <p className="text-xs text-muted-foreground">
                  Describe your logo concept and our AI will generate a description to inspire your design. Upload the final image above.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="e.g. fierce bear with a compass, mountain sunrise…"
                    className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-purple-400/40"
                    onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                  />
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={generating || !aiPrompt.trim() || !name.trim()}
                    className="px-3 py-2 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                  >
                    {generating ? (
                      <Icon icon="loader-2" className="w-4 h-4 animate-spin" />
                    ) : (
                      <Icon icon="sparkles" className="w-4 h-4" />
                    )}
                    {generating ? "Generating…" : "Generate"}
                  </button>
                </div>

                {aiDescription && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                    <p className="text-xs font-medium text-purple-700 mb-1">✨ AI Logo Concept:</p>
                    <p className="text-sm text-purple-900">{aiDescription}</p>
                    <p className="text-[10px] text-purple-500 mt-2 italic">
                      Use this as inspiration — create or find a matching image and upload it above!
                    </p>
                  </div>
                )}

                {/* Also show upload here for convenience */}
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-2">Upload your final logo:</p>
                  <ImageUpload
                    value={logoBase64}
                    onChange={setLogoBase64}
                    label=""
                    hint="Upload your logo image here"
                    shape="square"
                    maxSizeMB={2}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-foreground border border-border rounded-lg hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !name.trim() || !logoBase64 || !color}
            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? "Creating…" : "Create Team"}
          </button>
        </div>
      </div>
    </div>
  );
}
