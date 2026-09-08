import { Icon } from "@/components/ui/icon";
import type { IconName } from "lucide-react/dynamic";

type JourneyStep = {
  icon: IconName;
  label: string;
  description: string;
  status: "completed" | "active" | "upcoming" | "destination";
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
      status: profileCompleted ? "completed" : "active",
    },
    {
      icon: "trending-up",
      label: "Ascent",
      description: "Pre-work & preparation",
      status: profileCompleted ? (preworkDone ? "completed" : "active") : "upcoming",
    },
    {
      icon: "package",
      label: "Product 101",
      description: "Core product knowledge",
      status: preworkDone && profileCompleted ? "active" : "upcoming",
    },
    {
      icon: "mountain",
      label: "cAMP 201",
      description: "The summit experience",
      status: "destination",
    },
  ];

  return (
    <div className="relative flex flex-col gap-0">
      {steps.map((step, idx) => {
        const isLast = idx === steps.length - 1;
        const isDestination = step.status === "destination";

        return (
          <div key={idx} className="flex items-stretch gap-4 relative">
            {/* Vertical connector + node column */}
            <div className="flex flex-col items-center w-10 shrink-0">
              {/* Node */}
              <div
                className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all shrink-0 ${
                  step.status === "completed"
                    ? "bg-camp-green border-camp-green text-white"
                    : isDestination
                      ? "bg-camp-amber/20 border-camp-amber text-camp-amber ring-4 ring-camp-amber/10"
                      : step.status === "active"
                        ? "bg-muted border-camp-green/50 text-camp-green"
                        : "bg-muted border-border text-muted-foreground"
                }`}
              >
                {step.status === "completed" ? (
                  <Icon icon="check" className="w-4 h-4" />
                ) : (
                  <Icon icon={step.icon} className="w-4 h-4" />
                )}
              </div>

              {/* Connector line */}
              {!isLast && (
                <div className={`w-0.5 flex-1 min-h-[16px] ${
                  step.status === "completed"
                    ? "bg-camp-green"
                    : "bg-border"
                }`} />
              )}
            </div>

            {/* Content */}
            <div className={`flex-1 pb-4 pt-1.5 ${isLast ? "pb-0" : ""}`}>
              <div className={`flex items-center gap-2 ${
                isDestination ? "px-4 py-3 rounded-lg bg-camp-amber/10 border border-camp-amber/20 -ml-1" : ""
              }`}>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${
                      step.status === "completed" ? "text-camp-green" :
                      isDestination ? "text-camp-amber" :
                      step.status === "active" ? "text-foreground" : "text-muted-foreground"
                    }`}>
                      {step.label}
                    </span>
                    {isDestination && (
                      <span className="text-[10px] bg-camp-amber/20 text-camp-amber px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">
                        Your destination
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
