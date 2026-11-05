import { useNavigate } from "react-router";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import type { IconName } from "lucide-react/dynamic";

type Props = { name: string };

const LINKS: { icon: IconName; label: string; description: string; path: string; color: string }[] = [
  { icon: "calendar", label: "Agenda & your Q&A", description: "Schedule, speakers, resources, and your live Q&A", path: "/agenda?tab=speakers", color: "text-camp-brown" },
  { icon: "users", label: "Teams & Rankings", description: "Meet the cohort, teams, and past cAMPs", path: "/teams", color: "text-camp-green" },
];

/** Base Camp for guest speakers: welcome + Trail Guide (Agenda, Teams & Rankings). No announcements. */
export default function SpeakerBaseCamp({ name }: Props) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col gap-8 p-8 max-w-6xl overflow-auto">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#1e1b4b] p-8">
        <div className="relative flex flex-col items-center">
          <img src="/nomnom/camp201-logo-transparent.png" alt="cAMP 201" className="w-56 h-56 object-contain drop-shadow-2xl" />
          <div className="w-full mt-4 pt-4 border-t border-white/10">
            <p className="text-xs text-white/50 font-medium uppercase tracking-wide">Welcome, guest speaker</p>
            <h2 className="text-xl font-bold text-white mt-0.5">{name}</h2>
            <p className="text-sm text-white/70 mt-1">
              Thanks for joining cAMP 201! Answer the cAMPers' questions in your Q&A, and get to know the cohort.
            </p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Icon icon="compass" className="w-5 h-5 text-camp-green" />
          Trail Guide
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {LINKS.map((link) => (
            <Card
              key={link.path}
              className="p-4 cursor-pointer hover:shadow-md transition-all hover:border-camp-green/30 group"
              onClick={() => navigate(link.path)}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 ${link.color}`}>
                  <Icon icon={link.icon} className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium text-sm group-hover:text-primary transition-colors">{link.label}</span>
                  <span className="text-xs text-muted-foreground mt-0.5">{link.description}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
