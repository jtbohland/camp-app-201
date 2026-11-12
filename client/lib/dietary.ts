/** Optional dietary considerations a cAMPer can share. Values are stored; labels are shown. */
export const DIETARY_OPTIONS: { value: string; label: string; group: "Diet" | "Allergy" | "Religious / cultural" | "Other" }[] = [
  { value: "vegetarian", label: "Vegetarian", group: "Diet" },
  { value: "vegan", label: "Vegan", group: "Diet" },
  { value: "pescatarian", label: "Pescatarian", group: "Diet" },
  { value: "gluten_free", label: "Gluten-free / celiac", group: "Diet" },
  { value: "dairy_free", label: "Dairy-free / lactose intolerant", group: "Diet" },
  { value: "low_carb", label: "Low-carb / keto", group: "Diet" },
  { value: "nut_allergy", label: "Tree nut allergy", group: "Allergy" },
  { value: "peanut_allergy", label: "Peanut allergy", group: "Allergy" },
  { value: "shellfish_allergy", label: "Shellfish allergy", group: "Allergy" },
  { value: "fish_allergy", label: "Fish allergy", group: "Allergy" },
  { value: "egg_allergy", label: "Egg allergy", group: "Allergy" },
  { value: "soy_allergy", label: "Soy allergy", group: "Allergy" },
  { value: "sesame_allergy", label: "Sesame allergy", group: "Allergy" },
  { value: "halal", label: "Halal", group: "Religious / cultural" },
  { value: "kosher", label: "Kosher", group: "Religious / cultural" },
  { value: "no_pork", label: "No pork", group: "Religious / cultural" },
  { value: "no_beef", label: "No beef", group: "Religious / cultural" },
  { value: "jain", label: "Jain", group: "Religious / cultural" },
  { value: "other", label: "Other (add details below)", group: "Other" },
];

const LABELS = new Map(DIETARY_OPTIONS.map((o) => [o.value, o.label.replace(" (add details below)", "")]));
const ALLERGY = new Set(DIETARY_OPTIONS.filter((o) => o.group === "Allergy").map((o) => o.value));

export const dietaryLabel = (value: string) => LABELS.get(value) ?? value;
export const isAllergy = (value: string) => ALLERGY.has(value);
