import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });

  const { data: attempts } = await supabase
    .from('user_attempts')
    .select('*, users(email), quizzes(exam_name, id)');

  if (!attempts) {
    return new NextResponse('No attempts found', { status: 404 });
  }

  const processedResults = await Promise.all(
    attempts.map(async (attempt) => {
      const { count: totalQuestions } = await supabase
        .from('quiz_questions')
        .select('count', { count: 'exact' })
        .eq('quiz_id', attempt.quizzes.id);

      const { count: correctAnswers } = await supabase
        .from('user_attempts')
        .select('count', { count: 'exact' })
        .eq('user_id', attempt.user_id)
        .eq('quiz_id', attempt.quizzes.id)
        .eq('is_correct', true);

      const score = totalQuestions && totalQuestions > 0 ? Math.round(((correctAnswers || 0) / totalQuestions) * 100) : 0;

      return {
        user_email: attempt.users?.email,
        quiz_name: attempt.quizzes?.exam_name,
        score: `${score}%`,
        date: new Date(attempt.attempted_at).toLocaleDateString(),
      };
    })
  );
  
  const uniqueResults = Array.from(new Set(processedResults.map(r => JSON.stringify(r)))).map(s => JSON.parse(s));

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Quiz Results');

  worksheet.columns = [
    { header: 'User Email', key: 'user_email', width: 30 },
    { header: 'Quiz Name', key: 'quiz_name', width: 30 },
    { header: 'Score', key: 'score', width: 10 },
    { header: 'Date', key: 'date', width: 15 },
  ];

  uniqueResults.forEach((result) => {
    worksheet.addRow(result);
  });

  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="quiz_results.xlsx"`,
    },
  });
}