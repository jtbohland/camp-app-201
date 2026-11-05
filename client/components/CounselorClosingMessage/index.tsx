import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";

/** The "From Your Counselors" note at the bottom of Graduation. */
export default function CounselorClosingMessage() {
  return (
    <Card className="p-8 bg-gradient-to-br from-[#1e1b4b]/5 via-indigo-50/50 to-purple-50 border-indigo-200/30 text-center relative overflow-hidden">
      <img src="/nomnom/campfire.png" alt="" className="absolute -bottom-6 -right-2 w-44 h-44 object-contain opacity-[0.08] pointer-events-none" />
      <Icon icon="heart" className="w-8 h-8 mx-auto text-indigo-500 mb-3" />
      <h2 className="text-xl font-extrabold text-foreground mb-3">From Your Counselors</h2>
      <div className="max-w-lg mx-auto space-y-3 text-sm text-foreground/80 leading-relaxed">
        <p>
          Thank you for leaning in and bringing so much positive energy, creativity, and good spirit
          to this week. Your discovery skills, value mapping, Challenger practice, teamwork, daily
          contributions, and laughs all made this cAMP special.
        </p>
        <p>
          We appreciate how driven and determined you were — balancing cAMP with meetings, day jobs,
          travel, and everything else on your plates while still showing up motivated and ready to grow.
        </p>
        <p>
          You showed up, pushed yourselves, and grew. The confidence and skills you built here are what
          set great sellers apart — and you have them now.
        </p>
        <p className="font-medium text-foreground">
          Go make an impact. We are proud of you and cannot wait to see what you do next.
        </p>
        <p className="text-xs text-muted-foreground italic mt-2">
          Travel home safely — and remember, our doors and DMs are always open.
        </p>
      </div>
      <div className="mt-5 pt-4 border-t border-indigo-200/30">
        <p className="text-indigo-600 font-extrabold uppercase tracking-widest text-sm">Keep Climbing!</p>
      </div>
    </Card>
  );
}
