import React, { useEffect, useRef, useState } from 'react';

type TimelineScrollbarProps = {
  scrollRef: React.RefObject<HTMLDivElement>;
  contentWidth: number;
  isDark: boolean;
};

const MIN_THUMB_WIDTH = 36;

const TimelineScrollbar: React.FC<TimelineScrollbarProps> = ({
  scrollRef,
  contentWidth,
  isDark,
}) => {
  const [viewportWidth, setViewportWidth] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;

    const update = () => {
      setViewportWidth(el.clientWidth);
      setScrollLeft(el.scrollLeft);
    };

    update();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(update);
      observer.observe(el);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [scrollRef, contentWidth]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    const handleScroll = () => setScrollLeft(el.scrollLeft);
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, [scrollRef]);

  const overflow = Math.max(0, contentWidth - viewportWidth);
  if (overflow <= 1 || viewportWidth <= 0) return null;

  const thumbWidth = Math.max(
    MIN_THUMB_WIDTH,
    (viewportWidth / contentWidth) * viewportWidth,
  );
  const maxThumbTravel = Math.max(1, viewportWidth - thumbWidth);
  const thumbLeft = (scrollLeft / overflow) * maxThumbTravel;

  const handleThumbMouseDown = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const scrollEl = scrollRef.current;
    const trackEl = trackRef.current;
    if (!scrollEl || !trackEl) return;

    const trackRect = trackEl.getBoundingClientRect();
    const startX = event.clientX;
    const startScrollLeft = scrollEl.scrollLeft;

    const handleMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const ratio = deltaX / Math.max(1, trackRect.width - thumbWidth);
      const nextScrollLeft = Math.min(
        overflow,
        Math.max(0, startScrollLeft + ratio * overflow),
      );
      scrollEl.scrollLeft = nextScrollLeft;
      setScrollLeft(nextScrollLeft);
    };

    const handleUp = () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  const handleTrackMouseDown = (event: React.MouseEvent) => {
    if (event.target !== event.currentTarget) return;
    const scrollEl = scrollRef.current;
    const trackEl = trackRef.current;
    if (!scrollEl || !trackEl) return;

    const trackRect = trackEl.getBoundingClientRect();
    const clickX = event.clientX - trackRect.left;
    const maxThumbTravel = Math.max(1, trackRect.width - thumbWidth);
    const targetLeft = Math.min(
      maxThumbTravel,
      Math.max(0, clickX - thumbWidth / 2),
    );
    const ratio = targetLeft / maxThumbTravel;
    const nextScrollLeft = ratio * overflow;
    scrollEl.scrollLeft = nextScrollLeft;
    setScrollLeft(nextScrollLeft);
  };

  return (
    <div
      ref={trackRef}
      className={`mt-2 h-2 rounded-full relative ${
        isDark
          ? 'bg-black border border-black'
          : 'bg-gray-100 border border-gray-300'
      }`}
      onMouseDown={handleTrackMouseDown}
    >
      <div
        className={`h-full rounded-full transition-[width,transform] duration-150 cursor-grab active:cursor-grabbing ${
          isDark
            ? 'bg-industrial-orange/45 shadow-[0_0_2px_rgba(255,149,0,0.12)]'
            : 'bg-blue-600 shadow-[0_0_6px_rgba(37,99,235,0.35)]'
        }`}
        style={{
          width: `${thumbWidth}px`,
          transform: `translateX(${Math.max(0, thumbLeft)}px)`,
        }}
        onMouseDown={handleThumbMouseDown}
      />
    </div>
  );
};

export default TimelineScrollbar;
