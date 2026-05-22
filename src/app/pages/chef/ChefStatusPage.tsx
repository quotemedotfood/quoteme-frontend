import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import { getGuestQuote } from '../../services/api';

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

export function ChefStatusPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // c143 — step indices: 0=Reading, 1=Matching, 2=Building
  // currentStep tracks which step is currently active (0-based).
  // Once the first poll responds, step 0 flips to done and step 1 goes active.
  // Once lines appear, step 1 flips done and step 2 goes active briefly before navigate.
  const [currentStep, setCurrentStep] = useState(0);
  const [distributorName, setDistributorName] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Small delay so step 2→3 completes visually before navigating
  const FINAL_STEP_DISPLAY_MS = 600;

  // Poll quote every 4 seconds.
  useEffect(() => {
    if (!id) return;

    let firstPollDone = false;

    async function checkStatus() {
      if (!id) return;
      const res = await getGuestQuote(id);

      if (res.data) {
        // Step 1 done after the first successful poll response.
        if (!firstPollDone) {
          firstPollDone = true;
          // c143: QuoteResponse does not currently include a distributor field.
          // If BE adds it in the future, surface it here. For now, distributorName
          // stays null and the fallback sublabel "Aligning to your distributor catalog"
          // is shown. OPEN QUESTION for orchestrator: add distributor to QuoteResponse.
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
          // Briefly show step 3 active before navigating
          setCurrentStep(2);
          setTimeout(() => {
            navigate(`/chef/quotes/${id}`);
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
  }, [id, navigate]);

  const steps = buildSteps(distributorName);

  function stepState(index: number): StepState {
    if (index < currentStep) return 'done';
    if (index === currentStep) return 'active';
    return 'pending';
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
