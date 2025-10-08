import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import Link from 'next/link';

export default async function DashboardPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  const { data: assignments } = await supabase
    .from('quiz_assignments')
    .select('*, quizzes(*, quiz_questions(count))')
    .eq('user_email', user?.email)
    .in('status', ['assigned', 'in_progress']);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Your Quizzes</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {assignments?.map((assignment) => (
          <div key={assignment.id} className="relative border rounded-lg p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
            <h2 className="text-2xl font-bold mb-4">{assignment.quizzes.quiz_name}</h2>
            <div className="space-y-2 mb-6">
              <p className="text-sm text-gray-600">
                Status: <span className="font-medium">{assignment.status}</span>
              </p>
              <p className="text-sm text-gray-600">
                Exam Name: <span className="font-medium">{assignment.quizzes.exam_name}</span>
              </p>
              <p className="text-sm text-gray-600">
                Number of Questions: <span className="font-medium">{assignment.quizzes.quiz_questions[0].count}</span>
              </p>
              <p className="text-sm text-gray-600">
                Duration: <span className="font-medium">{assignment.quizzes.duration} minutes</span>
              </p>
            </div>
            <div className="flex gap-2">
              {assignment.status === 'assigned' && (
                <Link href={`/quiz/${assignment.id}/start`} className="px-4 py-2 bg-blue-500 hover:bg-blue-700 text-white font-bold rounded">
                  Start Quiz
                </Link>
              )}
              {assignment.status === 'in_progress' && (
                <Link href={`/quiz/${assignment.id}`} className="px-4 py-2 bg-yellow-500 hover:bg-yellow-700 text-white font-bold rounded">
                  Resume Quiz
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
