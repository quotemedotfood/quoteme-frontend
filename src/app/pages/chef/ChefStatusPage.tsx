import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import { getGuestQuote } from '../../services/api';

// ─── Shared styles ─────────────────────────────────────────────────────────────

const headlineStyle: React.CSSProperties = { fontFamily: "'Playfair Display', serif" };

// ─── ChefStatusPage ────────────────────────────────────────────────────────────

export function ChefStatusPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Animated dots: "" → "." → ".." → "..."
  const [dots, setDots] = useState('');
  const dotsRef = useRef(0);

  // Polling ref
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Dots animation — cycles every 500ms
  useEffect(() => {
    const dotStates = ['', '.', '..', '...'];
    const interval = setInterval(() => {
      dotsRef.current = (dotsRef.current + 1) % dotStates.length;
      setDots(dotStates[dotsRef.current]);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Poll quote status every 4 seconds
  useEffect(() => {
    if (!id) return;

    async function checkStatus() {
      if (!id) return;
      const res = await getGuestQuote(id);
      if (res.data && res.data.status && res.data.status !== 'draft') {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
        navigate(`/chef/quotes/${id}`);
      }
    }

    // Check immediately, then every 4 seconds
    checkStatus();
    pollRef.current = setInterval(checkStatus, 4000);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [id, navigate]);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm flex flex-col items-center text-center gap-6">
        {/* Spinner */}
        <div
          className="w-12 h-12 rounded-full border-4 border-[#E0E0E0] border-t-[#E5A84B]"
          style={{ animation: 'spin 1s linear infinite' }}
        />

        {/* Headline with animated dots */}
        <div>
          <h1
            className="text-2xl font-bold text-[#2A2A2A] mb-2"
            style={headlineStyle}
          >
            Building your quote{dots}
          </h1>
          <p className="text-[#4F4F4F] text-base">
            This usually takes about 30 seconds.
          </p>
        </div>
      </div>

      {/* Spin keyframe injected inline for portability */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
