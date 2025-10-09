'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface Answer {
  answer_text: string;
  is_correct: boolean;
}

export default function EditQuestionPage({ params }: { params: { id: string } }) {
  const supabase = createClientComponentClient();
  const [questionText, setQuestionText] = useState('');
  const [answers, setAnswers] = useState([
    { text: '', isCorrect: true },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
  ]);

  useEffect(() => {
    const fetchQuestion = async () => {
      const { data: question } = await supabase
        .from('questions')
        .select('*, answers(*)')
        .eq('id', params.id)
        .single();

      if (question) {
        setQuestionText(question.question_text);
        setAnswers(question.answers.map((a: Answer) => ({ text: a.answer_text, isCorrect: a.is_correct })));
      }
    };

    fetchQuestion();
  }, [params.id, supabase]);

  const handleAnswerChange = (index: number, text: string) => {
    const newAnswers = [...answers];
    newAnswers[index].text = text;
    setAnswers(newAnswers);
  };

  const handleCorrectAnswerChange = (index: number) => {
    const newAnswers = answers.map((answer, i) => ({
      ...answer,
      isCorrect: i === index,
    }));
    setAnswers(newAnswers);
  };

  const handleUpdate = async () => {
    // Implement update logic here
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Edit Question</h1>
      <form onSubmit={handleUpdate}>
        <div className="mb-4">
          <label htmlFor="question" className="block text-gray-700 font-bold mb-2">
            Question
          </label>
          <input
            type="text"
            id="question"
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 font-bold mb-2">Answers</label>
          {answers.map((answer, index) => (
            <div key={index} className="flex items-center mb-2">
              <input
                type="radio"
                name="correctAnswer"
                checked={answer.isCorrect}
                onChange={() => handleCorrectAnswerChange(index)}
                className="mr-2"
              />
              <input
                type="text"
                value={answer.text}
                onChange={(e) => handleAnswerChange(index, e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              />
            </div>
          ))}
        </div>
        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        >
          Update Question
        </button>
      </form>
    </div>
  );
}
