'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

export default function CreateQuizPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [quizName, setQuizName] = useState('');
  const [examName, setExamName] = useState('');
  const [duration, setDuration] = useState(0);

  const handleCreate = async () => {
    const { error } = await supabase.from('quizzes').insert({
      quiz_name: quizName,
      exam_name: examName,
      duration,
    });

    if (error) {
      alert('Error creating quiz');
    } else {
      router.push('/admin/quizzes');
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Create New Quiz</h1>
      <form onSubmit={handleCreate}>
        <div className="mb-4">
          <label htmlFor="quizName" className="block text-gray-700 font-bold mb-2">
            Quiz Name (e.g., A, B, C)
          </label>
          <input
            type="text"
            id="quizName"
            value={quizName}
            onChange={(e) => setQuizName(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          />
        </div>
        <div className="mb-4">
          <label htmlFor="examName" className="block text-gray-700 font-bold mb-2">
            Exam Name (e.g., Written Communication, Safety A)
          </label>
          <input
            type="text"
            id="examName"
            value={examName}
            onChange={(e) => setExamName(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          />
        </div>
        <div className="mb-4">
          <label htmlFor="duration" className="block text-gray-700 font-bold mb-2">
            Duration (in minutes)
          </label>
          <input
            type="number"
            id="duration"
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value, 10))}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          />
        </div>
        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        >
          Create Quiz
        </button>
      </form>
    </div>
  );
}
