import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { assignQuiz, allowResume, freshReassign } from './actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default async function AssignmentsPage() {
  const supabase = createServerComponentClient({ cookies });

  const { data: quizzes } = await supabase.from('quizzes').select('*');
  const { data: assignments } = await supabase.from('quiz_assignments').select('*, quizzes(*)');

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'assigned':
        return 'secondary';
      case 'in_progress':
        return 'default';
      case 'completed':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Assign Quiz</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={assignQuiz} className="flex items-center gap-4">
            <Input
              type="email"
              name="email"
              placeholder="User Email"
              className="w-full"
              required
            />
            <Select name="quiz_id" required>
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Select a quiz" />
              </SelectTrigger>
              <SelectContent>
                {quizzes?.map((quiz) => (
                  <SelectItem key={quiz.id} value={quiz.id}>
                    {quiz.exam_name} - {quiz.quiz_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit">Assign</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Quiz</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments?.map((assignment) => (
                <TableRow key={assignment.id}>
                  <TableCell className="font-medium">{assignment.user_email}</TableCell>
                  <TableCell>{assignment.quizzes.exam_name} - {assignment.quizzes.quiz_name}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={getStatusVariant(assignment.status)}>{assignment.status}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <form className="flex item-center justify-center gap-2">
                      <Button formAction={() => allowResume(assignment.id)} variant="outline" size="sm">Allow Resume</Button>
                      <Button formAction={() => freshReassign(assignment.id)} variant="outline" size="sm">Fresh Reassign</Button>
                    </form>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
