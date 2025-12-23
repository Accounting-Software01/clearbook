
// This is a mock authentication file to simulate user login/logout.
// In a real application, this would be replaced with Firebase Authentication.

const USER_SESSION_KEY = 'user';

// Simulates a user object you might get from Firebase.
interface User {
  uid: string;
  email: string;
  full_name: string;
  role: string;
  user_type: string;
  company_type: string;
  company_id: string;
}

// --- Public API ---

/**
 * Simulates a user logging in.
 * Stores a mock user session in sessionStorage.
 */

export async function login(email: string, password: string) {
  const res = await fetch("https://hariindustries.net/api/clearbook/login.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();

  if (data.status !== "success") {
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

  sessionStorage.setItem(USER_SESSION_KEY, JSON.stringify(transformedUser));
  return transformedUser;
}



/**
 * Simulates a user signing up.
 * Stores a mock user session in sessionStorage.
 */
export const signup = (email: string, password: string): Promise<User> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // In a real app, you'd create a new user. Here, we just succeed.
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
        resolve(user);
      } else {
        reject(new Error('Please provide email and password to sign up.'));
      }
    }, 500);
  });
};

/**
 * Simulates logging out by clearing the session.
 */
export const logout = (): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      sessionStorage.removeItem(USER_SESSION_KEY);
      resolve();
    }, 200);
  });
};

/**
 * Simulates checking for the currently authenticated user.
 * Reads the session from sessionStorage.
 */
export const getCurrentUser = (): Promise<User | null> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const sessionData = sessionStorage.getItem(USER_SESSION_KEY);
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