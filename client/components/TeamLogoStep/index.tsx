import { useCallback, useState } from "react";
import { Icon } from "@/components/ui/icon";
import ImageUpload from "@/components/ImageUpload/index.js";
import GeminiLogoGenerator from "@/components/GeminiLogoGenerator/index.js";
import TeamLogoBadge from "@/components/TeamLogoBadge/index.js";
import { fitLogo } from "@/lib/fitLogo.js";

type Mode = "choose" | "upload" | "gemini";

type Props = {
  teamName: string;
  color: string;
  logo: string;
  onChange: (logo: string) => void;
};

export default function TeamLogoStep({ teamName, color, logo, onChange }: Props) {
  const [mode, setMode] = useState<Mode>(logo ? "upload" : "choose");
  // The raw Gemini image behind the current logo, so its option stays highlighted.
  const [geminiSource, setGeminiSource] = useState<string | null>(null);

  const handleUpload = useCallback(async (raw: string) => {
    if (!raw) return;
    setGeminiSource(null);
    onChange(await fitLogo(raw));
  }, [onChange]);

  const handlePick = useCallback(async (raw: string) => {
    setGeminiSource(raw);
    onChange(await fitLogo(raw));
  }, [onChange]);

  const handleRemove = useCallback(() => {
    setGeminiSource(null);
    onChange("");
  }, [onChange]);

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-medium text-foreground block">Team Logo</label>

      {/* Current logo — exactly how it will look on the team badge */}
      {logo && (
        <div className="flex items-center gap-3 rounded-lg border border-camp-green/30 bg-camp-green/5 p-2.5">
          <TeamLogoBadge src={logo} name={teamName} color={color} size="lg" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground">Your team logo</p>
            <p className="text-[10px] text-muted-foreground">This is how it shows on your team badge.</p>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="px-2 py-1 text-xs rounded border border-border hover:bg-muted flex items-center gap-1"
          >
            <Icon icon="trash-2" className="w-3 h-3" />
            Remove
          </button>
        </div>
      )}

      {mode === "choose" ? (
        <div className="grid grid-cols-2 gap-2">
          <ChoiceButton icon="upload" title="Upload a logo" hint="Click or drag in an image" onClick={() => setMode("upload")} tone="primary" />
          <ChoiceButton icon="sparkles" title="Design with Gemini" hint="Describe it, pick from 3" onClick={() => setMode("gemini")} tone="purple" />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <Icon icon={mode === "upload" ? "upload" : "sparkles"} className="w-3.5 h-3.5" />
              {mode === "upload" ? "Upload a logo" : "Design with Gemini"}
            </span>
            <button
              type="button"
              onClick={() => setMode(mode === "upload" ? "gemini" : "upload")}
              className="text-[11px] font-medium text-primary hover:underline flex items-center gap-1"
            >
              <Icon icon={mode === "upload" ? "sparkles" : "upload"} className="w-3 h-3" />
              {mode === "upload" ? "Design with Gemini instead" : "Upload instead"}
            </button>
          </div>

          {mode === "upload" ? (
            <ImageUpload
              value=""
              onChange={handleUpload}
              label=""
              hint={logo ? "Drop or click to replace your logo" : "Drag & drop or click to upload (PNG, JPG, WebP)"}
              shape="square"
              maxSizeMB={5}
            />
          ) : (
            <GeminiLogoGenerator teamName={teamName} color={color} selectedSource={geminiSource} onPick={handlePick} />
          )}
        </>
      )}
    </div>
  );
}

function ChoiceButton({ icon, title, hint, onClick, tone }: {
  icon: "upload" | "sparkles";
  title: string;
  hint: string;
  onClick: () => void;
  tone: "primary" | "purple";
}) {
  const styles = tone === "purple"
    ? "border-purple-200 bg-purple-50/60 hover:border-purple-400 text-purple-700"
    : "border-primary/20 bg-primary/5 hover:border-primary/50 text-primary";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-1 rounded-lg border-2 border-dashed p-3 text-center transition-colors ${styles}`}
    >
      <Icon icon={icon} className="w-5 h-5" />
      <span className="text-xs font-semibold">{title}</span>
      <span className="text-[10px] opacity-70">{hint}</span>
    </button>
  );
}
