import { useState, useCallback, useEffect, useMemo } from "react";
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
import IceBreakerSection, { ICE_BREAKER_QUESTIONS } from "@/components/IceBreakerSection/index.js";
import CamperAvatar from "@/components/CamperAvatar/index.js";
import FlightDepartureSection from "@/components/FlightDepartureSection/index.js";

export default function ProfilePage() {
  const user = useSuperblocksUser();

  const { data, loading, refetch } = useApiData("GetCurrentCamper", {
    email: user?.email ?? "",
  }, { enabled: !!user?.email });

  const { run: updateProfile, loading: saving } = useApi("UpdateCamperProfile");
  const { run: toggleGoal } = useApi("ToggleGoalAchieved");
  const { run: requestAbsence, loading: requestingAbsence } = useApi("RequestAbsence");

  const { data: historyData } = useApiData("GetCheckInHistory", {
    camper_id: data?.camper?.id ?? 0,
  }, { enabled: !!data?.camper?.id });

  const checkInHistory = historyData?.history ?? [];

  // Absence request state
  const [absenceReason, setAbsenceReason] = useState("");

  // Form state
  const [bio, setBio] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [linkedinOption, setLinkedinOption] = useState("none");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [funFact, setFunFact] = useState("");
  const [goal1, setGoal1] = useState("");
  const [goal2, setGoal2] = useState("");
  const [goal3, setGoal3] = useState("");
  const [iceBreakerAnswers, setIceBreakerAnswers] = useState<Record<string, string>>({});

  // Populate form when data loads
  useEffect(() => {
    if (data?.camper) {
      const c = data.camper;
      setBio(c.bio ?? "");
      setPhotoUrl(c.photo_url ?? "");
      setLinkedinOption(c.linkedin_option ?? "none");
      setLinkedinUrl(c.linkedin_url ?? "");
      setFunFact(c.fun_fact ?? "");
      setGoal1(c.goal_1 ?? "");
      setGoal2(c.goal_2 ?? "");
      setGoal3(c.goal_3 ?? "");
      // Load ice breaker answers from JSONB or legacy columns
      const savedAnswers = (c.ice_breaker_answers && typeof c.ice_breaker_answers === 'object' && Object.keys(c.ice_breaker_answers).length > 0)
        ? c.ice_breaker_answers as Record<string, string>
        : {};
      // Migrate legacy q1/q2/q3 if JSONB is empty
      if (Object.keys(savedAnswers).length === 0 && (c.ice_breaker_q1 || c.ice_breaker_q2 || c.ice_breaker_q3)) {
        if (c.ice_breaker_q1) savedAnswers.q0 = c.ice_breaker_q1;
        if (c.ice_breaker_q2) savedAnswers.q1 = c.ice_breaker_q2;
        if (c.ice_breaker_q3) savedAnswers.q2 = c.ice_breaker_q3;
      }
      setIceBreakerAnswers(savedAnswers);
    }
  }, [data]);

  const handleSave = useCallback(async () => {
    try {
      const result = await updateProfile({
        email: user?.email ?? "",
        photo_url: photoUrl || null,
        bio: bio || null,
        linkedin_option: linkedinOption,
        linkedin_url: linkedinUrl || null,
        fun_fact: funFact || null,
        goal_1: goal1 || null,
        goal_2: goal2 || null,
        goal_3: goal3 || null,
        ice_breaker_q1: iceBreakerAnswers.q0 || null,
        ice_breaker_q2: iceBreakerAnswers.q1 || null,
        ice_breaker_q3: iceBreakerAnswers.q2 || null,
        ice_breaker_answers: JSON.stringify(iceBreakerAnswers),
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
  }, [user?.email, bio, linkedinOption, linkedinUrl, funFact, goal1, goal2, goal3, iceBreakerAnswers, updateProfile, refetch]);

  const handleToggleGoal = useCallback(async (goalNumber: number, achieved: boolean) => {
    if (!data?.camper?.id) return;
    try {
      await toggleGoal({ camper_id: data.camper.id, goal_number: goalNumber, achieved });
      await refetch();
      toast.success(achieved ? `Goal ${goalNumber} achieved! 🎯` : `Goal ${goalNumber} unchecked`);
    } catch (error) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message: unknown }).message)
          : String(error);
      toast.error("Failed to update goal: " + message);
    }
  }, [data?.camper?.id, toggleGoal, refetch]);

  const camper = data?.camper;
  const iceBreakerComplete = ICE_BREAKER_QUESTIONS.every((_, i) => iceBreakerAnswers[`q${i}`]?.trim());
  const isComplete = !!(bio && funFact && goal1 && goal2 && goal3 && iceBreakerComplete);

  const handleAbsenceRequest = useCallback(async () => {
    if (!absenceReason.trim() || !camper?.id) return;
    try {
      const now = new Date();
      const end = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
      await requestAbsence({
        camper_id: camper.id,
        start_time: now.toISOString(),
        end_time: end.toISOString(),
        reason: absenceReason.trim(),
      });
      toast.success("Absence request submitted. Your counselor will review it.");
      setAbsenceReason("");
    } catch (error) {
      const message = error && typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message) : String(error);
      toast.error("Failed to submit request: " + message);
    }
  }, [absenceReason, camper?.id, requestAbsence]);

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

      {/* PIN & Check-in Info */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Icon icon="key-round" className="w-5 h-5 text-camp-amber" />
          Your Check-in PIN
        </h2>
        <div className="flex items-center gap-4">
          <div className="px-5 py-3 bg-muted rounded-xl border border-border">
            <span className="text-2xl font-mono font-bold tracking-[0.3em] text-foreground">
              {camper?.pin ?? "----"}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm text-muted-foreground">Use this 4-digit PIN when checking back in after breaks.</p>
            <p className="text-xs text-muted-foreground/70">Keep it secret — it proves it's really you!</p>
          </div>
        </div>
      </Card>

      {/* Absence Request */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Icon icon="calendar-x" className="w-5 h-5 text-camp-amber" />
          Request Excused Absence
        </h2>
        <p className="text-sm text-muted-foreground mb-3">
          Need to step away during a session? Submit a request so your team won't be penalized.
        </p>
        <div className="flex gap-2">
          <Input
            placeholder="Reason for absence (e.g., client call, appointment)..."
            value={absenceReason}
            onChange={(e) => setAbsenceReason(e.target.value)}
            className="flex-1"
            onKeyDown={(e) => e.key === "Enter" && handleAbsenceRequest()}
          />
          <Button
            onClick={handleAbsenceRequest}
            disabled={!absenceReason.trim() || requestingAbsence}
            variant="outline"
            size="default"
          >
            {requestingAbsence ? "Submitting..." : "Submit"}
          </Button>
        </div>
      </Card>

      {/* Flight Departure */}
      <FlightDepartureSection
        camperId={camper?.id ?? 0}
        flightDepartureDate={camper?.flight_departure_date ?? null}
        flightDepartureTime={camper?.flight_departure_time ?? null}
        leaveOfficeBy={camper?.leave_office_by ?? null}
        onSaved={refetch}
      />

      {/* Check-in History */}
      {checkInHistory.length > 0 && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Icon icon="history" className="w-5 h-5 text-camp-green" />
            Check-in History
          </h2>
          <div className="flex flex-col gap-2">
            {checkInHistory.slice(0, 10).map((entry: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50 border border-border/50">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    entry.timing === "early" ? "bg-green-500" :
                    entry.timing === "on_time" ? "bg-yellow-500" : "bg-red-500"
                  }`} />
                  <span className="text-sm font-medium text-foreground">
                    {entry.timing === "early" ? "Early" : entry.timing === "on_time" ? "On Time" : "Late"}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-semibold ${
                    entry.points_awarded > 0 ? "text-green-600" : entry.points_awarded < 0 ? "text-red-600" : "text-muted-foreground"
                  }`}>
                    {entry.points_awarded > 0 ? "+" : ""}{entry.points_awarded} pts
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(entry.checked_in_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Photo & Bio Section */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Icon icon="camera" className="w-5 h-5 text-camp-amber" />
          About You
        </h2>

        <div className="flex flex-col gap-5">
          {/* Photo */}
          <div className="flex items-center gap-4">
            <CamperAvatar
              email={user?.email ?? ""}
              photoUrl={camper?.photo_url}
              name={`${camper?.first_name ?? ""} ${camper?.last_name ?? ""}`}
              size="lg"
            />
            <div className="flex flex-col gap-2 flex-1">
              <p className="text-sm font-medium">Profile Photo</p>
              <p className="text-xs text-muted-foreground">
                We'll try your Gravatar first. Paste a URL below to override.
              </p>
              <Input
                placeholder="https://your-photo-url.com/photo.jpg"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                className="text-xs"
              />
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
        <p className="text-sm text-muted-foreground mb-4">Share 3 things you hope to take away from this experience. Check them off as you achieve them!</p>
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => handleToggleGoal(1, !camper?.goal_1_achieved)}
              className={`flex items-center justify-center w-6 h-6 rounded-full border-2 mt-1 transition-colors shrink-0 ${
                camper?.goal_1_achieved
                  ? "bg-camp-green border-camp-green text-white"
                  : "border-border hover:border-camp-green/50"
              }`}
            >
              {camper?.goal_1_achieved && <Icon icon="check" className="w-3.5 h-3.5" />}
            </button>
            <Input
              placeholder="First goal or takeaway..."
              value={goal1}
              onChange={(e) => setGoal1(e.target.value)}
              className={`flex-1 ${camper?.goal_1_achieved ? "line-through opacity-60" : ""}`}
            />
          </div>
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => handleToggleGoal(2, !camper?.goal_2_achieved)}
              className={`flex items-center justify-center w-6 h-6 rounded-full border-2 mt-1 transition-colors shrink-0 ${
                camper?.goal_2_achieved
                  ? "bg-camp-green border-camp-green text-white"
                  : "border-border hover:border-camp-green/50"
              }`}
            >
              {camper?.goal_2_achieved && <Icon icon="check" className="w-3.5 h-3.5" />}
            </button>
            <Input
              placeholder="Second goal or takeaway..."
              value={goal2}
              onChange={(e) => setGoal2(e.target.value)}
              className={`flex-1 ${camper?.goal_2_achieved ? "line-through opacity-60" : ""}`}
            />
          </div>
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => handleToggleGoal(3, !camper?.goal_3_achieved)}
              className={`flex items-center justify-center w-6 h-6 rounded-full border-2 mt-1 transition-colors shrink-0 ${
                camper?.goal_3_achieved
                  ? "bg-camp-green border-camp-green text-white"
                  : "border-border hover:border-camp-green/50"
              }`}
            >
              {camper?.goal_3_achieved && <Icon icon="check" className="w-3.5 h-3.5" />}
            </button>
            <Input
              placeholder="Third goal or takeaway..."
              value={goal3}
              onChange={(e) => setGoal3(e.target.value)}
              className={`flex-1 ${camper?.goal_3_achieved ? "line-through opacity-60" : ""}`}
            />
          </div>
        </div>
        {(camper?.goal_1_achieved || camper?.goal_2_achieved || camper?.goal_3_achieved) && (
          <div className="mt-4 pt-3 border-t border-border">
            <p className="text-xs text-camp-green font-medium flex items-center gap-1">
              <Icon icon="check-circle" className="w-3.5 h-3.5" />
              {[camper?.goal_1_achieved, camper?.goal_2_achieved, camper?.goal_3_achieved].filter(Boolean).length}/3 goals achieved
            </p>
          </div>
        )}
      </Card>

      {/* Ice Breaker Questions */}
      <IceBreakerSection answers={iceBreakerAnswers} onChange={setIceBreakerAnswers} />

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
