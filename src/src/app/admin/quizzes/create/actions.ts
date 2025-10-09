'use server';

import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function createQuiz(formData: FormData) {
  const quizName = formData.get('quizName') as string;
  const examName = formData.get('examName') as string;
  const duration = parseInt(formData.get('duration') as string, 10);

  const supabase = createServerActionClient({ cookies });

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  const { error } = await supabase.from('quizzes').insert({
    quiz_name: quizName,
    exam_name: examName,
    duration,
    admin_id: user.id,
  });

  if (error) {
    console.error('Error creating quiz:', error);
    // Handle error appropriately
  } else {
    redirect('/admin/quizzes');
  }
}
