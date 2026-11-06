import { Icon } from "@/components/ui/icon";
import GraduationSummaryTab from "@/components/GraduationSummaryTab/index.js";

export default function GraduationPage() {
  return (
    <div className="flex flex-col h-full w-full overflow-auto">
      <div className="sticky top-0 z-10 bg-background border-b border-border px-6 py-5">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Icon icon="graduation-cap" className="w-6 h-6 text-amber-400" />
          Graduation
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your cAMP journey summary
        </p>
      </div>
      <div className="flex-1 p-6">
        <GraduationSummaryTab />
      </div>
    </div>
  );
}
