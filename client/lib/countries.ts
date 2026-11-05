/**
 * Every country (ISO 3166 code + common English name) for the searchable country picker.
 * Flags are built from the ISO code. Keep aliases in sync with camp201_map_country() (migration 0017).
 */
const RAW = `AF Afghanistan|AL Albania|DZ Algeria|AD Andorra|AO Angola|AG Antigua and Barbuda|AR Argentina|AM Armenia|AU Australia|AT Austria|AZ Azerbaijan|BS Bahamas|BH Bahrain|BD Bangladesh|BB Barbados|BY Belarus|BE Belgium|BZ Belize|BJ Benin|BT Bhutan|BO Bolivia|BA Bosnia and Herzegovina|BW Botswana|BR Brazil|BN Brunei|BG Bulgaria|BF Burkina Faso|BI Burundi|CV Cabo Verde|KH Cambodia|CM Cameroon|CA Canada|CF Central African Republic|TD Chad|CL Chile|CN China|CO Colombia|KM Comoros|CG Congo|CD Congo (DRC)|CR Costa Rica|CI Côte d'Ivoire|HR Croatia|CU Cuba|CY Cyprus|CZ Czechia|DK Denmark|DJ Djibouti|DM Dominica|DO Dominican Republic|EC Ecuador|EG Egypt|SV El Salvador|GQ Equatorial Guinea|ER Eritrea|EE Estonia|SZ Eswatini|ET Ethiopia|FJ Fiji|FI Finland|FR France|GA Gabon|GM Gambia|GE Georgia|DE Germany|GH Ghana|GR Greece|GD Grenada|GT Guatemala|GN Guinea|GW Guinea-Bissau|GY Guyana|HT Haiti|HN Honduras|HK Hong Kong|HU Hungary|IS Iceland|IN India|ID Indonesia|IR Iran|IQ Iraq|IE Ireland|IL Israel|IT Italy|JM Jamaica|JP Japan|JO Jordan|KZ Kazakhstan|KE Kenya|KI Kiribati|XK Kosovo|KW Kuwait|KG Kyrgyzstan|LA Laos|LV Latvia|LB Lebanon|LS Lesotho|LR Liberia|LY Libya|LI Liechtenstein|LT Lithuania|LU Luxembourg|MG Madagascar|MW Malawi|MY Malaysia|MV Maldives|ML Mali|MT Malta|MH Marshall Islands|MR Mauritania|MU Mauritius|MX Mexico|FM Micronesia|MD Moldova|MC Monaco|MN Mongolia|ME Montenegro|MA Morocco|MZ Mozambique|MM Myanmar|NA Namibia|NR Nauru|NP Nepal|NL Netherlands|NZ New Zealand|NI Nicaragua|NE Niger|NG Nigeria|KP North Korea|MK North Macedonia|NO Norway|OM Oman|PK Pakistan|PW Palau|PS Palestine|PA Panama|PG Papua New Guinea|PY Paraguay|PE Peru|PH Philippines|PL Poland|PT Portugal|PR Puerto Rico|QA Qatar|RO Romania|RU Russia|RW Rwanda|KN Saint Kitts and Nevis|LC Saint Lucia|VC Saint Vincent and the Grenadines|WS Samoa|SM San Marino|ST São Tomé and Príncipe|SA Saudi Arabia|SN Senegal|RS Serbia|SC Seychelles|SL Sierra Leone|SG Singapore|SK Slovakia|SI Slovenia|SB Solomon Islands|SO Somalia|ZA South Africa|KR South Korea|SS South Sudan|ES Spain|LK Sri Lanka|SD Sudan|SR Suriname|SE Sweden|CH Switzerland|SY Syria|TW Taiwan|TJ Tajikistan|TZ Tanzania|TH Thailand|TL Timor-Leste|TG Togo|TO Tonga|TT Trinidad and Tobago|TN Tunisia|TR Turkey|TM Turkmenistan|TV Tuvalu|UG Uganda|UA Ukraine|AE United Arab Emirates|GB United Kingdom|US United States|UY Uruguay|UZ Uzbekistan|VU Vanuatu|VA Vatican City|VE Venezuela|VN Vietnam|YE Yemen|ZM Zambia|ZW Zimbabwe`;

