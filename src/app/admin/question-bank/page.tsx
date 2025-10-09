import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Edit, Trash2 } from 'lucide-react';

const PAGE_SIZE = 10;

const getDifficultyVariant = (difficulty: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (difficulty) {
    case 'easy':
      return 'default';
    case 'medium':
      return 'secondary';
    case 'tough':
      return 'destructive';
    default:
      return 'outline';
  }
};

export default async function QuestionBankPage({ searchParams }: { searchParams: { q: string, difficulty: string, page: string } }) {
  const supabase = await createClient();
  const page = parseInt(searchParams.page || '1', 10);
  const offset = (page - 1) * PAGE_SIZE;

  let countQuery = supabase.from('questions').select('count', { count: 'exact' });
  let dataQuery = supabase.from('questions').select('*');

  if (searchParams.q) {
    countQuery = countQuery.ilike('question_text', `%${searchParams.q}%`);
    dataQuery = dataQuery.ilike('question_text', `%${searchParams.q}%`);
  }

  if (searchParams.difficulty && searchParams.difficulty !== 'all') {
    countQuery = countQuery.eq('difficulty_level', searchParams.difficulty);
    dataQuery = dataQuery.eq('difficulty_level', searchParams.difficulty);
  }

  const { data: questions } = await dataQuery.range(offset, offset + PAGE_SIZE - 1);
  const { data: count } = await countQuery;

  const totalPages = Math.ceil((count?.[0]?.count || 0) / PAGE_SIZE);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Question Bank</CardTitle>
          <Button asChild>
            <Link href="/admin/question-bank/add">+ Add Question</Link>
          </Button>
        </div>
        <div className="mt-4">
          <form>
            <div className="flex items-center gap-4">
              <Input
                type="text"
                name="q"
                defaultValue={searchParams.q}
                placeholder="Search questions..."
                className="w-full"
              />
              <Select name="difficulty" defaultValue={searchParams.difficulty}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Difficulties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Difficulties</SelectItem>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="tough">Tough</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit">Search</Button>
            </div>
          </form>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Question</TableHead>
              <TableHead>Difficulty</TableHead>
              <TableHead className="text-center">Attempts</TableHead>
              <TableHead className="text-center">Correct</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.isArray(questions) && questions.map((question) => (
              <TableRow key={question.id}>
                <TableCell className="font-medium">{question.question_text}</TableCell>
                <TableCell>
                  <Badge variant={getDifficultyVariant(question.difficulty_level)}>
                    {question.difficulty_level}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">{question.total_attempts}</TableCell>
                <TableCell className="text-center">{question.correct_attempts}</TableCell>
                <TableCell className="text-center">
                  <div className="flex item-center justify-center gap-2">
                    <Button asChild variant="ghost" size="icon">
                      <Link href={`/admin/question-bank/edit/${question.id}`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button asChild variant="ghost" size="icon">
                      <Link href={`/admin/question-bank/delete/${question.id}`}>
                        <Trash2 className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      {Number.isFinite(totalPages) && totalPages > 0 && (
        <div className="p-4">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious href={`?page=${page - 1}&q=${searchParams.q || ''}&difficulty=${searchParams.difficulty || ''}`} />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <PaginationItem key={p}>
                  <PaginationLink href={`?page=${p}&q=${searchParams.q || ''}&difficulty=${searchParams.difficulty || ''}`} isActive={p === page}>
                    {p}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext href={`?page=${page + 1}&q=${searchParams.q || ''}&difficulty=${searchParams.difficulty || ''}`} />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </Card>
  );
}
