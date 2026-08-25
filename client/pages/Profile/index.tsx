import { useState, useCallback, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Icon } from "@/components/ui/icon";
import { useApi } from "@/hooks/useApi";
import { useApiData } from "@/hooks/useApiData";
import { useSuperblocksUser } from "@superblocksteam/library";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const ICE_BREAKER_QUESTIONS = [
  "If you could have dinner with anyone (living or dead), who would it be and why?",
  "What's one thing on your bucket list you haven't done yet?",
  "If you were stranded on a desert island, what 3 items would you bring?",
];

export default function ProfilePage() {
  const user = useSuperblocksUser();

  const { data, loading, refetch } = useApiData("GetCurrentCamper", {
    email: user?.email ?? "",
  }, { enabled: !!user?.email });

  const { run: updateProfile, loading: saving } = useApi("UpdateCamperProfile");

  // Form state
  const [bio, setBio] = useState("");
  const [linkedinOption, setLinkedinOption] = useState("none");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [funFact, setFunFact] = useState("");
  const [goal1, setGoal1] = useState("");
  const [goal2, setGoal2] = useState("");
  const [goal3, setGoal3] = useState("");
  const [iceBreaker1, setIceBreaker1] = useState("");
  const [iceBreaker2, setIceBreaker2] = useState("");
  const [iceBreaker3, setIceBreaker3] = useState("");

  // Populate form when data loads
  useEffect(() => {
    if (data?.camper) {
      const c = data.camper;
      setBio(c.bio ?? "");
      setLinkedinOption(c.linkedin_option ?? "none");
      setLinkedinUrl(c.linkedin_url ?? "");
      setFunFact(c.fun_fact ?? "");
      setGoal1(c.goal_1 ?? "");
      setGoal2(c.goal_2 ?? "");
      setGoal3(c.goal_3 ?? "");
      setIceBreaker1(c.ice_breaker_q1 ?? "");
      setIceBreaker2(c.ice_breaker_q2 ?? "");
      setIceBreaker3(c.ice_breaker_q3 ?? "");
    }
  }, [data]);

  const handleSave = useCallback(async () => {
    try {
      const result = await updateProfile({
        email: user?.email ?? "",
        photo_url: null,
        bio: bio || null,
        linkedin_option: linkedinOption,
        linkedin_url: linkedinUrl || null,
        fun_fact: funFact || null,
        goal_1: goal1 || null,
        goal_2: goal2 || null,
        goal_3: goal3 || null,
        ice_breaker_q1: iceBreaker1 || null,
        ice_breaker_q2: iceBreaker2 || null,
        ice_breaker_q3: iceBreaker3 || null,
      });

      if (result && result.pointsAwarded > 0) {
        toast.success(`Profile saved! 🎉 +${result.pointsAwarded} points earned for completing your profile!`);
      } else {
        toast.success("Profile updated successfully!");
      }
      refetch();
    } catch (error) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message: unknown }).message)
          : String(error);
      toast.error("Failed to save profile: " + message);
    }
  }, [user?.email, bio, linkedinOption, linkedinUrl, funFact, goal1, goal2, goal3, iceBreaker1, iceBreaker2, iceBreaker3, updateProfile, refetch]);

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-8 max-w-3xl">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!data?.isRegistered) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Card className="p-8 text-center max-w-md">
          <Icon icon="tent" className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Not Registered Yet</h2>
          <p className="text-muted-foreground text-sm">Head back to Base Camp to register for cAMP 201 first.</p>
        </Card>
      </div>
    );
  }

  const camper = data.camper;
  const isComplete = !!(bio && funFact && goal1 && goal2 && goal3 && iceBreaker1 && iceBreaker2 && iceBreaker3);

  return (
    <div className="flex flex-col gap-6 p-8 max-w-3xl overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Icon icon="user" className="w-6 h-6 text-camp-green" />
            My Profile
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Build your cAMPer identity — complete all fields to earn <span className="text-camp-amber font-semibold">+15 points</span>
          </p>
        </div>
        {camper?.profile_completed && (
          <div className="flex items-center gap-2 bg-camp-green/10 text-camp-green rounded-lg px-3 py-1.5 text-sm font-medium">
            <Icon icon="check-circle" className="w-4 h-4" />
            Profile Complete
          </div>
        )}
      </div>

      {/* Photo & Bio Section */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Icon icon="camera" className="w-5 h-5 text-camp-amber" />
          About You
        </h2>

        <div className="flex flex-col gap-5">
          {/* Photo placeholder */}
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-border">
              <Icon icon="user" className="w-8 h-8 text-muted-foreground" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">Profile Photo</p>
              <p className="text-xs text-muted-foreground">Photo upload coming soon — for now, your initials will be displayed</p>
            </div>
          </div>

          {/* Bio */}
          <div className="flex flex-col gap-1.5">
            <Label>cAMPer Bio *</Label>
            <Textarea
              placeholder="Tell your fellow cAMPers about yourself — background, interests, what brings you to Amplitude..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          {/* LinkedIn */}
          <div className="flex flex-col gap-3">
            <Label>LinkedIn Profile</Label>
            <Select value={linkedinOption} onValueChange={setLinkedinOption}>
              <SelectTrigger>
                <SelectValue placeholder="LinkedIn preference" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="share">I'd like to share my LinkedIn</SelectItem>
                <SelectItem value="prefer_not">Prefer not to share</SelectItem>
                <SelectItem value="none">I don't have one</SelectItem>
              </SelectContent>
            </Select>
            {linkedinOption === "share" && (
              <Input
                placeholder="https://linkedin.com/in/your-profile"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
              />
            )}
          </div>
        </div>
      </Card>

      {/* Fun Fact */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Icon icon="sparkles" className="w-5 h-5 text-camp-amber" />
          Fun Fact
        </h2>
        <div className="flex flex-col gap-1.5">
          <Label>Share a fun camp/travel/hobby fact about yourself *</Label>
          <Textarea
            placeholder="Maybe you've hiked the PCT, bake award-winning sourdough, or once swam with sharks..."
            value={funFact}
            onChange={(e) => setFunFact(e.target.value)}
            className="min-h-[80px]"
          />
        </div>
      </Card>

      {/* Goals */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Icon icon="target" className="w-5 h-5 text-camp-green" />
          What do you want to get out of cAMP?
        </h2>
        <p className="text-sm text-muted-foreground mb-4">Share 3 things you hope to take away from this experience.</p>
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-camp-green/10 text-camp-green text-xs font-bold mt-1">1</span>
            <Input
              placeholder="First goal or takeaway..."
              value={goal1}
              onChange={(e) => setGoal1(e.target.value)}
              className="flex-1"
            />
          </div>
          <div className="flex items-start gap-3">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-camp-green/10 text-camp-green text-xs font-bold mt-1">2</span>
            <Input
              placeholder="Second goal or takeaway..."
              value={goal2}
              onChange={(e) => setGoal2(e.target.value)}
              className="flex-1"
            />
          </div>
          <div className="flex items-start gap-3">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-camp-green/10 text-camp-green text-xs font-bold mt-1">3</span>
            <Input
              placeholder="Third goal or takeaway..."
              value={goal3}
              onChange={(e) => setGoal3(e.target.value)}
              className="flex-1"
            />
          </div>
        </div>
      </Card>

      {/* Ice Breaker Survey */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Icon icon="message-circle" className="w-5 h-5 text-camp-amber" />
          Ice Breaker Survey
        </h2>
        <p className="text-sm text-muted-foreground mb-4">Your answers help our Counselors plan fun activities!</p>
        <div className="flex flex-col gap-5">
          {ICE_BREAKER_QUESTIONS.map((question, idx) => (
            <div key={idx} className="flex flex-col gap-1.5">
              <Label className="text-sm">{question} *</Label>
              <Textarea
                placeholder="Your answer..."
                value={idx === 0 ? iceBreaker1 : idx === 1 ? iceBreaker2 : iceBreaker3}
                onChange={(e) => {
                  if (idx === 0) setIceBreaker1(e.target.value);
                  else if (idx === 1) setIceBreaker2(e.target.value);
                  else setIceBreaker3(e.target.value);
                }}
                className="min-h-[70px]"
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex items-center justify-between py-4 sticky bottom-0 bg-background border-t border-border -mx-8 px-8">
        <div className="text-sm text-muted-foreground">
          {isComplete ? (
            <span className="text-camp-green flex items-center gap-1">
              <Icon icon="check" className="w-4 h-4" /> All required fields complete
            </span>
          ) : (
            <span>Fill in all fields marked * to complete your profile</span>
          )}
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-primary hover:bg-primary/90"
          size="lg"
        >
          {saving ? (
            <>
              <Icon icon="loader-2" className="w-4 h-4 animate-spin mr-2" />
              Saving...
            </>
          ) : (
            <>
              <Icon icon="save" className="w-4 h-4 mr-2" />
              Save Profile
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
