import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Search, Phone } from "lucide-react";

export interface CountryItem {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
}

export const COUNTRIES: CountryItem[] = [
  { code: "CD", name: "RDC (Congo-Kinshasa)", dialCode: "+243", flag: "🇨🇩" },
  { code: "CG", name: "Congo-Brazzaville", dialCode: "+242", flag: "🇨🇬" },
  { code: "BE", name: "Belgique", dialCode: "+32", flag: "🇧🇪" },
  { code: "FR", name: "France", dialCode: "+33", flag: "🇫🇷" },
  { code: "CA", name: "Canada", dialCode: "+1", flag: "🇨🇦" },
  { code: "US", name: "États-Unis", dialCode: "+1", flag: "🇺🇸" },
  { code: "AO", name: "Angola", dialCode: "+244", flag: "🇦🇴" },
  { code: "RW", name: "Rwanda", dialCode: "+250", flag: "🇷🇼" },
  { code: "BI", name: "Burundi", dialCode: "+257", flag: "🇧🇮" },
  { code: "CH", name: "Suisse", dialCode: "+41", flag: "🇨🇭" },
  { code: "CI", name: "Côte d'Ivoire", dialCode: "+225", flag: "🇨🇮" },
  { code: "SN", name: "Sénégal", dialCode: "+221", flag: "🇸🇳" },
  { code: "CM", name: "Cameroun", dialCode: "+237", flag: "🇨🇲" },
  { code: "GA", name: "Gabon", dialCode: "+241", flag: "🇬🇦" },
  { code: "CF", name: "Centrafrique", dialCode: "+236", flag: "🇨🇫" },
  { code: "TD", name: "Tchad", dialCode: "+235", flag: "🇹🇩" },
  { code: "ML", name: "Mali", dialCode: "+223", flag: "🇲🇱" },
  { code: "GN", name: "Guinée", dialCode: "+224", flag: "🇬🇳" },
  { code: "BJ", name: "Bénin", dialCode: "+229", flag: "🇧🇯" },
  { code: "TG", name: "Togo", dialCode: "+228", flag: "🇹🇬" },
  { code: "BF", name: "Burkina Faso", dialCode: "+226", flag: "🇧🇫" },
  { code: "NE", name: "Niger", dialCode: "+227", flag: "🇳🇪" },
  { code: "MA", name: "Maroc", dialCode: "+212", flag: "🇲🇦" },
  { code: "DZ", name: "Algérie", dialCode: "+213", flag: "🇩🇿" },
  { code: "TN", name: "Tunisie", dialCode: "+216", flag: "🇹🇳" },
  { code: "KE", name: "Kenya", dialCode: "+254", flag: "🇰🇪" },
  { code: "UG", name: "Ouganda", dialCode: "+256", flag: "🇺🇬" },
  { code: "TZ", name: "Tanzanie", dialCode: "+255", flag: "🇹🇿" },
  { code: "ZM", name: "Zambie", dialCode: "+260", flag: "🇿🇲" },
  { code: "ZA", name: "Afrique du Sud", dialCode: "+27", flag: "🇿🇦" },
  { code: "GB", name: "Royaume-Uni", dialCode: "+44", flag: "🇬🇧" },
  { code: "DE", name: "Allemagne", dialCode: "+49", flag: "🇩🇪" },
  { code: "IT", name: "Italie", dialCode: "+39", flag: "🇮🇹" },
  { code: "ES", name: "Espagne", dialCode: "+34", flag: "🇪🇸" },
  { code: "PT", name: "Portugal", dialCode: "+351", flag: "🇵🇹" },
  { code: "NL", name: "Pays-Bas", dialCode: "+31", flag: "🇳🇱" },
  { code: "SE", name: "Suède", dialCode: "+46", flag: "🇸🇪" },
  { code: "NO", name: "Norvège", dialCode: "+47", flag: "🇳🇴" },
  { code: "TR", name: "Turquie", dialCode: "+90", flag: "🇹🇷" },
  { code: "AE", name: "Émirats Arabes Unis", dialCode: "+971", flag: "🇦🇪" },
  { code: "CN", name: "Chine", dialCode: "+86", flag: "🇨🇳" },
  { code: "IN", name: "Inde", dialCode: "+91", flag: "🇮🇳" },
  { code: "BR", name: "Brésil", dialCode: "+55", flag: "🇧🇷" },
  { code: "HT", name: "Haïti", dialCode: "+509", flag: "🇭🇹" },
];

