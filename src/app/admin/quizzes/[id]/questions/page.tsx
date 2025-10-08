'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function QuizQuestionsPage({ params }: { params: { id: string } }) {
  const supabase = createClientComponentClient();
  const [quiz, setQuiz] = useState<any>(null);
  const [allQuestions, setAllQuestions] = useState<any[]>([]);
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);

  useEffect(() => {
    const fetchQuiz = async () => {
      const { data } = await supabase
        .from('quizzes')
        .select('*, quiz_questions(questions(*))')
        .eq('id', params.id)
        .single();
      setQuiz(data);
      setQuizQuestions(data?.quiz_questions.map((qq: any) => qq.questions) || []);
    };

    const fetchAllQuestions = async () => {
      const { data } = await supabase.from('questions').select('*');
      setAllQuestions(data || []);
    };

    fetchQuiz();
    fetchAllQuestions();
  }, [params.id, supabase]);

  const handleAddQuestion = async (questionId: string) => {
    const { error } = await supabase.from('quiz_questions').insert({
      quiz_id: params.id,
      question_id: questionId,
    });

    if (error) {
      alert('Error adding question');
    } else {
      // Refresh quiz questions
    }
  };

  const handleRemoveQuestion = async (questionId: string) => {
    const { error } = await supabase
      .from('quiz_questions')
      .delete()
      .eq('quiz_id', params.id)
      .eq('question_id', questionId);

    if (error) {
      alert('Error removing question');
    } else {
      // Refresh quiz questions
    }
  };

  return (
    <div className="container mx-auto p-4">
      {quiz && (
        <h1 className="text-2xl font-bold mb-4">
          Questions for {quiz.exam_name} - {quiz.quiz_name}
        </h1>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h2 className="text-xl font-bold mb-2">Available Questions</h2>
          <div className="bg-white shadow-md rounded my-6">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
                  <th className="py-3 px-6 text-left">Question</th>
                  <th className="py-3 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="text-gray-600 text-sm font-light">
                {allQuestions
                  .filter((q) => !quizQuestions.some((qq) => qq.id === q.id))
                  .map((question) => (
                    <tr key={question.id} className="border-b border-gray-200 hover:bg-gray-100">
                      <td className="py-3 px-6 text-left whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="font-medium">{question.question_text}</span>
                        </div>
                      </td>
                      <td className="py-3 px-6 text-center">
                        <button
                          onClick={() => handleAddQuestion(question.id)}
                          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded text-xs"
                        >
                          Add
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <h2 className="text-xl font-bold mb-2">Questions in this Quiz</h2>
          <div className="bg-white shadow-md rounded my-6">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
                  <th className="py-3 px-6 text-left">Question</th>
                  <th className="py-3 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="text-gray-600 text-sm font-light">
                {quizQuestions.map((question) => (
                  <tr key={question.id} className="border-b border-gray-200 hover:bg-gray-100">
                    <td className="py-3 px-6 text-left whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="font-medium">{question.question_text}</span>
                      </div>
                    </td>
                    <td className="py-3 px-6 text-center">
                      <button
                        onClick={() => handleRemoveQuestion(question.id)}
                        className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded text-xs"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
