import { Icon } from "@/components/ui/icon";
import type { IconName } from "lucide-react/dynamic";

type JourneyStep = {
  icon: IconName;
  label: string;
  description: string;
  status: "completed" | "current" | "upcoming";
};

type JourneyPathProps = {
  profileCompleted: boolean;
  preworkDone: boolean;
};

export default function JourneyPath({ profileCompleted, preworkDone }: JourneyPathProps) {
  const steps: JourneyStep[] = [
    {
      icon: "compass",
      label: "Path Finder",
      description: "Registration & profile setup",
      status: profileCompleted ? "completed" : "current",
    },
    {
      icon: "trending-up",
      label: "Ascent",
      description: "Pre-work & preparation",
      status: profileCompleted ? (preworkDone ? "completed" : "current") : "upcoming",
    },
    {
      icon: "package",
      label: "Product 101",
      description: "Core product knowledge",
      status: preworkDone && profileCompleted ? "current" : "upcoming",
    },
    {
      icon: "mountain",
      label: "cAMP 201",
      description: "The summit experience",
      status: "upcoming",
    },
  ];

  return (
    <div className="relative">
      {/* Vertical trail line */}
      <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gradient-to-b from-camp-green via-camp-green/50 to-border" />

      <div className="flex flex-col gap-2">
        {steps.map((step, idx) => (
          <div key={idx} className="flex items-center gap-4 relative pl-2">
            {/* Node */}
            <div
              className={`relative z-10 flex items-center justify-center w-9 h-9 rounded-full border-2 transition-all ${
                step.status === "completed"
                  ? "bg-camp-green border-camp-green text-white"
                  : step.status === "current"
                  ? "bg-camp-amber/20 border-camp-amber text-camp-amber"
                  : "bg-muted border-border text-muted-foreground"
              }`}
            >
              {step.status === "completed" ? (
                <Icon icon="check" className="w-4 h-4" />
              ) : (
                <Icon icon={step.icon} className="w-4 h-4" />
              )}
            </div>

            {/* Content */}
            <div className={`flex-1 py-3 px-4 rounded-lg ${
              step.status === "current" ? "bg-camp-amber-light/50 border border-camp-amber/20" : ""
            }`}>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold ${
                  step.status === "completed" ? "text-camp-green" :
                  step.status === "current" ? "text-camp-amber" : "text-muted-foreground"
                }`}>
                  {step.label}
                </span>
                {step.status === "current" && (
                  <span className="text-xs bg-camp-amber/20 text-camp-amber px-2 py-0.5 rounded-full font-medium">
                    You are here
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
