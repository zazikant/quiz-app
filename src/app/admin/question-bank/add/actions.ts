'use server';

import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function addQuestion(formData: FormData) {
  const questionText = formData.get('questionText') as string;
  const answers = JSON.parse(formData.get('answers') as string);

  const supabase = createServerActionClient({ cookies });

  // Check for duplicate question
  const { data: existingQuestions } = await supabase
    .from('questions')
    .select('id, is_deleted, answers(answer_text)')
    .ilike('question_text', questionText);

  const answersMatch = (newAnswers: any[], existingAnswers: any[]) => {
    if (newAnswers.length !== existingAnswers.length) return false;

    const sortedNew = newAnswers.map((a) => a.text.toLowerCase()).sort();
    const sortedExisting = existingAnswers.map((a) => a.answer_text.toLowerCase()).sort();

    return sortedNew.every((ans, idx) => ans === sortedExisting[idx]);
  };

  const exactMatch = existingQuestions?.find((q) =>
    answersMatch(answers, q.answers)
  );

  if (exactMatch) {
    if (exactMatch.is_deleted) {
      await supabase
        .from('questions')
        .update({ is_deleted: false })
        .eq('id', exactMatch.id);
    } else {
      // Question already exists and is active
      return { error: 'Question already exists' };
    }
  } else {
    // Create new question
    const { data: question, error: questionError } = await supabase
      .from('questions')
      .insert({ question_text: questionText })
      .select()
      .single();

    if (questionError) {
      console.error('Error inserting question:', questionError);
      return;
    }

    const answerInserts = answers.map((answer: any) => ({
      question_id: question.id,
      answer_text: answer.text,
      is_correct: answer.isCorrect,
    }));

    const { error: answersError } = await supabase.from('answers').insert(answerInserts);

    if (answersError) {
      console.error('Error inserting answers:', answersError);
    }
  }

  revalidatePath('/admin/question-bank');
}
