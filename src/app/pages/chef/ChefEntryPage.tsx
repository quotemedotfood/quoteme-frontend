import { useState, useRef } from 'react';
import { useNavigate } from 'react-router';
import { createGuestQuote } from '../../services/api';
import { useUser } from '../../contexts/UserContext';

// ─── Shared styles ─────────────────────────────────────────────────────────────

const pageWrap = 'min-h-screen bg-white flex flex-col items-center justify-center p-6';
const card = 'w-full max-w-lg';
const headlineStyle: React.CSSProperties = { fontFamily: "'Playfair Display', serif" };
const primaryBtn =
  'w-full bg-[#E5A84B] hover:bg-[#D49A3E] text-white rounded-lg px-6 py-3 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const labelStyle = 'text-sm font-medium text-[#4F4F4F]';
const errorText = 'text-sm text-red-500';

// ─── ChefEntryPage ─────────────────────────────────────────────────────────────

export function ChefEntryPage() {
  const navigate = useNavigate();
  const { initGuestSession } = useUser();

  const [restaurantName, setRestaurantName] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const hasContent = pasteText.trim().length > 0 || selectedFile !== null;
  const textareaDisabled = selectedFile !== null;
  const fileDisabled = pasteText.trim().length > 0;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    setError(null);
  }

  function handleClearFile() {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  }

  async function handleSubmit() {
    if (!hasContent) return;
    setSubmitting(true);
    setError(null);

    try {
      // Ensure guest session exists
      if (!localStorage.getItem('quoteme_guest_token')) {
        await initGuestSession();
      }

      let res;

      if (selectedFile) {
        // File path: send as FormData
        const formData = new FormData();
        formData.append('file', selectedFile);
        if (restaurantName.trim()) {
          formData.append('name', restaurantName.trim());
        }

        // createGuestQuote expects JSON body, so we call the raw endpoint directly
        const guestToken = localStorage.getItem('quoteme_guest_token');
        const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://web-production-9f6e9.up.railway.app';
        const response = await fetch(`${API_BASE}/api/v1/guest/quotes`, {
          method: 'POST',
          headers: {
            ...(guestToken ? { 'X-Guest-Token': guestToken } : {}),
          },
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const data = await response.json();
        navigate(`/chef/status/${data.quote_id}`);
        return;
      } else {
        // Text paste path
        res = await createGuestQuote({
          raw_text: pasteText.trim(),
          name: restaurantName.trim() || 'My Restaurant',
        });

        if (res.error) {
          setError(res.error);
          return;
        }

        navigate(`/chef/status/${res.data!.quote_id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={pageWrap}>
      <div className={card}>
        {/* Headline */}
        <div className="mb-8">
          <h1
            className="text-3xl font-bold text-[#2A2A2A] mb-3"
            style={headlineStyle}
          >
            What's on your menu?
          </h1>
          <p className="text-[#4F4F4F] text-base leading-relaxed">
            Paste your menu, upload a file, or snap a photo. We'll take it from here.
          </p>
        </div>

        <div className="flex flex-col gap-5">
          {/* Restaurant name (optional) */}
          <div className="flex flex-col gap-1">
            <label className={labelStyle}>
              Restaurant name{' '}
              <span className="text-[#9E9E9E] font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              placeholder="e.g. The Blue Apron"
              className="border border-[#E0E0E0] rounded-lg px-4 py-2.5 text-sm text-[#2A2A2A] placeholder-[#BDBDBD] focus:outline-none focus:ring-2 focus:ring-[#E5A84B]/40 focus:border-[#E5A84B]"
            />
          </div>

          {/* Menu paste */}
          <div className="flex flex-col gap-1">
            <label className={labelStyle}>Paste your menu</label>
            <textarea
              value={pasteText}
              onChange={(e) => {
                setPasteText(e.target.value);
                setError(null);
              }}
              disabled={textareaDisabled}
              placeholder="Paste your full menu here — dishes, ingredients, sections…"
              rows={8}
              className={`border border-[#E0E0E0] rounded-lg px-4 py-3 text-sm text-[#2A2A2A] placeholder-[#BDBDBD] focus:outline-none focus:ring-2 focus:ring-[#E5A84B]/40 focus:border-[#E5A84B] resize-none leading-relaxed ${
                textareaDisabled ? 'opacity-40 cursor-not-allowed bg-[#F9F9F9]' : 'bg-white'
              }`}
            />
          </div>

          {/* Upload + camera row */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-[#9E9E9E]">or</span>

            {/* File upload */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={fileDisabled}
              className={`flex items-center gap-2 border border-[#E0E0E0] rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                fileDisabled
                  ? 'opacity-40 cursor-not-allowed text-[#9E9E9E]'
                  : 'text-[#4F4F4F] hover:border-[#E5A84B] hover:text-[#E5A84B]'
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Upload file
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.csv,.txt,.xlsx,.xls,image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* Camera */}
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={fileDisabled}
              className={`flex items-center gap-2 border border-[#E0E0E0] rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                fileDisabled
                  ? 'opacity-40 cursor-not-allowed text-[#9E9E9E]'
                  : 'text-[#4F4F4F] hover:border-[#E5A84B] hover:text-[#E5A84B]'
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              Take photo
            </button>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Selected file chip */}
          {selectedFile && (
            <div className="flex items-center gap-2 bg-[#FDF6EC] border border-[#E5A84B]/30 rounded-lg px-4 py-2.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E5A84B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <span className="text-sm text-[#4F4F4F] flex-1 truncate">{selectedFile.name}</span>
              <button
                type="button"
                onClick={handleClearFile}
                className="text-[#9E9E9E] hover:text-[#4F4F4F] transition-colors"
                aria-label="Remove file"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          )}

          {/* Error */}
          {error && <p className={errorText}>{error}</p>}

          {/* Submit */}
          <button
            className={primaryBtn}
            onClick={handleSubmit}
            disabled={!hasContent || submitting}
          >
            {submitting ? 'Submitting…' : 'Build my quote'}
          </button>
        </div>
      </div>
    </div>
  );
}
