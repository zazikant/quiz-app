'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

interface Answer {
  id: string;
  answer_text: string;
}

interface QuestionData {
  id: string;
  question_text: string;
  answers: Answer[];
}

interface UserQuizProgress {
  id: string;
  answer_id: string | null;
  is_answered: boolean;
  question_order: number;
  questions: QuestionData;
}

interface Assignment {
  id: string;
  current_question_index: number;
}

export default function QuizPage({ params }: { params: { id: string } }) {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [quizProgress, setQuizProgress] = useState<UserQuizProgress[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: assignmentData } = await supabase
        .from('quiz_assignments')
        .select('*')
        .eq('id', params.id)
        .single();
      setAssignment(assignmentData);

      if (assignmentData) {
        const { data: progressData } = await supabase
          .from('user_quiz_progress')
          .select('*, questions(*, answers(*))')
          .eq('assignment_id', params.id)
          .order('question_order', { ascending: true });
        setQuizProgress(progressData || []);
        setCurrentIndex(assignmentData.current_question_index);
        setSelectedAnswer(progressData?.[assignmentData.current_question_index]?.answer_id || null);
      }
    };

    fetchData();
  }, [params.id, supabase]);

  const updateProgress = async () => {
    if (selectedAnswer) {
      const currentProgress = quizProgress[currentIndex];
      await supabase
        .from('user_quiz_progress')
        .update({ answer_id: selectedAnswer, is_answered: true })
        .eq('id', currentProgress.id);
    }
  };

  const handleNext = async () => {
    await updateProgress();
    const nextIndex = currentIndex + 1;
    await supabase.from('quiz_assignments').update({ current_question_index: nextIndex }).eq('id', params.id);
    setCurrentIndex(nextIndex);
    setSelectedAnswer(quizProgress[nextIndex]?.answer_id || null);
  };

  const handlePrevious = async () => {
    await updateProgress();
    const prevIndex = currentIndex - 1;
    await supabase.from('quiz_assignments').update({ current_question_index: prevIndex }).eq('id', params.id);
    setCurrentIndex(prevIndex);
    setSelectedAnswer(quizProgress[prevIndex]?.answer_id || null);
  };

  const handleComplete = async () => {
    await updateProgress();
    await supabase.from('quiz_assignments').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', params.id);
    router.push('/dashboard');
  };

  const currentQuestion = quizProgress[currentIndex]?.questions;

  return (
    <div className="container mx-auto p-4">
      {currentQuestion && assignment && (
        <div>
          <h1 className="text-2xl font-bold mb-4">{currentQuestion.question_text}</h1>
          <div className="space-y-4">
            {currentQuestion.answers.map((answer) => (
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
              disabled={currentIndex === 0}
              className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
            >
              Previous
            </button>
            {currentIndex < quizProgress.length - 1 ? (
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
