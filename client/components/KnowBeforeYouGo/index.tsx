import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { IconName } from "lucide-react/dynamic";

type InfoItem = {
  icon: IconName;
  title: string;
  content: string;
};

const INFO_SECTIONS: Record<string, InfoItem[]> = {
  rules: [
    { icon: "shield", title: "Be Present", content: "Phones away during sessions. Laptops only for cAMP activities. Full participation is expected." },
    { icon: "clock", title: "Be Punctual", content: "Sessions start on time. Check-in is gamified — early earns points, late loses them for your team!" },
    { icon: "users", title: "Be Collaborative", content: "You're part of a team. Contribute, support each other, and have fun competing." },
    { icon: "heart", title: "Be Open", content: "cAMP is a safe space to learn, fail, and grow. Ask questions. Get uncomfortable." },
  ],
  budget: [
    { icon: "credit-card", title: "Ramp Budget", content: "Your manager can approve ramp-related expenses. Check with your manager for your specific budget allocation." },
    { icon: "file-text", title: "How to Submit", content: "Submit expenses through your company expense tool. Tag them as 'cAMP 201 - Onboarding' for quick approval." },
    { icon: "info", title: "What's Covered", content: "Travel, lodging, meals during cAMP, and any required materials. Personal purchases are not covered." },
  ],
  travel: [
    { icon: "plane", title: "Book via Navan", content: "All travel must be booked through Navan (formerly TripActions). Log in with your Amplitude credentials." },
    { icon: "calendar", title: "When to Arrive", content: "Fly in the day BEFORE cAMP starts. Plan to arrive by 6 PM for the welcome dinner." },
    { icon: "calendar", title: "When to Depart", content: "cAMP ends at 5 PM on the final day. Book flights for 7 PM or later, or stay an extra night." },
    { icon: "alert-circle", title: "Flight Policy", content: "Economy class for domestic. Economy or Premium Economy for international (6+ hours). Book 2+ weeks in advance." },
  ],
  hotels: [
    { icon: "building", title: "Hotel Nikko SF", content: "222 Mason St — Walking distance to the office. Modern rooms, great location in Union Square." },
    { icon: "building", title: "Courtyard by Marriott", content: "299 2nd St — SoMa location, 10 min walk to office. Good for Marriott loyalty members." },
    { icon: "building", title: "Hyatt Place SF", content: "701 3rd St — Near the office in SoMa. Complimentary breakfast included." },
    { icon: "info", title: "Budget", content: "Aim for $200-300/night. Book through Navan for pre-negotiated rates." },
  ],
  office: [
    { icon: "map-pin", title: "Office Address", content: "631 Howard St, Suite 300, San Francisco, CA 94105 (SoMa district)" },
    { icon: "door-open", title: "Getting In", content: "Check in at the front desk with your ID. You'll receive a visitor badge on Day 1." },
    { icon: "coffee", title: "Amenities", content: "Kitchen fully stocked with snacks, coffee, and beverages. Lunch provided during cAMP." },
    { icon: "wifi", title: "WiFi", content: "Network: Amplitude-Guest. Password will be shared on Day 1." },
  ],
};

const TABS = [
  { key: "rules", label: "Rules & Expectations", icon: "shield" as IconName },
  { key: "budget", label: "Ramp Budget", icon: "credit-card" as IconName },
  { key: "travel", label: "Travel & Flights", icon: "plane" as IconName },
  { key: "hotels", label: "Hotels in SF", icon: "building" as IconName },
  { key: "office", label: "Office Info", icon: "map-pin" as IconName },
];

export default function KnowBeforeYouGo() {
  const [activeTab, setActiveTab] = useState("rules");

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Icon icon="book-open" className="w-5 h-5 text-camp-green" />
        Know Before You Go
      </h2>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 mb-4">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.key} value={tab.key} className="text-xs gap-1">
              <Icon icon={tab.icon} className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map((tab) => (
          <TabsContent key={tab.key} value={tab.key}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {INFO_SECTIONS[tab.key].map((item, idx) => (
                <div key={idx} className="flex gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
                  <div className="text-camp-green mt-0.5">
                    <Icon icon={item.icon} className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </Card>
  );
}
