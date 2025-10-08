'use client';

import { useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

export default function StartQuizPage({ params }: { params: { id: string } }) {
  const supabase = createClientComponentClient();
  const router = useRouter();

  useEffect(() => {
    const startQuiz = async () => {
      await supabase
        .from('quiz_assignments')
        .update({ status: 'in_progress', last_activity_at: new Date().toISOString() })
        .eq('id', params.id);
      router.push(`/quiz/${params.id}`);
    };

    startQuiz();
  }, [params.id, supabase, router]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Starting Quiz...</h1>
    </div>
  );
}
