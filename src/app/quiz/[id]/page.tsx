'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function QuizPage({ params }: { params: { id: string } }) {
  const supabase = createClientComponentClient();
  const [assignment, setAssignment] = useState<any>(null);
  const [question, setQuestion] = useState<any>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  useEffect(() => {
    const fetchAssignment = async () => {
      const { data } = await supabase
        .from('quiz_assignments')
        .select('*, quizzes(*)')
        .eq('id', params.id)
        .single();
      setAssignment(data);
    };

    fetchAssignment();
  }, [params.id, supabase]);

  useEffect(() => {
    if (assignment) {
      const fetchQuestion = async () => {
        const { data } = await supabase
          .from('user_quiz_progress')
          .select('*, questions(*, answers(*))')
          .eq('assignment_id', params.id)
          .eq('question_order', assignment.current_question_index)
          .single();
        setQuestion(data);
        setSelectedAnswer(data?.answer_id);
      };

      fetchQuestion();
    }
  }, [assignment, params.id, supabase]);

  const handleNext = async () => {
    if (selectedAnswer) {
      await supabase.from('user_quiz_progress').update({ answer_id: selectedAnswer, is_answered: true }).eq('id', question.id);
    }
    await supabase.from('quiz_assignments').update({ current_question_index: assignment.current_question_index + 1 }).eq('id', params.id);
    window.location.reload();
  };

  const handlePrevious = async () => {
    await supabase.from('quiz_assignments').update({ current_question_index: assignment.current_question_index - 1 }).eq('id', params.id);
    window.location.reload();
  };

  const handleComplete = async () => {
    if (selectedAnswer) {
      await supabase.from('user_quiz_progress').update({ answer_id: selectedAnswer, is_answered: true }).eq('id', question.id);
    }
    await supabase.from('quiz_assignments').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', params.id);
    window.location.href = '/dashboard';
  };

  return (
    <div className="container mx-auto p-4">
      {question && (
        <div>
          <h1 className="text-2xl font-bold mb-4">{question.questions.question_text}</h1>
          <div className="space-y-4">
            {question.questions.answers.map((answer: any) => (
              <div key={answer.id} className="flex items-center">
                <input
                  type="radio"
                  name="answer"
                  id={answer.id}
                  value={answer.id}
                  checked={selectedAnswer === answer.id}
                  onChange={() => setSelectedAnswer(answer.id)}
                  className="mr-2"
                />
                <label htmlFor={answer.id}>{answer.answer_text}</label>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-8">
            <button
              onClick={handlePrevious}
              disabled={assignment.current_question_index === 0}
              className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
            >
              Previous
            </button>
            {assignment.current_question_index < assignment.quizzes.quiz_questions[0].count - 1 ? (
              <button
                onClick={handleNext}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleComplete}
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
              >
                Complete
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
