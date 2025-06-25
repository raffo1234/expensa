import { useState, useEffect } from "react";

type SwipeDirection = "left" | "right" | "up" | "down";
type SwipeCallback = (direction: SwipeDirection) => void;

const useSwipe = (onSwipe: SwipeCallback, threshold: number = 50) => {
  const [startTouch, setStartTouch] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      setStartTouch({ x: touch.clientX, y: touch.clientY });
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!startTouch) return;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - startTouch.x;
      const deltaY = touch.clientY - startTouch.y;

      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        if (Math.abs(deltaX) > threshold) {
          onSwipe(deltaX > 0 ? "right" : "left");
        }
      } else {
        if (Math.abs(deltaY) > threshold) {
          onSwipe(deltaY > 0 ? "down" : "up");
        }
      }

      setStartTouch(null);
    };

    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [startTouch, onSwipe, threshold]);

  return;
};

export default useSwipe;