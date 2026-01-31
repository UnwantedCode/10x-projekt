import { useState, useCallback, useEffect, useRef } from "react";

import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import type { TaskFilterState, TaskSortField, SortOrder } from "@/types";
import { SEARCH_DEBOUNCE_MS } from "./types";

// =============================================================================
// Types
// =============================================================================

interface FilterToolbarProps {
  filters: TaskFilterState;
  onFiltersChange: (filters: Partial<TaskFilterState>) => void;
  disabled?: boolean;
}

// =============================================================================
// Icons
// =============================================================================

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

// =============================================================================
// Sort Options
// =============================================================================

interface SortOption {
  value: string;
  label: string;
  sort: TaskSortField;
  order: SortOrder;
}

const SORT_OPTIONS: SortOption[] = [
  { value: "priority-desc", label: "Priorytet (od najwyższego)", sort: "priority", order: "desc" },
  { value: "priority-asc", label: "Priorytet (od najniższego)", sort: "priority", order: "asc" },
  { value: "created_at-desc", label: "Data (od najnowszych)", sort: "created_at", order: "desc" },
  { value: "created_at-asc", label: "Data (od najstarszych)", sort: "created_at", order: "asc" },
  { value: "sort_order-asc", label: "Własna kolejność", sort: "sort_order", order: "asc" },
];

// =============================================================================
// Component
// =============================================================================

export function FilterToolbar({ filters, onFiltersChange, disabled = false }: FilterToolbarProps) {
  const [searchValue, setSearchValue] = useState(filters.search);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local search with filters (for external resets)
  useEffect(() => {
    setSearchValue(filters.search);
  }, [filters.search]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchValue(value);

      // Debounce the actual filter update
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        onFiltersChange({ search: value });
      }, SEARCH_DEBOUNCE_MS);
    },
    [onFiltersChange]
  );

  const handleClearSearch = useCallback(() => {
    setSearchValue("");
    onFiltersChange({ search: "" });
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
  }, [onFiltersChange]);

  const handleStatusToggle = useCallback(
    (checked: boolean) => {
      // checked = true means show all (status = null)
      // checked = false means show only todo (status = 1)
      onFiltersChange({ status: checked ? null : 1 });
    },
    [onFiltersChange]
  );

  const handleSortChange = useCallback(
    (value: string) => {
      const option = SORT_OPTIONS.find((opt) => opt.value === value);
      if (option) {
        onFiltersChange({ sort: option.sort, order: option.order });
      }
    },
    [onFiltersChange]
  );

  const currentSortValue = `${filters.sort}-${filters.order}`;
  const showAllTasks = filters.status === null;

  return (
    <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
      {/* Search input */}
      <div className="relative flex-1 max-w-sm">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Szukaj zadań..."
          value={searchValue}
          onChange={handleSearchChange}
          disabled={disabled}
          className="pl-9 pr-9"
          aria-label="Szukaj zadań"
        />
        {searchValue && (
          <button
            onClick={handleClearSearch}
            disabled={disabled}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Wyczyść wyszukiwanie"
          >
            <XIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Status filter (show completed) */}
        <div className="flex items-center gap-2">
          <Switch
            id="show-completed"
            checked={showAllTasks}
            onCheckedChange={handleStatusToggle}
            disabled={disabled}
            aria-describedby="show-completed-description"
          />
          <Label htmlFor="show-completed" className="text-sm cursor-pointer whitespace-nowrap">
            Pokaż zrobione
          </Label>
        </div>

        {/* Sort selector */}
        <Select value={currentSortValue} onValueChange={handleSortChange} disabled={disabled}>
          <SelectTrigger className="w-[200px]" aria-label="Sortuj według">
            <SelectValue placeholder="Sortuj według" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
