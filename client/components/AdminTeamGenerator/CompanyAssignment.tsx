import { useApi } from "@/hooks/useApi.js";
import { Icon } from "@/components/ui/icon";
import { toast } from "sonner";

const COMPANIES = [
  { slug: "doordash", name: "DoorDash", emoji: "🚗", color: "#FF3008" },
  { slug: "coursera", name: "Coursera", emoji: "🎓", color: "#0056D2" },
  { slug: "quickbooks", name: "Intuit QuickBooks", emoji: "💰", color: "#2CA01C" },
  { slug: "zillow", name: "Zillow", emoji: "🏠", color: "#006AFF" },
];

type CompanyAssignmentProps = {
  teams: any[];
  onChanged: () => void;
};

export default function CompanyAssignment({ teams, onChanged }: CompanyAssignmentProps) {
  const { run: assignCompany, loading: assigning } = useApi("AssignCompanyToTeam");

  return (
    <div className="bg-amber-500/10 border border-amber-400/30 rounded-lg p-4">
      <p className="text-sm text-amber-700 flex items-center gap-2">
        <Icon icon="triangle-alert" className="w-4 h-4" />
        {teams.length} team{teams.length !== 1 ? "s" : ""} already exist. Teams must be deleted before regenerating.
      </p>
      <div className="mt-4 pt-4 border-t border-border">
        <h4 className="text-sm font-semibold text-foreground/80 mb-2">🏢 Assign Companies</h4>
        <div className="space-y-2">
          {teams.map((t: any) => {
            const currentCompany = t.assigned_company;
            return (
              <div key={t.id} className="flex items-center justify-between bg-muted/50 rounded-lg p-2">
                <span className="text-sm text-foreground font-medium">{t.name}</span>
                <div className="flex items-center gap-1.5">
                  {currentCompany && (
                    <span className="text-xs mr-2" style={{ color: currentCompany.color }}>
                      {currentCompany.emoji} {currentCompany.name}
                    </span>
                  )}
                  {COMPANIES.map((c) => {
                    const taken = teams.some((ot: any) => ot.id !== t.id && ot.assigned_company?.slug === c.slug);
                    const isSelected = currentCompany?.slug === c.slug;
                    return (
                      <button
                        key={c.slug}
                        disabled={assigning || (taken && !isSelected)}
                        onClick={async () => {
                          try {
                            const res = await assignCompany({ team_id: t.id, company_slug: c.slug });
                            if (res?.success) { toast.success(res.message); onChanged(); }
                          } catch (err) { toast.error(String(err)); }
                        }}
                        className={`text-lg p-1 rounded transition-all ${
                          isSelected ? "ring-2 ring-primary bg-secondary" :
                          taken ? "opacity-20 cursor-not-allowed" : "hover:bg-muted"
                        }`}
                        title={`${c.name}${taken ? " (taken)" : ""}`}
                      >
                        {c.emoji}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
