import { useState, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Input } from '../../components/ui/input';
import { signUp, createRestaurant, updateRestaurant } from '../../services/api';
import { useGooglePlaces, ParsedAddress } from '../../hooks/useGooglePlaces';

type Step = 1 | 2 | 3 | 4;

interface AccountForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

interface RestaurantForm {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  restaurant_status?: 'new';
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const pageWrap = 'min-h-screen bg-white flex flex-col items-center justify-center p-6';
const card = 'w-full max-w-md';
const headlineStyle: React.CSSProperties = { fontFamily: "'Playfair Display', serif" };
const primaryBtn =
  'w-full bg-[#E5A84B] hover:bg-[#D49A3E] text-white rounded-lg px-6 py-3 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const secondaryBtn =
  'w-full border border-[#E5A84B] text-[#E5A84B] rounded-lg px-6 py-3 font-medium hover:bg-[#FDF6EC] transition-colors';
const inputWrap = 'flex flex-col gap-1';
const labelStyle = 'text-sm font-medium text-[#4F4F4F]';
const errorText = 'text-xs text-red-500 mt-0.5';

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepDots({ step }: { step: Step }) {
  return (
    <div className="flex gap-2 justify-center mb-6">
      {([1, 2, 3, 4] as Step[]).map((s) => (
        <div
          key={s}
          className={`w-2 h-2 rounded-full transition-colors ${s === step ? 'bg-[#E5A84B]' : 'bg-[#E0E0E0]'}`}
        />
      ))}
    </div>
  );
}

// ─── Screen 1: Welcome ────────────────────────────────────────────────────────

function WelcomeScreen({ onNext }: { onNext: () => void }) {
  return (
    <div className={pageWrap}>
      <div className={card}>
        <StepDots step={1} />
        <div className="text-center mb-10">
          <div className="mb-4 flex items-center justify-center">
            <span className="text-4xl">🍽️</span>
          </div>
          <h1
            className="text-3xl font-bold text-[#2A2A2A] mb-0"
            style={headlineStyle}
          >
            Turn your menu into a distributor-ready quote
          </h1>
        </div>
        <button className={primaryBtn} onClick={onNext}>
          Get Started
        </button>
        <p className="text-center text-sm text-[#4F4F4F] mt-4">
          Already have an account?{' '}
          <a href="/auth" className="text-[#7FAEC2] underline">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}

// ─── Screen 2: Account ───────────────────────────────────────────────────────

function AccountScreen({
  onNext,
  onBack,
  onToken,
}: {
  onNext: () => void;
  onBack: () => void;
  onToken: (token: string) => void;
}) {
  const [form, setForm] = useState<AccountForm>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Partial<AccountForm & { submit: string }>>({});
  const [submitting, setSubmitting] = useState(false);

  const set = (k: keyof AccountForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = (): boolean => {
    const errs: Partial<AccountForm & { submit: string }> = {};
    if (!form.firstName.trim()) errs.firstName = 'Required';
    if (!form.lastName.trim()) errs.lastName = 'Required';
    if (!form.email.trim()) errs.email = 'Required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Enter a valid email';
    if (!form.password) errs.password = 'Required';
    else if (form.password.length < 8) errs.password = 'Must be at least 8 characters';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    const res = await signUp({
      first_name: form.firstName,
      last_name: form.lastName,
      email: form.email,
      password: form.password,
      role: 'buyer',
    });

    if (res.error) {
      setErrors({ submit: res.error });
      setSubmitting(false);
      return;
    }

    if (res.token) {
      localStorage.setItem('quoteme_token', res.token);
      onToken(res.token);
    }
    setSubmitting(false);
    onNext();
  };

  return (
    <div className={pageWrap}>
      <div className={card}>
        <StepDots step={2} />
        <h1
          className="text-2xl font-bold text-[#2A2A2A] mb-1"
          style={headlineStyle}
        >
          Create your account
        </h1>
        <p className="text-[#4F4F4F] text-sm mb-6">Free to get started.</p>

        <div className="flex flex-col gap-4">
          <div className="flex gap-3">
            <div className={`${inputWrap} flex-1`}>
              <label className={labelStyle}>First Name</label>
              <Input
                value={form.firstName}
                onChange={set('firstName')}
                placeholder="Jane"
                aria-invalid={!!errors.firstName}
              />
              {errors.firstName && <p className={errorText}>{errors.firstName}</p>}
            </div>
            <div className={`${inputWrap} flex-1`}>
              <label className={labelStyle}>Last Name</label>
              <Input
                value={form.lastName}
                onChange={set('lastName')}
                placeholder="Smith"
                aria-invalid={!!errors.lastName}
              />
              {errors.lastName && <p className={errorText}>{errors.lastName}</p>}
            </div>
          </div>

          <div className={inputWrap}>
            <label className={labelStyle}>Email</label>
            <Input
              type="email"
              value={form.email}
              onChange={set('email')}
              placeholder="jane@restaurant.com"
              aria-invalid={!!errors.email}
            />
            {errors.email && <p className={errorText}>{errors.email}</p>}
          </div>

          <div className={inputWrap}>
            <label className={labelStyle}>Password</label>
            <Input
              type="password"
              value={form.password}
              onChange={set('password')}
              placeholder="Min. 8 characters"
              aria-invalid={!!errors.password}
            />
            {errors.password && <p className={errorText}>{errors.password}</p>}
          </div>

          {errors.submit && (
            <p className="text-sm text-red-500 text-center">{errors.submit}</p>
          )}

          <button className={primaryBtn} onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Creating account…' : 'Continue'}
          </button>

          <button className={secondaryBtn} onClick={onBack}>
            Back
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Screen 3: Restaurant ─────────────────────────────────────────────────────

function RestaurantScreen({
  onNext,
  onBack,
  onRestaurantCreated,
}: {
  onNext: () => void;
  onBack: () => void;
  onRestaurantCreated: (id: string) => void;
}) {
  const addressRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<RestaurantForm>({
    name: '',
    address: '',
    city: '',
    state: '',
    zip: '',
  });
  const [manualMode, setManualMode] = useState(false);
  const [placeChosen, setPlaceChosen] = useState(false);
  const [errors, setErrors] = useState<Partial<RestaurantForm & { submit: string }>>({});
  const [submitting, setSubmitting] = useState(false);

  useGooglePlaces(
    addressRef,
    (addr: ParsedAddress) => {
      setForm((f) => ({
        ...f,
        address: addr.addressLine1,
        city: addr.city,
        state: addr.state,
        zip: addr.zip,
      }));
      setPlaceChosen(true);
    },
    { types: ['establishment', 'geocode'] },
  );

  const set = (k: keyof RestaurantForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (k === 'address') setPlaceChosen(false);
  };

  const validate = (): boolean => {
    const errs: Partial<RestaurantForm & { submit: string }> = {};
    if (!form.name.trim()) errs.name = 'Required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    const payload: Parameters<typeof createRestaurant>[0] = {
      name: form.name,
      address_line_1: form.address || undefined,
      city: form.city || undefined,
      state: form.state || undefined,
      zip: form.zip || undefined,
    };

    const res = await createRestaurant(payload);
    if (res.error) {
      setErrors({ submit: res.error });
      setSubmitting(false);
      return;
    }
    if (res.data?.id) {
      onRestaurantCreated(res.data.id);
    }
    setSubmitting(false);
    onNext();
  };

  return (
    <div className={pageWrap}>
      <div className={card}>
        <StepDots step={3} />
        <h1
          className="text-2xl font-bold text-[#2A2A2A] mb-1"
          style={headlineStyle}
        >
          What's your restaurant?
        </h1>
        <p className="text-[#4F4F4F] text-sm mb-6">
          Search by name or enter manually.
        </p>

        <div className="flex flex-col gap-4">
          <div className={inputWrap}>
            <label className={labelStyle}>Restaurant Name</label>
            <Input
              value={form.name}
              onChange={set('name')}
              placeholder="e.g. The Blue Apron"
              aria-invalid={!!errors.name}
            />
            {errors.name && <p className={errorText}>{errors.name}</p>}
          </div>

          <div className={inputWrap}>
            <label className={labelStyle}>Address</label>
            <Input
              ref={addressRef}
              value={form.address}
              onChange={set('address')}
              placeholder="Search address…"
            />
          </div>

          {(placeChosen || manualMode) && (
            <>
              <div className="flex gap-3">
                <div className={`${inputWrap} flex-1`}>
                  <label className={labelStyle}>City</label>
                  <Input value={form.city} onChange={set('city')} placeholder="City" />
                </div>
                <div className={`${inputWrap} w-20`}>
                  <label className={labelStyle}>State</label>
                  <Input value={form.state} onChange={set('state')} placeholder="CA" maxLength={2} />
                </div>
                <div className={`${inputWrap} w-24`}>
                  <label className={labelStyle}>Zip</label>
                  <Input value={form.zip} onChange={set('zip')} placeholder="00000" maxLength={10} />
                </div>
              </div>
            </>
          )}

          {!manualMode && !placeChosen && (
            <button
              type="button"
              className="text-sm text-[#7FAEC2] underline text-left"
              onClick={() => setManualMode(true)}
            >
              Enter manually
            </button>
          )}

          {errors.submit && (
            <p className="text-sm text-red-500 text-center">{errors.submit}</p>
          )}

          <button className={primaryBtn} onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Saving…' : 'Continue'}
          </button>

          <button className={secondaryBtn} onClick={onBack}>
            Back
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Screen 4: Proposals ──────────────────────────────────────────────────────

function ProposalsScreen({
  onBack,
  restaurantId,
}: {
  onBack: () => void;
  restaurantId: string | null;
}) {
  const navigate = useNavigate();
  const [acceptsProposals, setAcceptsProposals] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFinish = async () => {
    setSubmitting(true);
    if (restaurantId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await updateRestaurant(restaurantId, { accepts_proposals: acceptsProposals } as any);
      if (res.error) {
        setError(res.error);
        setSubmitting(false);
        return;
      }
    }
    navigate('/chef/menu-upload');
  };

  return (
    <div className={pageWrap}>
      <div className={card}>
        <StepDots step={4} />
        <h1
          className="text-2xl font-bold text-[#2A2A2A] mb-3"
          style={headlineStyle}
        >
          Distributor proposals
        </h1>
        <p className="text-[#4F4F4F] text-sm mb-8">
          Allow distributors to send you relevant proposals based on your menus?
        </p>

        <div className="flex flex-col gap-3 mb-8">
          {/* Allow */}
          <button
            type="button"
            onClick={() => setAcceptsProposals(true)}
            className={`w-full flex items-center gap-3 p-4 rounded-lg border-2 transition-colors text-left ${
              acceptsProposals
                ? 'border-[#E5A84B] bg-[#FDF6EC]'
                : 'border-[#E0E0E0] hover:border-[#E5A84B]/40'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                acceptsProposals ? 'border-[#E5A84B]' : 'border-[#C0C0C0]'
              }`}
            >
              {acceptsProposals && (
                <span className="w-2.5 h-2.5 rounded-full bg-[#E5A84B]" />
              )}
            </span>
            <div>
              <p className="font-medium text-[#2A2A2A]">Allow proposals</p>
              <p className="text-sm text-[#4F4F4F]">
                Relevant distributors may reach out with pricing tailored to your menu.
              </p>
            </div>
          </button>

          {/* Do not allow */}
          <button
            type="button"
            onClick={() => setAcceptsProposals(false)}
            className={`w-full flex items-center gap-3 p-4 rounded-lg border-2 transition-colors text-left ${
              !acceptsProposals
                ? 'border-[#E5A84B] bg-[#FDF6EC]'
                : 'border-[#E0E0E0] hover:border-[#E5A84B]/40'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                !acceptsProposals ? 'border-[#E5A84B]' : 'border-[#C0C0C0]'
              }`}
            >
              {!acceptsProposals && (
                <span className="w-2.5 h-2.5 rounded-full bg-[#E5A84B]" />
              )}
            </span>
            <div>
              <p className="font-medium text-[#2A2A2A]">Do not allow</p>
              <p className="text-sm text-[#4F4F4F]">
                Keep your account private. No unsolicited outreach.
              </p>
            </div>
          </button>
        </div>

        {error && <p className="text-sm text-red-500 text-center mb-4">{error}</p>}

        <button className={primaryBtn} onClick={handleFinish} disabled={submitting}>
          {submitting ? 'Saving…' : 'Finish setup'}
        </button>

        <button className={secondaryBtn + ' mt-3'} onClick={onBack}>
          Back
        </button>
      </div>
    </div>
  );
}

// ─── Root component ───────────────────────────────────────────────────────────

export function ChefSignupPage() {
  const [step, setStep] = useState<Step>(1);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  const next = () => setStep((s) => (s < 4 ? ((s + 1) as Step) : s));
  const back = () => setStep((s) => (s > 1 ? ((s - 1) as Step) : s));

  return (
    <>
      {step === 1 && <WelcomeScreen onNext={next} />}
      {step === 2 && (
        <AccountScreen onNext={next} onBack={back} onToken={() => {}} />
      )}
      {step === 3 && (
        <RestaurantScreen
          onNext={next}
          onBack={back}
          onRestaurantCreated={(id) => setRestaurantId(id)}
        />
      )}
      {step === 4 && (
        <ProposalsScreen onBack={back} restaurantId={restaurantId} />
      )}
    </>
  );
}
