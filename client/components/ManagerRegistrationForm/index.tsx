import { useState, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { useApi } from "@/hooks/useApi";
import { useApiData } from "@/hooks/useApiData";
import { toast } from "sonner";

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
  const [selectedHires, setSelectedHires] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const { run: registerManager, loading } = useApi("RegisterManager");

  // Fetch all cAMPers in the current cohort for hire selection
  const { data: cohortData, loading: loadingCampers } = useApiData("GetCohortCampersForManager", {});
  const campers = cohortData?.campers ?? [];

  const filteredCampers = useMemo(() => {
    if (!searchQuery) return campers;
    const q = searchQuery.toLowerCase();
    return campers.filter((c: { first_name: string; last_name: string; role: string; email: string }) =>
      `${c.first_name} ${c.last_name} ${c.role} ${c.email}`.toLowerCase().includes(q)
    );
  }, [campers, searchQuery]);

  const toggleHire = useCallback((camperId: number) => {
    setSelectedHires(prev =>
      prev.includes(camperId)
        ? prev.filter(id => id !== camperId)
        : [...prev, camperId]
    );
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!firstName || !lastName || !title) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (selectedHires.length === 0) {
      toast.error("Please select at least one new hire");
      return;
    }

    try {
      await registerManager({
        email: userEmail,
        first_name: firstName,
        last_name: lastName,
        title,
        region: region || null,
        hire_ids: selectedHires,
      });
      toast.success(`Welcome! You're now tracking ${selectedHires.length} cAMPer${selectedHires.length > 1 ? "s" : ""}`);
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

        {/* Form */}
        <div className="flex flex-col gap-5">
          {/* Name row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mgrFirstName">First Name *</Label>
              <Input
                id="mgrFirstName"
                placeholder="Enter first name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mgrLastName">Last Name *</Label>
              <Input
                id="mgrLastName"
                placeholder="Enter last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <Label>Title *</Label>
            <Input
              placeholder="e.g. Sales Manager, AVP, Director"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
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

          {/* Hire Selection */}
          <div className="flex flex-col gap-2">
            <Label>Select Your New Hire(s) *</Label>
            <p className="text-xs text-muted-foreground">
              Choose the cAMPer(s) you manage. You can select multiple.
            </p>

            {/* Selected hires badges */}
            {selectedHires.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-muted/50">
                {selectedHires.map(hireId => {
                  const camper = campers.find((c: { id: number }) => c.id === hireId);
                  if (!camper) return null;
                  return (
                    <Badge
                      key={hireId}
                      variant="secondary"
                      className="flex items-center gap-1 pr-1 cursor-pointer hover:bg-destructive/10"
                      onClick={() => toggleHire(hireId)}
                    >
                      {camper.first_name} {camper.last_name}
                      <Icon icon="x" className="w-3 h-3" />
                    </Badge>
                  );
                })}
              </div>
            )}

            {/* Search */}
            <div className="relative">
              <Icon icon="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search cAMPers by name, title, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Camper list */}
            <div className="max-h-48 overflow-y-auto rounded-lg border divide-y">
              {loadingCampers ? (
                <div className="p-4 text-center text-sm text-muted-foreground">Loading cAMPers...</div>
              ) : filteredCampers.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  {searchQuery ? "No cAMPers found" : "No cAMPers registered yet"}
                </div>
              ) : (
                filteredCampers.map((camper: { id: number; first_name: string; last_name: string; role: string; email: string }) => {
                  const isSelected = selectedHires.includes(camper.id);
                  return (
                    <button
                      key={camper.id}
                      type="button"
                      onClick={() => toggleHire(camper.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors ${
                        isSelected
                          ? "bg-primary/5 border-l-2 border-l-primary"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                        isSelected ? "bg-primary border-primary" : "border-muted-foreground/30"
                      }`}>
                        {isSelected && <Icon icon="check" className="w-3 h-3 text-primary-foreground" />}
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="font-medium truncate">{camper.first_name} {camper.last_name}</span>
                        <span className="text-xs text-muted-foreground truncate">{camper.role}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedHires.length} cAMPer{selectedHires.length !== 1 ? "s" : ""} selected
            </p>
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={loading || !firstName || !lastName || !title || selectedHires.length === 0}
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
                <Icon icon="binoculars" className="w-4 h-4 mr-2" />
                View My cAMPers
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
