import { useState, useEffect } from 'react';

/**
 * Hook that returns true if the media query matches.
 * Useful for conditional rendering based on screen size.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

/**
 * Returns true if screen width >= 768px (Tailwind's md breakpoint)
 */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 768px)');
}
