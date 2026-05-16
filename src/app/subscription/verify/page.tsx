'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

// --- Icons (no changes) --------------------------------------------------------
const SpinnerIcon = () => (<svg className="animate-spin" width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="#28a74522" strokeWidth="3" /><path d="M12 2a10 10 0 0 1 10 10" stroke="#28a745" strokeWidth="3" strokeLinecap="round" /></svg>);
const CheckIcon = () => (<svg width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M6 16l7 7 13-13" stroke="#28a745" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>);
const CrossIcon = () => (<svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M6 6l16 16M22 6L6 22" stroke="#e05030" strokeWidth="2.8" strokeLinecap="round" /></svg>);
const ClearBooksLogo = () => (<div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}><div style={{ width: 36, height: 36, borderRadius: 8, background: '#28a745', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="10" height="13" rx="1.5" stroke="white" strokeWidth="1.6" /><path d="M6 8h4M6 11h4M6 14h2" stroke="white" strokeWidth="1.5" strokeLinecap="round" /><path d="M15 10l3 3-3 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M18 13H11" stroke="white" strokeWidth="1.5" strokeLinecap="round" /></svg></div><div><div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a', lineHeight: '1.1' }}>ClearBooks</div><div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#28a745' }}>Accounting Pro</div></div></div>);

// --- State Views (no changes) -----------------------------------------------------
const VerifyingView = () => (<div className="flex flex-col items-center text-center"><div className="flex items-center justify-center mb-6" style={{ width: 80, height: 80, borderRadius: '50%', background: '#edf7f0' }}><SpinnerIcon /></div><h1 className="text-2xl font-bold mb-2" style={{ color: '#1a1a1a' }}>Verifying your payment…</h1><p className="text-sm" style={{ color: '#6c757d', maxWidth: 320, lineHeight: 1.6 }}>Please wait and do not close this page. This usually takes a few seconds.</p><div className="mt-8 rounded-full overflow-hidden" style={{ width: 260, height: 4, background: '#e8eee8' }}><div className="h-full rounded-full" style={{ background: '#28a745', animation: 'progress 2.8s ease-in-out infinite', width: '40%', }} /></div><style>{`@keyframes progress { 0% { width: 0%; margin-left: 0; } 50% { width: 60%; margin-left: 20%; } 100% { width: 0%; margin-left: 100%; } }`}</style></div>);
const SuccessView = () => (<div className="flex flex-col items-center text-center"><div className="flex items-center justify-center mb-6" style={{ width: 80, height: 80, borderRadius: '50%', background: '#edf7f0', border: '3px solid #28a745'}}><CheckIcon /></div><div className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full mb-4" style={{ background: '#edf7f0', color: '#1e7a38', border: '1px solid #b8dfc5' }}>Payment Confirmed</div><h1 className="text-2xl font-bold mb-2" style={{ color: '#1a1a1a' }}>You&apos;re all set!</h1><p className="text-sm" style={{ color: '#6c757d', maxWidth: 320, lineHeight: 1.6 }}>Your ClearBooks subscription is now active. Redirecting you to the dashboard in a moment…</p><div className="mt-8 rounded-full overflow-hidden" style={{ width: 260, height: 4, background: '#e8eee8' }}><div className="h-full rounded-full" style={{ background: '#28a745', animation: 'drain 3s linear forwards', width: '100%', }}/></div><p className="mt-2 text-xs" style={{ color: '#9aab9c' }}>Redirecting to dashboard…</p><style>{`@keyframes drain { from { width: 100%; } to { width: 0%; } }`}</style></div>);
const FailedView = ({ error, onRetry }: { error: string; onRetry: () => void }) => (<div className="flex flex-col items-center text-center"><div className="flex items-center justify-center mb-6" style={{ width: 80, height: 80, borderRadius: '50%', background: '#fff3f0', border: '3px solid #e05030'}}><CrossIcon /></div><div className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full mb-4" style={{ background: '#fff3f0', color: '#e05030', border: '1px solid #f5c9bc' }}>Verification Failed</div><h1 className="text-2xl font-bold mb-2" style={{ color: '#1a1a1a' }}>Payment could not be verified</h1><p className="text-sm mb-8" style={{ color: '#6c757d', maxWidth: 360, lineHeight: 1.7 }}>{error}</p><div className="flex flex-col sm:flex-row gap-3"><button onClick={onRetry} className="px-6 py-3 rounded-xl text-sm font-semibold text-white transition-colors" style={{ background: '#28a745' }}>Try Again</button><a href="mailto:support@clearbook.africa" className="px-6 py-3 rounded-xl text-sm font-semibold transition-colors" style={{ background: '#f4f6f4', color: '#1a1a1a', border: '1px solid #dde5de', textDecoration: 'none' }}>Contact Support</a></div><div className="mt-8 flex items-center gap-2 text-xs px-4 py-3 rounded-xl" style={{ background: '#fff3f0', color: '#b03a20', border: '1px solid #f5c9bc', maxWidth: 360 }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01" strokeLinecap="round"/></svg><span>If your account was debited, please contact support with your payment reference.</span></div></div>);

// --- Page Component -----------------------------------------------------------

const VerificationPage = () => {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [status, setStatus] = useState<'verifying' | 'success' | 'failed'>('verifying');
    const [error, setError] = useState('');

    const runVerification = () => {
        // --- UPDATED LOGIC --- 
        const gateway = searchParams.get('gateway');
        let reference: string | null = null;

        if (gateway === 'paystack') {
            // Paystack can use 'reference' or 'trxref'
            reference = searchParams.get('reference') || searchParams.get('trxref');
        } else if (gateway === 'stripe') {
            reference = searchParams.get('session_id');
        } else if (gateway === 'paypal') {
            // PayPal uses 'token' for the Order ID
            reference = searchParams.get('token');
        }

        if (!gateway || !reference) {
            setStatus('failed');
            setError('Payment gateway and reference are required. Your URL may be incomplete.');
            return;
        }

        // --- END OF UPDATED LOGIC ---

        setStatus('verifying');
        setError('');

        const verifyPayment = async () => {
            try {
                const apiUrl = `https://hariindustries.net/api/clearbook/subscription.php`;
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    // --- UPDATED BODY --- 
                    body: JSON.stringify({ 
                        action: 'verify', 
                        gateway: gateway,  // Send the gateway
                        reference: reference // Send the correct reference
                    }),
                });

                const result = await response.json();

                if (result.success) {
                    setStatus('success');
                    setTimeout(() => {
                        window.location.href = '/dashboard';
                    }, 3000);
                } else {
                    setStatus('failed');
                    setError(result.error || result.message || 'An unknown error occurred during verification.');
                }
            } catch (err) {
                console.error('Verification fetch error:', err);
                setStatus('failed');
                setError('A network error occurred. Please check your connection and try again.');
            }
        };

        verifyPayment();
    };

    useEffect(() => {
        // useSearchParams() can be null on initial render, so we wait.
        if (searchParams) {
            runVerification();
        }
    }, [searchParams]);

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6" style={{ background: '#f4f6f4' }}>
            <div className="absolute top-0 inset-x-0" style={{ height: 4, background: '#28a745' }} />
            <ClearBooksLogo />
            <div className="w-full flex flex-col items-center" style={{ background: '#ffffff', border: '1px solid #dde5de', borderRadius: 16, padding: '40px 32px', maxWidth: 480, boxShadow: '0 2px 16px #0000000a', }}>
                {status === 'verifying' && <VerifyingView />}
                {status === 'success'   && <SuccessView />}
                {status === 'failed'    && <FailedView error={error} onRetry={runVerification} />}
            </div>
            <div className="mt-6 flex items-center gap-1.5 text-xs" style={{ color: '#9aab9c' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V7l-9-5z" strokeLinecap="round" strokeLinejoin="round"/><path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Secured by Paystack, Stripe & PayPal &nbsp;·&nbsp; ClearBooks Pro v2.1
            </div>
        </div>
    );
};

export default VerificationPage;
