import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { logout } from '@/app/actions';

export default async function Header() {
  const supabase = createServerComponentClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const isAdmin = session?.user?.user_metadata?.role === 'admin';

  return (
    <header className="bg-gray-800 text-white p-4">
      <nav className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-xl font-bold">
          Quiz App
        </Link>
        <div className="flex items-center space-x-4">
          {session ? (
            <>
              <Link href="/dashboard">Dashboard</Link>
              {isAdmin && (
                <>
                  <Link href="/admin/question-bank">Question Bank</Link>
                  <Link href="/admin/quizzes">Quizzes</Link>
                  <Link href="/admin/assignments">Assignments</Link>
                  <Link href="/admin/results">Results</Link>
                  <Link href="/admin/analytics">Analytics</Link>
                </>
              )}
              <form action={logout}>
                <button
                  type="submit"
                  className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                >
                  Logout
                </button>
              </form>
            </>
          ) : (
            <Link href="/">Login</Link>
          )}
        </div>
      </nav>
    </header>
  );
}