export type Country = { code: string; name: string; flag: string };

function flagFor(code: string): string {
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

export const COUNTRIES: Country[] = RAW.split("|").map((entry) => {
  const code = entry.slice(0, 2);
  const name = entry.slice(3);
  return { code, name, flag: flagFor(code) };
});

const BY_NAME = new Map(COUNTRIES.map((c) => [c.name.toLowerCase(), c]));

const US_STATES = [
  "alabama", "alaska", "arizona", "arkansas", "california", "colorado", "connecticut", "delaware",
  "florida", "hawaii", "idaho", "illinois", "indiana", "iowa", "kansas", "kentucky", "louisiana",
  "maine", "maryland", "massachusetts", "michigan", "minnesota", "mississippi", "missouri", "montana",
  "nebraska", "nevada", "new hampshire", "new jersey", "new mexico", "new york", "north carolina",
  "north dakota", "ohio", "oklahoma", "oregon", "pennsylvania", "rhode island", "south carolina",
  "south dakota", "tennessee", "texas", "utah", "vermont", "virginia", "washington", "west virginia",
  "wisconsin", "wyoming",
];

const ALIASES: Record<string, string> = {
  usa: "United States", us: "United States", "u.s.": "United States", "u.s.a.": "United States", "u.s": "United States",
  "united states of america": "United States", "the united states": "United States", america: "United States",
  nyc: "United States", sf: "United States", "bay area": "United States", "san francisco": "United States",
  "new york city": "United States", "washington dc": "United States", "washington d.c.": "United States",
  dc: "United States", "d.c.": "United States", "georgia, usa": "United States",
  uk: "United Kingdom", "u.k.": "United Kingdom", "the united kingdom": "United Kingdom", "great britain": "United Kingdom",
  britain: "United Kingdom", england: "United Kingdom", scotland: "United Kingdom", wales: "United Kingdom",
  "northern ireland": "United Kingdom", london: "United Kingdom",
  nederland: "Netherlands", "the netherlands": "Netherlands", holland: "Netherlands", amsterdam: "Netherlands",
  uae: "United Arab Emirates", "u.a.e.": "United Arab Emirates", "the united arab emirates": "United Arab Emirates",
  dubai: "United Arab Emirates", "abu dhabi": "United Arab Emirates",
  deutschland: "Germany", berlin: "Germany", munich: "Germany", "münchen": "Germany",
  "españa": "Spain", espana: "Spain", madrid: "Spain", barcelona: "Spain",
  brasil: "Brazil", "são paulo": "Brazil", "sao paulo": "Brazil",
  korea: "South Korea", "s. korea": "South Korea", "republic of korea": "South Korea", "korea, republic of": "South Korea", seoul: "South Korea",
  ksa: "Saudi Arabia", saudi: "Saudi Arabia", "kingdom of saudi arabia": "Saudi Arabia",
  italia: "Italy", "méxico": "Mexico", "türkiye": "Turkey", turkiye: "Turkey",
  paris: "France", sydney: "Australia", melbourne: "Australia", toronto: "Canada", vancouver: "Canada",
  nippon: "Japan", tokyo: "Japan", bharat: "India", bangalore: "India", bengaluru: "India",
  "éire": "Ireland", eire: "Ireland", dublin: "Ireland", "tel aviv": "Israel", bogota: "Colombia", "bogotá": "Colombia",
};
for (const s of US_STATES) ALIASES[s] = "United States";

/** Resolves aliases, local spellings, and US states to a canonical country name. */
export function canonicalCountry(input: string | null | undefined): string | null {
  const raw = (input ?? "").trim();
  if (!raw) return null;
  const l = raw.toLowerCase();
  if (ALIASES[l]) return ALIASES[l];
  return BY_NAME.get(l)?.name ?? raw;
}

export function findCountry(input: string | null | undefined): Country | null {
  const name = canonicalCountry(input);
  return name ? BY_NAME.get(name.toLowerCase()) ?? null : null;
}
