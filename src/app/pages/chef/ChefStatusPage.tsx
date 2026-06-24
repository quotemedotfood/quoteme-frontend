import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router';
import { getGuestQuote, getChefQuote } from '../../services/api';
import { StuckRecoveryScreen, MENU_DRAFT_KEY } from '../../components/chef/StuckRecoveryScreen';
import { isQuoteComplete } from '../../utils/quoteStatus';

// ─── Timeout threshold ────────────────────────────────────────────────────────
// If the quote hasn't resolved within STUCK_AFTER_MS milliseconds, transition
// to the stuck-state recovery UI (Screen 14). Agent A's c133 work may also
// call the parent's onTimeout prop if this page is embedded; the timeout here
// acts as a self-contained fallback in case ChefStatusPage is reached directly.
const STUCK_AFTER_MS = 60_000;

const headlineStyle: React.CSSProperties = { fontFamily: "'Playfair Display', serif" };

// c143 — three labeled steps replace the elapsed-time cycling messages.
// Step progression is driven by observable poll signals:
//   Step 1 ("Reading your menu")     — complete on first successful poll response
//   Step 2 ("Matching ingredients")  — complete when lines are populated
//   Step 3 ("Building your quote")   — complete / navigate when lines > 0

type StepState = 'pending' | 'active' | 'done';

interface StepDef {
  label: string;
  sublabel?: string;
}

function buildSteps(distributorName: string | null): StepDef[] {
  return [
    { label: 'Reading your menu' },
    {
      label: 'Matching ingredients',
      sublabel: distributorName
        ? `Aligning to ${distributorName} catalog`
        : 'Aligning to your distributor catalog',
    },
    { label: 'Building your quote' },
  ];
}

interface StepRowProps {
  step: StepDef;
  state: StepState;
  isLast: boolean;
}

