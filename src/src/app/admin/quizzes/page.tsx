import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface Quiz {
  id: string;
  quiz_name: string;
  exam_name: string;
  status: string;
  duration: number;
  quiz_questions: { count: number }[];
}

export default async function QuizzesPage() {
  const supabase = createServerComponentClient({ cookies });

  const { data: quizzes } = await supabase
    .from('quizzes')
    .select('*, quiz_questions(count)')
    .order('created_at', { ascending: false });

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Quiz Cards</h1>
        <Button asChild>
          <Link href="/admin/quizzes/create">+ Create Quiz</Link>
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {quizzes?.map((quiz: Quiz) => (
          <Card key={quiz.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle>{quiz.quiz_name}</CardTitle>
                <div className={`w-3 h-3 rounded-full ${quiz.status === 'activated' ? 'bg-green-500' : 'bg-gray-400'}`} />
              </div>
              <CardDescription>{quiz.exam_name}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Status: <span className="font-medium text-foreground">{quiz.status}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Number of Questions: <span className="font-medium text-foreground">{quiz.quiz_questions[0]?.count || 0}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Duration: <span className="font-medium text-foreground">{quiz.duration} minutes</span>
              </p>
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button asChild variant="secondary">
                <Link href={`/admin/quizzes/${quiz.id}/questions`}>Questions</Link>
              </Button>
              <Button variant="outline">
                {quiz.status === 'activated' ? 'Deactivate' : 'Activate'}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}