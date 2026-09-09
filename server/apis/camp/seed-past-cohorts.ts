import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "SeedPastCohorts",
  description: "Creates past cohort tables and seeds all historical data",
  integrations: { apps_database: postgres(APPS_DB) },
  input: z.object({}),
  output: z.object({ success: z.boolean(), message: z.string() }),
  async run(ctx) {
    // Create tables
    await ctx.integrations.apps_database.execute(`
      CREATE TABLE IF NOT EXISTS camp201_past_cohorts (
        id SERIAL PRIMARY KEY,
        cohort_number INTEGER NOT NULL UNIQUE,
        date_label TEXT NOT NULL,
        month TEXT NOT NULL,
        year INTEGER NOT NULL,
        num_teams INTEGER NOT NULL DEFAULT 0,
        has_team_names BOOLEAN DEFAULT false,
        has_logos BOOLEAN DEFAULT false,
        has_points BOOLEAN DEFAULT false,
        notes TEXT
      );
      CREATE TABLE IF NOT EXISTS camp201_past_teams (
        id SERIAL PRIMARY KEY,
        cohort_id INTEGER NOT NULL REFERENCES camp201_past_cohorts(id),
        team_name TEXT NOT NULL,
        logo_url TEXT,
        points INTEGER,
        points_note TEXT,
        place INTEGER,
        is_winner BOOLEAN DEFAULT false,
        tagline TEXT,
        presentation_company TEXT
      );
      CREATE TABLE IF NOT EXISTS camp201_past_members (
        id SERIAL PRIMARY KEY,
        team_id INTEGER NOT NULL REFERENCES camp201_past_teams(id),
        full_name TEXT NOT NULL,
        role TEXT,
        region TEXT
      );
    `, undefined, { label: "Create past cohort tables" });

    // Seed cohorts
    await ctx.integrations.apps_database.execute(`
      INSERT INTO camp201_past_cohorts (cohort_number, date_label, month, year, num_teams, has_team_names, has_logos, has_points, notes)
      VALUES
        (1, 'March 2025', 'March', 2025, 4, false, false, false, NULL),
        (2, 'June 2025', 'June', 2025, 4, false, false, false, NULL),
        (3, 'August 2025', 'August', 2025, 0, false, false, false, 'Details TBD'),
        (4, 'December 2025', 'December', 2025, 3, true, true, true, 'Points are standings before finals'),
        (5, 'February 2026', 'February', 2026, 3, true, true, true, NULL),
        (6, 'May 2026', 'May', 2026, 3, true, true, true, NULL),
        (7, 'August 2026', 'August', 2026, 4, true, true, true, NULL)
      ON CONFLICT (cohort_number) DO NOTHING;
    `, undefined, { label: "Seed cohorts" });

    // Get cohort IDs
    const CohortIdSchema = z.object({ id: z.coerce.number(), cohort_number: z.coerce.number() });
    const cohorts = await ctx.integrations.apps_database.query(
      "SELECT id, cohort_number FROM camp201_past_cohorts ORDER BY cohort_number",
      CohortIdSchema, undefined, { label: "Get cohort IDs" }
    );
    const cMap: Record<number, number> = {};
    for (const c of cohorts) cMap[c.cohort_number] = c.id;

    // COHORT 1 teams
    await ctx.integrations.apps_database.execute(`
      INSERT INTO camp201_past_teams (cohort_id, team_name, place) VALUES
        ($1, 'Group One', NULL), ($1, 'Group Two', NULL), ($1, 'Group Three', NULL), ($1, 'Group Four', NULL)
      ON CONFLICT DO NOTHING;
    `, [cMap[1]], { label: "C1 teams" });

    // COHORT 2 teams
    await ctx.integrations.apps_database.execute(`
      INSERT INTO camp201_past_teams (cohort_id, team_name, place) VALUES
        ($1, 'Group One', NULL), ($1, 'Group Two', NULL), ($1, 'Group Three', NULL), ($1, 'Group Four', NULL)
      ON CONFLICT DO NOTHING;
    `, [cMap[2]], { label: "C2 teams" });

    // COHORT 4 teams
    await ctx.integrations.apps_database.execute(`
      INSERT INTO camp201_past_teams (cohort_id, team_name, logo_url, points, points_note, place, is_winner, tagline) VALUES
        ($1, 'Value Drivers', '/logos/c4-value-drivers.png', 141, 'Pre-finals', 1, true, 'Always Driving Value'),
        ($1, 'Campliteers', '/logos/c4-campliteers.png', 140, 'Pre-finals', 2, false, 'Camp, Connect, Amplify!'),
        ($1, 'Trailblazers', '/logos/c4-trailblazers.png', 132, 'Pre-finals', 3, false, 'Better Than Benioff')
      ON CONFLICT DO NOTHING;
    `, [cMap[4]], { label: "C4 teams" });

    // COHORT 5 teams
    await ctx.integrations.apps_database.execute(`
      INSERT INTO camp201_past_teams (cohort_id, team_name, logo_url, points, place, is_winner, tagline) VALUES
        ($1, 'The DataPuff Girls', '/logos/c5-datapuff-girls.png', 209, 1, true, 'Sugar, Spice & Everything Insights'),
        ($1, 'The English Breakfast Club', '/logos/c5-english-breakfast-club.png', 187, 2, false, NULL),
        ($1, 'The cAMPtastic Four', '/logos/c5-camptastic-four.png', 176, 3, false, 'From the Lab... To the Rescue!')
      ON CONFLICT DO NOTHING;
    `, [cMap[5]], { label: "C5 teams" });

    // COHORT 6 teams
    await ctx.integrations.apps_database.execute(`
      INSERT INTO camp201_past_teams (cohort_id, team_name, logo_url, points, place, is_winner, tagline, presentation_company) VALUES
        ($1, 'chAMPiones', '/logos/c6-championies.png', 186, 1, true, 'We came. We camped. We closed.', 'Intuit QuickBooks'),
        ($1, 'cAMPfire Insights', '/logos/c6-campfire-insights.png', 158, 2, false, 'The team gathered around the fire.', 'Zillow'),
        ($1, 'S''more Conversions', '/logos/c6-smore-conversions.png', 148, 3, false, NULL, 'DoorDash')
      ON CONFLICT DO NOTHING;
    `, [cMap[6]], { label: "C6 teams" });

    // COHORT 7 teams
    await ctx.integrations.apps_database.execute(`
      INSERT INTO camp201_past_teams (cohort_id, team_name, logo_url, points, place, is_winner, tagline) VALUES
        ($1, 'Five Wavemakers', '/logos/c7-five-wavemakers.png', 127, 1, true, 'Waves and Wipeouts'),
        ($1, 'Wave Makers', '/logos/c7-wave-makers.png', 108, 2, false, 'Self-improving product experts'),
        ($1, 'K-POP Data Hunters', '/logos/c7-kpop-data-hunters.jpg', 107, 3, false, NULL),
        ($1, 'Funnel Scouts', '/logos/c7-funnel-scouts.png', 106, 4, false, NULL)
      ON CONFLICT DO NOTHING;
    `, [cMap[7]], { label: "C7 teams" });

    // Now get all team IDs for member seeding
    const TeamIdSchema = z.object({ id: z.coerce.number(), team_name: z.string(), cohort_id: z.coerce.number() });
    const teams = await ctx.integrations.apps_database.query(
      "SELECT id, team_name, cohort_id FROM camp201_past_teams ORDER BY id",
      TeamIdSchema, undefined, { label: "Get team IDs" }
    );

    const findTeam = (cohortNum: number, teamName: string) => {
      const cid = cMap[cohortNum];
      return teams.find(t => t.cohort_id === cid && t.team_name === teamName)?.id ?? 0;
    };

    // C1 members
    const c1g1 = findTeam(1, "Group One");
    const c1g2 = findTeam(1, "Group Two");
    const c1g3 = findTeam(1, "Group Three");
    const c1g4 = findTeam(1, "Group Four");

    await ctx.integrations.apps_database.execute(`
      INSERT INTO camp201_past_members (team_id, full_name) VALUES
        ($1,'Amanda Grennan'),($1,'Cara DeForge'),($1,'Harshivl Shah'),($1,'Emrah Çetin'),
        ($2,'Fe Hmelar'),($2,'Katie Williams'),($2,'Kurt Fitterer'),($2,'Javier Alvarado'),($2,'Adam Yapkowitz'),
        ($3,'Noah Dorfman'),($3,'Gabriel Mandossian'),($3,'Shessvy Kelly'),($3,'Archie Browne'),($3,'Paul Kozusko'),
        ($4,'Jonathan Solomiany'),($4,'Jonathan Fryett'),($4,'Rakeen Mahmud'),($4,'Lucas Demiguel')
    `, [c1g1, c1g2, c1g3, c1g4], { label: "C1 members" });

    // C2 members
    const c2g1 = findTeam(2, "Group One");
    const c2g2 = findTeam(2, "Group Two");
    const c2g3 = findTeam(2, "Group Three");
    const c2g4 = findTeam(2, "Group Four");

    await ctx.integrations.apps_database.execute(`
      INSERT INTO camp201_past_members (team_id, full_name) VALUES
        ($1,'Christy Barnett'),($1,'Zach Gould'),($1,'Anastasia Tkachuk'),($1,'Gina Bradley'),($1,'Youssef Bengelloun'),($1,'Cassandra Tang'),
        ($2,'Nate Harrison'),($2,'Noumouké N''Diaye'),($2,'Uelton Dias/Moura'),($2,'Yusuf Ali'),($2,'Kristin Rooke'),($2,'Dave Brown'),
        ($3,'Kyle McDaniel'),($3,'Arjun Soman Ulogen'),($3,'Katie Jiang'),($3,'Karolina Polovynko'),($3,'James Appleton'),($3,'Billy Cabrera'),
        ($4,'Pratham Shetty'),($4,'John Buchney'),($4,'Alan Weijdema'),($4,'Gabriella Bertran'),($4,'Lejf Hansen'),($4,'Kelly Casanova')
    `, [c2g1, c2g2, c2g3, c2g4], { label: "C2 members" });

    // C4 members
    const c4vd = findTeam(4, "Value Drivers");
    const c4cm = findTeam(4, "Campliteers");
    const c4tb = findTeam(4, "Trailblazers");

    await ctx.integrations.apps_database.execute(`
      INSERT INTO camp201_past_members (team_id, full_name) VALUES
        ($1,'Heeren Gandhi'),($1,'Chris Slovak'),($1,'Edward Chiang'),($1,'Sharon Mertens'),($1,'Warren Villanueva'),($1,'Maddy Agrawal'),
        ($2,'Hope Flower'),($2,'Chris Landon'),($2,'Nitin Sethi'),($2,'Sonia Ardeel'),($2,'Michael Pakter'),
        ($3,'Baljin Singh'),($3,'Jamie Wells'),($3,'Aaron Gottesfeld'),($3,'Kiley Sheehy'),($3,'Saish Santosh Redkar')
    `, [c4vd, c4cm, c4tb], { label: "C4 members" });

    // C5 members
    const c5dp = findTeam(5, "The DataPuff Girls");
    const c5eb = findTeam(5, "The English Breakfast Club");
    const c5cf = findTeam(5, "The cAMPtastic Four");

    await ctx.integrations.apps_database.execute(`
      INSERT INTO camp201_past_members (team_id, full_name) VALUES
        ($1,'Sophia Fellner'),($1,'Yi Shiean Tan'),($1,'Ariana Henck'),
        ($2,'Allyssa Cruz'),($2,'Alice Steels'),($2,'Jackson Yang'),($2,'Philip Norblad'),
        ($3,'Brittany Peters'),($3,'Aaron Feldman'),($3,'Marco Patino'),($3,'Ryan Abelman')
    `, [c5dp, c5eb, c5cf], { label: "C5 members" });

    // C6 members with roles and regions
    const c6ch = findTeam(6, "chAMPiones");
    const c6ci = findTeam(6, "cAMPfire Insights");
    const c6sc = findTeam(6, "S'more Conversions");

    await ctx.integrations.apps_database.execute(`
      INSERT INTO camp201_past_members (team_id, full_name, role, region) VALUES
        ($1,'Miguel Gonzalez','SDR','NAMER'),($1,'Inci Ovat','SDR','EMEA'),($1,'Cameron Curran','AE','NAMER'),($1,'Erin Shields','SE','NAMER'),($1,'Nayeem Shaik','CSA','APJ'),($1,'Kritika Gadia','Renewals','APJ'),
        ($2,'Leah McGhee','AE','NAMER'),($2,'Mariana Kakarakis','SDR','LATAM'),($2,'Anthony Ho Cheuk Kiu','SDR','APJ'),($2,'Renato Limao','AE','LATAM'),($2,'Perla Lobera','SE','NAMER'),($2,'Lucas Cyr','CSA','NAMER'),
        ($3,'Derek Liu','AE','NAMER'),($3,'Evgenia Yatsenko','SDR','EMEA'),($3,'Wai Yee Lydia Lok','SDR','APJ'),($3,'David Kim','AE','NAMER'),($3,'Tucker Sjoblad','SE','NAMER'),($3,'Jihee Yoo','CSA','APJ')
    `, [c6ch, c6ci, c6sc], { label: "C6 members" });

    // C7 members with roles and regions
    const c7fw = findTeam(7, "Five Wavemakers");
    const c7wm = findTeam(7, "Wave Makers");
    const c7kp = findTeam(7, "K-POP Data Hunters");
    const c7fs = findTeam(7, "Funnel Scouts");

    await ctx.integrations.apps_database.execute(`
      INSERT INTO camp201_past_members (team_id, full_name, role, region) VALUES
        ($1,'Mo Bouzari','SE','NAMER'),($1,'Alex Sgueglia','TSM','NAMER'),($1,'Levi Verry','AE','NAMER'),($1,'Salim Al Sabaa','AE','NAMER'),($1,'Kabir Rai','AE','APAC'),
        ($2,'Cole Craig','Renewals','NAMER'),($2,'Yukyung Roh','AE','APAC'),($2,'Scott Wilson','TSM','NAMER'),($2,'Brett Bogle','AE','NAMER'),($2,'Andre Woodroffe','AE','NAMER'),
        ($3,'Benjamin Singh','AE','EMEA'),($3,'Tyler Spaan','AE','NAMER'),($3,'Daniel Kim','TSM','NAMER'),($3,'Chris Webber','TSM','NAMER'),($3,'Kevin Terauchi','Partner Sales','APAC'),
        ($4,'Felipe Boni','TSM','LATAM'),($4,'Cambi Cukar','AE','NAMER'),($4,'Mike Farrell','TSM','NAMER'),($4,'Chris English','AE','NAMER'),($4,'Mo Rafati','AE','NAMER')
    `, [c7fw, c7wm, c7kp, c7fs], { label: "C7 members" });

    return { success: true, message: "Seeded 7 cohorts with teams and members" };
  },
});
