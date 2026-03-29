import { redirect } from 'next/navigation';

/**
 * Root page — immediately redirects to dashboard.
 * Dashboard will redirect to login if not authenticated.
 */
export default function HomePage() {
  redirect('/dashboard');
}
