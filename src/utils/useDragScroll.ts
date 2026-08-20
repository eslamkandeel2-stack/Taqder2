import { useRef, useState, useCallback, useEffect, MouseEvent } from 'react';

/**
 * Custom React Hook for smooth mouse dragging and horizontal scrolling on desktop/touch.
 * Enables clicking and dragging left/right to scroll content naturally.
 */
export function useDragScroll() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScrollability = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const hasOverflow = el.scrollWidth > el.clientWidth;
    // Note: in RTL layout, scrollLeft can be negative or positive depending on browser implementation
    const maxScroll = el.scrollWidth - el.clientWidth;
    const currentScroll = Math.abs(el.scrollLeft);
    
    setCanScrollLeft(hasOverflow && currentScroll < maxScroll - 4);
    setCanScrollRight(hasOverflow && currentScroll > 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    checkScrollability();
    const handleResize = () => checkScrollability();
    window.addEventListener('resize', handleResize);
    el.addEventListener('scroll', checkScrollability);

    return () => {
      window.removeEventListener('resize', handleResize);
      el.removeEventListener('scroll', checkScrollability);
    };
  }, [checkScrollability]);

  const onMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el) return;
    setIsDragging(true);
    setStartX(e.pageX - el.offsetLeft);
    setScrollLeftState(el.scrollLeft);
  };

  const onMouseLeave = () => {
    setIsDragging(false);
  };

  const onMouseUp = () => {
    setIsDragging(false);
  };

  const onMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.preventDefault();
    const el = scrollRef.current;
    if (!el) return;
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startX) * 1.5; // Scroll speed factor
    el.scrollLeft = scrollLeftState - walk;
    checkScrollability();
  };

  const scrollByAmount = (amount: number) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: amount, behavior: 'smooth' });
    setTimeout(checkScrollability, 300);
  };

  return {
    scrollRef,
    isDragging,
    canScrollLeft,
    canScrollRight,
    onMouseDown,
    onMouseLeave,
    onMouseUp,
    onMouseMove,
    scrollLeft: () => scrollByAmount(-220),
    scrollRight: () => scrollByAmount(220),
    checkScrollability
  };
}
