'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Library, Loader2, Shield, Eye, EyeOff, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import { login } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  // Get reCAPTCHA site key from environment variables
  const RECAPTCHA_SITE_KEY =
    process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ||
    '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI'; // Test key

  // Log if site key is missing
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) {
      console.warn('RECAPTCHA_SITE_KEY is not set in environment variables');
    }
  }, []);

  const handleCaptchaChange = (token: string | null) => {
    setCaptchaToken(token);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setIsLoading(true);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      // Use the token or bypass for development
      const tokenToUse =
        captchaToken ||
        (process.env.NODE_ENV === 'development' ? 'test-token-bypass' : '');

      // Include captcha token in login request
      await login(email, password, tokenToUse);

      toast({
        title: 'Login Successful',
        description: 'Welcome back! Redirecting to dashboard...',
      });

      // Reset captcha
      recaptchaRef.current?.reset();
      setCaptchaToken(null);

      // Use router.push instead of window.location for smoother transition
      setTimeout(() => {
        router.push('/dashboard');
      }, 1000);
    } catch (error: any) {
      // Reset captcha on error
      recaptchaRef.current?.reset();
      setCaptchaToken(null);

      let errorMessage = 'Invalid credentials. Please try again.';

      if (
        error.message.includes('CAPTCHA') ||
        error.message.includes('Security verification')
      ) {
        errorMessage = error.message;
      } else if (error.message.includes('locked')) {
        errorMessage =
          'Account temporarily locked. Please try again later or contact support.';
      } else if (error.message.includes('not active')) {
        errorMessage =
          'Your account is not active. Please contact your administrator.';
      }

      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: errorMessage,
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualLogin = () => {
    // For development/testing only - bypass captcha
    if (process.env.NODE_ENV === 'development') {
      toast({
        title: 'Development Mode',
        description: 'Bypassing CAPTCHA for testing',
        duration: 3000,
      });
      setCaptchaToken('test-token-bypass');
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleForgotPassword = () => {
    toast({
      title: 'Password Reset',
      description:
        'Please contact your system administrator to reset your password.',
      duration: 5000,
    });
  };

  return (
    <div className="w-full h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-background via-background to-muted/10">
      <div className="w-full max-w-4xl">
        <Card className="overflow-hidden rounded-lg shadow-2xl bg-card/95 backdrop-blur-xl border border-white/20">
          <CardHeader className="flex flex-row items-center justify-between p-4 border-b border-white/20 bg-gradient-to-r from-primary/5 to-primary/10">
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-full bg-red-500"></div>
              <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
              <div className="h-3 w-3 rounded-full bg-green-500"></div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4 text-primary" />
              <span>Protected by reCAPTCHA</span>
            </div>
          </CardHeader>
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Left Side - Branding */}
            <div
              className="relative p-8 bg-cover bg-center hidden md:flex flex-col justify-center items-center text-center text-white"
              style={{
                backgroundImage: "url('/login-bg.png')",
                backgroundPosition: 'center',
                backgroundSize: 'cover',
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary/80 to-primary/60" />
              <div className="relative z-10 space-y-6">
                <div className="flex flex-col items-center">
                  <div className="p-3 bg-white/10 backdrop-blur-sm rounded-full mb-4">
                    <Library className="h-12 w-12 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold tracking-tight">
                    ClearBooks
                  </h2>
                  <p className="text-white/90 mt-2 max-w-md text-sm leading-relaxed">
                    A unified financial platform designed to eliminate silos,
                    improve accuracy, and give leaders real-time insight across
                    the entire organization.
                  </p>
                  <div className="mt-4 w-full max-w-xs bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-4">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Lock className="h-4 w-4 text-green-400" />
                      <p className="text-sm font-medium">
                        Enterprise-Grade Security
                      </p>
                    </div>
                    <p className="text-xs text-white/80">
                      Your data is protected with bank-level encryption and
                      multi-factor authentication.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="p-6 sm:p-8">
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold">Welcome Back</h1>
                <p className="text-muted-foreground text-sm">
                  Enter your credentials to access your account.
                </p>
              </div>
              <CardContent className="p-0">
                <form onSubmit={handleSubmit}>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="email"
                        className="text-sm font-medium"
                      >
                        Email Address
                      </Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="name@example.com"
                        required
                        autoComplete="username"
                        className="h-11 transition-all duration-200 focus:ring-2 focus:ring-primary"
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label
                          htmlFor="password"
                          className="text-sm font-medium"
                        >
                          Password
                        </Label>
                        <button
                          type="button"
                          onClick={handleForgotPassword}
                          className="text-xs text-muted-foreground hover:text-primary transition-colors"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <div className="relative">
                        <Input
                          id="password"
                          name="password"
                          type={showPassword ? 'text' : 'password'}
                          required
                          autoComplete="current-password"
                          className="h-11 transition-all duration-200 focus:ring-2 focus:ring-primary pr-10"
                          disabled={isLoading}
                        />
                        <button
                          type="button"
                          onClick={togglePasswordVisibility}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* reCAPTCHA Component */}
                    <div className="my-4">
                      {RECAPTCHA_SITE_KEY ? (
                        <>
                          <ReCAPTCHA
                            ref={recaptchaRef}
                            sitekey={RECAPTCHA_SITE_KEY}
                            onChange={handleCaptchaChange}
                            onErrored={() => {
                              toast({
                                variant: 'destructive',
                                title: 'Security Error',
                                description:
                                  'Failed to load security verification. Please refresh the page.',
                              });
                            }}
                            onExpired={() => {
                              setCaptchaToken(null);
                              toast({
                                title: 'Security Check Expired',
                                description:
                                  'Please complete the security check again.',
                                variant: 'default',
                              });
                            }}
                            size="normal"
                            theme="light"
                            className="flex justify-center"
                          />
                          <p className="text-xs text-muted-foreground text-center mt-2">
                            This helps us prevent automated attacks
                          </p>
                        </>
                      ) : (
                        <div className="text-center py-4 border rounded-md bg-muted/30">
                          <p className="text-sm text-muted-foreground">
                            Security verification is not configured
                          </p>
                        </div>
                      )}
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-11 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                      disabled={
                        isLoading ||
                        (!captchaToken && process.env.NODE_ENV === 'production')
                      }
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        'Sign In'
                      )}
                    </Button>

                    {/* Development bypass button - only shown in development */}
                    {process.env.NODE_ENV === 'development' && !captchaToken && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleManualLogin}
                        className="w-full h-9 text-xs mt-2"
                      >
                        Bypass CAPTCHA (Development Only)
                      </Button>
                    )}
                  </div>
                </form>
                <div className="mt-8 space-y-4">
                  <div className="text-center text-sm">
                    <p className="text-muted-foreground">
                      Don't have an account?{' '}
                      <Link
                        href="/contact"
                        className="text-primary font-medium hover:underline transition-colors"
                      >
                        Contact us
                      </Link>
                    </p>
                  </div>
                  <div className="bg-muted/20 rounded-lg p-3 border border-muted/30">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-4 w-4 text-green-500" />
                      <p className="text-xs font-medium">Security Notice</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This site is protected by reCAPTCHA and the Google{' '}
                      <a
                        href="https://policies.google.com/privacy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Privacy Policy
                      </a>{' '}
                      and{' '}
                      <a
                        href="https://policies.google.com/terms"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Terms of Service
                      </a>{' '}
                      apply.
                    </p>
                  </div>
                </div>
              </CardContent>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
