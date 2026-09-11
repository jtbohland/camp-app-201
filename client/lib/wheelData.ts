// Wheel & Deal — full product + challenge data set

export type WheelProduct = {
  id: string;
  name: string;
  icon: string;
  color: string;
  objections: { text: string; reframe: string }[];
  challengerPrompt: string;
  challengerHint: string;
  confettiEmojis: string[];
};

export type Scenario = {
  id: string;
  icon: string;
  label: string;
  setup: string;
  oneLiner: string;
};

export type ChallengeType = "pitch" | "objection" | "scenario" | "challenger";

export type Challenge = {
  type: ChallengeType;
  typeLabel: string;
  typeIcon: string;
  product: WheelProduct;
  prompt: string;
  hint: string;
  objectionReframe?: string;
  scenario?: Scenario;
};

// ── Products ──────────────────────────────────────────────
export const PRODUCTS: WheelProduct[] = [
  {
    id: "analytics",
    name: "Analytics",
    icon: "📊",
    color: "#2962FF",
    confettiEmojis: ["📊", "📈"],
    objections: [
      {
        text: "We already use Google Analytics.",
        reframe: "GA is great for traffic — who came and from where. Amplitude answers what they did after they arrived, which features drove them to stay, and why they churned. Different question, different tool.",
      },
      {
        text: "We built something internally.",
        reframe: "Most teams do early on. The question is what it's costing your engineers to maintain it vs. building your actual product. That's usually where the real conversation starts.",
      },
      {
        text: "We use Mixpanel.",
        reframe: "Good tool. The difference is we're a full platform — analytics, experimentation, session replay, and activation all in one place. No stitching together five vendors to get one answer.",
      },
    ],
    challengerPrompt: "Don't tell me what Analytics does. Teach me something about my business I didn't know I needed to hear.",
    challengerHint: "Lead with the data argument problem, not the product. Make them feel the gap before you offer the solution.",
  },
  {
    id: "sessionreplay",
    name: "Session Replay + Heatmaps",
    icon: "🎞️🔥",
    color: "#7B2FFF",
    confettiEmojis: ["🔥", "🗺️"],
    objections: [
      {
        text: "We already have Hotjar.",
        reframe: "Hotjar shows you where users click. We show you exactly what happened in the session AND connect it to your product analytics — so you know not just what they did, but who they are and what happened to them next.",
      },
      {
        text: "Isn't that a privacy concern?",
        reframe: "Great question — Session Replay masks sensitive fields by default. You see the behavior, not the personal data. It's built for compliance from the ground up.",
      },
      {
        text: "We don't have the bandwidth to watch recordings.",
        reframe: "That's the old way. Our AI summarizes sessions automatically — you see the patterns without watching a single video.",
      },
    ],
    challengerPrompt: "Don't pitch Session Replay. Show me the moment a team found a bug they didn't know they had.",
    challengerHint: "Tell the story of a specific discovery — a rage click, a broken button, a confusing flow — not what the product does.",
  },
  {
    id: "experimentation",
    name: "Experimentation",
    icon: "🧪",
    color: "#00BFA5",
    confettiEmojis: ["🧪", "🥼"],
    objections: [
      {
        text: "Our engineers handle A/B testing.",
        reframe: "For feature flags, sure — that makes sense. But can your marketing team run a test on the homepage without filing a ticket? That's the gap we usually fill first.",
      },
      {
        text: "We use Optimizely.",
        reframe: "Optimizely is great for web testing. The difference is our experimentation is natively connected to your product behavioral data — so you see retention and downstream impact, not just conversion rate.",
      },
      {
        text: "We don't have enough traffic to run tests.",
        reframe: "Smaller traffic just means longer tests, not impossible ones. We can help you scope what's actually testable at your current scale — it's usually more than people think.",
      },
    ],
    challengerPrompt: "Don't describe Experimentation. Tell me what happens to a company that ships without testing.",
    challengerHint: "Make them feel the cost of slow experimentation — missed retention signals, expensive rollbacks, guesses masquerading as strategy.",
  },
  {
    id: "guidessurveys",
    name: "Guides & Surveys",
    icon: "🐕",
    color: "#FF6B35",
    confettiEmojis: ["🐕", "🧭"],
    objections: [
      {
        text: "We use Intercom for in-app messaging.",
        reframe: "Intercom is great for support conversations. Guides & Surveys is built for product moments — onboarding flows, feature announcements, and NPS triggered by behavior. The difference is the data connection to what users actually did.",
      },
      {
        text: "Our users hate popups.",
        reframe: "Everyone's users hate random popups. The reason ours work is they're triggered by specific behaviors — so they feel helpful, not interruptive. Right message, right moment.",
      },
      {
        text: "We just use email for this.",
        reframe: "Email is great for users who've already left your product. Guides catch them inside the product at the exact moment they need help — that's when it actually changes behavior.",
      },
    ],
    challengerPrompt: "Don't describe Guides & Surveys. Tell me what it costs a product team when their onboarding doesn't work.",
    challengerHint: "Lead with the gap between what teams think users experience and what users actually experience.",
  },
  {
    id: "statsig",
    name: "Statsig",
    icon: "📈",
    color: "#6941C6",
    confettiEmojis: ["📈", "⚡"],
    objections: [
      {
        text: "We already use LaunchDarkly for feature flags.",
        reframe: "LaunchDarkly is a great feature flag tool. Statsig gives you flags AND experimentation AND analytics in one platform — so you don't just gate features, you measure their impact automatically. Plus Statsig's pricing doesn't penalize you for scaling.",
      },
      {
        text: "We already use Amplitude Experiment.",
        reframe: "Amplitude Experiment is built for business and marketing teams to run web tests without code. Statsig is built for engineering teams who want to gate every deploy, run experiments at warehouse scale, and own the full ship-measure-decide loop. They're complementary.",
      },
      {
        text: "We built feature flags in-house.",
        reframe: "Most engineering teams do early on. The question is: are you also measuring the impact of every flag? Are you running experiments on them? Do you have automatic rollback if a metric drops? That's where homegrown usually hits a wall.",
      },
      {
        text: "We use Optimizely.",
        reframe: "Optimizely is strong for web and content experimentation. Statsig is built for product engineering — server-side flags, warehouse-native analytics, and SDKs that engineers actually want to use.",
      },
    ],
    challengerPrompt: "Don't describe Statsig. Teach me why most engineering teams are gambling every time they push to production — and what the best teams do differently.",
    challengerHint: "The insight is that deploying to 100% of users without a gate isn't 'continuous delivery' — it's continuous gambling.",
  },
  {
    id: "activation",
    name: "Activation",
    icon: "🚀",
    color: "#FFB300",
    confettiEmojis: ["🚀", "🎯"],
    objections: [
      {
        text: "We handle onboarding with our product team.",
        reframe: "Most do. The question is whether you know which specific actions in week 1 predict retention at 90 days. That's what Activation surfaces — and it's usually 2 or 3 things, not 20.",
      },
      {
        text: "We use HubSpot for lifecycle marketing.",
        reframe: "HubSpot is great for email sequences. Activation is about understanding the behavioral milestones inside your product that predict whether a user will stick — that data lives in Amplitude, not your CRM.",
      },
      {
        text: "Our activation rate is already fine.",
        reframe: "Most companies think that until they see the benchmark data. What's your activation rate? We can compare it to similar products on our platform in about 5 minutes.",
      },
    ],
    challengerPrompt: "Don't describe Activation. Teach me why most companies are optimizing for the wrong thing in their growth funnel.",
    challengerHint: "The reframe is acquisition vs. activation — getting users in the door vs. getting them to the moment where the product clicks.",
  },
  {
    id: "aifeedback",
    name: "AI Feedback",
    icon: "🎤",
    color: "#E91E8C",
    confettiEmojis: ["🦾", "💬"],
    objections: [
      {
        text: "We have a customer success team for this.",
        reframe: "CS teams are great at relationship management. The question is whether they have time to read 10,000 support tickets a month and surface the patterns. AI Feedback does that — it's the layer underneath that tells CS where to focus.",
      },
      {
        text: "We use Medallia / Qualtrics for feedback.",
        reframe: "Those are great survey tools. AI Feedback goes beyond surveys — it reads support tickets, app store reviews, social, and call scripts too. And it connects everything back to behavioral data.",
      },
      {
        text: "We already tag our support tickets.",
        reframe: "Manual tagging catches what you're already looking for. AI Feedback surfaces what you didn't know to look for — the emerging patterns before they become a crisis.",
      },
    ],
    challengerPrompt: "Don't describe AI Feedback. Tell me about the insight a company almost missed — and what would have happened if they had.",
    challengerHint: "The story is about speed and signal — a pattern hiding in thousands of tickets that almost became a churn crisis.",
  },
  {
    id: "aiassistant",
    name: "AI Assistant",
    icon: "🤖",
    color: "#00C853",
    confettiEmojis: ["🤖", "🗣️"],
    objections: [
      {
        text: "We have a data team for this.",
        reframe: "Your data team is probably overwhelmed with ad-hoc requests. AI Assistant handles the routine questions so they can focus on the analysis that actually requires human judgment.",
      },
      {
        text: "Our team already uses ChatGPT for data questions.",
        reframe: "ChatGPT doesn't know your data. Amplitude AI Assistant is trained on your actual behavioral data — real answers about your real users.",
      },
      {
        text: "We already have a BI tool.",
        reframe: "BI tools are great for dashboards. AI Assistant is conversational — you ask in plain English and get an answer. No building a report, no waiting for a data pull.",
      },
    ],
    challengerPrompt: "Don't describe AI Assistant. Tell me what a company loses every time someone has to file a ticket to get a data question answered.",
    challengerHint: "The insight is about access and speed — the cost of the gap between having data and being able to act on it.",
  },
];

