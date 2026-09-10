import { useState } from "react";

type Props = {
  email: string;
  photoUrl?: string | null;
  name?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
};

const SIZES = {
  sm: { container: "w-8 h-8", text: "text-xs" },
  md: { container: "w-12 h-12", text: "text-sm" },
  lg: { container: "w-20 h-20", text: "text-xl" },
  xl: { container: "w-28 h-28", text: "text-3xl" },
};

export default function CamperAvatar({ email, photoUrl, name, size = "md", className = "" }: Props) {
  const [imgError, setImgError] = useState(false);
  const sizeConfig = SIZES[size];

  const initials = name
    ? name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : email?.[0]?.toUpperCase() ?? "?";

  // Show photo if available and not broken, otherwise initials
  if (photoUrl && !imgError) {
    return (
      <div className={`${sizeConfig.container} rounded-full overflow-hidden bg-muted flex items-center justify-center ${className}`}>
        <img
          src={photoUrl}
          alt={name ?? email}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div className={`${sizeConfig.container} rounded-full bg-primary/20 flex items-center justify-center ${className}`}>
      <span className={`font-bold text-primary ${sizeConfig.text}`}>{initials}</span>
    </div>
  );
}
