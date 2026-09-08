import { useState, useMemo, useEffect } from "react";
import { Icon } from "@/components/ui/icon";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiData } from "@/hooks/useApiData";
import { useSuperblocksUser } from "@superblocksteam/library";
import ExecutivesTab from "@/components/ExecutivesTab/index.js";
import AgendaResources from "@/components/AgendaResources/index.js";

const DAY_LABELS: Record<number, string> = { 1: "Monday", 2: "Tuesday", 3: "Wednesday", 4: "Thursday", 5: "Friday" };

const TYPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  core:         { bg: "bg-emerald-50",  border: "border-emerald-200",  text: "text-emerald-700" },
  challenger:   { bg: "bg-blue-50",     border: "border-blue-200",     text: "text-blue-700" },
  workshop:     { bg: "bg-purple-50",   border: "border-purple-200",   text: "text-purple-700" },
  value:        { bg: "bg-teal-50",     border: "border-teal-200",     text: "text-teal-700" },
  presentation: { bg: "bg-amber-50",    border: "border-amber-200",    text: "text-amber-700" },
  executive:    { bg: "bg-yellow-50",   border: "border-yellow-300",   text: "text-yellow-800" },
  social:       { bg: "bg-pink-50",     border: "border-pink-200",     text: "text-pink-700" },
  break:        { bg: "bg-gray-50",     border: "border-gray-200",     text: "text-gray-500" },
  lunch:        { bg: "bg-orange-50",   border: "border-orange-200",   text: "text-orange-700" },
  session:      { bg: "bg-emerald-50",  border: "border-emerald-200",  text: "text-emerald-700" },
};

function formatTime(time: string): string {
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:${m} ${ampm}`;
}

type TabId = "schedule" | "speakers" | "resources";

export default function AgendaPage() {
  const user = useSuperblocksUser();
  const [activeTab, setActiveTab] = useState<TabId>("schedule");

  const { data: configData } = useApiData("GetCampConfig", {});
  const { data: agendaData, loading } = useApiData("GetAgenda", {});
  const { data: camperData } = useApiData("GetCurrentCamper", {
    email: user?.email ?? "",
  }, { enabled: !!user?.email });

  const camperId = camperData?.camper?.id ?? 0;

  const numDays = useMemo(() => {
    if (configData?.config) {
      const dayConfig = configData.config.find((c: any) => c.key === "num_days");
      if (dayConfig) return parseInt(dayConfig.value, 10);
    }
    return 4;
  }, [configData]);

  const campStartDate = useMemo(() => {
    if (configData?.config) {
      const sd = configData.config.find((c: any) => c.key === "camp_start_date");
      if (sd?.value) return sd.value;
    }
    return null;
  }, [configData]);

  // Live clock for "now" indicator
  const [nowPT, setNowPT] = useState<Date>(() => new Date(new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" })));
  useEffect(() => {
    const interval = setInterval(() => {
      setNowPT(new Date(new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" })));
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  const currentDayNumber = useMemo(() => {
    if (!campStartDate) return null;
    const start = new Date(campStartDate + "T00:00:00");
    const diffMs = nowPT.getTime() - start.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diffDays >= 0 ? diffDays + 1 : null;
  }, [campStartDate, nowPT]);

  const agendaItems = agendaData?.items ?? [];

  // Group items by day
  const dayGroups = useMemo(() => {
    return Array.from({ length: numDays }, (_, i) => {
      const dayNum = i + 1;
      const items = agendaItems
        .filter((item: any) => item.day_number === dayNum)
        .sort((a: any, b: any) => a.start_time.localeCompare(b.start_time));
      // Add lunch if not present
      if (!items.some((item: any) => item.session_type === "lunch" || (item.title === "Lunch" && item.session_type === "break"))) {
        items.push({ id: -dayNum, title: "Lunch", session_type: "lunch", start_time: "12:00", end_time: "13:00", day_number: dayNum, session_bank_id: null });
        items.sort((a: any, b: any) => a.start_time.localeCompare(b.start_time));
      }
      return { dayNumber: dayNum, label: DAY_LABELS[dayNum], items };
    });
  }, [numDays, agendaItems]);

  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: "schedule", label: "Schedule", icon: "calendar" },
    { id: "speakers", label: "Speakers", icon: "mic" },
    { id: "resources", label: "Resources", icon: "file-text" },
  ];

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center gap-6 px-6 pt-5 pb-0">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Icon icon="calendar" className="w-6 h-6 text-primary" />
              Agenda
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Your cAMP 201 schedule</p>
          </div>
        </div>
        <div className="flex gap-1 px-6 mt-4">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-primary text-primary bg-primary/5"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50"
              }`}>
              <Icon icon={tab.icon as any} className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === "schedule" && (
          <div className="p-6 max-w-5xl">
            <p className="text-[10px] text-muted-foreground italic mb-4">All times in Pacific Time (PT)</p>
            {loading ? (
              <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48" />)}</div>
            ) : (
              <div className="flex flex-col gap-8">
                {dayGroups.map(({ dayNumber, label, items }) => {
                  const isToday = currentDayNumber === dayNumber;
                  const isPast = currentDayNumber !== null && dayNumber < currentDayNumber;
                  return (
                    <div key={dayNumber} className={isPast ? "opacity-60" : ""}>
                      <div className="flex items-center gap-3 mb-3">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                          Day {dayNumber} — {label}
                          {isToday && <Badge className="bg-camp-green/15 text-camp-green border-camp-green/30 text-xs">Today</Badge>}
                        </h2>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {items.map((item: any) => {
                          const colors = TYPE_COLORS[item.session_type] ?? TYPE_COLORS.session;
                          const isExec = item.session_type === "executive";
                          return (
                            <div key={item.id} className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${colors.bg} ${colors.border}`}>
                              <div className="w-24 shrink-0 text-xs text-muted-foreground font-mono">
                                {formatTime(item.start_time)} – {formatTime(item.end_time)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className={`text-sm font-medium ${colors.text}`}>
                                  {isExec && "⭐ "}{item.title}
                                </span>
                                {isExec && <span className="text-[10px] text-yellow-600 ml-2 italic">Mandatory</span>}
                              </div>
                              <Badge variant="outline" className={`text-[10px] ${colors.text} border-current/20`}>
                                {item.session_type}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        {activeTab === "speakers" && <ExecutivesTab />}
        {activeTab === "resources" && (
          <div className="p-6 max-w-5xl">
            <AgendaResources agendaItems={agendaItems} isAdmin={false} camperId={camperId} />
          </div>
        )}
      </div>
    </div>
  );
}
