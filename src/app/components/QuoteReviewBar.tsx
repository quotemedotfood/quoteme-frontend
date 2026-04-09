import { useState } from 'react';
import { ThumbsUp, ThumbsDown, Loader2, X } from 'lucide-react';
import { reviewQuote } from '../services/api';

interface QuoteReviewBarProps {
  quoteId: string;
  onMatchesUpdated: () => void;
}

type ReviewState = 'idle' | 'expanded' | 'submitting' | 'dismissed';

export function QuoteReviewBar({ quoteId, onMatchesUpdated }: QuoteReviewBarProps) {
  const [state, setState] = useState<ReviewState>('idle');
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [rulesCreated, setRulesCreated] = useState<number | null>(null);

  if (state === 'dismissed') return null;

  const handleThumbsUp = async () => {
    await reviewQuote(quoteId, 'positive');
    setState('dismissed');
  };

  const handleThumbsDown = () => {
    setState('expanded');
    setError(null);
    setRulesCreated(null);
  };

  const handleSubmit = async () => {
    if (!comment.trim()) return;
    setState('submitting');
    setError(null);

    const result = await reviewQuote(quoteId, 'negative', comment.trim());

    if (result.error) {
      setError(result.error);
      setState('expanded');
      return;
    }

    setRulesCreated(result.data?.rules_created ?? 0);
    setComment('');
    onMatchesUpdated();
    setState('idle');
  };

  const handleClose = () => {
    setState('idle');
    setComment('');
    setError(null);
  };

  // Submitting state
  if (state === 'submitting') {
    return (
      <div className="fixed bottom-0 left-0 right-0 md:left-64 z-40 bg-white border-t border-gray-200 p-4">
        <div className="flex items-center justify-center gap-3 py-3">
          <Loader2 className="w-5 h-5 animate-spin text-[#7FAEC2]" />
          <span className="text-sm font-medium text-gray-700">Rethinking matches...</span>
        </div>
      </div>
    );
  }

  // Expanded state (textarea visible)
  if (state === 'expanded') {
    return (
      <div className="fixed bottom-0 left-0 right-0 md:left-64 z-40 bg-white border-t border-gray-200 shadow-lg">
        <div className="p-4 max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">What should we fix?</span>
            <button onClick={handleClose} className="p-1 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="e.g., No Sysco products for this chef, only fresh shrimp..."
            className="w-full p-3 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#7FAEC2] focus:border-transparent"
            rows={3}
            autoFocus
          />
          {error && (
            <p className="text-xs text-red-500 mt-2">{error}</p>
          )}
          <button
            onClick={handleSubmit}
            disabled={!comment.trim()}
            className="mt-3 w-full bg-[#F9A64B] hover:bg-[#E8953A] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg text-sm min-h-[48px]"
          >
            Redo Matches
          </button>
        </div>
      </div>
    );
  }

  // Idle state — teal bar with thumbs up/down
  return (
    <div className="fixed bottom-0 left-0 right-0 md:left-64 z-40">
      {rulesCreated !== null && rulesCreated > 0 && (
        <div className="bg-green-50 border-t border-green-200 px-4 py-2 text-center">
          <span className="text-xs text-green-700">
            Updated {rulesCreated} matching rule{rulesCreated !== 1 ? 's' : ''} and refreshed results
          </span>
        </div>
      )}
      <div className="bg-[#7FAEC2] px-4 py-3">
        <div className="flex items-center justify-center gap-4 max-w-2xl mx-auto">
          <span className="text-white text-sm font-medium">How do these matches look?</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleThumbsUp}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              title="Looks good"
            >
              <ThumbsUp className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={handleThumbsDown}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              title="Needs fixes"
            >
              <ThumbsDown className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
