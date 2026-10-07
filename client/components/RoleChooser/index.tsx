import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import type { IconName } from "lucide-react/dynamic";

export type JoinRole = "camper" | "manager" | "counselor";

type RoleOption = {
  role: JoinRole;
  icon: IconName;
  title: string;
  description: string;
  tint: string;
};

const OPTIONS: RoleOption[] = [
  { role: "camper", icon: "tent", title: "I'm a cAMPer", description: "I'm attending cAMP 201 as a new hire", tint: "bg-camp-green/10 text-camp-green" },
  { role: "manager", icon: "binoculars", title: "I'm a Manager", description: "I'm here to track my new hire's progress", tint: "bg-blue-500/10 text-blue-600" },
  { role: "counselor", icon: "shield", title: "cAMP Counselor", description: "I'm running cAMP 201 (password required)", tint: "bg-camp-amber/15 text-camp-amber" },
];

export default function RoleChooser({ onChoose }: { onChoose: (role: JoinRole) => void }) {
  return (
    <div className="flex items-center justify-center min-h-full p-8">
      <div className="w-full max-w-3xl flex flex-col items-center gap-8">
        <div className="flex flex-col items-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-camp-green/10 mb-4">
            <Icon icon="mountain" className="w-8 h-8 text-camp-green" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Welcome to cAMP 201</h1>
          <p className="text-sm text-muted-foreground mt-1">How are you joining us?</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
          {OPTIONS.map((opt) => (
            <Card
              key={opt.role}
              role="button"
              tabIndex={0}
              onClick={() => onChoose(opt.role)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onChoose(opt.role)}
              className="p-6 cursor-pointer hover:shadow-lg transition-all hover:border-primary/40 group text-center"
            >
              <div className="flex flex-col items-center gap-3">
                <div className={`flex items-center justify-center w-14 h-14 rounded-full transition-colors ${opt.tint}`}>
                  <Icon icon={opt.icon} className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-foreground">{opt.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{opt.description}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
