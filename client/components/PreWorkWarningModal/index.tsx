import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

type Link = { label: string; url: string };

type Props = {
  itemTitle: string;
  missingLinks: Link[];
  onOpenLink: (url: string) => void;
  onForceComplete: () => void;
  onClose: () => void;
};

export default function PreWorkWarningModal({
  itemTitle,
  missingLinks,
  onOpenLink,
  onForceComplete,
  onClose,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="max-w-md w-full mx-4 p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
            <Icon icon="alert-triangle" className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Hold up, cAMPer!</h3>
            <p className="text-sm text-muted-foreground mt-1">
              You're trying to complete <strong>{itemTitle}</strong>, but you haven't opened all the required links yet.
            </p>
          </div>
        </div>

        {/* Missing links */}
        <div className="bg-muted/50 rounded-lg p-4 mb-4">
          <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
            <Icon icon="link" className="w-3.5 h-3.5 text-amber-500" />
            Links you still need to open:
          </p>
          <div className="space-y-2">
            {missingLinks.map((link, i) => (
              <button
                key={i}
                onClick={() => onOpenLink(link.url)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md bg-background border border-border hover:border-primary/30 hover:bg-primary/5 text-left transition-colors"
              >
                <Icon icon="external-link" className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                <span className="text-xs font-medium text-primary truncate">{link.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <Button onClick={onClose} className="w-full bg-camp-green hover:bg-camp-green/90">
            <Icon icon="arrow-left" className="w-4 h-4 mr-1.5" />
            Go Back & Complete the Links
          </Button>
          <button
            onClick={onForceComplete}
            className="w-full text-xs text-muted-foreground/60 hover:text-muted-foreground py-2 transition-colors"
          >
            Complete anyway (may result in point deduction)
          </button>
        </div>
      </Card>
    </div>
  );
}
