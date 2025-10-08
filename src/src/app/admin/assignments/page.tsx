'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { allowResume, freshReassign } from './actions';

interface Quiz {
  id: string;
  quiz_name: string;
  exam_name: string;
}

interface Assignment {
  id: string;
  user_email: string;
  status: string;
  quizzes: Quiz;
}

export default function AssignmentsPage() {
  const supabase = createClientComponentClient();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [userEmail, setUserEmail] = useState('');
  const [selectedQuiz, setSelectedQuiz] = useState('');

  useEffect(() => {
    const fetchQuizzes = async () => {
      const { data } = await supabase.from('quizzes').select('*');
      setQuizzes(data || []);
    };

    const fetchAssignments = async () => {
      const { data } = await supabase.from('quiz_assignments').select('*, quizzes(*), users(*)');
      setAssignments(data || []);
    };

    fetchQuizzes();
    fetchAssignments();
  }, [supabase]);

  const handleAssign = async () => {
    const { error } = await supabase.from('quiz_assignments').insert({
      user_email: userEmail,
      quiz_id: selectedQuiz,
    });

    if (error) {
      alert('Error assigning quiz');
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Assign Quiz</h1>
      <div className="flex items-center mb-4">
        <input
          type="email"
          value={userEmail}
          onChange={(e) => setUserEmail(e.target.value)}
          placeholder="User Email"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
        />
        <select
          value={selectedQuiz}
          onChange={(e) => setSelectedQuiz(e.target.value)}
          className="ml-4 shadow appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
        >
          <option value="">Select a quiz</option>
          {quizzes.map((quiz) => (
            <option key={quiz.id} value={quiz.id}>
              {quiz.exam_name} - {quiz.quiz_name}
            </option>
          ))}
        </select>
        <button
          onClick={handleAssign}
          className="ml-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Assign
        </button>
      </div>

      <h1 className="text-2xl font-bold mb-4">All Assignments</h1>
      <div className="bg-white shadow-md rounded my-6">
        <table className="min-w-full table-auto">
          <thead>
            <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
              <th className="py-3 px-6 text-left">User</th>
              <th className="py-3 px-6 text-left">Quiz</th>
              <th className="py-3 px-6 text-center">Status</th>
              <th className="py-3 px-6 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="text-gray-600 text-sm font-light">
            {assignments.map((assignment) => (
              <tr key={assignment.id} className="border-b border-gray-200 hover:bg-gray-100">
                <td className="py-3 px-6 text-left whitespace-nowrap">
                  <div className="flex items-center">
                    <span className="font-medium">{assignment.user_email}</span>
                  </div>
                </td>
                <td className="py-3 px-6 text-left">
                  {assignment.quizzes.exam_name} - {assignment.quizzes.quiz_name}
                </td>
                <td className="py-3 px-6 text-center">{assignment.status}</td>
                <td className="py-3 px-6 text-center">
                  <div className="flex item-center justify-center">
                    <button
                      onClick={() => allowResume(assignment.id)}
                      className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-1 px-2 rounded text-xs mr-2"
                    >
                      Allow Resume
                    </button>
                    <button
                      onClick={() => freshReassign(assignment.id)}
                      className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-2 rounded text-xs"
                    >
                      Fresh Reassign
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
