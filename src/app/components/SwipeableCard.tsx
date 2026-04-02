import { ReactNode, useState, useEffect, useRef } from 'react';
import { useSwipeable } from 'react-swipeable';
import { Edit, Trash2 } from 'lucide-react';

interface SwipeableCardProps {
  children: ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
  /** Show a bounce-left hint animation on mount */
  bounceHint?: boolean;
}

export function SwipeableCard({ children, onEdit, onDelete, className = '', bounceHint = false }: SwipeableCardProps) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [showBounce, setShowBounce] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!bounceHint) return;
    // Small delay so the card renders first
    const timer = setTimeout(() => setShowBounce(true), 300);
    return () => clearTimeout(timer);
  }, [bounceHint]);

  const handlers = useSwipeable({
    onSwiping: (eventData) => {
      if (eventData.dir === 'Left') {
        const offset = Math.min(Math.abs(eventData.deltaX), 120);
        setSwipeOffset(-offset);
        setIsSwiping(true);
      }
    },
    onSwipedLeft: () => {
      if (swipeOffset < -60) {
        setSwipeOffset(-120);
      } else {
        setSwipeOffset(0);
      }
      setIsSwiping(false);
    },
    onSwipedRight: () => {
      setSwipeOffset(0);
      setIsSwiping(false);
    },
    onTouchEndOrOnMouseUp: () => {
      if (!isSwiping) return;
      if (swipeOffset < -60) {
        setSwipeOffset(-120);
      } else {
        setSwipeOffset(0);
      }
      setIsSwiping(false);
    },
    trackMouse: true,
    trackTouch: true,
  });

  return (
    <div className="relative overflow-hidden">
      {/* Action Buttons Background */}
      <div className="absolute right-0 top-0 bottom-0 flex items-stretch">
        {onEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
              setSwipeOffset(0);
            }}
            className="w-16 bg-[#A5CFDD] flex items-center justify-center text-white transition-colors hover:bg-[#7FAEC2]"
          >
            <Edit size={20} />
          </button>
        )}
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
              setSwipeOffset(0);
            }}
            className="w-16 bg-red-500 flex items-center justify-center text-white transition-colors hover:bg-red-600"
          >
            <Trash2 size={20} />
          </button>
        )}
      </div>

      {/* Card Content */}
      <div
        ref={cardRef}
        {...handlers}
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: isSwiping ? 'none' : 'transform 0.3s ease-out',
          animation: showBounce ? 'swipe-bounce-hint 0.5s ease-out forwards' : undefined,
        }}
        onAnimationEnd={() => setShowBounce(false)}
        className={`bg-white ${className}`}
      >
        {children}
      </div>

      {showBounce && (
        <style>{`
          @keyframes swipe-bounce-hint {
            0% { transform: translateX(0); }
            40% { transform: translateX(-25px); }
            100% { transform: translateX(0); }
          }
        `}</style>
      )}
    </div>
  );
}
