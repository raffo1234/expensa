"use client";

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

function useSpecificPageScrollPositionSaver(targetPathname: string, keyPrefix: string = 'scrollPosition'): void {
  const pathname = usePathname();
  const scrollPositionRef = useRef<number | null>(null);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (pathname === targetPathname) {
      const storageKey = `${keyPrefix}_${pathname}_onscroll`;

      const saveScrollPosition = () => {
        scrollPositionRef.current = window.scrollY;
        localStorage.setItem(storageKey, window.scrollY.toString());
        debounceTimeout.current = null;
      };

      const debouncedSaveScrollPosition = () => {
        if (debounceTimeout.current) {
          clearTimeout(debounceTimeout.current);
        }
        debounceTimeout.current = setTimeout(saveScrollPosition, 500);
      };

      const handleScroll = () => {
        debouncedSaveScrollPosition();
      };

      window.addEventListener('scroll', handleScroll);

      return () => {
        window.removeEventListener('scroll', handleScroll);
        if (debounceTimeout.current) {
          clearTimeout(debounceTimeout.current);
        }
      };
    }
  }, [pathname, targetPathname, keyPrefix]);

  useEffect(() => {
    if (pathname === targetPathname) {
      const storageKey = `${keyPrefix}_${pathname}_onscroll`;
      const storedPosition = localStorage.getItem(storageKey);

      if (storedPosition) {
        window.scrollTo(0, parseInt(storedPosition, 10));
      }
    }
  }, [pathname, targetPathname, keyPrefix]);
}

export default useSpecificPageScrollPositionSaver;