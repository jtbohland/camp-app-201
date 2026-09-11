import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useApi } from "@/hooks/useApi";
import { toast } from "sonner";
import { usePointsBubble } from "@/components/PointsBubble/index.js";
import ImageUpload from "@/components/ImageUpload";

type CourseUpload = {
  name: string;
  screenshot: string | null;
};

type Props = {
  camperId: number;
  camperRole: string;
  links: { label: string; url: string }[];
  onComplete: () => void;
};

// Roles that already completed Challenger elsewhere
const EXEMPT_ROLES = ["ae", "account executive", "sdr", "sales development", "psm", "partner", "renewals", "renewal"];

function isExemptRole(role: string): boolean {
  const r = role.toLowerCase();
  return EXEMPT_ROLES.some((exempt) => r.includes(exempt));
}

export default function ChallengerUpload({ camperId, camperRole, links, onComplete }: Props) {
  const showPoints = usePointsBubble();
  const exempt = isExemptRole(camperRole);
  const { run: submit, loading } = useApi("SubmitPreworkValidation");

  // For exempt roles, show auto-complete
  const handleAutoComplete = useCallback(async () => {
    try {
      const result = await submit({
        camper_id: camperId,
        item_key: "challenger_sales",
        submission_data: { auto_completed: true, reason: `Role: ${camperRole} (exempt — already completed Challenger)`, screenshots: ["auto"] },
      });
      if (result?.success) {
        toast.success("Challenger auto-completed (already done in your role)");
        onComplete();
      }
    } catch (err) {
      const msg = err && typeof err === "object" && "message" in err ? String((err as any).message) : String(err);
      toast.error("Failed: " + msg);
    }
  }, [camperId, camperRole, submit, onComplete]);

  // For non-exempt roles, screenshot upload
  const [courses] = useState<CourseUpload[]>([
    { name: "Why Challenger", screenshot: null },
    { name: "Intro to Challenger Skills", screenshot: null },
  ]);
  const [screenshots, setScreenshots] = useState<Record<string, string>>({});

  const handleScreenshot = useCallback((courseName: string, base64: string) => {
    setScreenshots((prev) => ({ ...prev, [courseName]: base64 }));
  }, []);

  const handleSubmit = useCallback(async () => {
    const uploaded = Object.keys(screenshots);
    if (uploaded.length < courses.length) {
      toast.error("Please upload a screenshot for each course");
      return;
    }
    try {
      const result = await submit({
        camper_id: camperId,
        item_key: "challenger_sales",
        submission_data: {
          screenshots: Object.entries(screenshots).map(([name, img]) => ({ course: name, image: img.slice(0, 100) + "..." })),
          courses_completed: uploaded,
        },
      });
      if (result?.success) {
        toast.success(`Challenger verified! +${result.points_awarded} pts`);
        showPoints(result.points_awarded as number);
        onComplete();
      }
    } catch (err) {
      const msg = err && typeof err === "object" && "message" in err ? String((err as any).message) : String(err);
      toast.error("Failed: " + msg);
    }
  }, [screenshots, courses.length, camperId, submit, onComplete]);

  if (exempt) {
    return (
      <div className="mt-3 p-4 rounded-lg border border-green-200 bg-green-50/30">
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
            {loading ? "..." : "Confirm Complete"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-3 p-4 rounded-lg border border-violet-200 bg-violet-50/30">
      <div className="flex items-center gap-2 mb-1">
        <Icon icon="rocket" className="w-5 h-5 text-violet-600" />
        <h4 className="font-semibold text-sm">Challenger Completion</h4>
      </div>

      <p className="text-xs text-muted-foreground">
        Complete both courses, then upload a screenshot of each completion screen as proof.
      </p>

      {/* Course links */}
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

      {/* Screenshot uploads */}
      <div className="grid grid-cols-2 gap-3">
        {courses.map((course) => (
          <div key={course.name} className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              {screenshots[course.name] ? (
                <Icon icon="check-circle" className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <Icon icon="camera" className="w-3.5 h-3.5" />
              )}
              {course.name}
            </label>
            {screenshots[course.name] ? (
              <div className="relative rounded-lg overflow-hidden border border-green-200">
                <img src={screenshots[course.name]} alt={course.name} className="w-full h-24 object-cover" />
                <div className="absolute top-1 right-1">
                  <button
                    onClick={() => setScreenshots((prev) => { const n = { ...prev }; delete n[course.name]; return n; })}
                    className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs"
                  >
                    ×
                  </button>
                </div>
                <div className="absolute bottom-0 inset-x-0 bg-green-600/90 text-white text-[10px] text-center py-0.5 font-medium">
                  Screenshot uploaded
                </div>
              </div>
            ) : (
              <ImageUpload
                value=""
                onChange={(base64: string) => handleScreenshot(course.name, base64)}
                label="Upload"
              />
            )}
          </div>
        ))}
      </div>

      <Button
        onClick={handleSubmit}
        disabled={loading || Object.keys(screenshots).length < courses.length}
        className="w-full bg-violet-600 hover:bg-violet-700 text-white"
        size="sm"
      >
        {loading ? "Submitting..." : `Mark Complete (${Object.keys(screenshots).length}/${courses.length} uploaded)`}
      </Button>
    </div>
  );
}
