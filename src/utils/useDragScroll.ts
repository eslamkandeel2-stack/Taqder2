import React, { useRef, useState, useCallback, useEffect } from 'react';

interface DragScrollOptions {
  scrollStep?: number;
  direction?: 'horizontal' | 'vertical';
}

export function useDragScroll(options: DragScrollOptions = {}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const scrollStep = options.scrollStep || 160;

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft: sl, scrollWidth: sw, clientWidth: cw } = el;
    // In RTL, scrollLeft can be negative or positive depending on browser implementation
    const maxScroll = sw - cw;
    const absScroll = Math.abs(sl);
    setCanScrollLeft(absScroll < maxScroll - 2 || sl > 2);
    setCanScrollRight(absScroll > 2 || sl < maxScroll - 2);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    updateScrollState();
    el.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);

    return () => {
      el.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [updateScrollState]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    setIsDragging(true);
    setStartX(e.pageX - el.offsetLeft);
    setScrollLeft(el.scrollLeft);
  }, []);

  const onMouseLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const onMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const el = scrollRef.current;
    if (!el) return;
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startX) * 1.5; // Drag sensitivity multiplier
    el.scrollLeft = scrollLeft - walk;
    updateScrollState();
  }, [isDragging, startX, scrollLeft, updateScrollState]);

  const scrollBy = useCallback((direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const delta = direction === 'left' ? -scrollStep : scrollStep;
    el.scrollBy({ left: delta, behavior: 'smooth' });
    setTimeout(updateScrollState, 250);
  }, [scrollStep, updateScrollState]);

  return {
    scrollRef,
    isDragging,
    canScrollLeft,
    canScrollRight,
    onMouseDown,
    onMouseLeave,
    onMouseUp,
    onMouseMove,
    scrollBy,
    scrollLeft: () => scrollBy('left'),
    scrollRight: () => scrollBy('right'),
    updateScrollState
  };
}
