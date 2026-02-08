declare global {
    interface Window {
      grecaptcha: {
        ready: (callback: () => void) => void;
        execute: (siteKey: string, options: { action: string }) => Promise<string>;
        render: (element: string | HTMLElement, options: any) => number;
        reset: (widgetId?: number) => void;
        getResponse: (widgetId?: number) => string;
      };
    }
  }
  
  export interface ReCAPTCHAResponse {
    success: boolean;
    score: number;
    action: string;
    challenge_ts: string;
    hostname: string;
    'error-codes'?: string[];
  }
  
  export interface VerifyCaptchaRequest {
    token: string;
  }
  
  export interface VerifyCaptchaResponse {
    success: boolean;
    score?: number;
    action?: string;
    message?: string;
    errors?: string[];
  }