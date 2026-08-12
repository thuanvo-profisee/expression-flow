// ─── Searchable dropdown ──────────────────────────────────────────
//
// The custom select used across the app (see EntityDropdown in
// AttributesPanel and the attribute picker in BlockRenderer): trigger
// button, search header, highlighted result list, keyboard navigation.

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from "react";
import { Check, ChevronDown, Search } from "lucide-react";

export interface DropdownOption {
    value: string;
    label: string;
}

export function SearchableDropdown({
    options,
    value,
    onSelect,
    icon,
    placeholder = "Select…",
    searchPlaceholder = "Search…",
    emptyLabel = "No matches",
    disabled = false,
}: {
    options: DropdownOption[];
    /** Currently selected value ("" when nothing is selected) */
    value: string;
    onSelect: (value: string) => void;
    icon?: ReactNode;
    placeholder?: string;
    searchPlaceholder?: string;
    emptyLabel?: string;
    disabled?: boolean;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [highlightIdx, setHighlightIdx] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const filtered = useMemo(() => {
        const q = query.toLowerCase().trim();
        if (!q) return options;
        return options.filter((o) => o.label.toLowerCase().includes(q));
    }, [query, options]);

    const selectedLabel = options.find((o) => o.value === value)?.label ?? null;

    // Focus search when opened
    useEffect(() => {
        if (isOpen) searchInputRef.current?.focus();
    }, [isOpen]);

    // Close on outside click (capture phase so it beats canvas handlers)
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: PointerEvent) => {
            if (!containerRef.current?.contains(e.target as Node)) {
                setIsOpen(false);
                setQuery("");
            }
        };
        document.addEventListener("pointerdown", handler, true);
        return () => document.removeEventListener("pointerdown", handler, true);
    }, [isOpen]);

    const select = useCallback(
        (next: string) => {
            onSelect(next);
            setIsOpen(false);
            setQuery("");
        },
        [onSelect],
    );

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setHighlightIdx((i) => Math.min(i + 1, filtered.length - 1));
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setHighlightIdx((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter" && filtered.length > 0) {
                e.preventDefault();
                select(filtered[highlightIdx].value);
            } else if (e.key === "Escape") {
                setIsOpen(false);
                setQuery("");
            }
        },
        [filtered, highlightIdx, select],
    );

    // Keep wheel events off the canvas (prevents zooming while scrolling)
    const stopWheel = useCallback((e: React.WheelEvent) => {
        e.stopPropagation();
    }, []);

    return (
        <div ref={containerRef} className="relative">
            {/* Trigger */}
            <button
                type="button"
                onClick={() => setIsOpen((v) => !v)}
                disabled={disabled}
                className={`
          w-full flex items-center gap-1.5 px-2 py-1 rounded-md
          border bg-white text-[11px] font-medium text-slate-700
          transition-all duration-150
          hover:border-blue-300 hover:shadow-sm
          disabled:opacity-60 disabled:cursor-not-allowed
          ${isOpen ? "border-blue-400 ring-2 ring-blue-400/30" : "border-slate-200"}
        `}
            >
                {icon}
                <span
                    className={`truncate ${selectedLabel ? "" : "text-slate-300"}`}
                >
                    {selectedLabel ?? placeholder}
                </span>
                <ChevronDown
                    size={12}
                    className={`text-slate-400 ml-auto shrink-0 transition-transform duration-150 ${
                        isOpen ? "rotate-180" : ""
                    }`}
                />
            </button>

            {/* Dropdown panel */}
            {isOpen && (
                <div
                    onWheel={stopWheel}
                    className="
            absolute left-0 right-0 top-full mt-1 z-50
            max-h-[220px]
            bg-white border border-slate-200 rounded-lg shadow-lg
            flex flex-col overflow-hidden
          "
                >
                    {/* Search input */}
                    <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-slate-100">
                        <Search size={11} className="text-slate-400 shrink-0" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value);
                                setHighlightIdx(0);
                            }}
                            onKeyDown={handleKeyDown}
                            placeholder={searchPlaceholder}
                            className="
                flex-1 min-w-0 text-[11px] text-slate-700 bg-transparent
                placeholder:text-slate-300 outline-none
              "
                        />
                        <span className="text-[9px] text-slate-300">
                            {filtered.length}
                        </span>
                    </div>

                    {/* Results */}
                    <div className="flex-1 overflow-y-auto">
                        {filtered.length === 0 ? (
                            <div className="px-2.5 py-3 text-[11px] text-slate-400 text-center">
                                {emptyLabel}
                            </div>
                        ) : (
                            filtered.map((opt, idx) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => select(opt.value)}
                                    onMouseEnter={() => setHighlightIdx(idx)}
                                    title={opt.label}
                                    className={`
                    w-full flex items-center gap-1.5 px-2 py-1 text-left
                    text-[11px] transition-colors
                    ${idx === highlightIdx ? "bg-blue-50" : "hover:bg-slate-50"}
                    ${opt.value === value ? "font-semibold text-slate-700" : "text-slate-600"}
                  `}
                                >
                                    <span className="truncate">
                                        {opt.label}
                                    </span>
                                    {opt.value === value && (
                                        <Check
                                            size={11}
                                            className="text-blue-500 ml-auto shrink-0"
                                        />
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
