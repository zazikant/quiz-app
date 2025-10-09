import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const supabase = createServerComponentClient({ cookies });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/');
  }

  const { data: assignments } = await supabase
    .from('quiz_assignments')
    .select('*, quizzes(*, quiz_questions(count))')
    .in('status', ['assigned', 'in_progress'])
    .eq('user_email', session.user.email);

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
      </div>
      <p className="mb-8 text-lg">Welcome, {session.user.email}</p>
      <h2 className="text-2xl font-bold mb-6">Your Quizzes</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {assignments?.map((assignment) => (
          <Card key={assignment.id}>
            <CardHeader>
              <CardTitle>{assignment.quizzes.exam_name}</CardTitle>
              <CardDescription>
                {assignment.quizzes.quiz_questions[0].count} Questions | {assignment.quizzes.duration} Minutes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className={`text-sm ${assignment.status === 'in_progress' ? 'text-blue-500' : 'text-muted-foreground'}`}>
                Status: {assignment.status === 'in_progress' ? `In Progress (${assignment.current_question_index} / ${assignment.quizzes.quiz_questions[0].count})` : 'Not Started'}
              </p>
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full">
                <Link href={`/quiz/${assignment.id}`}>
                  {assignment.status === 'in_progress' ? 'Resume Quiz' : 'Start Quiz'}
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}