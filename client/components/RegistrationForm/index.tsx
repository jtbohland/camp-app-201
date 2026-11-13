import { useState, useCallback, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Icon } from "@/components/ui/icon";
import { useApi } from "@/hooks/useApi";
import { useApiData } from "@/hooks/useApiData";
import { toast } from "sonner";
import CountryPicker from "@/components/CountryPicker/index.js";
import { STANDARD_ROLES, ROLE_HINTS, type StandardRole } from "@/lib/roles.js";
import { REGIONS, REGION_STYLES, getRegion, type Region } from "@/lib/regions.js";
// getRegion maps the CSV's region text onto NAMER/EMEA/APAC below.

type RegistrationFormProps = {
  userEmail: string;
  onSuccess: () => void;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** First-time registration. Accounts with blanks are handled by RegistrationCompletionModal. */
export default function RegistrationForm({ userEmail, onSuccess }: RegistrationFormProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<StandardRole | "">("");
  const [managerEmail, setManagerEmail] = useState("");
  const [region, setRegion] = useState<Region | "">("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [startDate, setStartDate] = useState("");

  const { run: registerCamper, loading } = useApi("RegisterCamper");

  // Pre-fill from the counselor's new-hire CSV (every field stays editable).
  const { data: csvInfo } = useApiData("GetMyNewHireInfo", {});
  const prefilled = useRef(false);
  useEffect(() => {
    if (prefilled.current || !csvInfo?.found) return;
    prefilled.current = true;
    if (csvInfo.first_name) setFirstName((v) => v || csvInfo.first_name!);
    if (csvInfo.last_name) setLastName((v) => v || csvInfo.last_name!);
    if (csvInfo.role) setRole((v) => v || (csvInfo.role as StandardRole));
    if (csvInfo.manager_email) setManagerEmail((v) => v || csvInfo.manager_email!);
    if (csvInfo.country) setCountry((v) => v || csvInfo.country!);
    if (csvInfo.start_date) setStartDate((v) => v || csvInfo.start_date!);
    const csvRegion = getRegion(csvInfo.region);
    if (csvRegion) setRegion((v) => v || csvRegion);
  }, [csvInfo]);
  const csvRole = csvInfo?.found ? csvInfo.role : null;

  // Every field is required: registration can't be finished with anything blank.
  const mgrEmail = managerEmail.trim().toLowerCase();
  const missing = [
    !firstName.trim() && "First Name",
    !lastName.trim() && "Last Name",
    !role && "Role",
    !EMAIL_RE.test(mgrEmail) && "Manager's Work Email",
    !region && "Region",
    !country.trim() && "Country",
    !city.trim() && "City",
    !startDate && "Start Date",
  ].filter(Boolean) as string[];

  const handleSubmit = useCallback(async () => {
    if (missing.length > 0 || !role || !region) {
      toast.error("Please fill in: " + missing.join(", "));
      return;
    }

    try {
      const result = await registerCamper({
        email: userEmail,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        role,
        manager: null,
        manager_email: mgrEmail,
        region,
        country: country.trim(),
        city: city.trim(),
        start_date: startDate,
      });
      if (result?.pendingApproval) {
        toast.success("Thanks! A counselor will confirm your spot shortly.");
      } else if (result?.pointsAwarded) {
        toast.success("Welcome to cAMP 201! 🏕️ +10 points earned!");
      } else {
        toast.success("Welcome back to cAMP 201! 🏕️");
      }
      onSuccess();
    } catch (error) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message: unknown }).message)
          : String(error);
      toast.error("Registration failed: " + message);
    }
  }, [missing, firstName, lastName, role, mgrEmail, region, country, city, startDate, userEmail, registerCamper, onSuccess]);

  return (
    <div className="flex items-center justify-center min-h-full p-8">
      <Card className="w-full max-w-lg p-8 shadow-lg border-camp-green/20">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-camp-green/10 mb-4">
            <Icon icon="mountain" className="w-8 h-8 text-camp-green" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Welcome to cAMP 201</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Register to begin your ascent. Every field is required.
          </p>
        </div>

        {/* Form */}
        <div className="flex flex-col gap-5">
          {/* Name row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                placeholder="Enter first name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                placeholder="Enter last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          {/* Role */}
          <div className="flex flex-col gap-1.5">
            <Label>Role *</Label>
            <Select value={role} onValueChange={(v) => setRole(v as StandardRole)}>
              <SelectTrigger>
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
            {csvRole && (
              <p className="text-xs text-muted-foreground">
                {role === csvRole
                  ? "Pre-filled from your cAMP invite. Change it if it's not right."
                  : `Your cAMP invite says ${csvRole}. Your counselors will see the change.`}
              </p>
            )}
          </div>

          {/* Manager */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="managerEmail">Manager&apos;s Work Email *</Label>
            <Input
              id="managerEmail"
              type="email"
              placeholder="firstname.lastname@amplitude.com"
              value={managerEmail}
              onChange={(e) => setManagerEmail(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Lets your manager follow your cAMP journey on their dashboard.
            </p>
          </div>

          {/* Region / Country / City */}
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Region *</Label>
              <Select value={region} onValueChange={(v) => setRegion(v as Region)}>
                <SelectTrigger>
                  <SelectValue placeholder="Region" />
                </SelectTrigger>
                <SelectContent>
                  {REGIONS.map((r) => (
                    <SelectItem key={r} value={r}>{REGION_STYLES[r].globe} {r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Country *</Label>
              <CountryPicker value={country} onChange={setCountry} placeholder="Country" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>City *</Label>
              <Input
                placeholder="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
          </div>

          {/* Start Date */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="startDate">Official Amplitude Start Date *</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={loading || missing.length > 0}
            className="w-full mt-2 bg-primary hover:bg-primary/90"
            size="lg"
          >
            {loading ? (
              <>
                <Icon icon="loader-2" className="w-4 h-4 animate-spin mr-2" />
                Registering...
              </>
            ) : (
              <>
                <Icon icon="tent" className="w-4 h-4 mr-2" />
                Join cAMP 201
              </>
            )}
          </Button>

          {missing.length > 0 && (
            <p className="text-xs text-center text-camp-amber font-medium">
              Fill in every field to register. Still needed: {missing.join(", ")}
            </p>
          )}

          <p className="text-xs text-center text-muted-foreground">
            You'll earn <span className="font-semibold text-camp-amber">+10 points</span> for registering!
          </p>
        </div>
      </Card>
    </div>
  );
}
