import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icon } from "@/components/ui/icon";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CountryPicker from "@/components/CountryPicker/index.js";
import { STANDARD_ROLES, ROLE_HINTS, type StandardRole } from "@/lib/roles.js";
import { REGIONS, REGION_STYLES, type Region } from "@/lib/regions.js";
import { FIELD_LABELS, isFilled, type RegField, type RegValues } from "./fields";

type Props = {
  field: RegField;
  values: RegValues;
  onChange: (field: RegField, value: string) => void;
};

/** One missing registration field, with a check once it's filled in correctly. */
export default function RegistrationFieldInput({ field, values, onChange }: Props) {
  const done = isFilled(field, values);
  const id = `reg-${field}`;

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="flex items-center gap-1.5">
        {done ? (
          <Icon icon="circle-check" className="w-3.5 h-3.5 text-camp-green" />
        ) : (
          <Icon icon="circle-alert" className="w-3.5 h-3.5 text-camp-amber" />
        )}
        {FIELD_LABELS[field]} *
      </Label>

      {field === "role" ? (
        <Select value={values.role} onValueChange={(v) => onChange("role", v as StandardRole)}>
          <SelectTrigger id={id}>
            <SelectValue placeholder="Select your role" />
          </SelectTrigger>
          <SelectContent>
            {STANDARD_ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                <span className="font-medium">{r}</span>
                {ROLE_HINTS[r] && <span className="ml-2 text-xs text-muted-foreground">{ROLE_HINTS[r]}</span>}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : field === "region" ? (
        <Select value={values.region} onValueChange={(v) => onChange("region", v as Region)}>
          <SelectTrigger id={id}>
            <SelectValue placeholder="Select your region" />
          </SelectTrigger>
          <SelectContent>
            {REGIONS.map((r) => (
              <SelectItem key={r} value={r}>{REGION_STYLES[r].globe} {r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : field === "country" ? (
        <CountryPicker id={id} value={values.country} onChange={(v) => onChange("country", v)} placeholder="Select your country" />
      ) : (
        <Input
          id={id}
          type={field === "start_date" ? "date" : field === "manager_email" ? "email" : "text"}
          placeholder={field === "manager_email" ? "firstname.lastname@amplitude.com" : ""}
          value={values[field]}
          onChange={(e) => onChange(field, e.target.value)}
        />
      )}

      {field === "manager_email" && values.manager_email.trim() && !done && (
        <p className="text-xs text-camp-amber">Enter a full work email address.</p>
      )}
    </div>
  );
}
