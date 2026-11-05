import { useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { COUNTRIES, findCountry } from "@/lib/countries.js";

type Props = {
  value: string;
  onChange: (country: string) => void;
  placeholder?: string;
  id?: string;
};

/** Searchable dropdown of every real country. Stores the canonical English name. */
export default function CountryPicker({ value, onChange, placeholder = "Select country", id }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = findCountry(value);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter((c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase() === q);
  }, [query]);

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          className="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"
        >
          <span className={`truncate ${selected ? "text-foreground" : "text-muted-foreground"}`}>
            {selected ? `${selected.flag} ${selected.name}` : value || placeholder}
          </span>
          <Icon icon="chevrons-up-down" className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <Input
          autoFocus
          placeholder="Search countries..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="mb-2 h-8"
        />
        <div className="max-h-60 overflow-y-auto">
          {matches.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">No country found</p>
          ) : (
            matches.map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => {
                  onChange(c.name);
                  setOpen(false);
                  setQuery("");
                }}
                className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-muted ${
                  selected?.code === c.code ? "bg-muted font-medium" : ""
                }`}
              >
                <span>{c.flag}</span>
                <span className="truncate">{c.name}</span>
                {selected?.code === c.code && <Icon icon="check" className="ml-auto h-4 w-4 text-primary" />}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
