'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function QuestionHistoryPage({ params }: { params: { id: string } }) {
  const supabase = createClientComponentClient();
  const [question, setQuestion] = useState<any>(null);
  const [attempts, setAttempts] = useState<any[]>([]);

  useEffect(() => {
    const fetchQuestion = async () => {
      const { data } = await supabase
        .from('questions')
        .select('*')
        .eq('id', params.id)
        .single();
      setQuestion(data);
    };

    const fetchAttempts = async () => {
      const { data } = await supabase
        .from('user_attempts')
        .select('*, users(*)')
        .eq('question_id', params.id);
      setAttempts(data || []);
    };

    fetchQuestion();
    fetchAttempts();
  }, [params.id, supabase]);

  return (
    <div className="container mx-auto p-4">
      {question && (
        <h1 className="text-2xl font-bold mb-4">
          History for "{question.question_text}"
        </h1>
      )}
      <div className="bg-white shadow-md rounded my-6">
        <h2 className="text-xl font-bold p-4">User Attempts</h2>
        <table className="min-w-full table-auto">
          <thead>
            <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
              <th className="py-3 px-6 text-left">User</th>
              <th className="py-3 px-6 text-center">Correct</th>
              <th className="py-3 px-6 text-center">Date</th>
            </tr>
          </thead>
          <tbody className="text-gray-600 text-sm font-light">
            {attempts.map((attempt) => (
              <tr key={attempt.id} className="border-b border-gray-200 hover:bg-gray-100">
                <td className="py-3 px-6 text-left whitespace-nowrap">
                  <div className="flex items-center">
                    <span className="font-medium">{attempt.users.email}</span>
                  </div>
                </td>
                <td className="py-3 px-6 text-center">{attempt.is_correct ? 'Yes' : 'No'}</td>
                <td className="py-3 px-6 text-center">{new Date(attempt.attempted_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
