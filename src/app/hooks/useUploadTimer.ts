import { useEffect, useRef, useState } from "react";

export const useUploadTimer = (progress: number) => {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (progress > 0 && progress < 100) {
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now();
      }

      const elapsedTime = (Date.now() - startTimeRef.current) / 1000;
      const estimatedTotalTime = (elapsedTime / progress) * 100;
      const remaining = estimatedTotalTime - elapsedTime;

      setTimeLeft(remaining);
    }

    if (progress === 100) {
      startTimeRef.current = null;
      setTimeLeft(0);
    }
  }, [progress]);

  return timeLeft;
};
