import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';

export function SwipeHint() {
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    const hasSeenHint = localStorage.getItem('hasSeenSwipeHint');
    if (!hasSeenHint) {
      // Show hint after a short delay
      const timer = setTimeout(() => {
        setShowHint(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismissHint = () => {
    setShowHint(false);
    localStorage.setItem('hasSeenSwipeHint', 'true');
  };

  if (!showHint) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="md:hidden fixed bottom-20 left-4 right-4 z-50"
    >
      <div className="bg-[#F2993D] text-white rounded-lg p-4 shadow-lg relative">
        <button 
          onClick={dismissHint}
          className="absolute top-3 right-3 p-1 hover:bg-white/20 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex justify-between items-center gap-4 pr-6">
          <div className="flex-1">
            <p className="font-medium mb-1">👈 Swipe Left</p>
            <p className="text-sm text-white/90">Swipe cards left to reveal quick actions</p>
          </div>
          
          {/* Animated swipe gesture */}
          <motion.div
            className="flex items-center gap-2 flex-shrink-0"
            animate={{ x: [10, -30, 10] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <span className="text-xl">←</span>
            <div className="w-12 h-8 bg-white/20 rounded"></div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}