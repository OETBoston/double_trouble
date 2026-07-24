import { useCallback, useEffect, useRef, useState } from "react";
import { forwardGeocode, GeocodeSuggestion } from "../../lib/mapboxGeocoding";
import type { LocationResult } from "./ReportFlow";
import styles from "./ReportFlow.module.css";

export function AddressSearchStep({
  onResolved,
  onBack,
}: {
  onResolved: (result: LocationResult) => void;
  onBack: () => void;
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const results = await forwardGeocode(query);
        setSuggestions(results);
        setActiveIndex(-1);
      } catch {
        setError("Address lookup failed. Check your connection and try again.");
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const selectSuggestion = useCallback(
    (s: GeocodeSuggestion) => {
      onResolved({
        latitude: s.latitude,
        longitude: s.longitude,
        address: s.placeName,
        method: "ADDRESS_SEARCH",
      });
    },
    [onResolved]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!suggestions.length) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % suggestions.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (activeIndex >= 0) selectSuggestion(suggestions[activeIndex]);
      } else if (e.key === "Escape") {
        setSuggestions([]);
      }
    },
    [suggestions, activeIndex, selectSuggestion]
  );

  return (
    <section aria-labelledby="search-heading" className={styles.stepSection}>
      <h2 id="search-heading">Search for the address</h2>
      <label htmlFor="address-input" className={styles.fieldLabel}>
        Street address in Boston
      </label>
      <input
        id="address-input"
        type="text"
        role="combobox"
        aria-expanded={suggestions.length > 0}
        aria-controls="address-listbox"
        aria-autocomplete="list"
        aria-activedescendant={activeIndex >= 0 ? `address-option-${activeIndex}` : undefined}
        className={styles.textInput}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="e.g. 1 City Hall Square"
        autoComplete="off"
      />
      <p role="status" aria-live="polite" className="visually-hidden">
        {loading
          ? "Searching…"
          : suggestions.length
            ? `${suggestions.length} suggestions available`
            : ""}
      </p>
      {error && <p className={styles.errorText}>{error}</p>}
      {suggestions.length > 0 && (
        <ul id="address-listbox" role="listbox" className={styles.suggestionList}>
          {suggestions.map((s, i) => (
            <li
              key={s.id}
              id={`address-option-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              className={i === activeIndex ? styles.suggestionActive : styles.suggestion}
              onMouseDown={() => selectSuggestion(s)}
            >
              {s.placeName}
            </li>
          ))}
        </ul>
      )}
      <div className={styles.stepActions}>
        <button className={styles.linkButton} onClick={onBack}>
          Choose a different method
        </button>
      </div>
    </section>
  );
}
