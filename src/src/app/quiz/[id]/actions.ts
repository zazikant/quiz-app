'use server';

import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function updateProgress(progressId: string, answerId: string) {
  const supabase = createServerActionClient({ cookies });
  await supabase
    .from('user_quiz_progress')
    .update({ answer_id: answerId, is_answered: true })
    .eq('id', progressId);
}

export async function updateAssignmentIndex(assignmentId: string, newIndex: number) {
  const supabase = createServerActionClient({ cookies });
  await supabase.from('quiz_assignments').update({ current_question_index: newIndex }).eq('id', assignmentId);
  revalidatePath(`/quiz/${assignmentId}`);
}

export async function completeQuiz(assignmentId: string) {
  const supabase = createServerActionClient({ cookies });
  await supabase.from('quiz_assignments').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', assignmentId);
  revalidatePath('/dashboard');
}
