// THE LAUNCH CHECKLIST on the QM admin restaurant page.
//
// Moose, 2026-10-15: "set an SOP checklist for every restaurant in the QM
// admin page. I want to make sure they get everything that's needed for
// their success." And: "a documents section in the restaurant page:
// checkboxes for each resource, that triggers the creation, send, cc me, and
// confirmation in the admin."
//
// Eight steps in his order, from the backend (Pairme::OnboardingChecklist).
// Steps 1 to 4 are documents: Download, and Send to the restaurant admin
// with the signed-in QM admin copied, after a confirmation. Steps 5 to 8 are
// ticked by hand with an optional note. Any step can be ticked or unticked
// by hand.
//
// Reads and writes GET/PATCH/POST /api/v1/admin/restaurants/:id/onboarding
// (QM admin only). Nothing here computes done or percent; it shows what the
// server stored.
import { useEffect, useState } from 'react';
import {
  getRestaurantOnboarding,
  setRestaurantOnboardingStep,
  sendRestaurantOnboardingDocument,
  downloadRestaurantOnboardingDocument,
  type OnboardingChecklist,
  type OnboardingStep,
  type QrInsertLayout,
} from '../../services/adminApi';

function shortDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function LaunchChecklistSection({ restaurantId }: { restaurantId: string }) {
  const [data, setData] = useState<OnboardingChecklist | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, { text: string; error: boolean }>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [layout, setLayout] = useState<QrInsertLayout>('vertical');

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const res = await getRestaurantOnboarding(restaurantId);
        if (!live) return;
        if (res.data) setData(res.data);
        else setLoadError(res.error || 'Could not load the launch checklist.');
      } catch (e) {
        if (live) setLoadError(e instanceof Error ? e.message : 'Could not load the launch checklist.');
      }
    })();
    return () => {
      live = false;
    };
  }, [restaurantId]);

  const say = (key: string, text: string, error = false) => setMessages((m) => ({ ...m, [key]: { text, error } }));

  async function toggle(step: OnboardingStep) {
    setBusy(step.key);
    const res = await setRestaurantOnboardingStep(restaurantId, step.key, !step.done, notes[step.key]?.trim() || undefined);
    setBusy(null);
    if (res.data) {
      setData(res.data);
      say(step.key, '');
    } else {
      say(step.key, res.error || 'Could not save.', true);
    }
  }

  async function download(step: OnboardingStep) {
    setBusy(step.key);
    const res = await downloadRestaurantOnboardingDocument(restaurantId, step.key, step.key === 'qr_inserts' ? layout : undefined);
    setBusy(null);
    if (res.blob) {
      saveBlob(res.blob, res.filename || `${step.key}.pdf`);
      say(step.key, '');
    } else {
      say(step.key, res.error || 'Download failed.', true);
    }
  }

  async function send(step: OnboardingStep) {
    const to = data?.recipient.email;
    if (!to) return;
    const what = step.key === 'qr_inserts' ? `${step.label} (${layout})` : step.label;
    if (!window.confirm(`Email the ${what} to ${to}? You will be copied.`)) return;
    setBusy(step.key);
    say(step.key, 'Sending...');
    const res = await sendRestaurantOnboardingDocument(restaurantId, step.key, step.key === 'qr_inserts' ? layout : undefined);
    setBusy(null);
    if (res.data) {
      setData(res.data);
      say(step.key, '');
    } else {
      say(step.key, res.error || 'Could not send.', true);
    }
  }

  if (loadError) {
    return (
      <section className="mb-8" data-testid="launch-checklist">
        <h2 className="text-lg font-semibold text-[#2A2A2A] mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
          Launch checklist
        </h2>
        <p className="text-sm text-red-500">{loadError}</p>
      </section>
    );
  }
  if (!data) {
    return (
      <section className="mb-8" data-testid="launch-checklist">
        <h2 className="text-lg font-semibold text-[#2A2A2A] mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
          Launch checklist
        </h2>
        <p className="text-sm text-gray-400">Loading...</p>
      </section>
    );
  }

  const { recipient } = data;
  const sendBlocked = !data.paired
    ? 'Not paired yet. The documents can be downloaded and sent once the pairings are made.'
    : recipient.blocked;

  return (
    <section className="mb-8" data-testid="launch-checklist">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
        <h2 className="text-lg font-semibold text-[#2A2A2A]" style={{ fontFamily: "'Playfair Display', serif" }}>
          Launch checklist
        </h2>
        <span className="text-sm font-semibold text-[#2A2A2A]" data-testid="launch-percent">
          {data.percent}% done
        </span>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
        <div className="h-2 w-full rounded-full bg-gray-100 mb-4" aria-hidden="true">
          <div className="h-2 rounded-full bg-[#7FAEC2]" style={{ width: `${data.percent}%` }} />
        </div>
        {sendBlocked && (
          <p className="text-xs text-amber-700 mb-3" data-testid="launch-send-blocked">
            {sendBlocked}
          </p>
        )}
        <ol className="flex flex-col divide-y divide-gray-100">
          {data.steps.map((step) => {
            const msg = messages[step.key];
            const isBusy = busy === step.key;
            return (
              <li key={step.key} className="py-3 flex flex-col gap-2" data-testid={`launch-step-${step.key}`}>
                <div className="flex flex-wrap items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-[#2A2A2A]"
                    checked={step.done}
                    disabled={isBusy}
                    onChange={() => toggle(step)}
                    aria-label={`${step.position}. ${step.label}`}
                  />
                  <div className="flex-1 min-w-[12rem]">
                    <p className="text-sm font-medium text-[#2A2A2A]">
                      {step.position}. {step.label}
                    </p>
                    {step.done && (
                      <p className="text-xs text-gray-500" data-testid={`launch-done-${step.key}`}>
                        {step.sent_to
                          ? `Sent ${shortDate(step.done_at)} to ${step.sent_to}${step.cc ? `, cc ${step.cc}` : ''}${step.layout ? ` (${step.layout})` : ''}${step.done_by ? ` by ${step.done_by}` : ''}`
                          : `Done ${shortDate(step.done_at)}${step.done_by ? ` by ${step.done_by}` : ''}`}
                      </p>
                    )}
                    {step.done && step.note && <p className="text-xs text-gray-500 italic">{step.note}</p>}
                  </div>
                  {step.document && (
                    <div className="flex flex-wrap items-center gap-2">
                      {step.key === 'qr_inserts' && (
                        <select
                          value={layout}
                          onChange={(e) => setLayout(e.target.value as QrInsertLayout)}
                          aria-label="QR insert layout"
                          className="text-xs border border-gray-200 rounded px-2 py-1.5 bg-white"
                        >
                          <option value="vertical">Vertical</option>
                          <option value="horizontal">Horizontal</option>
                        </select>
                      )}
                      <button
                        type="button"
                        disabled={isBusy || !data.paired}
                        onClick={() => download(step)}
                        className="px-3 py-1.5 rounded text-xs font-medium border border-gray-200 text-[#2A2A2A] hover:bg-gray-50 disabled:opacity-50"
                      >
                        Download
                      </button>
                      <button
                        type="button"
                        disabled={isBusy || Boolean(sendBlocked) || !recipient.email}
                        onClick={() => send(step)}
                        className="px-3 py-1.5 rounded text-xs font-medium bg-[#7FAEC2] hover:bg-[#6a9aae] text-white disabled:opacity-50 break-all text-left"
                      >
                        {recipient.email ? `Send to ${recipient.email}` : 'Send'}
                      </button>
                    </div>
                  )}
                </div>
                {!step.document && !step.done && (
                  <input
                    type="text"
                    value={notes[step.key] ?? ''}
                    onChange={(e) => setNotes((n) => ({ ...n, [step.key]: e.target.value }))}
                    placeholder="Note (optional), saved when you tick the box"
                    aria-label={`Note for ${step.label}`}
                    className="ml-7 text-xs border border-gray-200 rounded px-2 py-1.5 max-w-md"
                  />
                )}
                {msg?.text && (
                  <p className={`ml-7 text-xs ${msg.error ? 'text-red-500' : 'text-gray-500'}`}>{msg.text}</p>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
