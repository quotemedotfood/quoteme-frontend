// ChefPullStatusPage — /chef/pull/status/:id
//
// Polling status page for a pull-quote in progress.
// Reuses the same labeled-steps pattern and StuckRecoveryScreen as
// ChefStatusPage. Navigation target on success: /chef/pull/receipt/:id.
//
// Affiliated copy variant: "Aligning to [Distributor] catalog"
// Unaffiliated copy variant: same labels, no rep-handoff sublabel
//
// Stuck-state (60s): routes to StuckRecoveryScreen with rep context
// when available (affiliated) or without (unaffiliated).
//
// Copy doctrine: calm, operational.
// BANNED: AI, intelligent, automated, platform, ecosystem, seamless.

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router';
import { getPullQuote, type PullQuoteDistributor } from '../../services/api';
import { StuckRecoveryScreen, MENU_DRAFT_KEY } from '../../components/chef/StuckRecoveryScreen';
import { PullDistributorAnchor } from '../../components/chef/PullDistributorAnchor';
import { isQuoteNotFoundResponse } from './ChefStatusPage';

// ─── Timeout threshold ────────────────────────────────────────────────────────
const STUCK_AFTER_MS = 60_000;

const headlineStyle: React.CSSProperties = { fontFamily: "'Playfair Display', serif" };

// ─── Step model ──────────────────────────────────────────────────────────────

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
        : 'Aligning to distributor catalog',
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

// ─── ChefPullStatusPage ───────────────────────────────────────────────────────

export function ChefPullStatusPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // Distributor context from router state (passed by ChefPullEntryPage)
  const locationState = location.state as {
    distributor?: PullQuoteDistributor;
    raw_text?: string;
  } | null;

  const [currentStep, setCurrentStep] = useState(0);
  const [distributor, setDistributor] = useState<PullQuoteDistributor | null>(
    locationState?.distributor ?? null,
  );
  const [isStuck, setIsStuck] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stuckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Persist raw_text so StuckRecoveryScreen's recovery paths can use it
  useEffect(() => {
    const rawText = locationState?.raw_text;
    if (rawText) {
      localStorage.setItem(MENU_DRAFT_KEY, rawText);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 60s stuck-state timer
  useEffect(() => {
    stuckTimerRef.current = setTimeout(() => {
      setIsStuck(true);
    }, STUCK_AFTER_MS);
    return () => {
      if (stuckTimerRef.current) clearTimeout(stuckTimerRef.current);
    };
  }, []);

  const FINAL_STEP_DISPLAY_MS = 600;

  // Poll pull-quote every 4 seconds
  useEffect(() => {
    if (!id) return;

    let firstPollDone = false;

    async function checkStatus() {
      if (!id) return;
      const res = await getPullQuote(id);

      // Invalid or missing pull quote — receipt page shows error UX.
      if (isQuoteNotFoundResponse(res)) {
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
        if (stuckTimerRef.current) { clearTimeout(stuckTimerRef.current); stuckTimerRef.current = null; }
        navigate(`/chef/pull/receipt/${id}`, { replace: true });
        return;
      }

      if (res.data) {
        if (!firstPollDone) {
          firstPollDone = true;
          // Enrich distributor from live response if router state was absent
          if (!distributor && res.data.distributor) {
            setDistributor(res.data.distributor);
          }
          setCurrentStep(1);
        }

        const done =
          (res.data.lines && res.data.lines.length > 0) ||
          (res.data.status &&
            res.data.status !== 'draft' &&
            res.data.status !== 'processing');

        if (done) {
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
          if (stuckTimerRef.current) {
            clearTimeout(stuckTimerRef.current);
            stuckTimerRef.current = null;
          }
          localStorage.removeItem(MENU_DRAFT_KEY);
          setCurrentStep(2);
          setTimeout(() => {
            navigate(`/chef/pull/receipt/${id}`, {
              state: { distributor: res.data!.distributor ?? distributor },
            });
          }, FINAL_STEP_DISPLAY_MS);
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
  }, [id, navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  const distributorName = distributor?.name ?? null;
  const repEmail = distributor?.rep?.email;
  const repName = distributor?.rep?.name;

  const steps = buildSteps(distributorName);

  function stepState(index: number): StepState {
    if (index < currentStep) return 'done';
    if (index === currentStep) return 'active';
    return 'pending';
  }

  if (isStuck) {
    return (
      <>
        <PullDistributorAnchor distributor={distributor} />
        <StuckRecoveryScreen quoteId={id} repEmail={repEmail} repName={repName} />
      </>
    );
  }

  const affiliated = distributor?.affiliated ?? false;

  return (
    <div className="min-h-screen bg-[#FBFAF7] flex flex-col">
      {/* Anchor strip */}
      <PullDistributorAnchor distributor={distributor} />

      {/* Step content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
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
              {affiliated
                ? 'This usually takes about 30-60 seconds.'
                : 'This usually takes about 30-60 seconds.'}
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
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