function StepRow({ step, state, isLast }: StepRowProps) {
  return (
    <div className="flex items-start gap-4">
      {/* Icon column */}
      <div className="flex flex-col items-center">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-500 ${
            state === 'done'
              ? 'bg-[#E5A84B]'
              : state === 'active'
              ? 'border-2 border-[#E5A84B] bg-white'
              : 'border-2 border-[#E0E0E0] bg-white'
          }`}
        >
          {state === 'done' ? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M2.5 7L5.5 10L11.5 4"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : state === 'active' ? (
            <div
              className="w-3 h-3 rounded-full border-2 border-[#E0E0E0] border-t-[#E5A84B]"
              style={{ animation: 'spin 1s linear infinite' }}
            />
          ) : (
            <div className="w-2 h-2 rounded-full bg-[#E0E0E0]" />
          )}
        </div>
        {/* Connector line */}
        {!isLast && (
          <div
            className={`w-0.5 h-8 mt-1 transition-colors duration-500 ${
              state === 'done' ? 'bg-[#E5A84B]' : 'bg-[#E0E0E0]'
            }`}
          />
        )}
      </div>

      {/* Text column */}
      <div className="pt-1 pb-8">
        <p
          className={`text-sm font-medium transition-colors duration-500 ${
            state === 'pending' ? 'text-[#BDBDBD]' : 'text-[#2B2B2B]'
          }`}
        >
          {step.label}
        </p>
        {step.sublabel && state !== 'pending' && (
          <p className="text-xs text-[#9E9E9E] mt-0.5">{step.sublabel}</p>
        )}
      </div>
    </div>
  );
}

// ─── B01: Session-expired detection ──────────────────────────────────────────
// Exported so it can be unit-tested independently of the component.
// Returns true when an API response indicates the guest session has expired
// (HTTP 401) or carries the canonical "Session not found or expired" error
// string — both mean polling should stop and the expired UI should render.
export function isSessionExpiredResponse(res: { status?: number; error?: string }): boolean {
  if (res.status === 401) return true;
  if (res.error === 'Session not found or expired') return true;
  return false;
}

// ─── Props (Agent A integration surface) ─────────────────────────────────────
// Agent A's c133 timeout work can pass `onTimeout` via router state or as a
// prop if ChefStatusPage is ever rendered as a child component. When the
// self-contained 60s timer fires, `onTimeout` is called first so Agent A's
// code can run any cleanup; if absent the recovery screen renders directly.
export interface ChefStatusPageProps {
  /** Called when STUCK_AFTER_MS elapses without a resolved quote. */
  onTimeout?: () => void;
}

export function ChefStatusPage({ onTimeout }: ChefStatusPageProps = {}) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // c143 — step indices: 0=Reading, 1=Matching, 2=Building
  // currentStep tracks which step is currently active (0-based).
  // c144 — isStuck flips when the 60s stuck-timer fires; switches to StuckRecoveryScreen.
  // repEmail/repName surface to StuckRecoveryScreen path (a) when on file.
  // B01 — isSessionExpired flips when a 401 is received; stops polling + shows expired UI.
  const [currentStep, setCurrentStep] = useState(0);
  const [distributorName, setDistributorName] = useState<string | null>(null);
  const [repEmail, setRepEmail] = useState<string | undefined>(undefined);
  const [repName, setRepName] = useState<string | undefined>(undefined);
  const [isStuck, setIsStuck] = useState(false);
  const [isSessionExpired, setIsSessionExpired] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stuckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // c144 — restore menu draft from router state into localStorage so recovery
  // paths (a) and (b) can retrieve it. ChefEntryPage's pasteText onChange also
  // writes it; this is the fallback for direct navigation with raw_text in state.
  useEffect(() => {
    const rawText = (location.state as { raw_text?: string } | null)?.raw_text;
    if (rawText) {
      localStorage.setItem(MENU_DRAFT_KEY, rawText);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // c144 — 60s stuck-state timer. Fires StuckRecoveryScreen and calls any
  // external onTimeout handler.
  useEffect(() => {
    stuckTimerRef.current = setTimeout(() => {
      onTimeout?.();
      setIsStuck(true);
    }, STUCK_AFTER_MS);
    return () => {
      if (stuckTimerRef.current) clearTimeout(stuckTimerRef.current);
    };
  }, [onTimeout]);

  // Small delay so step 2→3 completes visually before navigating
  const FINAL_STEP_DISPLAY_MS = 600;

  // Poll quote every 4 seconds.
  useEffect(() => {
    if (!id) return;

    let firstPollDone = false;

    async function checkStatus() {
      if (!id) return;
      const bearerToken = localStorage.getItem('quoteme_token');
      const fetchFn = bearerToken ? getChefQuote : getGuestQuote;
      const res = await fetchFn(id);

      // B01: detect expired session (401 / "Session not found or expired").
      // Stop polling immediately and show the expired UI — never spin forever.
      if (isSessionExpiredResponse(res)) {
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
        if (stuckTimerRef.current) { clearTimeout(stuckTimerRef.current); stuckTimerRef.current = null; }
        setIsSessionExpired(true);
        return;
      }

      if (res.data) {
        const wasFirstPoll = !firstPollDone;

        // C-03: revisiting an already-finished quote should land on the receipt
        // immediately — no blank Step-1 flash and no FINAL_STEP_DISPLAY_MS delay.
        if (wasFirstPoll && isQuoteComplete(res.data)) {
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
          if (stuckTimerRef.current) { clearTimeout(stuckTimerRef.current); stuckTimerRef.current = null; }
          localStorage.removeItem(MENU_DRAFT_KEY);
          navigate(`/chef/quotes/${id}`, { replace: true });
          return;
        }

        // Populate distributor/rep metadata on first successful response.
        if (!firstPollDone) {
          firstPollDone = true;
          // c143 + c144 — defensive read of distributor/rep fields. These ride
          // alongside the canonical QuoteResponse shape; BE adds them via the
          // chef-facing serializer. When absent, sublabel falls back and
          // StuckRecoveryScreen path (a) stays hidden.
          const distributor = (res.data as { distributor?: { name?: string; rep?: { email?: string; name?: string } } }).distributor;
          if (distributor?.name) setDistributorName(distributor.name);
          if (distributor?.rep?.email) setRepEmail(distributor.rep.email);
          if (distributor?.rep?.name) setRepName(distributor.rep.name);
        }

        // Track 22: drive step progression from real backend processing_stage.
        const stage = res.data.processing_stage;

        if (stage && !isQuoteComplete(res.data)) {
          // Stage-driven path — quote was created via the async Track 22 flow.
          if (stage === 'extracting_dishes') {
            setCurrentStep(0);
          } else if (stage === 'aligning_products') {
            setCurrentStep(1);
          } else if (stage === 'building_quote') {
            setCurrentStep(2);
          } else if (stage === 'failed') {
            if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
            if (stuckTimerRef.current) { clearTimeout(stuckTimerRef.current); stuckTimerRef.current = null; }
            // Treat a failed job the same as stuck — show recovery screen.
            setIsStuck(true);
            return;
          } else if (stage === 'complete') {
            if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
            if (stuckTimerRef.current) { clearTimeout(stuckTimerRef.current); stuckTimerRef.current = null; }
            localStorage.removeItem(MENU_DRAFT_KEY);
            setCurrentStep(2);
            setTimeout(() => { navigate(`/chef/quotes/${id}`); }, FINAL_STEP_DISPLAY_MS);
            return;
          }
        } else {
          // Fallback: legacy behavior — advance by line count.
          // Handles quotes already in-flight at the time of Track 22 deploy,
          // or quotes reached directly via /chef/status/:id without async creation.
          // firstPollDone is already true at this point (set in the block above), so
          // we check it before this block to set step 1 on the first successful poll.
          setCurrentStep((prev) => Math.max(prev, 1));

          const done =
            (res.data.lines && res.data.lines.length > 0) ||
            (res.data.status &&
              res.data.status !== 'draft' &&
              res.data.status !== 'processing');

          if (done) {
            if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
            if (stuckTimerRef.current) { clearTimeout(stuckTimerRef.current); stuckTimerRef.current = null; }
            localStorage.removeItem(MENU_DRAFT_KEY);
            setCurrentStep(2);
            setTimeout(() => { navigate(`/chef/quotes/${id}`); }, FINAL_STEP_DISPLAY_MS);
          }
        }
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

  const steps = buildSteps(distributorName);

  function stepState(index: number): StepState {
    if (index < currentStep) return 'done';
    if (index === currentStep) return 'active';
    return 'pending';
  }

  // B01: session expired — stop all activity and show a clear message.
  if (isSessionExpired) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm text-center">
          <div className="mb-6">
            <svg
              width="48"
              height="48"
              viewBox="0 0 48 48"
              fill="none"
              className="mx-auto mb-4"
              aria-hidden="true"
            >
              <circle cx="24" cy="24" r="22" stroke="#E0E0E0" strokeWidth="2" />
              <path
                d="M24 14v12l6 4"
                stroke="#BDBDBD"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <h1
              className="text-xl font-bold text-[#2B2B2B] mb-3"
              style={headlineStyle}
            >
              Your session has expired
            </h1>
            <p className="text-[#4F4F4F] text-sm leading-relaxed">
              Use the quote link from your email to pick up where you left off.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Transition to recovery screen once the timeout fires.
  if (isStuck) {
    return <StuckRecoveryScreen quoteId={id} repEmail={repEmail} repName={repName} />;
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Heading */}
        <div className="mb-8 text-center">
          <h1
            className="text-2xl font-bold text-[#2B2B2B] mb-2"
            style={headlineStyle}
          >
            Building your quote
          </h1>
          <p className="text-[#4F4F4F] text-sm">
            This usually takes about 30 seconds.
          </p>
        </div>

        {/* Step list */}
        <div className="flex flex-col">
          {steps.map((step, i) => (
            <StepRow
              key={step.label}
              step={step}
              state={stepState(i)}
              isLast={i === steps.length - 1}
            />
          ))}
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
