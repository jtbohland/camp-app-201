import { useState, useCallback, useEffect } from "react";
import { useApiData } from "@/hooks/useApiData.js";
import { useApi } from "@/hooks/useApi.js";
import { useSuperblocksUser } from "@superblocksteam/library";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COUNTRY_OPTIONS, getCountryDisplayName, getCountryStyle } from "@/lib/countryUtils.js";
import { toast } from "sonner";
import ProfilePhotoUpload from "@/components/ProfilePhotoUpload/index.js";

export default function AdminCounselorProfile() {
  const user = useSuperblocksUser();
  const { data, loading, refetch } = useApiData("GetCurrentCamper", {
    email: user?.email ?? "",
  }, { enabled: !!user?.email });

  const { run: updateProfile, loading: saving } = useApi("UpdateCounselorProfile");

  const [photoUrl, setPhotoUrl] = useState("");
  const [bio, setBio] = useState("");
  const [funFact, setFunFact] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [startDate, setStartDate] = useState("");
  const [country, setCountry] = useState("");

  useEffect(() => {
    if (data?.camper) {
      setPhotoUrl(data.camper.photo_url ?? "");
      setBio(data.camper.bio ?? "");
      setFunFact(data.camper.fun_fact ?? "");
      setLinkedinUrl(data.camper.linkedin_url ?? "");
      setStartDate((data.camper.start_date ?? "").slice(0, 10));
      // Normalize aliases like "USA" so the dropdown shows the saved value.
      setCountry(getCountryDisplayName(data.camper.country)?.replace(/^the /, "") ?? "");
    }
  }, [data]);

  const handleSave = useCallback(async () => {
    try {
      await updateProfile({
        email: user?.email ?? "",
        photo_url: photoUrl || null,
        bio: bio || null,
        fun_fact: funFact || null,
        linkedin_url: linkedinUrl || null,
        start_date: startDate || null,
        country: country || null,
      });
      toast.success("Counselor profile updated!");
      refetch();
    } catch (error) {
      const message = error && typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message) : String(error);
      toast.error("Failed to save: " + message);
    }
  }, [user?.email, photoUrl, bio, funFact, linkedinUrl, startDate, country, updateProfile, refetch]);

  if (loading) return null;

  const camper = data?.camper;
  if (!camper) {
    return (
      <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
        <h2 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
          <Icon icon="user-circle" className="w-5 h-5" />
          My Counselor Profile
        </h2>
        <p className="text-sm text-muted-foreground">
          Your counselor profile is created the first time you verify through the <span className="font-medium text-foreground">cAMP Counselor</span> tile on the landing page.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
      <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        <Icon icon="user-circle" className="w-5 h-5" />
        My Counselor Profile
      </h2>
      <p className="text-sm text-muted-foreground mb-5">
        This is how you'll appear on the Cohort tab. Keep it updated!
      </p>

      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <ProfilePhotoUpload
            currentPhotoUrl={photoUrl || null}
            email={user?.email ?? ""}
            name={`${camper.first_name ?? ""} ${camper.last_name ?? ""}`}
            onChange={setPhotoUrl}
          />
          <div>
            <p className="text-sm font-medium text-foreground">{camper.first_name} {camper.last_name}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-foreground/80 mb-1 block">Amplitude Start Date</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-background border-input text-foreground"
            />
            <p className="text-xs text-muted-foreground mt-1">Shows your time at Amplitude on your card.</p>
          </div>
          <div>
            <label className="text-sm text-foreground/80 mb-1 block">Country</label>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                {COUNTRY_OPTIONS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {getCountryStyle(c)?.flag} {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">Shows as a flag pill on your card.</p>
          </div>
        </div>

        <div>
          <label className="text-sm text-foreground/80 mb-1 block">Bio</label>
          <Textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell cAMPers about yourself..."
            className="bg-background border-input text-foreground placeholder:text-muted-foreground min-h-[80px]"
          />
        </div>

        <div>
          <label className="text-sm text-foreground/80 mb-1 block">Fun Fact</label>
          <Input
            value={funFact}
            onChange={(e) => setFunFact(e.target.value)}
            placeholder="Something fun about you"
            className="bg-background border-input text-foreground placeholder:text-muted-foreground"
          />
        </div>

        <div>
          <label className="text-sm text-foreground/80 mb-1 block">LinkedIn URL</label>
          <Input
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
            placeholder="https://linkedin.com/in/..."
            className="bg-background border-input text-foreground placeholder:text-muted-foreground"
          />
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-emerald-600 hover:bg-emerald-700 text-white self-start"
        >
          {saving ? "Saving..." : "Save Profile"}
        </Button>
      </div>
    </div>
  );
}
