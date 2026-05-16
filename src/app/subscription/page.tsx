'use client';

import { useState, Fragment, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

// --- Interfaces & Data ---------------------------------------------------------
interface Tier {
  name: string;
  price: number;
  annualPrice: number;
  description: string;
  features: { text: string; highlight?: boolean; tooltip?: string }[];
  popular?: boolean;
  savings?: string;
}

const tiers: Tier[] = [
  {
    name: 'basic',
    price: 29.99,
    annualPrice: 287.90, // ~20% off (29.99 * 12 * 0.8)
    description: 'Essential accounting for small businesses',
    features: [
      { text: 'Up to 5 users' },
      { text: 'Income & expense tracking' },
      { text: 'Invoice & waybill generation' },
      { text: 'Basic financial reports' },
      { text: 'Email support', tooltip: '24hr response time' },
    ],
  },
  {
    name: 'premium',
    price: 49.99,
    annualPrice: 479.90,
    description: 'Full-suite accounting for growing companies',
    features: [
      { text: 'Unlimited users', highlight: true },
      { text: 'General ledger & GL reports', highlight: true },
      { text: 'BOM, Production & VAT modules', highlight: true },
      { text: 'Cash flow & balance sheet' },
      { text: 'Multi-currency (₦ & more)' },
      { text: 'Priority support & onboarding', tooltip: 'Dedicated support within 4hrs' },
    ],
    popular: true,
    savings: 'Save $119.88 annually',
  },
  {
    name: 'standard',
    price: 89.99,
    annualPrice: 863.90,
    description: 'Enterprise-level features for large organizations',
    features: [
      { text: 'All features from Premium' },
      { text: 'Dedicated Account Manager', highlight: true, tooltip: 'Personal account executive' },
      { text: 'Advanced API Access', highlight: true },
      { text: 'Custom Integrations Support' },
      { text: '24/7 Priority Phone Support' },
    ],
    savings: 'Save $215.98 annually',
  },
];

// --- Icons ---------------------------------------------------------------------
const CheckIcon = ({ bold }: { bold?: boolean }) => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="flex-shrink-0">
    <path
      d="M2 6l3 3 5-5"
      stroke={bold ? '#239149' : '#2db85a'}
      strokeWidth={bold ? '2' : '1.8'}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const SpinnerIcon = ({ color = '#2db85a', size = 18 }: { color?: string; size?: number }) => (
  <svg
    className="animate-spin"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
  >
    <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="3" strokeOpacity="0.2" />
    <path d="M12 2a10 10 0 0 1 10 10" stroke={color} strokeWidth="3" strokeLinecap="round" />
  </svg>
);

const ShieldIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7f72" strokeWidth="1.8">
    <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V7l-9-5z" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const InfoIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6b7f72" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4M12 8h.01" strokeLinecap="round" />
  </svg>
);

const ClearBooksLogo = () => (
  <div className="flex items-center gap-2.5 group">
    <div className="flex items-center justify-center rounded-xl flex-shrink-0 transition-all duration-300 group-hover:scale-105" style={{ width: 40, height: 40, background: '#2db85a' }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="4" width="10" height="13" rx="1.5" stroke="white" strokeWidth="1.6" />
        <path d="M6 8h4M6 11h4M6 14h2" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M15 10l3 3-3 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M18 13H11" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
    <div>
      <div className="text-base font-bold leading-tight tracking-tight" style={{ color: '#1a2d1e' }}>ClearBooks</div>
      <div className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: '#239149' }}>Accounting Pro</div>
    </div>
  </div>
);

// --- Components ---------------------------------------------------------------

const BillingToggle = ({ isAnnual, onChange }: { isAnnual: boolean; onChange: (value: boolean) => void }) => (
  <div className="flex items-center gap-3 bg-white/50 backdrop-blur-sm rounded-full p-1 border border-[#dde8e0] shadow-sm">
    <button
      onClick={() => onChange(false)}
      className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 ${
        !isAnnual
          ? 'bg-[#2db85a] text-white shadow-md'
          : 'text-[#6b7f72] hover:text-[#1a2d1e]'
      }`}
    >
      Monthly
    </button>
    <button
      onClick={() => onChange(true)}
      className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
        isAnnual
          ? 'bg-[#2db85a] text-white shadow-md'
          : 'text-[#6b7f72] hover:text-[#1a2d1e]'
      }`}
    >
      Annual
      <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full">Save 20%</span>
    </button>
  </div>
);

const FeatureTooltip = ({ text, children }: { text: string; children: React.ReactNode }) => {
  const [show, setShow] = useState(false);
  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap z-10 pointer-events-none">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
};

