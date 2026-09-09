import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";

const TROPHY_IMAGES = ["/logos/trophy-front.jpg", "/logos/trophy-side.jpg", "/logos/trophy-back.jpg"];

const EARN_POINTS = [
  { icon: "✅", text: "Complete daily surveys on time" },
  { icon: "🎯", text: "Finish pre-work before deadline" },
  { icon: "🎤", text: "Ask great questions in executive Q&A" },
  { icon: "🏆", text: "Win team presentation scoring" },
  { icon: "⭐", text: "Counselor shoutouts for participation" },
  { icon: "🏃", text: "Be the first team to submit surveys" },
];

const LOSE_POINTS = [
  { icon: "⏰", text: "Late or missed survey submissions" },
  { icon: "📋", text: "Incomplete pre-work at deadline" },
  { icon: "🚫", text: "Missing check-ins or sessions" },
];

export default function TeamCultureHero() {
  const [trophyIdx, setTrophyIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTrophyIdx((prev) => (prev + 1) % TROPHY_IMAGES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 mb-8">
      {/* Trophy Banner */}
      <Card className="overflow-hidden bg-gradient-to-r from-yellow-50 via-amber-50 to-yellow-50 border-yellow-200">
        <div className="flex flex-col md:flex-row items-center gap-6 p-6">
          {/* Trophy carousel */}
          <div className="relative w-48 h-64 shrink-0">
            <img
              src={TROPHY_IMAGES[trophyIdx]}
              alt="cAMP 201 Champions Trophy"
              className="w-full h-full object-contain rounded-lg drop-shadow-xl transition-opacity duration-500"
            />
            <div className="absolute -top-2 -right-2">
              <span className="text-3xl animate-pulse">🏆</span>
            </div>
          </div>
          <div className="flex-1 text-center md:text-left">
            <Badge className="bg-yellow-400/80 text-yellow-900 text-xs font-bold mb-2">THE ULTIMATE PRIZE</Badge>
            <h2 className="text-2xl font-black text-foreground mb-2">The cAMP 201 Trophy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Every member of the winning team takes home this custom 3D-printed Amplitude mascot trophy.
              It's not just a trophy — it's bragging rights, proof of teamwork, and a reminder that you and your team
              showed up, competed, and conquered cAMP 201.
            </p>
            <div className="flex flex-wrap gap-3 mt-4 justify-center md:justify-start">
              <Badge variant="outline" className="text-yellow-800 border-yellow-300 bg-yellow-100">
                🏆 cAMP Champ = Winning Team
              </Badge>
              <Badge variant="outline" className="text-purple-800 border-purple-300 bg-purple-100">
                ⭐ cAMP-V-P = Top Individual (any team!)
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* Culture Blurb */}
      <Card className="p-6 border-camp-green/20 bg-camp-green/5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-camp-green/15 flex items-center justify-center shrink-0">
            <Icon icon="flame" className="w-5 h-5 text-camp-green" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">How Teams Work at cAMP 201</h3>
            <p className="text-sm text-muted-foreground mt-1">Everything you need to know about the team experience</p>
          </div>
        </div>

        <div className="space-y-3 text-sm text-foreground/80 leading-relaxed">
          <p>
            When you arrive at cAMP 201, you'll be placed on a <strong>team</strong> — and that's your crew for the entire week.
            Every presentation, every challenge, every activity — you do it together. Your team is your support system,
            your brainstorm partners, and your competition all at once.
          </p>
          <p>
            Throughout cAMP, <strong>you earn XP (experience points)</strong> through engagement and participation — completing surveys,
            finishing pre-work, asking great questions, crushing presentations, and being an active contributor. Counselors can also
            award bonus points for standout moments. Your individually earned XP contributes directly to your team's total score,
            so every point matters.
          </p>
          <p>
            But here's the thing — you can also <strong>lose points</strong> for your team. Late surveys, missed deadlines, incomplete
            pre-work — it all counts against you. Your team is counting on you to carry your weight, stay accountable, and show up.
            This isn't about being perfect — it's about being present and putting in the effort.
          </p>
          <p>
            At the end of the week, the team with the most points is crowned <strong>cAMP Champ</strong> 🏆 and every member walks away
            with the legendary cAMP 201 trophy. We'll also name the <strong>cAMP-V-P</strong> ⭐ — the individual who earns the most XP
            across all teams. It could be anyone, on any team.
          </p>
          <p className="text-camp-green font-medium">
            So have fun, collaborate, compete, build something great together — and maybe take home some hardware. 🏕️
          </p>
        </div>

        {/* Earn / Lose points */}
        <div className="grid md:grid-cols-2 gap-4 mt-6">
          <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
            <h4 className="text-sm font-bold text-emerald-800 flex items-center gap-2 mb-3">
              <Icon icon="trending-up" className="w-4 h-4" />
              Ways to Earn XP
            </h4>
            <ul className="space-y-2">
              {EARN_POINTS.map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-emerald-700">
                  <span>{item.icon}</span>
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <h4 className="text-sm font-bold text-red-800 flex items-center gap-2 mb-3">
              <Icon icon="trending-down" className="w-4 h-4" />
              Ways to Lose XP
            </h4>
            <ul className="space-y-2">
              {LOSE_POINTS.map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-red-700">
                  <span>{item.icon}</span>
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
