'use server';

import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function allowResume(_assignmentId: string) {
  // No changes needed for allow resume, as the user can just continue
  // from where they left off.
}

export async function freshReassign(assignmentId: string) {
  const supabase = createServerActionClient({ cookies });

  const { data: oldAssignment } = await supabase
    .from('quiz_assignments')
    .select('user_email, quiz_id, assigned_by')
    .eq('id', assignmentId)
    .single();

  if (!oldAssignment) {
    return { error: 'Assignment not found' };
  }

  await supabase.from('user_quiz_progress').delete().eq('assignment_id', assignmentId);
  await supabase.from('quiz_assignments').delete().eq('id', assignmentId);

  const { data: newAssignment, error: newAssignmentError } = await supabase
    .from('quiz_assignments')
    .insert({
      user_email: oldAssignment.user_email,
      quiz_id: oldAssignment.quiz_id,
      assigned_by: oldAssignment.assigned_by,
    })
    .select()
    .single();

  if (newAssignmentError) {
    return { error: newAssignmentError.message };
  }

  const { data: quizQuestions } = await supabase
    .from('quiz_questions')
    .select('question_id')
    .eq('quiz_id', oldAssignment.quiz_id);

  if (quizQuestions) {
    const shuffled = quizQuestions.sort(() => Math.random() - 0.5);

    const progressRecords = shuffled.map((q, index) => ({
      assignment_id: newAssignment.id,
      question_id: q.question_id,
      question_order: index,
      is_answered: false,
    }));

    await supabase.from('user_quiz_progress').insert(progressRecords);
  }

  revalidatePath('/admin/assignments');
}
