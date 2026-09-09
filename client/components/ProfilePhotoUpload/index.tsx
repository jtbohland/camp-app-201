import { useState, useCallback, useRef, type DragEvent, type ChangeEvent } from "react";
import { Icon } from "@/components/ui/icon";
import CamperAvatar from "@/components/CamperAvatar/index.js";

type ProfilePhotoUploadProps = {
  currentPhotoUrl: string | null;
  email: string;
  name: string;
  onChange: (base64: string) => void;
};

export default function ProfilePhotoUpload({
  currentPhotoUrl,
  email,
  name,
  onChange,
}: ProfilePhotoUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    (file: File) => {
      setError(null);
      const validTypes = ["image/png", "image/jpeg", "image/gif", "image/webp"];
      if (!validTypes.includes(file.type)) {
        setError("Use PNG, JPG, GIF, or WebP");
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        setError("Image must be under 2MB");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => onChange(reader.result as string);
      reader.onerror = () => setError("Failed to read file");
      reader.readAsDataURL(file);
    },
    [onChange]
  );

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      e.target.value = "";
    },
    [processFile]
  );

  return (
    <div className="flex flex-col items-start gap-1">
      <div
        className={`relative group cursor-pointer rounded-full transition-all ${
          isDragging ? "ring-4 ring-primary/40 scale-105" : ""
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <CamperAvatar
          email={email}
          photoUrl={currentPhotoUrl}
          name={name}
          size="lg"
        />
        {/* Camera overlay on hover */}
        <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Icon icon="camera" className="w-6 h-6 text-white" />
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      {error && (
        <p className="text-[10px] text-red-500 flex items-center gap-1 mt-0.5">
          <Icon icon="alert-circle" className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  );
}
