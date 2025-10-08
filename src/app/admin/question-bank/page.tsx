import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import Link from 'next/link';

const PAGE_SIZE = 10;

const getDifficultyClass = (difficulty: string) => {
  switch (difficulty) {
    case 'easy':
      return 'bg-green-200 text-green-600';
    case 'medium':
      return 'bg-yellow-200 text-yellow-600';
    case 'tough':
      return 'bg-red-200 text-red-600';
    default:
      return 'bg-gray-200 text-gray-600';
  }
};

export default async function QuestionBankPage({ searchParams }: { searchParams: { q: string, difficulty: string, page: string } }) {
  const supabase = createServerComponentClient({ cookies });
  const page = parseInt(searchParams.page || '1', 10);
  const offset = (page - 1) * PAGE_SIZE;

  let countQuery = supabase.from('questions').select('count', { count: 'exact' });
  let dataQuery = supabase.from('questions').select('*');

  if (searchParams.q) {
    countQuery = countQuery.ilike('question_text', `%${searchParams.q}%`);
    dataQuery = dataQuery.ilike('question_text', `%${searchParams.q}%`);
  }

  if (searchParams.difficulty) {
    countQuery = countQuery.eq('difficulty_level', searchParams.difficulty);
    dataQuery = dataQuery.eq('difficulty_level', searchParams.difficulty);
  }

  const { data: questions, error } = await dataQuery.range(offset, offset + PAGE_SIZE - 1);
  const { data: count } = await countQuery;

  const totalPages = Math.ceil((count?.[0]?.count || 0) / PAGE_SIZE);

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Question Bank</h1>
        <Link href="/admin/question-bank/add" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          + Add Question
        </Link>
      </div>
      <div className="mb-4">
        <form>
          <div className="flex items-center">
            <input
              type="text"
              name="q"
              defaultValue={searchParams.q}
              placeholder="Search questions..."
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
            <select name="difficulty" defaultValue={searchParams.difficulty} className="ml-4 shadow appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline">
              <option value="">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="tough">Tough</option>
            </select>
            <button type="submit" className="ml-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
              Search
            </button>
          </div>
        </form>
      </div>
      <div className="bg-white shadow-md rounded my-6">
        <table className="min-w-full table-auto">
          <thead>
            <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
              <th className="py-3 px-6 text-left">Question</th>
              <th className="py-3 px-6 text-left">Difficulty</th>
              <th className="py-3 px-6 text-center">Attempts</th>
              <th className="py-3 px-6 text-center">Correct</th>
              <th className="py-3 px-6 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="text-gray-600 text-sm font-light">
            {questions?.map((question) => (
              <tr key={question.id} className="border-b border-gray-200 hover:bg-gray-100">
                <td className="py-3 px-6 text-left whitespace-nowrap">
                  <div className="flex items-center">
                    <span className="font-medium">{question.question_text}</span>
                  </div>
                </td>
                <td className="py-3 px-6 text-left">
                  <span className={`${getDifficultyClass(question.difficulty_level)} py-1 px-3 rounded-full text-xs`}>
                    {question.difficulty_level}
                  </span>
                </td>
                <td className="py-3 px-6 text-center">{question.total_attempts}</td>
                <td className="py-3 px-6 text-center">{question.correct_attempts}</td>
                <td className="py-3 px-6 text-center">
                  <div className="flex item-center justify-center">
                    <Link href={`/admin/question-bank/edit/${question.id}`} className="w-4 mr-2 transform hover:text-purple-500 hover:scale-110">
                      {/* Edit Icon */}
                    </Link>
                    <Link href={`/admin/question-bank/delete/${question.id}`} className="w-4 mr-2 transform hover:text-purple-500 hover:scale-110">
                      {/* Delete Icon */}
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-center">
        <Link href={`?page=${page - 1}&q=${searchParams.q || ''}&difficulty=${searchParams.difficulty || ''}`} className={`mx-1 px-3 py-1 rounded ${page <= 1 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-500 text-white'}`}>
          Previous
        </Link>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <Link key={p} href={`?page=${p}&q=${searchParams.q || ''}&difficulty=${searchParams.difficulty || ''}`} className={`mx-1 px-3 py-1 rounded ${p === page ? 'bg-blue-700 text-white' : 'bg-blue-500'}`}>
            {p}
          </Link>
        ))}
        <Link href={`?page=${page + 1}&q=${searchParams.q || ''}&difficulty=${searchParams.difficulty || ''}`} className={`mx-1 px-3 py-1 rounded ${page >= totalPages ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-500 text-white'}`}>
          Next
        </Link>
      </div>
    </div>
  );
}
