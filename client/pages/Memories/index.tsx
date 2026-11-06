import { Icon } from "@/components/ui/icon";
import MemoriesTab from "@/components/MemoriesTab/index.js";

export default function MemoriesPage() {
  return (
    <div className="flex flex-col h-full w-full overflow-auto">
      <div className="sticky top-0 z-10 bg-background border-b border-border px-6 py-5">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Icon icon="camera" className="w-6 h-6 text-rose-400" />
          Memories
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Photos and favorite moments shared by your cohort
        </p>
      </div>
      <div className="flex-1 p-6">
        <MemoriesTab />
      </div>
    </div>
  );
}
