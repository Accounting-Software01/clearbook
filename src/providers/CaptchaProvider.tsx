'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';

interface CaptchaContextType {
  executeCaptcha: () => Promise<string | null>;
  resetCaptcha: () => void;
  isCaptchaLoaded: boolean;
}

const CaptchaContext = createContext<CaptchaContextType | undefined>(undefined);

export function CaptchaProvider({ children }: { children: React.ReactNode }) {
  const [recaptchaRef, setRecaptchaRef] = useState<ReCAPTCHA | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Check if reCAPTCHA script is loaded
    if (typeof window !== 'undefined' && window.grecaptcha) {
      setIsLoaded(true);
    }
  }, []);

  const executeCaptcha = async (): Promise<string | null> => {
    if (!recaptchaRef) {
      throw new Error('reCAPTCHA not initialized');
    }

    try {
      const token = await recaptchaRef.executeAsync();
      return token;
    } catch (error) {
      console.error('CAPTCHA execution failed:', error);
      return null;
    }
  };

  const resetCaptcha = () => {
    recaptchaRef?.reset();
  };

  return (
    <CaptchaContext.Provider value={{ executeCaptcha, resetCaptcha, isCaptchaLoaded: isLoaded }}>
      {children}
      {!isLoaded && (
        <Script
          src={`https://www.google.com/recaptcha/api.js?render=${process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}`}
          onLoad={() => setIsLoaded(true)}
        />
      )}
    </CaptchaContext.Provider>
  );
}

export function useCaptcha() {
  const context = useContext(CaptchaContext);
  if (!context) {
    throw new Error('useCaptcha must be used within CaptchaProvider');
  }
  return context;
}