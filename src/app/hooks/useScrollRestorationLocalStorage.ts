import { useRouter } from 'next/router';
import { useEffect } from 'react';

function useScrollRestorationLocalStorage(keyPrefix = 'scrollPosition') {
  const router = useRouter();

  useEffect(() => {
    if (!router.isReady) return;

    const storageKey = `${keyPrefix}_${router.pathname}`;

    const handleBeforeUnload = () => {
      localStorage.setItem(storageKey, window.scrollY.toString());
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    const restoreScrollPosition = () => {
      const storedPosition = localStorage.getItem(storageKey);
      if (storedPosition) {
        window.scrollTo(0, parseInt(storedPosition, 10));
        localStorage.removeItem(storageKey); 
      }
    };

    restoreScrollPosition();
    router.events.on('routeChangeComplete', restoreScrollPosition);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      router.events.off('routeChangeComplete', restoreScrollPosition);
    };
  }, [router.pathname, router.isReady, keyPrefix]);
}

export default useScrollRestorationLocalStorage;