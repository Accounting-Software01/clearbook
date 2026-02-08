import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();
    
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Token required' },
        { status: 400 }
      );
    }

    // Development bypass
    if (process.env.NODE_ENV === 'development' && token === 'test-token-bypass') {
      return NextResponse.json({
        success: true,
        score: 0.9,
        action: 'bypassed',
        timestamp: new Date().toISOString()
      });
    }

    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    
    if (!secretKey) {
      console.error('RECAPTCHA_SECRET_KEY is not set in environment variables');
      return NextResponse.json(
        { success: false, message: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Verify with Google reCAPTCHA
    const response = await fetch(
      `https://www.google.com/recaptcha/api/siteverify`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          secret: secretKey,
          response: token,
          remoteip: request.ip || '',
        }),
      }
    );

    const data = await response.json();

    if (data.success && data.score >= 0.5) {
      return NextResponse.json({
        success: true,
        score: data.score,
        action: data.action,
        timestamp: new Date().toISOString()
      });
    } else {
      console.error('CAPTCHA verification failed:', data['error-codes']);
      return NextResponse.json(
        {
          success: false,
          score: data.score || 0,
          errors: data['error-codes'] || [],
          message: 'CAPTCHA verification failed'
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('CAPTCHA verification error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}