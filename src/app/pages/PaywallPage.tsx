import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Button } from '../components/ui/button';
import { Check, ArrowLeft } from 'lucide-react';
import { createCheckoutSession } from '../services/api';

export function PaywallPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  const success = new URLSearchParams(window.location.search).get('success');

  const handleStartSolo = async () => {
    setLoading(true);
    const res = await createCheckoutSession('solo_rep');
    setLoading(false);
    if (res.data?.checkout_url) {
      window.location.href = res.data.checkout_url;
    } else {
      alert(res.error || 'Failed to create checkout session');
    }
  };

  if (success === 'true') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-[#2A2A2A] mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
            You're all set!
          </h1>
          <p className="text-[#4F4F4F] mb-6">Your subscription is active. You now have unlimited quotes.</p>
          <Button onClick={() => navigate('/')} className="bg-[#7FAEC2] hover:bg-[#6b9ab0] text-white">
            Start New Quote
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-3xl w-full">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-[#4F4F4F] hover:text-[#2A2A2A] mb-8 transition-colors">
          <ArrowLeft size={16} />
          Back
        </button>

        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-[#2A2A2A] mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
            You've used your 5 free quotes
          </h1>
          <p className="text-lg text-[#4F4F4F]">To keep building quotes, choose a plan that works for you.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Solo Rep */}
          <div className="bg-white rounded-xl border-2 border-[#7FAEC2] p-6 flex flex-col">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-[#2A2A2A] mb-1">Solo Rep</h2>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-[#2A2A2A]">$50</span>
                <span className="text-[#4F4F4F]">/month</span>
              </div>
              <p className="text-sm text-[#4F4F4F] mt-2">For individual reps managing their own accounts</p>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {['Unlimited quotes', 'Full catalog management', 'Email & SMS delivery', 'PDF export & download', 'Ingredient matching engine'].map(feature => (
                <li key={feature} className="flex items-start gap-2.5">
                  <Check size={16} className="text-[#7FAEC2] mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-[#2A2A2A]">{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              onClick={handleStartSolo}
              disabled={loading}
              className="w-full bg-[#7FAEC2] hover:bg-[#6b9ab0] text-white"
              size="lg"
            >
              {loading ? 'Loading...' : 'Start Solo Plan'}
            </Button>
          </div>

          {/* Distributor Seat */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-[#2A2A2A] mb-1">Distributor Seat</h2>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-[#2A2A2A]">$100</span>
                <span className="text-[#4F4F4F]">/seat/month</span>
              </div>
              <p className="text-sm text-[#4F4F4F] mt-2">For distributors managing a team of reps</p>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {[
                'Everything in Solo, plus:',
                'Rep management & assignment',
                'Quote inbox & triage',
                'Group pricing controls',
                'Onboarding document management',
              ].map((feature, i) => (
                <li key={feature} className="flex items-start gap-2.5">
                  <Check size={16} className={`mt-0.5 flex-shrink-0 ${i === 0 ? 'text-[#7FAEC2]' : 'text-gray-400'}`} />
                  <span className={`text-sm ${i === 0 ? 'text-[#7FAEC2] font-medium' : 'text-[#2A2A2A]'}`}>{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              variant="outline"
              className="w-full border-[#7FAEC2] text-[#7FAEC2] hover:bg-[#7FAEC2]/5"
              size="lg"
              onClick={() => window.location.href = 'mailto:justinl@quoteme.food?subject=QuoteMe%20Distributor%20Seat%20Inquiry'}
            >
              Contact Sales
            </Button>
          </div>
        </div>

        <p className="text-center text-xs text-[#4F4F4F] mt-8">
          Questions? Email us at justinl@quoteme.food
        </p>
      </div>
    </div>
  );
}
