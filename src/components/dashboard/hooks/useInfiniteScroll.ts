import { useEffect, useRef, useCallback, useState } from "react";

// =============================================================================
// Types
// =============================================================================

export interface UseInfiniteScrollOptions {
  /** Callback to load more items */
  onLoadMore: () => void | Promise<void>;
  /** Whether there are more items to load */
  hasMore: boolean;
  /** Whether currently loading */
  isLoading: boolean;
  /** Root margin for intersection observer (default: "100px") */
  rootMargin?: string;
  /** Threshold for intersection observer (default: 0.1) */
  threshold?: number;
  /** Whether the infinite scroll is enabled (default: true) */
  enabled?: boolean;
}

export interface UseInfiniteScrollReturn {
  /** Ref to attach to the trigger element */
  triggerRef: React.RefObject<HTMLDivElement | null>;
  /** Whether the trigger element is currently visible */
  isIntersecting: boolean;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Custom hook for infinite scroll functionality using Intersection Observer
 */
export function useInfiniteScroll({
  onLoadMore,
  hasMore,
  isLoading,
  rootMargin = "100px",
  threshold = 0.1,
  enabled = true,
}: UseInfiniteScrollOptions): UseInfiniteScrollReturn {
  const triggerRef = useRef<HTMLDivElement>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);

  // Store callback in ref to avoid re-creating observer
  const onLoadMoreRef = useRef(onLoadMore);
  
  // Update ref in useEffect to comply with React rules (no ref access during render)
  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      const isVisible = entry?.isIntersecting ?? false;

      setIsIntersecting(isVisible);

      // Trigger load more when element becomes visible
      if (isVisible && hasMore && !isLoading && enabled) {
        onLoadMoreRef.current();
      }
    },
    [hasMore, isLoading, enabled]
  );

  useEffect(() => {
    const element = triggerRef.current;

    // Don't observe if disabled or no element
    if (!enabled || !element) {
      return;
    }

    const observer = new IntersectionObserver(handleIntersection, {
      rootMargin,
      threshold,
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [handleIntersection, rootMargin, threshold, enabled]);

  return {
    triggerRef,
    isIntersecting,
  };
}
