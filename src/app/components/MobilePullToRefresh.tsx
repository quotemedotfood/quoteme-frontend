import { ReactNode, useState, useEffect, TouchEvent } from 'react';
import { motion } from 'motion/react';

interface MobilePullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
}

export function MobilePullToRefresh({ children, onRefresh }: MobilePullToRefreshProps) {
  const [startY, setStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [canPull, setCanPull] = useState(false);

  const threshold = 80;

  const handleTouchStart = (e: TouchEvent) => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    if (scrollTop === 0) {
      setCanPull(true);
      setStartY(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!canPull || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const distance = currentY - startY;

    if (distance > 0) {
      setPullDistance(Math.min(distance * 0.5, threshold + 20));
    }
  };

  const handleTouchEnd = async () => {
    if (!canPull) return;

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      await onRefresh();
      setIsRefreshing(false);
    }

    setPullDistance(0);
    setCanPull(false);
  };

  return (
    <>
      {/* Mobile version with pull-to-refresh */}
      <div 
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="md:hidden"
      >
        {/* Pull to refresh indicator */}
        <div 
          className="flex items-center justify-center transition-opacity"
          style={{
            height: `${pullDistance}px`,
            opacity: pullDistance / threshold,
          }}
        >
          <motion.div
            animate={{ rotate: isRefreshing ? 360 : pullDistance * 4 }}
            transition={{ duration: isRefreshing ? 1 : 0, repeat: isRefreshing ? Infinity : 0, ease: 'linear' }}
            className="text-[#F2993D]"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </motion.div>
        </div>

        {/* Content */}
        {children}
      </div>

      {/* Desktop fallback - show content without pull-to-refresh */}
      <div className="hidden md:block">
        {children}
      </div>
    </>
  );
}