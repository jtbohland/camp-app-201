import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Icon } from "@/components/ui/icon";
import { useApi } from "@/hooks/useApi";
import { toast } from "sonner";

type RegistrationFormProps = {
  userEmail: string;
  onSuccess: () => void;
};

const ROLES = ["Account Executive", "Solutions Consultant", "Customer Success Manager", "Sales Development Representative", "Sales Manager", "Sales Engineer", "Other"];

const MANAGERS = ["Select your manager", "Sarah Chen", "Mike Rodriguez", "Emily Watson", "David Park", "Jessica Liu", "Chris Taylor", "Other"];

const REGIONS = ["North America", "EMEA", "APAC", "LATAM"];

export default function RegistrationForm({ userEmail, onSuccess }: RegistrationFormProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState("");
  const [manager, setManager] = useState("");
  const [region, setRegion] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [startDate, setStartDate] = useState("");

  const { run: registerCamper, loading } = useApi("RegisterCamper");

  const handleSubmit = useCallback(async () => {
    if (!firstName || !lastName || !role) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      await registerCamper({
        email: userEmail,
        first_name: firstName,
        last_name: lastName,
        role,
        manager: manager || null,
        region: region || null,
        country: country || null,
        city: city || null,
        start_date: startDate || null,
      });
      toast.success("Welcome to cAMP 201! 🏕️ +10 points earned!");
      onSuccess();
    } catch (error) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message: unknown }).message)
          : String(error);
      toast.error("Registration failed: " + message);
    }
  }, [firstName, lastName, role, manager, region, country, city, startDate, userEmail, registerCamper, onSuccess]);

  return (
    <div className="flex items-center justify-center min-h-full p-8">
      <Card className="w-full max-w-lg p-8 shadow-lg border-camp-green/20">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-camp-green/10 mb-4">
            <Icon icon="mountain" className="w-8 h-8 text-camp-green" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Welcome to cAMP 201</h1>
          <p className="text-sm text-muted-foreground mt-1">Register to begin your ascent</p>
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
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select your role" />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Manager */}
          <div className="flex flex-col gap-1.5">
            <Label>Manager</Label>
            <Select value={manager} onValueChange={setManager}>
              <SelectTrigger>
                <SelectValue placeholder="Select your manager" />
              </SelectTrigger>
              <SelectContent>
                {MANAGERS.filter(m => m !== "Select your manager").map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Region / Country / City */}
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Region</Label>
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger>
                  <SelectValue placeholder="Region" />
                </SelectTrigger>
                <SelectContent>
                  {REGIONS.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Country</Label>
              <Input
                placeholder="Country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>City</Label>
              <Input
                placeholder="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
          </div>

          {/* Start Date */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="startDate">Official Amplitude Start Date</Label>
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
            disabled={loading || !firstName || !lastName || !role}
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

          <p className="text-xs text-center text-muted-foreground">
            You'll earn <span className="font-semibold text-camp-amber">+10 points</span> for registering!
          </p>
        </div>
      </Card>
    </div>
  );
}
