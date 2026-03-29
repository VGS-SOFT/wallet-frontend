'use client';

import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';

const ERROR_MESSAGES: Record<string, { title: string; description: string }> = {
  no_token: {
    title: 'Authentication Failed',
    description: 'No token was received from the server. Please try again.',
  },
  no_user: {
    title: 'Login Failed',
    description: 'We could not retrieve your account from Google. Please try again.',
  },
  invalid_token: {
    title: 'Session Expired',
    description: 'Your session token is invalid or expired. Please log in again.',
  },
  server_error: {
    title: 'Server Error',
    description: 'Something went wrong on our end. Please try again in a moment.',
  },
};

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const reason = searchParams.get('reason') || 'server_error';
  const error = ERROR_MESSAGES[reason] || ERROR_MESSAGES['server_error'];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-xl p-10 w-full max-w-md flex flex-col items-center gap-6">
        {/* Error Icon */}
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
          <span className="text-red-500 text-3xl">⚠️</span>
        </div>

        {/* Message */}
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-xl font-bold text-gray-900">{error.title}</h1>
          <p className="text-gray-500 text-sm">{error.description}</p>
          <p className="text-xs text-gray-400 mt-1">Error code: <code className="bg-gray-100 px-1 rounded">{reason}</code></p>
        </div>

        {/* Back to Login */}
        <button
          onClick={() => router.replace('/login')}
          className="w-full bg-primary-600 text-white rounded-xl py-3 font-medium hover:bg-primary-700 transition-colors"
        >
          Back to Login
        </button>
      </div>
    </div>
  );
}
