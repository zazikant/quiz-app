'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface Quiz {
  id: string;
  quiz_name: string;
  exam_name: string;
}

export default function BulkOperationsPage() {
  const supabase = createClientComponentClient();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState('');
  const [questionIds, setQuestionIds] = useState('');
  const [operation, setOperation] = useState('add');

  useEffect(() => {
    const fetchQuizzes = async () => {
      const { data } = await supabase.from('quizzes').select('*');
      setQuizzes(data || []);
    };

    fetchQuizzes();
  }, [supabase]);

  const handleBulkOperation = async () => {
    const ids = questionIds.split('\n').map((id) => id.trim()).filter((id) => id);

    if (operation === 'add') {
      const { error } = await supabase.from('quiz_questions').insert(
        ids.map((id) => ({ quiz_id: selectedQuiz, question_id: id }))
      );
      if (error) {
        alert('Error adding questions');
      } else {
        alert('Questions added successfully');
      }
    } else {
      const { error } = await supabase
        .from('quiz_questions')
        .delete()
        .eq('quiz_id', selectedQuiz)
        .in('question_id', ids);
      if (error) {
        alert('Error removing questions');
      } else {
        alert('Questions removed successfully');
      }
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Bulk Operations</h1>
      <div className="mb-4">
        <select
          value={selectedQuiz}
          onChange={(e) => setSelectedQuiz(e.target.value)}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
        >
          <option value="">Select a quiz</option>
          {quizzes.map((quiz) => (
            <option key={quiz.id} value={quiz.id}>
              {quiz.exam_name} - {quiz.quiz_name}
            </option>
          ))}
        </select>
      </div>
      <div className="mb-4">
        <textarea
          value={questionIds}
          onChange={(e) => setQuestionIds(e.target.value)}
          placeholder="Enter question IDs, one per line"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline h-48"
        />
      </div>
      <div className="flex items-center mb-4">
        <label className="mr-4">
          <input
            type="radio"
            name="operation"
            value="add"
            checked={operation === 'add'}
            onChange={() => setOperation('add')}
            className="mr-2"
          />
          Add
        </label>
        <label>
          <input
            type="radio"
            name="operation"
            value="remove"
            checked={operation === 'remove'}
            onChange={() => setOperation('remove')}
            className="mr-2"
          />
          Remove
        </label>
      </div>
      <button
        onClick={handleBulkOperation}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        Perform Bulk Operation
      </button>
    </div>
  );
}
