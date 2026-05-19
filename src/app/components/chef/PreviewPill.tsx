// PreviewPill — stamps on any quote a rep hasn't confirmed yet.
// Opus c11 lock (May 18): visible on every chef surface the quote appears on —
// current-quote tile, previous-quote rows, receipt page. Trust the design to
// not dominate; this is a quiet operational signal, not a banner.
//
// Source: designs/handoff/source/document.jsx → PreviewPill
// Two sizes: "sm" (default, fontSize 10) and "xs" (fontSize 9.5).

interface PreviewPillProps {
  size?: 'sm' | 'xs';
}

export function PreviewPill({ size = 'sm' }: PreviewPillProps) {
  const fontSize = size === 'xs' ? 9.5 : 10;
  return (
    <span
      className="qm-pill"
      style={{
        background: 'var(--qm-warm-paper)',
        color: 'var(--qm-gray-700)',
        border: '1px solid var(--qm-soft-line)',
        fontSize,
        padding: '2px 7px',
        letterSpacing: '.06em',
        textTransform: 'uppercase',
        fontWeight: 500,
      }}
    >
      Preview
    </span>
  );
}
