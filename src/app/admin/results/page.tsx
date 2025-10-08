import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { deleteUserAttempt } from './actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Trash2 } from 'lucide-react';

const PAGE_SIZE = 10;

export default async function ResultsPage({ searchParams }: { searchParams: { page: string, user: string, quiz: string, date: string } }) {
  const supabase = createServerComponentClient({ cookies });
  const page = parseInt(searchParams.page || '1', 10);
  const offset = (page - 1) * PAGE_SIZE;

  let countQuery = supabase.from('user_attempts').select('count', { count: 'exact' });
  let dataQuery = supabase.from('user_attempts').select('*, users(*), quizzes(*)');

  if (searchParams.user) {
    countQuery = countQuery.ilike('users.email', `%${searchParams.user}%`);
    dataQuery = dataQuery.ilike('users.email', `%${searchParams.user}%`);
  }

  if (searchParams.quiz) {
    countQuery = countQuery.ilike('quizzes.exam_name', `%${searchParams.quiz}%`);
    dataQuery = dataQuery.ilike('quizzes.exam_name', `%${searchParams.quiz}%`);
  }

  if (searchParams.date) {
    countQuery = countQuery.gte('attempted_at', new Date(searchParams.date).toISOString()).lte('attempted_at', new Date(searchParams.date).toISOString().replace('00:00:00', '23:59:59'));
    dataQuery = dataQuery.gte('attempted_at', new Date(searchParams.date).toISOString()).lte('attempted_at', new Date(searchParams.date).toISOString().replace('00:00:00', '23:59:59'));
  }

  const { data: results } = await dataQuery.range(offset, offset + PAGE_SIZE - 1);
  const { data: count } = await countQuery;

  const totalPages = Math.ceil((count?.[0]?.count || 0) / PAGE_SIZE);

  return (
    <div className="container mx-auto p-4 space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Filter Results</CardTitle>
        </CardHeader>
        <CardContent>
          <form>
            <div className="flex items-center gap-4">
              <Input
                type="text"
                name="user"
                defaultValue={searchParams.user}
                placeholder="Filter by user..."
                className="w-full"
              />
              <Input
                type="text"
                name="quiz"
                defaultValue={searchParams.quiz}
                placeholder="Filter by quiz..."
                className="w-full"
              />
              <Input
                type="date"
                name="date"
                defaultValue={searchParams.date}
                className="w-full"
              />
              <Button type="submit">Filter</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>All Results</CardTitle>
            <Button asChild variant="outline">
              <a href="/api/admin/results/export" download>📥 Download Excel</a>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Quiz</TableHead>
                <TableHead className="text-center">Score</TableHead>
                <TableHead className="text-center">Date</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results?.map((result) => (
                <TableRow key={result.id}>
                  <TableCell className="font-medium">{result.users.email}</TableCell>
                  <TableCell>{result.quizzes.exam_name} - {result.quizzes.quiz_name}</TableCell>
                  <TableCell className="text-center">{result.is_correct ? 'Correct' : 'Incorrect'}</TableCell>
                  <TableCell className="text-center">{new Date(result.attempted_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-center">
                    <form action={deleteUserAttempt}>
                      <input type="hidden" name="id" value={result.id} />
                      <Button variant="ghost" size="icon" type="submit">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <div className="p-4">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious href={`?page=${page - 1}&user=${searchParams.user || ''}&quiz=${searchParams.quiz || ''}&date=${searchParams.date || ''}`} />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <PaginationItem key={p}>
                  <PaginationLink href={`?page=${p}&user=${searchParams.user || ''}&quiz=${searchParams.quiz || ''}&date=${searchParams.date || ''}`} isActive={p === page}>
                    {p}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext href={`?page=${page + 1}&user=${searchParams.user || ''}&quiz=${searchParams.quiz || ''}&date=${searchParams.date || ''}`} />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </Card>
    </div>
  );
}
