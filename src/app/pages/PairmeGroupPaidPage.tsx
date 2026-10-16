// Where a restaurant group's payer lands after Stripe Checkout (Moose,
// 2026-10-15: "'Let's get pairing' pop up then wherever, I don't care, the
// settings page?"). PUBLIC: the person who pays a group link (Seth) has no
// QuoteMe sign-in, so this page needs none. The backend sends Stripe here:
// success_url /pairme/paid, cancel_url /pairme/paid?canceled=1
// (Pairme::GroupBilling::PAID_PATH). Branded PairMe, not QuoteMe.
import { Link, useSearchParams } from 'react-router';

const INK = '#2A2A2A';
const WINE = '#6B2737';
const CREAM = '#FBF7F2';

export function PairmeGroupPaidPage() {
  const [params] = useSearchParams();
  const canceled = params.get('canceled') === '1';

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{ background: CREAM, color: INK }}
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-[#EDE4DA] px-6 py-8 text-center">
        <p
          className="text-sm tracking-[0.2em] uppercase mb-6"
          style={{ color: WINE, fontFamily: "'Playfair Display', serif" }}
          aria-label="PairMe"
        >
          PairMe
        </p>
        {canceled ? (
          <>
            <h1 className="text-2xl font-semibold mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
              No payment was made
            </h1>
            <p className="text-sm text-gray-600">
              You left checkout before paying, so nothing was charged. Use the same link whenever you are ready.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-semibold mb-3" style={{ fontFamily: "'Playfair Display', serif", color: WINE }}>
              Let's get pairing
            </h1>
            <p className="text-sm text-gray-600 mb-6">
              Thank you. One payment covers every restaurant in your group.
            </p>
            <Link
              to="/auth"
              className="inline-block rounded-full px-5 py-2.5 text-sm font-medium text-white"
              style={{ background: WINE }}
            >
              Sign in to your restaurant
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
