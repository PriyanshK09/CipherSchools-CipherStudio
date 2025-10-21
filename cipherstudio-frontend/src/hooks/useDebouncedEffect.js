import { useEffect } from "react";

export const useDebouncedEffect = (callback, dependencies, delay) => {
  useEffect(() => {
    const handler = setTimeout(() => {
      callback();
    }, delay);

    return () => clearTimeout(handler);
  }, [...dependencies, delay]);
};
