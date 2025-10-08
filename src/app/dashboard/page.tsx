import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { logout } from './actions';

export default async function DashboardPage() {
  const supabase = createServerComponentClient({ cookies });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/');
  }

  const { data: assignments } = await supabase
    .from('quiz_assignments')
    .select('*, quizzes(*, quiz_questions(count))')
    .in('status', ['assigned', 'in_progress'])
    .eq('user_email', session.user.email);

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <form action={logout}>
          <button
            type="submit"
            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
          >
            Logout
          </button>
        </form>
      </div>
      <p className="mb-4">Welcome, {session.user.email}</p>
      <h2 className="text-xl font-bold mb-4">Your Quizzes</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {assignments?.map((assignment) => (
          <div key={assignment.id} className="border rounded-lg p-6 bg-white shadow-sm">
            <h3 className="text-lg font-bold mb-2">{assignment.quizzes.exam_name}</h3>
            <p className="text-sm text-gray-600">
              {assignment.quizzes.quiz_questions[0].count} Questions | {assignment.quizzes.duration} Minutes
            </p>
            <p className={`text-sm mt-2 ${assignment.status === 'in_progress' ? 'text-blue-500' : 'text-gray-500'}`}>
              Status: {assignment.status === 'in_progress' ? `In Progress (${assignment.current_question_index} / ${assignment.quizzes.quiz_questions[0].count})` : 'Not Started'}
            </p>
            <Link href={`/quiz/${assignment.id}`} className="mt-4 inline-block bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
              {assignment.status === 'in_progress' ? 'Resume Quiz' : 'Start Quiz'}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}