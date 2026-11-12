import { useState, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
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
import ProfileStandingBanner from "@/components/ProfileStandingBanner/index.js";
import CheckInPinCard from "@/components/CheckInPinCard/index.js";
import CheckInHistoryCard from "@/components/CheckInHistoryCard/index.js";
import FlightDepartureSection from "@/components/FlightDepartureSection/index.js";
import AbsenceRequestCard from "@/components/AbsenceRequestCard/index.js";
import ProfilePhotoUpload from "@/components/ProfilePhotoUpload/index.js";
import FromYourManagerCard from "@/components/FromYourManagerCard/index.js";
import DietaryCard from "@/components/DietaryCard/index.js";
import { formatLastSeenFull } from "@/lib/lastSeen.js";

export default function ProfilePage() {
  const user = useSuperblocksUser();
  const navigate = useNavigate();

  const { data, loading, refetch } = useApiData("GetCurrentCamper", {
    email: user?.email ?? "",
  }, { enabled: !!user?.email });

  const { run: updateProfile, loading: saving } = useApi("UpdateCamperProfile");
  const { run: toggleGoal } = useApi("ToggleGoalAchieved");

  // Form state
  const [bio, setBio] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [linkedinOption, setLinkedinOption] = useState("none");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [managerEmail, setManagerEmail] = useState("");
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
      setManagerEmail(c.manager_email ?? "");
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
        manager_email: managerEmail.trim().toLowerCase(),
      });

      const justCompleted = !data?.camper?.profile_completed && result?.camper?.profile_completed;
      if (result && result.pointsAwarded > 0) {
        toast.success(`Profile saved! 🎉 +${result.pointsAwarded} points earned for completing your profile!`);
      } else {
        toast.success("Profile updated successfully!");
      }
      await refetch();
      if (justCompleted) navigate("/");
    } catch (error) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message: unknown }).message)
          : String(error);
      toast.error("Failed to save profile: " + message);
    }
  }, [user?.email, bio, photoUrl, linkedinOption, linkedinUrl, managerEmail, funFact, goal1, goal2, goal3, iceBreakerAnswers, updateProfile, refetch, data?.camper?.profile_completed, navigate]);

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

      {!camper?.profile_completed && camper?.role !== "counselor" && camper?.role !== "admin" && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-camp-amber/40 bg-camp-amber/10">
          <Icon icon="lock" className="w-5 h-5 text-camp-amber mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-foreground">One more step before Base Camp</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Complete your profile to unlock the rest of cAMP 201: bio, fun fact, three goals and all ice breaker questions. Then click <span className="font-medium text-foreground">Save Profile</span>.
            </p>
          </div>
        </div>
      )}

      {/* XP / current place / team banner */}
      <ProfileStandingBanner camperId={camper?.id ?? 0} />

      {/* Transparency: counselors + managers see when they last opened the app */}
      <p className="-mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon icon="log-in" className="h-3.5 w-3.5" />
        Last login: <span className="font-medium text-foreground">{formatLastSeenFull(camper?.last_seen_at)}</span>
        <span>· Your counselors and manager can see this.</span>
      </p>

      {/* Notes shared by their manager (reply / acknowledge only) */}
      <FromYourManagerCard />

      {/* Photo & Bio Section */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Icon icon="camera" className="w-5 h-5 text-camp-amber" />
          About You
        </h2>

        <div className="flex flex-col gap-5">
          {/* Photo */}
          <div className="flex items-center gap-4">
            <ProfilePhotoUpload
              currentPhotoUrl={photoUrl || camper?.photo_url || null}
              email={user?.email ?? ""}
              name={`${camper?.first_name ?? ""} ${camper?.last_name ?? ""}`}
              onChange={setPhotoUrl}
            />
            <div className="flex-1">
              <p className="text-sm font-medium">Profile Photo</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Click your avatar or drag & drop to upload a photo
              </p>
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

          {/* Manager */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="profileManagerEmail">Manager&apos;s Work Email</Label>
            <Input
              id="profileManagerEmail"
              type="email"
              placeholder="firstname.lastname@amplitude.com"
              value={managerEmail}
              onChange={(e) => setManagerEmail(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Lets your manager follow your cAMP journey on their dashboard.
            </p>
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

      {/* Logistics: PIN, dietary, flight, absences */}
      <CheckInPinCard pin={camper?.pin} />

      <DietaryCard
        savedOptions={camper?.dietary_options}
        savedNotes={camper?.dietary_notes}
        onSaved={refetch}
      />

      <FlightDepartureSection
        camperId={camper?.id ?? 0}
        isLocal={camper?.flight_is_local ?? false}
        flightDepartureDate={camper?.flight_departure_date ?? null}
        flightDepartureTime={camper?.flight_departure_time ?? null}
        leaveOfficeBy={camper?.leave_office_by ?? null}
        onSaved={refetch}
      />

      {/* Excused absences: 3 included, counselor approval beyond that.
          Counselors see a read-only preview of what cAMPers see. */}
      {camper?.id && (
        <AbsenceRequestCard
          camperId={camper.id}
          preview={camper.role === "counselor" || camper.role === "admin"}
        />
      )}

      <CheckInHistoryCard camperId={camper?.id ?? 0} />

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
