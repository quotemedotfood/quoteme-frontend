import { ReactNode, useState } from 'react';
import { useSwipeable } from 'react-swipeable';
import { Edit, Trash2 } from 'lucide-react';

interface SwipeableCardProps {
  children: ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
}

export function SwipeableCard({ children, onEdit, onDelete, className = '' }: SwipeableCardProps) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);

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
            className="w-16 bg-blue-500 flex items-center justify-center text-white transition-colors hover:bg-blue-600"
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
        {...handlers}
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: isSwiping ? 'none' : 'transform 0.3s ease-out',
        }}
        className={`bg-white ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
