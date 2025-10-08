'use server';

import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function deleteUserAttempt(attemptId: string) {
  const supabase = createServerActionClient({ cookies });
  const { error } = await supabase.from('user_attempts').delete().eq('id', attemptId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/admin/results');
}
