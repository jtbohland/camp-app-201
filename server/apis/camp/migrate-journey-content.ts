import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "MigrateJourneyContent",
  description: "Creates journey_content and link_clicks tables, seeds approved content.",
  integrations: {
    camp_db: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({ success: z.boolean(), seeded: z.coerce.number() }),
  async run(ctx) {
    // Journey content table
    await ctx.integrations.camp_db.execute(`
      CREATE TABLE IF NOT EXISTS camp201_journey_content (
        id SERIAL PRIMARY KEY,
        section TEXT NOT NULL CHECK (section IN ('prework', 'know_before_you_go')),
        tab TEXT,
        sort_order INTEGER DEFAULT 0,
        icon TEXT DEFAULT 'info',
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        tip TEXT,
        links JSONB DEFAULT '[]'::jsonb,
        is_checkable BOOLEAN DEFAULT false,
        item_key TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `, undefined, { label: "Create journey_content table" });

    // Link clicks tracking table
    await ctx.integrations.camp_db.execute(`
      CREATE TABLE IF NOT EXISTS camp201_link_clicks (
        id SERIAL PRIMARY KEY,
        camper_id INTEGER NOT NULL REFERENCES camp201_campers(id),
        content_id INTEGER NOT NULL REFERENCES camp201_journey_content(id),
        link_url TEXT NOT NULL,
        clicked_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(camper_id, content_id, link_url)
      )
    `, undefined, { label: "Create link_clicks table" });

    // Completion attempts tracking (for penalty logic)
    await ctx.integrations.camp_db.execute(`
      CREATE TABLE IF NOT EXISTS camp201_completion_attempts (
        id SERIAL PRIMARY KEY,
        camper_id INTEGER NOT NULL REFERENCES camp201_campers(id),
        content_id INTEGER NOT NULL REFERENCES camp201_journey_content(id),
        attempted_at TIMESTAMPTZ DEFAULT NOW(),
        links_missing INTEGER DEFAULT 0
      )
    `, undefined, { label: "Create completion_attempts table" });

    // Check if already seeded
    const existing = await ctx.integrations.camp_db.query(
      "SELECT COUNT(*)::int AS cnt FROM camp201_journey_content",
      z.object({ cnt: z.coerce.number() }),
      undefined,
      { label: "Check existing content" }
    );

    if (existing[0].cnt > 0) {
      return { success: true, seeded: 0 };
    }

    // === SEED PRE-WORK ITEMS ===
    const preworkItems = [
      {
        sort_order: 1, icon: "target", item_key: "wheel_and_deal",
        title: "Wheel & Deal — Product Pitch Practice",
        content: "Wheel & Deal is a self-guided product pitch practice tool designed to build your fluency talking about Amplitude's products in a casual, conversational way. No slides, no script, and no prep time required. Read the Welcome tab in the app for more details, then get your reps in and have fun with it! You'll pitch Amplitude live in front of your new hire class at cAMP 201.",
        tip: "Use it as your warm-up for cAMP 201!",
        links: JSON.stringify([{ label: "Open Wheel & Deal", url: "https://app.superblocks.com/code-mode/applications/fef97ebe-4fb9-401f-b97c-c52c1693b31b/?v=1786385711575" }]),
      },
      {
        sort_order: 2, icon: "book-open", item_key: "challenger_sales",
        title: "Challenger Sales Methodology",
        content: "Register with your Amplitude credentials and follow the prompts to enroll in the Challenger pre-work. Complete \"Why Challenger?\" (~20–30 minutes) and \"Intro to Challenger Skills\" (~1 hour).",
        tip: "SDRs, AEs, PSMs & Renewals are exempt — you completed this in cAMP Ascent!",
        links: JSON.stringify([
          { label: "Register", url: "https://hub.challengerinc.com/redeem/1bff9c75-94e3-405f-a673-33f8eb820209amplitude-seller" },
          { label: "Why Challenger (~20-30 min)", url: "https://hub.challengerinc.com/learn/course/why-challenger/why-challenger/what-it-means-to-be-a-high-performer" },
          { label: "Intro to Challenger Skills (~1 hr)", url: "https://hub.challengerinc.com/learning-paths/intro-to-challenger-skills" },
        ]),
      },
      {
        sort_order: 3, icon: "message-circle", item_key: "ice_breaker_survey",
        title: "Camper Trivia Form",
        content: "Complete the icebreaker survey so we can use your answers for team activities during cAMP. Everyone MUST complete this before cAMP starts — no exceptions!",
        tip: "Go to My Profile → Ice Breaker section",
        links: JSON.stringify([{ label: "Fill Out Form", url: "https://forms.gle/GmT6d2Q4mvzwk4vNA" }]),
      },
      {
        sort_order: 4, icon: "calendar", item_key: "calendar_invites",
        title: "Accept Calendar Invites & Free Up Your Schedule",
        content: "Accept your cAMP 201 calendar invites so it's on your calendar and blocked off. Free up your calendar and reschedule your meetings — your full presence is expected at cAMP.",
        tip: "cAMP runs 9am–5pm each day",
        links: JSON.stringify([]),
      },
      {
        sort_order: 5, icon: "credit-card", item_key: "ramp_budget",
        title: "Create Your Ramp Budget",
        content: "Open the Ramp Okta tile, create a budget for your cAMP-related travel and expenses, and submit it for manager approval. Please do this BEFORE booking travel.",
        tip: "Must be approved before booking in Navan",
        links: JSON.stringify([{ label: "Open Ramp (Okta tile)", url: "https://app.ramp.com/sign-in" }]),
      },
      {
        sort_order: 6, icon: "plane", item_key: "book_travel",
        title: "Book Travel & Accommodations",
        content: "After your Ramp budget is approved, book your travel and hotel in Navan (Okta tile or download the app). AMER travelers: arrive the day before cAMP starts. International travelers: arrive two days before to acclimate from jet lag. cAMP ends at 5pm on the final day — book return travel accordingly!",
        tip: "Book early so we can help with any access issues!",
        links: JSON.stringify([{ label: "Open Navan (Okta tile or app)", url: "https://app.navan.com/app/user2/home?tripType=corporate" }]),
      },
    ];

    for (const item of preworkItems) {
      await ctx.integrations.camp_db.execute(
        `INSERT INTO camp201_journey_content (section, tab, sort_order, icon, title, content, tip, links, is_checkable, item_key)
         VALUES ('prework', NULL, $1, $2, $3, $4, $5, $6::jsonb, true, $7)`,
        [item.sort_order, item.icon, item.title, item.content, item.tip, item.links, item.item_key],
        { label: `Seed prework: ${item.item_key}` }
      );
    }

    // === SEED KNOW BEFORE YOU GO ===
    const kbygItems = [
      // Rules & Expectations
      { tab: "rules", sort_order: 1, icon: "shield", title: "Be Present", content: "Phones away during sessions. Laptops only for cAMP activities. Full participation is expected.", tip: null, links: "[]" },
      { tab: "rules", sort_order: 2, icon: "clock", title: "Be Punctual", content: "Sessions start on time. Check-in is gamified — early earns points, late loses them for your team!", tip: null, links: "[]" },
      { tab: "rules", sort_order: 3, icon: "users", title: "Be Collaborative", content: "You're part of a team. Contribute, support each other, and have fun competing.", tip: null, links: "[]" },
      { tab: "rules", sort_order: 4, icon: "heart", title: "Be Open", content: "cAMP is a safe space to learn, fail, and grow. Ask questions. Get uncomfortable.", tip: null, links: "[]" },
      // Ramp Budget
      { tab: "budget", sort_order: 1, icon: "credit-card", title: "Create Your Ramp Budget", content: "Open the Ramp Okta tile, create a budget for your cAMP-related travel and expenses, and submit it for manager approval. Do this BEFORE booking travel.", tip: null, links: JSON.stringify([{ label: "Open Ramp (Okta tile)", url: "https://app.ramp.com/sign-in" }]) },
      { tab: "budget", sort_order: 2, icon: "file-text", title: "What's Covered", content: "Travel, lodging, meals during cAMP, and any required materials. Personal purchases are not covered.", tip: null, links: "[]" },
      { tab: "budget", sort_order: 3, icon: "book-open", title: "Resources & Policies", content: "Review Amplitude's travel and expense policies, FAQs, and how to link your Ramp card to Navan. Use #help-procurement-te for questions about Navan, Ramp, travel bookings, or travel policy.", tip: null, links: JSON.stringify([
        { label: "Travel & Expense Policy (Oct 2025)", url: "https://amplitude.atlassian.net/wiki/spaces/LegalKnowledgeBase/pages/3100672112/Amplitude+Travel+Expense+Policy+Oct+2025" },
        { label: "Travel & Expense FAQs", url: "https://amplitude.atlassian.net/wiki/spaces/LegalKnowledgeBase/pages/3406331978/Travel+Expense+FAQs" },
        { label: "How to add Ramp Card to Navan", url: "https://amplitude.atlassian.net/wiki/spaces/LegalKnowledgeBase/pages/3407118359/How+to+add+my+Ramp+Corporate+Card+to+Navan+for+booking" },
      ]) },
      // Travel & Flights
      { tab: "travel", sort_order: 1, icon: "plane", title: "Book via Navan", content: "All travel must be booked through Navan (Okta tile or download the app). Log in with your Amplitude credentials.", tip: null, links: JSON.stringify([{ label: "Open Navan", url: "https://app.navan.com/app/user2/home?tripType=corporate" }]) },
      { tab: "travel", sort_order: 2, icon: "calendar", title: "When to Arrive (AMER)", content: "Arrive the day before cAMP starts so you're ready to begin at 9:00 AM on Day 1.", tip: null, links: "[]" },
      { tab: "travel", sort_order: 3, icon: "globe", title: "When to Arrive (International)", content: "Arrive two days before cAMP starts so you have time to acclimate from jet lag and feel ready at 9:00 AM on Day 1.", tip: null, links: "[]" },
      { tab: "travel", sort_order: 4, icon: "alert-circle", title: "Return Travel", content: "cAMP ends at 5pm on the final day. The expectation is that you attend cAMP in its entirety. Please book return travel accordingly!", tip: null, links: "[]" },
      // Hotels in SF
      { tab: "hotels", sort_order: 1, icon: "building", title: "W San Francisco", content: "Luxury hotel near the office. Great location and amenities.", tip: null, links: "[]" },
      { tab: "hotels", sort_order: 2, icon: "building", title: "The Clancy", content: "Boutique hotel in a convenient SoMa location.", tip: null, links: "[]" },
      { tab: "hotels", sort_order: 3, icon: "building", title: "Hyatt Regency Downtown SOMA", content: "Modern hotel in the heart of SoMa, close to the office.", tip: null, links: "[]" },
      { tab: "hotels", sort_order: 4, icon: "building", title: "Canopy by Hilton SoMa", content: "Comfortable stay with a great neighborhood feel.", tip: null, links: "[]" },
      { tab: "hotels", sort_order: 5, icon: "building", title: "Hotel Zetta", content: "Trendy hotel with a creative vibe, walking distance to the office.", tip: null, links: "[]" },
      { tab: "hotels", sort_order: 6, icon: "info", title: "Booking Policy", content: "Book whichever hotel is available and in policy in Navan. Check the Travel & Expense Policy for rate limits.", tip: null, links: "[]" },
      // Office Info
      { tab: "office", sort_order: 1, icon: "map-pin", title: "Office Address", content: "201 3rd Street, Suite 200, San Francisco, CA 94103.", tip: null, links: "[]" },
      { tab: "office", sort_order: 2, icon: "door-open", title: "Getting In", content: "Enter through the main entrance just beyond the red \"201\" sign, next to the Moscone Parking Garage. Take the elevators to the 2nd floor and check in at reception.", tip: null, links: "[]" },
      { tab: "office", sort_order: 3, icon: "badge-check", title: "Badge Access", content: "If you're visiting from out of town or forgot your badge, request a temporary badge at reception or contact #help-workplace. The office is staffed Monday–Friday, 8:30 AM–5:00 PM; badge access is available 24/7.", tip: null, links: "[]" },
      { tab: "office", sort_order: 4, icon: "phone", title: "Who to Contact", content: "Contact the Workplace team at workplace@amplitude.com or in #help-workplace for access questions or issues.", tip: null, links: "[]" },
    ];

    for (const item of kbygItems) {
      await ctx.integrations.camp_db.execute(
        `INSERT INTO camp201_journey_content (section, tab, sort_order, icon, title, content, tip, links, is_checkable, item_key)
         VALUES ('know_before_you_go', $1, $2, $3, $4, $5, $6, $7::jsonb, false, NULL)`,
        [item.tab, item.sort_order, item.icon, item.title, item.content, item.tip, item.links],
        { label: `Seed KBYG: ${item.tab} - ${item.title}` }
      );
    }

    return { success: true, seeded: preworkItems.length + kbygItems.length };
  },
});
