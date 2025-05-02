'use client';
import { useState } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [stored, setStored] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    try { const item = window.localStorage.getItem(key); return item ? JSON.parse(item) : initialValue; } catch { return initialValue; }
  });
  const setValue = (value: T | ((val: T) => T)) => {
    const v = value instanceof Function ? value(stored) : value;
    setStored(v);
    if (typeof window !== 'undefined') window.localStorage.setItem(key, JSON.stringify(v));
  };
  return [stored, setValue] as const;
}