// ── Scenarios ──────────────────────────────────────────────
export const SCENARIOS: Scenario[] = [
  { id: "conference", icon: "🎪", label: "Conference", setup: "You're at an industry conference after-party and a founder at your table asks what you do.", oneLiner: "\"So what does your company actually do?\"" },
  { id: "happyhour", icon: "🍹", label: "Happy Hour", setup: "You're at happy hour with a mix of people and someone asks about your job.", oneLiner: "\"Wait, Amplitude — what is that?\"" },
  { id: "gym", icon: "🏋️", label: "Gym", setup: "You're cooling down after a workout and your gym buddy asks what you sell.", oneLiner: "\"So what does your company actually make?\"" },
  { id: "nailsalon", icon: "💅", label: "Nail Salon / Barber", setup: "You're in the chair and your stylist asks what you do for work.", oneLiner: "\"Oh that sounds fancy — but what does it actually do?\"" },
  { id: "airplane", icon: "✈️", label: "Airplane", setup: "You're on a flight and your seatmate sees your laptop and asks about your work.", oneLiner: "\"I've heard of Amplitude — what does it do exactly?\"" },
  { id: "baseball", icon: "⚾", label: "Baseball Game", setup: "You're at a game with friends and someone in your group asks what you do.", oneLiner: "\"Analytics software — like spreadsheets?\"" },
  { id: "reunion", icon: "👨‍👩‍👧", label: "Family Reunion", setup: "Your cousin corners you at the family reunion and asks what you've been up to.", oneLiner: "\"So you work in tech? What does your company do?\"" },
  { id: "nightout", icon: "🎉", label: "Night Out", setup: "You're out with friends and someone new to the group asks what you do for work.", oneLiner: "\"Wait — so what exactly do you sell?\"" },
  { id: "uber", icon: "🚗", label: "Uber / Lyft", setup: "Your driver asks what you do and whether it's anything like what they've heard of.", oneLiner: "\"Is that like Google Analytics or something?\"" },
  { id: "golf", icon: "⛳", label: "Golf", setup: "You're on the back nine with a prospect and they ask you to explain what you do in plain English.", oneLiner: "\"Okay but what does a company actually use it for day to day?\"" },
  { id: "coffee", icon: "☕", label: "Coffee Shop", setup: "Someone at the next table sees your Amplitude sticker and asks about it.", oneLiner: "\"I keep seeing that logo — what is Amplitude?\"" },
  { id: "wedding", icon: "💒", label: "Wedding", setup: "You're at a wedding reception and a guest at your table asks what you do.", oneLiner: "\"Tech sales — so what are you selling?\"" },
  { id: "dogpark", icon: "🐕", label: "Dog Park", setup: "You're at the dog park and another owner asks what you do while your dogs play.", oneLiner: "\"Analytics? What does that mean for a regular company?\"" },
  { id: "bookclub", icon: "📚", label: "Book Club", setup: "At a book club, someone asks what you work on since you mentioned data and decisions.", oneLiner: "\"So is it like a business intelligence tool?\"" },
  { id: "volunteering", icon: "🤝", label: "Volunteering", setup: "You're volunteering and your partner for the day asks what your day job is.", oneLiner: "\"That sounds really interesting — but what problem does it solve?\"" },
];

