'use client';

import { createClientSupabase } from '@/lib/supabase';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const handleGoogleSignIn = async () => {
    const supabase = createClientSupabase();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          hd: 'wisq.com', // Restrict to wisq.com domain in Google's OAuth
        },
      },
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-sm w-full">
        <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-[#03143B] rounded-xl flex items-center justify-center">
              <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="currentColor">
                <rect x="3" y="8" width="18" height="12" rx="2" />
                <rect x="7" y="3" width="10" height="7" rx="1" fill="#F59E0B" />
                <rect x="6" y="10" width="5" height="1" rx="0.5" fill="#1e293b" />
                <rect x="13" y="10" width="5" height="1" rx="0.5" fill="#1e293b" />
                <rect x="19" y="12" width="2" height="4" rx="0.5" fill="#94a3b8" />
              </svg>
            </div>
          </div>

          <h1 className="text-xl font-semibold text-gray-900 text-center mb-2">
            Prop Tart
          </h1>
          <p className="text-gray-500 text-center text-sm mb-6">
            Sign in with your Wisq account
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm text-center">
                {decodeURIComponent(error)}
              </p>
            </div>
          )}

          <button
            onClick={handleGoogleSignIn}
            className="w-full py-3 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-3"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <p className="mt-4 text-xs text-gray-400 text-center">
            Only @wisq.com email addresses are allowed
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
