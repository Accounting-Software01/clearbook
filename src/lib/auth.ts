// @/lib/auth.ts - Complete corrected version

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

// HARDCODE your API URL
const API_BASE_URL = 'http://hariindustries.net/api/clearbook';

/**
 * Login with CAPTCHA verification
 */
export async function login(email: string, password: string, captchaToken?: string) {
  console.log('📡 Calling API:', `${API_BASE_URL}/login.php`);
  console.log('📧 Email:', email);
  
  // Prepare request body
  const body: any = { 
    email, 
    password 
  };
  
  // Only add captcha_token if it exists (avoid sending undefined)
  if (captchaToken && captchaToken.trim()) {
    body.captcha_token = captchaToken;
  }
  
  console.log('📦 Request body:', body);

  try {
    const res = await fetch(`${API_BASE_URL}/login.php`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(body),
    });

    console.log('📊 Response status:', res.status);
    
    const text = await res.text();
    console.log('📨 Raw response:', text);
    
    let data;
    try {
      data = JSON.parse(text);
    } catch (error) {
      console.error('❌ Failed to parse JSON:', text);
      throw new Error('Invalid server response');
    }

    if (data.status !== "success") {
      // Check for specific error messages
      if (data.message?.toLowerCase().includes('captcha') || 
          data.message?.toLowerCase().includes('security')) {
        throw new Error('Security verification failed. Please try again.');
      }
      if (data.message?.toLowerCase().includes('locked')) {
        throw new Error('Account is temporarily locked. Please try again later.');
      }
      if (data.message?.toLowerCase().includes('not active')) {
        throw new Error('Account is not active. Please contact support.');
      }
      throw new Error(data.message || "Invalid email or password");
    }

    // Transform PHP user → layout-friendly format
    const transformedUser: User = {
      uid: data.user.id.toString(),
      full_name: data.user.full_name,
      email: data.user.email,
      role: data.user.role,
      user_type: data.user.user_type,
      company_type: data.user.company_type,
      company_id: data.user.company_id.toString()
    };

    // Store in sessionStorage
    sessionStorage.setItem(USER_SESSION_KEY, JSON.stringify(transformedUser));
    
    // Also store in localStorage for persistence
    localStorage.setItem(USER_SESSION_KEY, JSON.stringify(transformedUser));
    
    console.log('✅ Login successful for:', email);
    return transformedUser;
    
  } catch (error: any) {
    console.error('❌ Login error:', error);
    if (error.message.includes('Failed to fetch')) {
      throw new Error('Network error. Please check your connection.');
    }
    throw error;
  }
}

/**
 * Sign up with CAPTCHA verification
 */
export const signup = async (email: string, password: string, captchaToken?: string): Promise<User> => {
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
      // Clear any other session-related items
      sessionStorage.clear();
      localStorage.clear();
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
          console.error('Error parsing user data:', e);
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
  try {
    const sessionData = sessionStorage.getItem(USER_SESSION_KEY) || localStorage.getItem(USER_SESSION_KEY);
    if (!sessionData) return false;
    
    const user = JSON.parse(sessionData);
    return !!(user && user.email && user.uid);
  } catch (error) {
    return false;
  }
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

/**
 * Get user from storage synchronously
 */
export const getUserSync = (): User | null => {
  try {
    const sessionData = sessionStorage.getItem(USER_SESSION_KEY) || localStorage.getItem(USER_SESSION_KEY);
    return sessionData ? JSON.parse(sessionData) : null;
  } catch (error) {
    return null;
  }
};