'use client';
import { useState, useEffect } from 'react';

export function useWindowSize() {
  const [size, setSize] = useState({ width: 1280, height: 800, isMobile: false, isTablet: false });
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      setSize({ width: w, height: window.innerHeight, isMobile: w < 640, isTablet: w >= 640 && w < 1024 });
    };
    window.addEventListener('resize', update);
    update();
    return () => window.removeEventListener('resize', update);
  }, []);
  return size;
}
