import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

export async function POST() {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: results } = await supabase
    .from('user_attempts')
    .select('*, users(*), quizzes(*)');

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Results');

  worksheet.columns = [
    { header: 'User', key: 'user', width: 30 },
    { header: 'Quiz', key: 'quiz', width: 30 },
    { header: 'Score', key: 'score', width: 10 },
    { header: 'Date', key: 'date', width: 15 },
  ];

  results?.forEach((result) => {
    worksheet.addRow({
      user: result.users.email,
      quiz: `${result.quizzes.exam_name} - ${result.quizzes.quiz_name}`,
      score: result.is_correct ? 'Correct' : 'Incorrect',
      date: new Date(result.attempted_at).toLocaleDateString(),
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename=results.xlsx',
    },
  });
}
