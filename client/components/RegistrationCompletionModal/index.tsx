import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { queryClient } from "@superblocksteam/library";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useApi } from "@/hooks/useApi";
import RegistrationFieldInput from "./RegistrationFieldInput";
import { fieldsToAsk, isFilled, valuesFrom, FIELD_LABELS, type RegField, type RegValues } from "./fields";

type Camper = Parameters<typeof valuesFrom>[0];

type Props = {
  userEmail: string;
  camper: Camper;
  /** Profile items still blank (from GetCurrentCamper). Empty = profile complete. */
  missingProfile: string[];
};

function errorText(err: unknown): string {
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err) return String((err as { message: unknown }).message);
  return "Request failed";
}

/**
 * Shown to any cAMPer whose registration has blanks. It can't be closed (no X, Escape, or
 * click-outside). It lists only the missing fields; once they're all filled in, the button saves
 * registration and goes to the profile (if that's unfinished) or straight into cAMP.
 */
export default function RegistrationCompletionModal({ userEmail, camper, missingProfile }: Props) {
  const navigate = useNavigate();
  const { run: registerCamper, loading: saving } = useApi("RegisterCamper");

  const [values, setValues] = useState<RegValues>(() => valuesFrom(camper));
  // Fixed when the modal opens, so a field doesn't vanish while they're typing in it.
  const [asked] = useState<RegField[]>(() => fieldsToAsk(valuesFrom(camper)));

  const onChange = useCallback((field: RegField, value: string) => {
    setValues((v) => ({ ...v, [field]: value }));
  }, []);

  const stillMissing = useMemo(() => asked.filter((f) => !isFilled(f, values)), [asked, values]);
  // Every field must be valid, including ones on file (an old record may hold an unusable value).
  const allValid = useMemo(() => fieldsToAsk(values).length === 0, [values]);
  const profileDone = missingProfile.length === 0;

  const handleContinue = useCallback(async () => {
    if (!allValid || !values.role || !values.region) return;
    try {
      await registerCamper({
        email: userEmail,
        first_name: values.first_name.trim(),
        last_name: values.last_name.trim(),
        role: values.role,
        manager: null,
        manager_email: values.manager_email.trim().toLowerCase(),
        region: values.region,
        country: values.country.trim(),
        city: values.city.trim(),
        start_date: values.start_date,
      });
      await queryClient.invalidateQueries("GetCurrentCamper");
      toast.success(profileDone ? "Registration complete. Welcome to cAMP!" : "Registration complete. Now finish your profile.");
      navigate(profileDone ? "/" : "/profile");
    } catch (err) {
      toast.error("Couldn't save your registration: " + errorText(err));
    }
  }, [allValid, values, registerCamper, userEmail, profileDone, navigate]);

  return (
    <Dialog open onOpenChange={() => { /* can't be dismissed until registration is complete */ }}>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        className="sm:max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <div className="mx-auto sm:mx-0 flex items-center justify-center w-11 h-11 rounded-full bg-camp-amber/15 mb-1">
            <Icon icon="clipboard-list" className="w-5 h-5 text-camp-amber" />
          </div>
          <DialogTitle>Finish your registration</DialogTitle>
          <DialogDescription>
            {asked.length === 0
              ? "Your details are all here. Confirm to finish registration and get your check-in PIN."
              : `Your cAMP 201 registration is missing ${asked.length === 1 ? "1 required field" : `${asked.length} required fields`}. Fill ${asked.length === 1 ? "it" : "them"} in below to continue.`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {asked.map((f) => (
            <RegistrationFieldInput key={f} field={f} values={values} onChange={onChange} />
          ))}
        </div>

        {!profileDone && (
          <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground mb-1 flex items-center gap-1.5">
              <Icon icon="user" className="w-3.5 h-3.5" /> Next: your profile
            </p>
            Still to do there: {missingProfile.join(", ")}.
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Button size="lg" onClick={handleContinue} disabled={!allValid || saving} className="w-full">
            {saving ? (
              <>
                <Icon icon="loader-2" className="w-4 h-4 mr-2 animate-spin" /> Saving…
              </>
            ) : profileDone ? (
              <>
                Continue to cAMP <Icon icon="arrow-right" className="w-4 h-4 ml-2" />
              </>
            ) : (
              <>
                Continue to profile <Icon icon="arrow-right" className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
          {stillMissing.length > 0 && (
            <p className="text-xs text-center text-muted-foreground">
              Still needed: {stillMissing.map((f) => FIELD_LABELS[f]).join(", ")}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
