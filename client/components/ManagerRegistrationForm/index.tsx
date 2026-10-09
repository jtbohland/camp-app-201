import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Icon } from "@/components/ui/icon";
import { useApi } from "@/hooks/useApi";
import { useApiData } from "@/hooks/useApiData";
import { toast } from "sonner";
import NewHiresSection from "./NewHiresSection";
import type { HireOption } from "./NewHirePicker";

type ManagerRegistrationFormProps = {
  userEmail: string;
  onSuccess: () => void;
};

const REGIONS = ["North America", "EMEA", "APAC", "LATAM"];

export default function ManagerRegistrationForm({ userEmail, onSuccess }: ManagerRegistrationFormProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [title, setTitle] = useState("");
  const [region, setRegion] = useState("");
  const [selectedHires, setSelectedHires] = useState<HireOption[]>([]);

  const { run: registerManager, loading } = useApi("RegisterManager");

  // Registered cAMPers in the current cohort
  const { data: cohortData, loading: loadingCampers } = useApiData("GetCohortCampersForManager", {});
  const campers: HireOption[] = cohortData?.campers ?? [];

  const canSubmit = !!firstName.trim() && !!lastName.trim() && !!title.trim() && selectedHires.length > 0;

  const handleSubmit = useCallback(async () => {
    if (!firstName.trim() || !lastName.trim() || !title.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (selectedHires.length === 0) {
      toast.error("Please add at least one new hire");
      return;
    }

    try {
      await registerManager({
        email: userEmail,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        title: title.trim(),
        region: region || null,
        hire_ids: selectedHires.map((h) => h.id),
      });
      const n = selectedHires.length;
      toast.success(`Welcome! You're now tracking ${n} cAMPer${n > 1 ? "s" : ""}`);
      onSuccess();
    } catch (error) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message: unknown }).message)
          : String(error);
      toast.error("Registration failed: " + message);
    }
  }, [firstName, lastName, title, region, selectedHires, userEmail, registerManager, onSuccess]);

  return (
    <div className="flex items-center justify-center min-h-full p-8">
      <Card className="w-full max-w-2xl p-8 shadow-lg border-camp-green/20">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-blue-500/10 mb-4">
            <Icon icon="binoculars" className="w-8 h-8 text-blue-500" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Manager Portal</h1>
          <p className="text-sm text-muted-foreground mt-1">Track your new hire&apos;s cAMP 201 journey</p>
        </div>

        <div className="flex flex-col gap-5">
          {/* Name */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mgrFirstName">First Name *</Label>
              <Input id="mgrFirstName" placeholder="Enter first name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mgrLastName">Last Name *</Label>
              <Input id="mgrLastName" placeholder="Enter last name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>

          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mgrTitle">Title *</Label>
            <Input id="mgrTitle" placeholder="e.g. Sales Manager, AVP, Director" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          {/* Region */}
          <div className="flex flex-col gap-1.5">
            <Label>Region</Label>
            <Select value={region} onValueChange={setRegion}>
              <SelectTrigger>
                <SelectValue placeholder="Select region" />
              </SelectTrigger>
              <SelectContent>
                {REGIONS.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* New hires: one at a time, with "add another" */}
          <NewHiresSection
            campers={campers}
            loading={loadingCampers}
            selected={selectedHires}
            onChange={setSelectedHires}
          />

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={loading || !canSubmit}
            className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white"
            size="lg"
          >
            {loading ? (
              <>
                <Icon icon="loader-2" className="w-4 h-4 animate-spin mr-2" />
                Registering...
              </>
            ) : (
              <>
                <Icon icon="check" className="w-4 h-4 mr-2" />
                Complete Registration
                {selectedHires.length > 0 && ` (${selectedHires.length} new hire${selectedHires.length > 1 ? "s" : ""})`}
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
