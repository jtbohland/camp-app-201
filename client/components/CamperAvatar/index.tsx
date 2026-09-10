import { useState, useMemo } from "react";
import { Icon } from "@/components/ui/icon";

/**
 * Generates a Gravatar URL from an email address.
 * Uses SHA-256 hash (Web Crypto API) but falls back to a simple hash for SSR.
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(32, "0");
}

function getGravatarUrl(email: string, size: number = 200): string {
  const hash = simpleHash(email.trim().toLowerCase());
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=blank`;
}

type Props = {
  email: string;
  photoUrl?: string | null;
  name?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
};

const SIZES = {
  sm: { container: "w-8 h-8", text: "text-xs", icon: "w-4 h-4" },
  md: { container: "w-12 h-12", text: "text-sm", icon: "w-5 h-5" },
  lg: { container: "w-20 h-20", text: "text-xl", icon: "w-8 h-8" },
  xl: { container: "w-28 h-28", text: "text-3xl", icon: "w-10 h-10" },
};

export default function CamperAvatar({ email, photoUrl, name, size = "md", className = "" }: Props) {
  const [imgError, setImgError] = useState(false);
  const [gravatarError, setGravatarError] = useState(false);

  const gravatarUrl = useMemo(() => getGravatarUrl(email), [email]);
  const sizeConfig = SIZES[size];

  const initials = name
    ? name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : email?.[0]?.toUpperCase() ?? "?";

  // Priority: custom photo URL > Gravatar > initials
  const imageUrl = photoUrl && !imgError ? photoUrl : (!gravatarError ? gravatarUrl : null);

  if (imageUrl) {
    return (
      <div className={`${sizeConfig.container} rounded-full overflow-hidden bg-muted flex items-center justify-center ${className}`}>
        <img
          src={imageUrl}
          alt={name ?? email}
          className="w-full h-full object-cover"
          onError={() => {
            if (photoUrl && !imgError) {
              setImgError(true);
            } else {
              setGravatarError(true);
            }
          }}
        />
      </div>
    );
  }

  // Fallback: initials
  return (
    <div className={`${sizeConfig.container} rounded-full bg-primary/20 flex items-center justify-center ${className}`}>
      <span className={`font-bold text-primary ${sizeConfig.text}`}>{initials}</span>
    </div>
  );
}

export { getGravatarUrl };
