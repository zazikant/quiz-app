import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { logout } from '@/app/actions';
import { Button } from './ui/button';

export default async function Header() {
  const supabase = createServerComponentClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const isAdmin = session?.user?.user_metadata?.role === 'admin';

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="hidden font-bold sm:inline-block">Quiz App</span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {session && (
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
              </>
            )}
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <nav className="flex items-center">
            {session ? (
              <form action={logout}>
                <Button variant="ghost" type="submit">Logout</Button>
              </form>
            ) : (
              <Button asChild variant="ghost">
                <Link href="/">Login</Link>
              </Button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
