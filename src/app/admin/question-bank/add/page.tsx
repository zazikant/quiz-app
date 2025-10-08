'use client';

import { useState } from 'react';

import { addQuestion } from './actions';

export default function AddQuestionPage() {
  const [questionText, setQuestionText] = useState('');
  const [answers, setAnswers] = useState([
    { text: '', isCorrect: true },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
  ]);

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

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Add New Question</h1>
      <form action={addQuestion}>
        <input type="hidden" name="questionText" value={questionText} />
        <input type="hidden" name="answers" value={JSON.stringify(answers)} />
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
          Add Question
        </button>
      </form>
    </div>
  );
}
