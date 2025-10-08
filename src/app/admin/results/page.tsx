'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import { deleteUserAttempt } from './actions';

const PAGE_SIZE = 10;

interface User {
  email: string;
}

interface Quiz {
  exam_name: string;
  quiz_name: string;
}

interface Result {
  id: string;
  is_correct: boolean;
  attempted_at: string;
  users: User;
  quizzes: Quiz;
}

export default function ResultsPage({ searchParams }: { searchParams: { page: string, user: string, quiz: string, date: string } }) {
  const supabase = createClientComponentClient();
  const [results, setResults] = useState<Result[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const page = parseInt(searchParams.page || '1', 10);

  useEffect(() => {
    const fetchResults = async () => {
      const offset = (page - 1) * PAGE_SIZE;

      let query = supabase
        .from('user_attempts')
        .select('*, users(*), quizzes(*)', { count: 'exact' });

      if (searchParams.user) {
        query = query.ilike('users.email', `%${searchParams.user}%`);
      }

      if (searchParams.quiz) {
        query = query.ilike('quizzes.exam_name', `%${searchParams.quiz}%`);
      }

      if (searchParams.date) {
        query = query.gte('attempted_at', new Date(searchParams.date).toISOString()).lte('attempted_at', new Date(searchParams.date).toISOString().replace('00:00:00', '23:59:59'));
      }

      const { data, count } = await query.range(offset, offset + PAGE_SIZE - 1);

      setResults(data || []);
      setTotalPages(Math.ceil((count || 0) / PAGE_SIZE));
    };

    fetchResults();
  }, [page, supabase, searchParams]);

  return (
    <div className="container mx-auto p-4">
      <div className="mb-4">
        <form>
          <div className="flex items-center">
            <input
              type="text"
              name="user"
              defaultValue={searchParams.user}
              placeholder="Filter by user..."
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
            <input
              type="text"
              name="quiz"
              defaultValue={searchParams.quiz}
              placeholder="Filter by quiz..."
              className="ml-4 shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
            <input
              type="date"
              name="date"
              defaultValue={searchParams.date}
              className="ml-4 shadow appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
            <button type="submit" className="ml-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
              Filter
            </button>
          </div>
        </form>
      </div>
      <div className="bg-white shadow-md rounded my-6">
        <table className="min-w-full table-auto">
          <thead>
            <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
              <th className="py-3 px-6 text-left">User</th>
              <th className="py-3 px-6 text-left">Quiz</th>
              <th className="py-3 px-6 text-center">Score</th>
              <th className="py-3 px-6 text-center">Date</th>
              <th className="py-3 px-6 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="text-gray-600 text-sm font-light">
            {results.map((result) => (
              <tr key={result.id} className="border-b border-gray-200 hover:bg-gray-100">
                <td className="py-3 px-6 text-left whitespace-nowrap">
                  <div className="flex items-center">
                    <span className="font-medium">{result.users.email}</span>
                  </div>
                </td>
                <td className="py-3 px-6 text-left">
                  {result.quizzes.exam_name} - {result.quizzes.quiz_name}
                </td>
                <td className="py-3 px-6 text-center">{result.is_correct ? 'Correct' : 'Incorrect'}</td>
                <td className="py-3 px-6 text-center">{new Date(result.attempted_at).toLocaleDateString()}</td>
                <td className="py-3 px-6 text-center">
                  <div className="flex item-center justify-center">
                    <button
                      onClick={() => deleteUserAttempt(result.id)}
                      className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded text-xs"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-center">
        <Link href={`?page=${page - 1}`} className={`mx-1 px-3 py-1 rounded ${page <= 1 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-500 text-white'}`}>
          Previous
        </Link>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <Link key={p} href={`?page=${p}`} className={`mx-1 px-3 py-1 rounded ${p === page ? 'bg-blue-700 text-white' : 'bg-blue-500'}`}>
            {p}
          </Link>
        ))}
        <Link href={`?page=${page + 1}`} className={`mx-1 px-3 py-1 rounded ${page >= totalPages ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-500 text-white'}`}>
          Next
        </Link>
      </div>
    </div>
  );
}
