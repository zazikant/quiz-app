import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import Link from 'next/link';

export default async function QuizzesPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: quizzes } = await supabase.from('quizzes').select('*, quiz_questions(count)');

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Quiz Cards</h1>
        <Link href="/admin/quizzes/create" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          + Create Quiz
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {quizzes?.map((quiz) => (
          <div key={quiz.id} className="relative border rounded-lg p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
            <div className={`absolute top-4 right-4 w-3 h-3 rounded-full ${quiz.status === 'activated' ? 'bg-green-500' : 'bg-gray-400'}`} />
            <h2 className="text-2xl font-bold mb-4">{quiz.quiz_name}</h2>
            <div className="space-y-2 mb-6">
              <p className="text-sm text-gray-600">
                Status: <span className="font-medium">{quiz.status}</span>
              </p>
              <p className="text-sm text-gray-600">
                Exam Name: <span className="font-medium">{quiz.exam_name}</span>
              </p>
              <p className="text-sm text-gray-600">
                Number of Questions: <span className="font-medium">{quiz.quiz_questions[0].count}</span>
              </p>
              <p className="text-sm text-gray-600">
                Duration: <span className="font-medium">{quiz.duration} minutes</span>
              </p>
            </div>
            <div className="flex gap-2">
              <Link href={`/admin/quizzes/${quiz.id}/questions`} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded">
                Questions
              </Link>
              <button
                onClick={async () => {
                  const newStatus = quiz.status === 'activated' ? 'deactivated' : 'activated';
                  const { error } = await supabase
                    .from('quizzes')
                    .update({ status: newStatus })
                    .eq('id', quiz.id);
                  if (error) {
                    alert('Error updating quiz status');
                  } else {
                    window.location.reload();
                  }
                }}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
              >
                {quiz.status === 'activated' ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
