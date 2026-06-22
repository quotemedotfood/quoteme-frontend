// ChefRequestSentPage — /chef/distributor/:id/sent
//
// Confirmation landing after a chef submits "Request from a rep".
// The BE returns redirect_to: "/chef/distributor/:id/sent" on success.
// This page resolves the distributor name and rep name from the API,
// then renders the RequestCatalogAsked confirmation panel.
//
// Fallbacks:
//   - If the API call fails or is still loading: repFirst = "your rep",
//     distributorName = "your distributor"
//   - If no rep is attached yet: repFirst = "your rep"

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  getChefDistributorDetail,
  type ChefDistributorDetail,
} from '../../services/api';
import { RequestCatalogAsked } from '../../components/chef/RequestCatalogAsked';

// ─── Color constants (matches ChefDistributorDetailPage convention) ──────────
const C = {
  charcoal: '#2B2B2B',
  warmPaper: '#FBFAF7',
  softLine: '#E8E8E8',
  gray500: '#6B7280',
  orange: '#F2993D',
} as const;

const sans: React.CSSProperties = {
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

export function ChefRequestSentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [distributor, setDistributor] = useState<ChefDistributorDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    getChefDistributorDetail(id)
      .then((res) => {
        if (res.data) setDistributor(res.data);
      })
      .catch(() => {
        // Silently fall back to generic copy
      })
      .finally(() => setLoading(false));
  }, [id]);

  // Derive display names with fallbacks
  const distributorName = distributor?.name ?? 'your distributor';
  const repFirst = distributor?.rep?.name
    ? distributor.rep.name.split(' ')[0]
    : 'your rep';

  return (
    <div
      style={{
        ...sans,
        minHeight: '100%',
        background: C.warmPaper,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '40px 16px 80px',
      }}
    >
      {/* Page card */}
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          background: '#fff',
          border: `1px solid ${C.softLine}`,
          borderRadius: 12,
          padding: '28px 24px 24px',
        }}
      >
        {/* Heading */}
        <div
          style={{
            fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
            fontSize: 20,
            fontWeight: 600,
            color: C.charcoal,
            marginBottom: 4,
          }}
        >
          {loading ? 'Sending your request…' : 'Request sent!'}
        </div>

        {!loading && (
          <>
            {/* Confirmation panel */}
            <RequestCatalogAsked
              repFirst={repFirst}
              distributorName={distributorName}
              status="requested"
              desktop={true}
              askedLabel="Asked just now"
            />

            {/* Navigation buttons */}
            <div
              style={{
                marginTop: 20,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <button
                onClick={() => navigate('/chef/distributor/new')}
                style={{
                  ...sans,
                  width: '100%',
                  padding: '11px 0',
                  background: C.orange,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  letterSpacing: '0.01em',
                }}
              >
                Add another distributor
              </button>

              <button
                onClick={() => navigate('/dashboard')}
                style={{
                  ...sans,
                  width: '100%',
                  padding: '10px 0',
                  background: 'transparent',
                  color: C.gray500,
                  border: `1px solid ${C.softLine}`,
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Back to dashboard
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
