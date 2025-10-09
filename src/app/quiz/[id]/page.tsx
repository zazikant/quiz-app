import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Quiz } from './quiz';

export default async function QuizPage({ params }: { params: { id: string } }) {
  const supabase = createServerComponentClient({ cookies });

  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/');
  }

  const { data: assignment } = await supabase
    .from('quiz_assignments')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!assignment) {
    return <div>Quiz not found.</div>;
  }

  const { data: questions } = await supabase
    .from('user_quiz_progress')
    .select('*, questions(*, answers(*))')
    .eq('assignment_id', params.id)
    .order('question_order', { ascending: true });

  return <Quiz assignment={assignment} questions={questions || []} />;
}