const TierCard = ({
  tier,
  onSubscribe,
  isProcessing,
  isAnnual,
}: {
  tier: Tier;
  onSubscribe: (tierName: string, period: 'monthly' | 'annual') => void;
  isProcessing: boolean;
  isAnnual: boolean;
}) => {
  const isPopular = tier.popular;
  const displayPrice = isAnnual ? tier.annualPrice : tier.price;
  const periodText = isAnnual ? 'billed annually' : '/month';

  return (
    <div
      className={`relative flex flex-col rounded-2xl overflow-hidden w-full max-w-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl group ${
        isPopular ? 'ring-2 ring-[#2db85a] shadow-lg' : 'ring-1 ring-[#dde8e0] shadow-sm'
      }`}
      style={{ background: 'white' }}
    >
      {/* Animated gradient border on hover */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" 
           style={{ background: 'radial-gradient(circle at top right, rgba(45,184,90,0.15), transparent 70%)' }} />

      {isPopular && (
        <div className="relative">
          <div className="text-[10px] font-bold tracking-widest uppercase text-center py-1.5 text-white flex items-center justify-center gap-1.5" style={{ background: '#2db85a' }}>
             Most Popular
          </div>
        </div>
      )}

      <div className="flex flex-col flex-1 p-8">
        {/* Tier badge */}
        <div className="mb-5">
          <span className="text-[10px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-full" style={{ background: '#eaf5ee', color: '#239149' }}>
            {tier.name}
          </span>
        </div>

        {/* Price */}
        <div className="mb-2">
          <div className="flex items-baseline gap-1">
            <span className="text-[52px] font-extrabold leading-none tracking-tight" style={{ color: '#2db85a' }}>
              ${displayPrice.toFixed(2)}
            </span>
            <span className="text-sm font-medium pb-1.5" style={{ color: '#6b7f72' }}>{periodText}</span>
          </div>
          {isAnnual && tier.savings && (
            <div className="text-xs font-semibold mt-1" style={{ color: '#239149' }}>✨ {tier.savings}</div>
          )}
        </div>

        <p className="text-sm mb-6 leading-relaxed" style={{ color: '#6b7f72' }}>{tier.description}</p>

        <div className="h-px w-full mb-6" style={{ background: '#dde8e0' }} />

        {/* Features list */}
        <ul className="flex flex-col gap-3 mb-8 flex-1">
          {tier.features.map((f, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span
                className="flex-shrink-0 mt-0.5 flex items-center justify-center rounded-full transition-all duration-200"
                style={{
                  width: 18,
                  height: 18,
                  background: f.highlight ? '#2db85a22' : '#eaf5ee',
                }}
              >
                <CheckIcon bold={f.highlight} />
              </span>
              <span className="text-sm leading-relaxed" style={f.highlight ? { color: '#1a2d1e', fontWeight: 600 } : { color: '#6b7f72' }}>
                {f.text}
              </span>
              {f.tooltip && (
                <FeatureTooltip text={f.tooltip}>
                  <span className="cursor-help opacity-50 hover:opacity-100 transition-opacity">
                    <InfoIcon />
                  </span>
                </FeatureTooltip>
              )}
            </li>
          ))}
        </ul>

        {/* CTA Button */}
        <button
          onClick={() => onSubscribe(tier.name, isAnnual ? 'annual' : 'monthly')}
          disabled={isProcessing}
          aria-label={`Subscribe to ${tier.name} plan for $${displayPrice} ${isAnnual ? 'per year' : 'per month'}`}
          className={`w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed relative overflow-hidden group/btn ${
            isPopular
              ? 'bg-[#2db85a] text-white shadow-md hover:shadow-lg hover:bg-[#239149]'
              : 'bg-[#f0f7f2] text-[#239149] border border-[#b8dfc5] hover:bg-[#e5f3e9]'
          }`}
        >
          {isProcessing ? (
            <>
              <SpinnerIcon color={isPopular ? 'white' : '#239149'} size={18} />
              Processing...
            </>
          ) : (
            <>
              Choose {tier.name.charAt(0).toUpperCase() + tier.name.slice(1)}
              <span className="absolute right-3 opacity-0 group-hover/btn:opacity-100 transition-all duration-200 transform translate-x-2 group-hover/btn:translate-x-0">
                →
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

const GatewaySelectionModal = ({
  isOpen,
  onClose,
  onSelect,
  isProcessing,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (gateway: string) => void;
  isProcessing: boolean;
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [selectedGateway, setSelectedGateway] = useState<string | null>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const gateways = [
    { id: 'paystack', name: 'Paystack', logo: '/paystack-logo.svg', color: '#00B3F0', bgColor: '#E8F5FE' },
    { id: 'stripe', name: 'Stripe', logo: '/stripe-logo.svg', color: '#635BFF', bgColor: '#F0EFFE' },
    { id: 'paypal', name: 'PayPal', logo: '/paypal-logo.svg', color: '#003087', bgColor: '#E8EEF7' },
  ];

  const handleSelect = (gatewayId: string) => {
    setSelectedGateway(gatewayId);
    onSelect(gatewayId);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-2xl max-w-md w-full shadow-2xl transform transition-all duration-300 animate-slideUp"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        <div className="p-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold mb-2" style={{ color: '#1a2d1e' }}>Select Payment Method</h2>
            <p className="text-sm" style={{ color: '#6b7f72' }}>Choose your preferred secure payment gateway</p>
          </div>

          <div className="flex flex-col gap-3">
            {gateways.map((gw) => (
              <button
                key={gw.id}
                onClick={() => handleSelect(gw.id)}
                disabled={isProcessing}
                className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-200 border-2 ${
                  selectedGateway === gw.id && isProcessing
                    ? 'border-[#2db85a] bg-[#f0f7f2]'
                    : 'border-[#e2e8f0] hover:border-[#2db85a] hover:bg-gray-50'
                } disabled:opacity-50 disabled:cursor-wait group`}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 group-hover:scale-105"
                  style={{ background: gw.bgColor }}
                >
                  <div className="relative w-8 h-8">
                    {/* Fallback text for logos if images not available */}
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-bold" style={{ color: gw.color }}>
                      {gw.name.charAt(0)}
                    </div>
                  </div>
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold text-base" style={{ color: '#1a2d1e' }}>{gw.name}</div>
                  <div className="text-xs" style={{ color: '#6b7f72' }}>Secure & instant payment</div>
                </div>
                {selectedGateway === gw.id && isProcessing && <SpinnerIcon color={gw.color} size={20} />}
                {!isProcessing && (
                  <svg className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="#2db85a" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-[#dde8e0] flex justify-between items-center">
            <button
              onClick={onClose}
              className="text-sm px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              style={{ color: '#6b7f72' }}
            >
              Cancel
            </button>
            <div className="flex items-center gap-1 text-xs" style={{ color: '#6b7f72' }}>
              <ShieldIcon />
              <span>PCI compliant</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const FAQItem = ({ question, answer }: { question: string; answer: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-[#dde8e0] py-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center text-left font-semibold hover:text-[#239149] transition-colors"
        style={{ color: '#1a2d1e' }}
      >
        <span>{question}</span>
        <svg className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="mt-2 text-sm" style={{ color: '#6b7f72' }}>
          {answer}
        </div>
      )}
    </div>
  );
};

// --- Main Page Component -------------------------------------------------------

const SubscriptionPage = () => {
  const { user, subscriptionStatus } = useAuth();
  const router = useRouter();

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [isAnnualBilling, setIsAnnualBilling] = useState(false);

  const apiUrl = `https://hariindustries.net/api/clearbook/subscription.php`;

  const handleTierSelection = (tier: string, period: 'monthly' | 'annual') => {
    setSelectedTier(tier);
    setSelectedPeriod(period);
    setIsModalOpen(true);
  };

  const handleGatewaySelect = async (gateway: string) => {
    if (!user?.company_id || !user?.email || !selectedTier) {
      setErrorMessage('User information or selected plan is missing. Please refresh and try again.');
      setIsModalOpen(false);
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'initialize',
          email: user.email,
          company_id: user.company_id,
          tier: selectedTier,
          gateway: gateway,
          period: selectedPeriod, // Added billing period
        }),
      });

      const result = await response.json();

      if (result.status && result.data?.authorization_url) {
        window.location.href = result.data.authorization_url;
      } else {
        const phpErrorMessage = result.message || result.error || 'Failed to initialize payment. Please try again.';
        setErrorMessage(phpErrorMessage);
        setIsProcessing(false);
        setIsModalOpen(false);
      }
    } catch (err: any) {
      console.error('Payment initialization error:', err);
      setErrorMessage('A network error occurred. Please check your connection and try again.');
      setIsProcessing(false);
      setIsModalOpen(false);
    }
  };

  // Loading skeleton
  if (subscriptionStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f5f7f5' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#eaf5ee] flex items-center justify-center animate-pulse">
            <div className="w-6 h-6 rounded-full bg-[#2db85a] animate-ping" />
          </div>
          <p className="text-sm font-medium" style={{ color: '#6b7f72' }}>Loading subscription details...</p>
        </div>
      </div>
    );
  }

  // Active subscription state
  if (subscriptionStatus === 'active') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center text-center px-6 animate-fadeIn" style={{ background: '#f5f7f5' }}>
        <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl mb-6 animate-bounce" style={{ background: '#eaf5ee', color: '#2db85a' }}>
          ✓
        </div>
        <h1 className="text-3xl font-extrabold mb-3" style={{ color: '#1a2d1e' }}>You're all set!</h1>
        <p className="text-base mb-8 max-w-sm" style={{ color: '#6b7f72' }}>
          Your ClearBooks Africa subscription is active. Start managing your finances today.
        </p>
        <button
          onClick={() => router.push('/dashboard')}
          className="px-8 py-3.5 rounded-xl font-bold text-white transition-all duration-200 hover:scale-105 hover:shadow-lg"
          style={{ background: '#2db85a' }}
        >
          Go to Dashboard →
        </button>
      </div>
    );
  }

  // Main subscription page
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-x-hidden" style={{ background: '#f5f7f5' }}>
      {/* Decorative elements */}
      <div className="absolute top-0 inset-x-0 h-1" style={{ background: 'linear-gradient(90deg, #2db85a, #a8e6cf)' }} />
      <div className="absolute top-20 right-10 w-72 h-72 rounded-full blur-3xl opacity-20 pointer-events-none" style={{ background: '#2db85a' }} />
      <div className="absolute bottom-20 left-10 w-96 h-96 rounded-full blur-3xl opacity-10 pointer-events-none" style={{ background: '#239149' }} />

      <GatewaySelectionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedTier(null);
        }}
        onSelect={handleGatewaySelect}
        isProcessing={isProcessing}
      />

      <div className="relative z-10 flex flex-col items-center text-center mb-12 max-w-2xl">
        <div className="mb-8">
          <ClearBooksLogo />
        </div>

        <div className="inline-flex items-center gap-2 text-[11px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-full mb-6 animate-pulse" style={{ background: '#fdecea', color: '#e05230', border: '0.5px solid #f5c4b5' }}>
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#e05230' }} />
          Subscription Expired
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight mb-4 bg-gradient-to-r from-[#1a2d1e] to-[#2db85a] bg-clip-text text-transparent">
          Your Subscription
          <br />
          Has Expired
        </h1>

        <p className="text-base leading-relaxed max-w-md" style={{ color: '#6b7f72' }}>
          Choose a plan below to regain full access and continue enjoying ClearBooks features.
        </p>
      </div>

      {/* Billing Toggle */}
      <div className="relative z-10 mb-10">
        <BillingToggle isAnnual={isAnnualBilling} onChange={setIsAnnualBilling} />
      </div>

      {/* Pricing Cards */}
      <div className="flex flex-col lg:flex-row gap-8 justify-center items-stretch w-full max-w-6xl relative z-10">
        {tiers.map((tier) => (
          <TierCard
            key={tier.name}
            tier={tier}
            onSubscribe={handleTierSelection}
            isProcessing={isProcessing && selectedTier === tier.name}
            isAnnual={isAnnualBilling}
          />
        ))}
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="mt-8 relative z-10 flex items-center gap-3 text-sm px-5 py-3 rounded-xl max-w-md animate-shake" style={{ background: '#fdecea', border: '0.5px solid #f5c4b5', color: '#b03a20' }}>
          <span className="text-lg">⚠️</span>
          <span>{errorMessage}</span>
          <button
            onClick={() => setErrorMessage('')}
            className="ml-auto text-xs underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Trust Badges */}
      <div className="relative z-10 mt-12 flex flex-wrap items-center justify-center gap-6 text-xs" style={{ color: '#6b7f72' }}>
        <div className="flex items-center gap-2">
          <ShieldIcon />
          <span>256-bit SSL Secure</span>
        </div>
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" />
          </svg>
          <span>24/7 Support</span>
        </div>
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M20 12v4a4 4 0 01-4 4H8a4 4 0 01-4-4v-4M12 2v10M8 8l4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Cancel anytime</span>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="relative z-10 mt-16 w-full max-w-2xl">
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold" style={{ color: '#1a2d1e' }}>Frequently Asked Questions</h3>
          <p className="text-sm" style={{ color: '#6b7f72' }}>Everything you need to know about our plans</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <FAQItem
            question="Can I switch plans later?"
            answer="Yes, you can upgrade or downgrade your plan at any time from your dashboard. Changes will be prorated."
          />
          <FAQItem
            question="What payment methods do you accept?"
            answer="We accept all major credit cards via Paystack, Stripe, and PayPal. Bank transfers are available for annual plans."
          />
          <FAQItem
            question="Is there a setup fee?"
            answer="No setup fees. You only pay the subscription amount shown above."
          />
          <FAQItem
            question="How does the free trial work?"
            answer="We offer a 14-day free trial on all plans. No credit card required to start."
          />
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPage;