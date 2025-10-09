'use server';

import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function deleteUserAttempt(formData: FormData) {
  const supabase = createServerActionClient({ cookies });
  const attemptId = formData.get('id') as string;

  const { error } = await supabase
    .from('user_attempts')
    .delete()
    .eq('id', attemptId);

  if (error) {
    console.error('Error deleting user attempt:', error);
    return;
  }

  revalidatePath('/admin/results');
}