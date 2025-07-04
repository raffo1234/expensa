import { useEffect, useCallback } from 'react';

type KeyboardEventHandler = (event: KeyboardEvent) => void;

function useControlEnter(
  callback: KeyboardEventHandler,
  targetElement: HTMLElement | Document = document,
  preventDefault: boolean = false,
  isActionDisabled: boolean = false
): void {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const isModifierPressed = event.ctrlKey || event.metaKey;
    const isEnterPressed = event.key === 'Enter';

    if (isModifierPressed && isEnterPressed && !isActionDisabled) {
      if (preventDefault) {
        event.preventDefault();
      }
      callback(event);
    }
  }, [callback, preventDefault, isActionDisabled]);

  useEffect(() => {
    if (targetElement) {
      targetElement.addEventListener('keydown', handleKeyDown as EventListener);
    }

    return () => {
      if (targetElement) {
        targetElement.removeEventListener('keydown', handleKeyDown as EventListener);
      }
    };
  }, [handleKeyDown, targetElement]);
}

export default useControlEnter;