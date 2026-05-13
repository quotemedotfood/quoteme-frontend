import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import { getGuestQuote } from '../../services/api';

const headlineStyle: React.CSSProperties = { fontFamily: "'Playfair Display', serif" };

// Staged progress messages — cycle by elapsed time so the chef sees the
// system working, not a stale 30s countdown. Mirrors the rep MapIngredientsPage
// 6-phase pattern (memory note: "So close…" after 15s of "Almost there…").
const STAGES: Array<{ at: number; message: string }> = [
  { at: 0,  message: 'Reading your menu' },
  { at: 8,  message: 'Matching ingredients' },
  { at: 18, message: 'Building your quote' },
  { at: 35, message: 'Almost there' },
  { at: 50, message: 'So close' },
];

function stageFor(elapsedSec: number): string {
  let current = STAGES[0].message;
  for (const stage of STAGES) {
    if (elapsedSec >= stage.at) current = stage.message;
  }
  return current;
}

export function ChefStatusPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [dots, setDots] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const dotsRef = useRef(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number>(Date.now());

  // Dots animation — cycles every 500ms
  useEffect(() => {
    const dotStates = ['', '.', '..', '...'];
    const interval = setInterval(() => {
      dotsRef.current = (dotsRef.current + 1) % dotStates.length;
      setDots(dotStates[dotsRef.current]);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Elapsed-time ticker — drives staged messages
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Poll quote every 4 seconds. Guest quotes are processed synchronously and
  // stay status="draft" forever; the right signal that work is done is
  // quote_lines being populated. Navigate as soon as we see any lines.
  useEffect(() => {
    if (!id) return;

    async function checkStatus() {
      if (!id) return;
      const res = await getGuestQuote(id);
      const done = res.data && (
        (res.data.lines && res.data.lines.length > 0) ||
        (res.data.status && res.data.status !== 'draft' && res.data.status !== 'processing')
      );
      if (done) {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
        navigate(`/chef/quotes/${id}`);
      }
    }

    checkStatus();
    pollRef.current = setInterval(checkStatus, 4000);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [id, navigate]);

  const stageMessage = stageFor(elapsed);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm flex flex-col items-center text-center gap-6">
        <div
          className="w-12 h-12 rounded-full border-4 border-[#E0E0E0] border-t-[#E5A84B]"
          style={{ animation: 'spin 1s linear infinite' }}
        />

        <div>
          <h1
            className="text-2xl font-bold text-[#2A2A2A] mb-2"
            style={headlineStyle}
          >
            {stageMessage}{dots}
          </h1>
          <p className="text-[#4F4F4F] text-base">
            This usually takes about 30 seconds.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
