'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

interface Question {
  id: string;
  question_text: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  total_attempts: number;
  correct_attempts: number;
  difficulty_level: 'easy' | 'medium' | 'tough';
  admin_id: string;
}

export default function DeleteQuestionPage({ params }: { params: { id: string } }) {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [question, setQuestion] = useState<Question | null>(null);

  useEffect(() => {
    const fetchQuestion = async () => {
      const { data } = await supabase
        .from('questions')
        .select('*')
        .eq('id', params.id)
        .single();
      setQuestion(data);
    };

    fetchQuestion();
  }, [params.id, supabase]);

  const handleDelete = async (hardDelete: boolean) => {
    if (hardDelete) {
      const { error } = await supabase.from('questions').delete().eq('id', params.id);
      if (error) {
        alert('Error deleting question');
      } else {
        router.push('/admin/question-bank');
      }
    } else {
      const { error } = await supabase.from('questions').update({ is_deleted: true }).eq('id', params.id);
      if (error) {
        alert('Error deleting question');
      } else {
        router.push('/admin/question-bank');
      }
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Delete Question</h1>
      {question && (
        <div>
          <p className="mb-4">Are you sure you want to delete this question?</p>
          <p className="mb-4"><strong>{question.question_text}</strong></p>
          <div className="flex space-x-4">
            <button
              onClick={() => handleDelete(false)}
              className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded"
            >
              Soft Delete
            </button>
            <button
              onClick={() => handleDelete(true)}
              className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
            >
              Hard Delete
            </button>
            <button
              onClick={() => router.push('/admin/question-bank')}
              className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