interface InternationalPhoneInputProps {
  value: string;
  onChange: (fullNumber: string, countryCode: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  id?: string;
}

export const InternationalPhoneInput: React.FC<InternationalPhoneInputProps> = ({
  value,
  onChange,
  placeholder = "81 234 5678",
  required = false,
  className = "",
  id,
}) => {
  const [selectedCountry, setSelectedCountry] = useState<CountryItem>(COUNTRIES[0]); // Default RDC (+243)
  const [localNumber, setLocalNumber] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Initialize or update from incoming prop value
  useEffect(() => {
    if (!value) {
      setLocalNumber("");
      return;
    }

    // Try to match dial code
    const matching = COUNTRIES.find((c) => value.startsWith(c.dialCode));
    if (matching) {
      setSelectedCountry(matching);
      setLocalNumber(value.slice(matching.dialCode.length).trim());
    } else {
      setLocalNumber(value);
    }
  }, []);

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCountrySelect = (c: CountryItem) => {
    setSelectedCountry(c);
    setDropdownOpen(false);
    setSearchQuery("");
    const cleaned = localNumber.trim();
    const full = cleaned ? `${c.dialCode} ${cleaned}` : "";
    onChange(full, c.code);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setLocalNumber(raw);
    const cleaned = raw.trim();
    const full = cleaned ? `${selectedCountry.dialCode} ${cleaned}` : "";
    onChange(full, selectedCountry.code);
  };

  const filteredCountries = COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.dialCode.includes(searchQuery) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div className="flex rounded-xl border border-[#D5CBB9] bg-[#FAF8F5] focus-within:ring-2 focus-within:ring-[#D4A346] focus-within:border-transparent transition-all overflow-hidden shadow-2xs">
        {/* Country Selector Trigger */}
        <button
          type="button"
          onClick={() => setDropdownOpen((prev) => !prev)}
          className="flex items-center gap-1.5 px-3 py-2.5 bg-[#F6F0E4] hover:bg-[#EFE6D6] text-[#1E1C1A] text-sm font-medium border-r border-[#D5CBB9] transition-colors cursor-pointer shrink-0 select-none"
          title={`${selectedCountry.name} (${selectedCountry.dialCode})`}
        >
          <span className="text-base leading-none">{selectedCountry.flag}</span>
          <span className="font-semibold text-xs text-[#4F473B]">{selectedCountry.dialCode}</span>
          <ChevronDown className={`w-3.5 h-3.5 text-[#736B5E] transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
        </button>

        {/* Input */}
        <div className="relative flex-1 flex items-center">
          <input
            id={id}
            type="tel"
            value={localNumber}
            onChange={handleNumberChange}
            placeholder={placeholder}
            required={required}
            className="w-full px-3.5 py-2.5 text-sm text-[#1E1C1A] placeholder-[#9E9587] bg-transparent focus:outline-hidden"
          />
        </div>
      </div>

      {/* Dropdown Menu */}
      {dropdownOpen && (
        <div className="absolute top-full left-0 mt-1 z-50 w-72 sm:w-80 bg-white rounded-2xl border border-[#D5CBB9] shadow-xl p-2 animate-in fade-in zoom-in-95 duration-150">
          {/* Search bar */}
          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-[#8A8172]" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher pays ou indicatif..."
              className="w-full pl-8 pr-3 py-2 text-xs bg-[#FAF8F5] rounded-xl border border-[#E4DCce] text-[#1E1C1A] focus:outline-hidden focus:ring-1 focus:ring-[#D4A346]"
            />
          </div>

          {/* List */}
          <div className="max-h-56 overflow-y-auto space-y-0.5">
            {filteredCountries.length > 0 ? (
              filteredCountries.map((c) => (
                <button
                  key={`${c.code}-${c.dialCode}`}
                  type="button"
                  onClick={() => handleCountrySelect(c)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl transition-colors cursor-pointer text-left ${
                    selectedCountry.code === c.code && selectedCountry.dialCode === c.dialCode
                      ? "bg-[#FAF4E8] text-[#8C6B24] font-bold"
                      : "text-[#2D2A26] hover:bg-[#F9F6F0]"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-base">{c.flag}</span>
                    <span className="truncate">{c.name}</span>
                  </div>
                  <span className="font-semibold ml-2 text-[#736B5E] shrink-0">{c.dialCode}</span>
                </button>
              ))
            ) : (
              <div className="p-3 text-center text-xs text-[#8A8172]">
                Aucun pays trouvé
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
