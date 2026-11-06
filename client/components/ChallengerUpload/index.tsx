import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useApi } from "@/hooks/useApi";
import { toast } from "sonner";
import { usePointsBubble } from "@/components/PointsBubble/index.js";
import ImageUpload from "@/components/ImageUpload";
import PreworkDoneTile from "@/components/PreworkDoneTile/index.js";
import { compressImage } from "@/lib/compressImage.js";
import { showPreworkResultToast, errorMessage } from "@/lib/preworkResult.js";

const COURSES = ["Why Challenger", "Intro to Challenger Skills"];

type Props = {
  camperId: number;
  camperRole: string;
  links: { label: string; url: string }[];
  isCompleted: boolean;
  submission: Record<string, any> | null;
  flagged?: boolean;
  onComplete: () => void;
};

// Roles that already completed Challenger elsewhere
const EXEMPT_ROLES = ["ae", "account executive", "sdr", "sales development", "psm", "partner", "renewals", "renewal"];

function isExemptRole(role: string): boolean {
  const r = role.toLowerCase();
  return EXEMPT_ROLES.some((exempt) => r.includes(exempt));
}

function CompletedChallenger({ submission, flagged }: { submission: Record<string, any> | null; flagged?: boolean }) {
  if (submission?.auto_completed) {
    return <PreworkDoneTile title="Challenger Sales Methodology" subtitle="Already completed in your role's onboarding" flagged={flagged} />;
  }
  const shots = (Array.isArray(submission?.screenshots) ? submission!.screenshots : []) as { course: string; image: string }[];
  return (
    <PreworkDoneTile title="Challenger Sales Methodology" subtitle="Both course screenshots submitted" flagged={flagged}>
      <div className="grid grid-cols-2 gap-3">
        {COURSES.map((course) => {
          const img = shots.find((s) => s.course === course)?.image ?? "";
          const viewable = img.startsWith("data:image/") && !img.endsWith("...");
          return (
            <div key={course} className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Icon icon="check-circle" className="w-3.5 h-3.5 text-camp-green" />
                {course}
              </p>
              {viewable ? (
                <a href={img} target="_blank" rel="noopener noreferrer" className="block rounded-lg overflow-hidden border border-camp-green/20">
                  <img src={img} alt={`${course} completion`} className="w-full h-24 object-cover" />
                </a>
              ) : (
                <div className="h-24 rounded-lg border border-dashed border-camp-green/30 flex items-center justify-center text-xs text-muted-foreground">
                  Screenshot on file
                </div>
              )}
            </div>
          );
        })}
      </div>
    </PreworkDoneTile>
  );
}

export default function ChallengerUpload({ camperId, camperRole, links, isCompleted, submission, flagged, onComplete }: Props) {
  const showPoints = usePointsBubble();
  const exempt = isExemptRole(camperRole);
  const { run: submit, loading } = useApi("SubmitPreworkValidation");
  const [screenshots, setScreenshots] = useState<Record<string, string>>({});

  const handleScreenshot = useCallback(async (courseName: string, base64: string) => {
    if (!base64) return;
    const small = await compressImage(base64);
    setScreenshots((prev) => ({ ...prev, [courseName]: small }));
  }, []);

  const send = useCallback(async (submission_data: Record<string, any>) => {
    try {
      const result = await submit({ camper_id: camperId, item_key: "challenger_sales", submission_data });
      if (!result?.success) {
        toast.error(result?.message || "Couldn't complete Challenger");
        return;
      }
      showPreworkResultToast("Challenger", result, showPoints);
      onComplete();
    } catch (err) {
      toast.error("Failed: " + errorMessage(err));
    }
  }, [camperId, submit, onComplete, showPoints]);

  const handleAutoComplete = useCallback(() => send({ auto_completed: true }), [send]);

  const uploadedCount = COURSES.filter((c) => screenshots[c]).length;
  const handleSubmit = useCallback(() => {
    if (uploadedCount < COURSES.length) {
      toast.error("Please upload a screenshot for each course");
      return;
    }
    send({ screenshots: COURSES.map((course) => ({ course, image: screenshots[course] })) });
  }, [uploadedCount, screenshots, send]);

  if (isCompleted) return <CompletedChallenger submission={submission} flagged={flagged} />;

  if (exempt) {
    return (
      <div className="p-4 rounded-lg border border-green-200 bg-green-50/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
            <Icon icon="check-circle" className="w-5 h-5 text-green-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-sm text-green-800">Challenger — Already Completed</h4>
            <p className="text-xs text-green-600 mt-0.5">
              As a {camperRole}, you've already completed Challenger in your onboarding. No additional points for this module, but it counts toward your full pre-work completion.
            </p>
          </div>
          <Button size="sm" onClick={handleAutoComplete} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white">
            {loading ? "..." : "Mark Complete"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4 rounded-lg border border-violet-200 bg-violet-50/30">
      <div className="flex items-center gap-2 mb-1">
        <Icon icon="rocket" className="w-5 h-5 text-violet-600" />
        <h4 className="font-semibold text-sm">Challenger Completion</h4>
      </div>

      <p className="text-xs text-muted-foreground">
        Complete both courses, then upload a screenshot of each completion screen as proof.
      </p>

      {links.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {links.map((link, i) => (
            <a
              key={i}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-violet-100 border border-violet-200 text-violet-700 hover:bg-violet-200 transition-colors"
            >
              <Icon icon="external-link" className="w-3 h-3" />
              {link.label}
            </a>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {COURSES.map((course) => (
          <div key={course} className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Icon icon={screenshots[course] ? "check-circle" : "camera"} className={`w-3.5 h-3.5 ${screenshots[course] ? "text-green-500" : ""}`} />
              {course}
            </label>
            {screenshots[course] ? (
              <div className="relative rounded-lg overflow-hidden border border-green-200">
                <img src={screenshots[course]} alt={course} className="w-full h-24 object-cover" />
                <button
                  type="button"
                  aria-label={`Remove ${course} screenshot`}
                  onClick={() => setScreenshots((prev) => { const n = { ...prev }; delete n[course]; return n; })}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs"
                >
                  ×
                </button>
                <div className="absolute bottom-0 inset-x-0 bg-green-600/90 text-white text-[10px] text-center py-0.5 font-medium">
                  Screenshot uploaded
                </div>
              </div>
            ) : (
              <ImageUpload
                value=""
                onChange={(base64: string) => handleScreenshot(course, base64)}
                label="Upload"
                maxSizeMB={5}
              />
            )}
          </div>
        ))}
      </div>

      <Button
        onClick={handleSubmit}
        disabled={loading || uploadedCount < COURSES.length}
        className="w-full bg-violet-600 hover:bg-violet-700 text-white"
        size="sm"
      >
        {loading ? "Completing..." : `Mark Complete (${uploadedCount}/${COURSES.length} uploaded)`}
      </Button>
    </div>
  );
}
