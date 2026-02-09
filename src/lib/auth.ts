// @/lib/auth.ts

const USER_SESSION_KEY = 'user';

interface User {
  uid: string;
  email: string;
  full_name: string;
  role: string;
  user_type: string;
  company_type: string;
  company_id: string;
}

/**
 * Verify CAPTCHA token using Next.js API route
 */
async function verifyCaptcha(token: string): Promise<boolean> {
  try {
    // Development bypass
    if (process.env.NEXT_PUBLIC_APP_ENV === 'development' && token === 'test-token-bypass') {
      return true;
    }

    const response = await fetch('/api/auth/verify-captcha', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('CAPTCHA verification failed:', error);
      return false;
    }

    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error('CAPTCHA verification error:', error);
    return false;
  }
}

/**
 * Login with CAPTCHA verification
 */
export async function login(email: string, password: string, captchaToken?: string) {
  // Verify CAPTCHA if provided (except in development bypass)
  if (captchaToken && captchaToken !== 'test-token-bypass') {
    const isCaptchaValid = await verifyCaptcha(captchaToken);
    if (!isCaptchaValid) {
      throw new Error('Security verification failed. Please complete the CAPTCHA and try again.');
    }
  }

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/login.php`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      email, 
      password, 
      captcha_token: captchaToken || 'bypassed' 
    }),
  });

  const data = await res.json();

  if (data.status !== "success") {
    if (data.message?.toLowerCase().includes('captcha')) {
      throw new Error('Security verification failed. Please refresh and try again.');
    }
    throw new Error(data.message || "Login failed");
  }

  // Transform PHP user → layout-friendly format
  const transformedUser: User = {
    uid: data.user.id,
    full_name: data.user.full_name,
    email: data.user.email,
    role: data.user.role,
    user_type: data.user.user_type,
    company_type: data.user.company_type,
    company_id: data.user.company_id
  };

  // Store in sessionStorage (consider using cookies for production)
  sessionStorage.setItem(USER_SESSION_KEY, JSON.stringify(transformedUser));
  
  // Also store in localStorage for persistence across tabs
  localStorage.setItem(USER_SESSION_KEY, JSON.stringify(transformedUser));
  
  return transformedUser;
}

/**
 * Sign up with CAPTCHA verification
 */
export const signup = async (email: string, password: string, captchaToken?: string): Promise<User> => {
  // Verify CAPTCHA if provided
  if (captchaToken && captchaToken !== 'test-token-bypass') {
    const isCaptchaValid = await verifyCaptcha(captchaToken);
    if (!isCaptchaValid) {
      throw new Error('Security verification failed. Please complete the CAPTCHA.');
    }
  }

  // In a real app, you'd call your signup API
  // For now, simulate with timeout
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (email && password) {
        const user: User = {
          uid: 'simulated-user-id',
          email,
          full_name: 'New User',
          role: 'user',
          user_type: 'standard',
          company_type: 'none',
          company_id: 'none'
        };
        sessionStorage.setItem(USER_SESSION_KEY, JSON.stringify(user));
        localStorage.setItem(USER_SESSION_KEY, JSON.stringify(user));
        resolve(user);
      } else {
        reject(new Error('Please provide email and password to sign up.'));
      }
    }, 500);
  });
};

/**
 * Logout - clear all storage
 */
export const logout = async (): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      sessionStorage.removeItem(USER_SESSION_KEY);
      localStorage.removeItem(USER_SESSION_KEY);
      resolve();
    }, 200);
  });
};

/**
 * Get current user from storage
 */
export const getCurrentUser = (): Promise<User | null> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Try sessionStorage first, then localStorage
      let sessionData = sessionStorage.getItem(USER_SESSION_KEY);
      if (!sessionData) {
        sessionData = localStorage.getItem(USER_SESSION_KEY);
      }
      
      if (sessionData) {
        try {
          resolve(JSON.parse(sessionData));
        } catch (e) {
          resolve(null);
        }
      } else {
        resolve(null);
      }
    }, 200);
  });
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  return !!(sessionStorage.getItem(USER_SESSION_KEY) || localStorage.getItem(USER_SESSION_KEY));
};

/**
 * Clear session without API call (for idle timeout)
 */
export const clearSession = (): void => {
  sessionStorage.removeItem(USER_SESSION_KEY);
  localStorage.removeItem(USER_SESSION_KEY);
};

/**
 * Get session timeout in minutes
 */
export const getSessionTimeout = (): number => {
  return parseInt(process.env.NEXT_PUBLIC_SESSION_TIMEOUT || '10');
};