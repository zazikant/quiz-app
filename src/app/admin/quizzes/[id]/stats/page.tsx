'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface Quiz {
  id: string;
  exam_name: string;
  quiz_name: string;
}

interface QuizStats {
  total_attempts: number;
  correct_attempts: number;
  success_rate: number;
}

export default function QuizStatsPage({ params }: { params: { id: string } }) {
  const supabase = createClientComponentClient();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [stats, setStats] = useState<QuizStats | null>(null);

  useEffect(() => {
    const fetchQuiz = async () => {
      const { data } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', params.id)
        .single();
      setQuiz(data);
    };

    const fetchStats = async () => {
      const { data, error } = await supabase.rpc('get_quiz_stats', { quiz_id: params.id });
      if (error) {
        console.error(error);
      } else {
        setStats(data);
      }
    };

    fetchQuiz();
    fetchStats();
  }, [params.id, supabase]);

  return (
    <div className="container mx-auto p-4">
      {quiz && (
        <h1 className="text-2xl font-bold mb-4">
          Statistics for {quiz.exam_name} - {quiz.quiz_name}
        </h1>
      )}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white shadow-md rounded p-4">
            <h2 className="text-lg font-bold mb-2">Total Attempts</h2>
            <p className="text-3xl font-bold">{stats.total_attempts}</p>
          </div>
          <div className="bg-white shadow-md rounded p-4">
            <h2 className="text-lg font-bold mb-2">Correct Attempts</h2>
            <p className="text-3xl font-bold">{stats.correct_attempts}</p>
          </div>
          <div className="bg-white shadow-md rounded p-4">
            <h2 className="text-lg font-bold mb-2">Success Rate</h2>
            <p className="text-3xl font-bold">{stats.success_rate}%</p>
          </div>
        </div>
      )}
    </div>
  );
}
