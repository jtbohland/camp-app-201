import { useState, useCallback, useEffect } from "react";
import { useApiData } from "@/hooks/useApiData.js";
import { useApi } from "@/hooks/useApi.js";
import { useSuperblocksUser } from "@superblocksteam/library";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

  useEffect(() => {
    if (data?.camper) {
      setPhotoUrl(data.camper.photo_url ?? "");
      setBio(data.camper.bio ?? "");
      setFunFact(data.camper.fun_fact ?? "");
      setLinkedinUrl(data.camper.linkedin_url ?? "");
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
      });
      toast.success("Counselor profile updated!");
      refetch();
    } catch (error) {
      const message = error && typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message) : String(error);
      toast.error("Failed to save: " + message);
    }
  }, [user?.email, photoUrl, bio, funFact, linkedinUrl, updateProfile, refetch]);

  if (loading) return null;

  const camper = data?.camper;
  if (!camper) return null;

  return (
    <div className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/10">
      <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Icon icon="user-circle" className="w-5 h-5" />
        My Counselor Profile
      </h2>
      <p className="text-sm text-white/60 mb-5">
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
            <p className="text-sm font-medium text-white">{camper.first_name} {camper.last_name}</p>
            <p className="text-xs text-white/50">{user?.email}</p>
          </div>
        </div>

        <div>
          <label className="text-sm text-white/80 mb-1 block">Bio</label>
          <Textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell cAMPers about yourself..."
            className="bg-white/10 border-white/20 text-white placeholder:text-white/30 min-h-[80px]"
          />
        </div>

        <div>
          <label className="text-sm text-white/80 mb-1 block">Fun Fact</label>
          <Input
            value={funFact}
            onChange={(e) => setFunFact(e.target.value)}
            placeholder="Something fun about you"
            className="bg-white/10 border-white/20 text-white placeholder:text-white/30"
          />
        </div>

        <div>
          <label className="text-sm text-white/80 mb-1 block">LinkedIn URL</label>
          <Input
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
            placeholder="https://linkedin.com/in/..."
            className="bg-white/10 border-white/20 text-white placeholder:text-white/30"
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
