import { useState } from 'react';
import { ThumbsUp, ThumbsDown, Loader2, X } from 'lucide-react';
import { reviewQuote } from '../services/api';

interface QuoteReviewBarProps {
  quoteId: string;
  onMatchesUpdated: () => void;
  noSidebarOffset?: boolean;
}

type ReviewState = 'idle' | 'expanded' | 'submitting' | 'dismissed';

export function QuoteReviewBar({ quoteId, onMatchesUpdated }: QuoteReviewBarProps) {
  // BUG #30/#31 — compact floating card (not a full-width bar), stacked above
  // the floating Adjust Pricing / Finish Quote button. Right-justified (moved
  // off dead-center per Moose's 100km Foods demo feedback — a centered card
  // sat on top of the match rows) so it never overlaps the DISHES sidebar
  // (far left column) in any state, and stays clear of match-row content
  // which now reads uncovered on the left/center of the screen; fixed
  // height/position so dismissing it causes no layout jump. `noSidebarOffset`
  // is kept in QuoteReviewBarProps (unused here) so QuoteBuilderPage's call
  // site keeps compiling unchanged.
  //
  // Dispatch #7 (QB smalls): bottom offset raised from 88px to 144px. The
  // floating "Finish Quote" button on QuoteBuilderPage sits at bottom-[80px]
  // with a ~48px min-height, i.e. it occupies the 80-128px band from the
  // viewport bottom -- the old 88px offset put this card's bottom edge
  // *inside* that band, covering the primary CTA (Ch XXII). 144px clears the
  // button's top edge (128px) with a 16px gap. MapIngredientsPage's "Adjust
  // Pricing" button sits much lower (bottom-6, ~24-72px band) so the extra
  // clearance only moves this card a bit higher there -- still non-
  // overlapping, still fully functional.
  //
  // Width: fixed px + a plain (non-calc) vw cap instead of the previous
  // `w-[calc(100%-2rem)]` -- calc()-driven percentage widths are a known
  // layout-thrash trigger for libraries that observe element size.
  const cardClass = 'fixed bottom-[144px] right-4 md:right-6 z-40 w-[380px] max-w-[92vw]';
  const [state, setState] = useState<ReviewState>('idle');
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [rulesCreated, setRulesCreated] = useState<number | null>(null);
  const [rulesSummary, setRulesSummary] = useState<string[]>([]);

  if (state === 'dismissed') return null;

  const handleThumbsUp = async () => {
    await reviewQuote(quoteId, 'positive');
    setState('dismissed');
  };

  const handleThumbsDown = () => {
    setState('expanded');
    setError(null);
    setRulesCreated(null);
    setRulesSummary([]);
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
    setRulesSummary(result.data?.rules_summary ?? []);
    setComment('');
    onMatchesUpdated();
    setState('idle');
  };

  const handleClose = () => {
    setState('idle');
    setComment('');
    setError(null);
  };

  if (state === 'submitting') {
    return (
      <div className={`${cardClass} bg-white border border-gray-200 rounded-xl shadow-lg p-4`}>
        <div className="flex items-center justify-center gap-3 py-1">
          <Loader2 className="w-5 h-5 animate-spin text-[#7FAEC2]" />
          <span className="text-sm font-medium text-gray-700">Rethinking matches...</span>
        </div>
      </div>
    );
  }

  if (state === 'expanded') {
    return (
      <div className={`${cardClass} bg-white border border-gray-200 rounded-xl shadow-lg`}>
        <div className="p-4">
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
            className="mt-3 w-full bg-[#F2993D] hover:bg-[#E8953A] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg text-sm min-h-[48px]"
          >
            Redo Matches
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${cardClass} rounded-xl shadow-lg overflow-hidden`}>
      {rulesCreated !== null && rulesCreated > 0 && (
        <div className="bg-green-50 border-b border-green-200 px-4 py-3 text-center">
          <p className="text-xs font-medium text-green-800 mb-1">
            Applied {rulesCreated} rule{rulesCreated !== 1 ? 's' : ''}:
          </p>
          <p className="text-xs text-green-700">
            {rulesSummary.join(' \u00b7 ')}
          </p>
        </div>
      )}
      <div className="bg-[#7FAEC2] px-4 py-3">
        <div className="flex items-center justify-center gap-4 max-w-2xl mx-auto">
          <span className="text-white text-sm font-medium">How do these matches look?</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleThumbsUp}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              // Icon-only rating control. `title` is the last fallback in the
              // accessible-name computation and is never surfaced on touch, so
              // both thumbs announced as unnamed buttons. The name has to say
              // which answer the button gives, not just which glyph it shows.
              aria-label="These matches look good"
              title="Looks good"
            >
              <ThumbsUp className="w-5 h-5 text-white" aria-hidden="true" />
            </button>
            <button
              onClick={handleThumbsDown}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="These matches need fixes"
              title="Needs fixes"
            >
              <ThumbsDown className="w-5 h-5 text-white" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
