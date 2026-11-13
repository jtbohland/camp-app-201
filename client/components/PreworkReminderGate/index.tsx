import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { useApiData } from "@/hooks/useApiData";
import PreworkReminderModal from "@/components/PreworkReminderModal/index.js";
import {
  PREWORK_REMINDER_EVENT,
  clearReminderRequest,
  isReminderRequested,
  markShownToday,
  wasShownToday,
} from "@/lib/preworkReminder.js";

type Props = {
  email: string;
  /** The profile is part of pre-work and has its own page; the daily reminder waits until it's saved. */
  profileCompleted: boolean;
  children: ReactNode;
};

/**
 * Shows the pre-work reminder to cAMPers with unfinished pre-work: once a day (first open or
 * refresh), plus right after registration or a first profile save. Nothing shows once all
 * pre-work is done, or for counselors, removed cAMPers, ended cohorts, or a closed cAMP.
 */
export default function PreworkReminderGate({ email, profileCompleted, children }: Props) {
  const navigate = useNavigate();
  const [requested, setRequested] = useState(() => isReminderRequested());
  const [dueToday, setDueToday] = useState(() => !wasShownToday(email));
  // Daily: only once the profile is saved (until then they're kept on the profile page anyway).
  // Requested (right after registration / first profile save): always.
  const wanted = requested || (profileCompleted && dueToday);

  const { data, refetch } = useApiData("GetPreworkReminder", {}, { enabled: wanted, staleTime: 0, refetchOnWindowFocus: false });

  // Registration or a first profile save asks for the reminder right away.
  useEffect(() => {
    const onRequest = () => {
      setRequested(true);
      void refetch().catch(() => {});
    };
    window.addEventListener(PREWORK_REMINDER_EVENT, onRequest);
    return () => window.removeEventListener(PREWORK_REMINDER_EVENT, onRequest);
  }, [refetch]);

  const outstanding = !!data?.eligible && data.totalCount > 0 && data.completedCount < data.totalCount;

  // Nothing to remind about today: don't check again until tomorrow.
  useEffect(() => {
    if (wanted && data && !outstanding) {
      markShownToday(email);
      clearReminderRequest();
      setRequested(false);
      setDueToday(false);
    }
  }, [wanted, data, outstanding, email]);

  const handleGoToJourney = useCallback(() => {
    markShownToday(email);
    clearReminderRequest();
    setRequested(false);
    setDueToday(false);
    // Profile is pre-work item #1 and the rest of cAMP opens once it's saved.
    navigate(profileCompleted ? "/journey#prework" : "/profile");
  }, [email, navigate, profileCompleted]);

  return (
    <>
      {children}
      {wanted && outstanding && data && <PreworkReminderModal data={data} profileCompleted={profileCompleted} onGoToJourney={handleGoToJourney} />}
    </>
  );
}