// ── Challenge generator ──────────────────────────────────
export function generateChallenge(product: WheelProduct): Challenge {
  const types: ChallengeType[] = ["pitch", "objection", "scenario", "challenger"];
  const type = types[Math.floor(Math.random() * types.length)];

  switch (type) {
    case "pitch":
      return {
        type: "pitch",
        typeLabel: "Tell Me About It",
        typeIcon: "🎯",
        product,
        prompt: `Hey, what does ${product.name} actually do?`,
        hint: "Give a natural 1–2 minute answer. No slides, no jargon.",
      };
    case "objection": {
      const obj = product.objections[Math.floor(Math.random() * product.objections.length)];
      return {
        type: "objection",
        typeLabel: "Handle the Objection",
        typeIcon: "🛡️",
        product,
        prompt: obj.text,
        hint: "Respond naturally — don't get defensive, reframe it.",
        objectionReframe: obj.reframe,
      };
    }
    case "scenario": {
      const scene = SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)];
      return {
        type: "scenario",
        typeLabel: `Scenario: ${scene.label}`,
        typeIcon: scene.icon,
        product,
        prompt: `${scene.setup}\n\nThey say: ${scene.oneLiner}`,
        hint: "Keep it under 2 minutes. Conversational, not salesy.",
        scenario: scene,
      };
    }
    case "challenger":
      return {
        type: "challenger",
        typeLabel: "Challenger Play",
        typeIcon: "🔥",
        product,
        prompt: product.challengerPrompt,
        hint: product.challengerHint,
      };
  }
}

// ── Scoring ──────────────────────────────────────────────
export const SCORING_CATEGORIES = [
  { key: "clarity", icon: "💬", label: "Clarity", selfQuestion: "Were you concise and easy to follow?", coachQuestion: "Were they concise and easy to follow?" },
  { key: "tone", icon: "🗣️", label: "Conversational Tone", selfQuestion: "Did it feel natural, not scripted?", coachQuestion: "Did it feel natural, not scripted?" },
  { key: "credibility", icon: "🎓", label: "Credibility", selfQuestion: "Did you speak about the product correctly?", coachQuestion: "Did they speak about the product correctly?" },
  { key: "close", icon: "🤝", label: "Close", selfQuestion: "Did you end with a compelling ask?", coachQuestion: "Did they end with a compelling ask?" },
] as const;

export const SCORE_LABELS: Record<number, string> = {
  1: "Needs Work",
  2: "Getting There",
  3: "Nailed It",
};
