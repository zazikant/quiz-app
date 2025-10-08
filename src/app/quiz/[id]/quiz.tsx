'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { updateProgress, updateAssignmentIndex, completeQuiz } from './actions';

export function Quiz({ assignment, questions }) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(assignment.current_question_index);
  const [selectedAnswer, setSelectedAnswer] = useState(questions[currentIndex]?.answer_id);

  const currentQuestion = questions[currentIndex];
  const progress = (currentIndex / questions.length) * 100;

  const handleNext = async () => {
    if (selectedAnswer) {
      await updateProgress(currentQuestion.id, selectedAnswer);
    }
    const nextIndex = currentIndex + 1;
    await updateAssignmentIndex(assignment.id, nextIndex);
    setCurrentIndex(nextIndex);
    setSelectedAnswer(questions[nextIndex]?.answer_id);
  };

  const handlePrevious = async () => {
    if (selectedAnswer) {
      await updateProgress(currentQuestion.id, selectedAnswer);
    }
    const prevIndex = currentIndex - 1;
    await updateAssignmentIndex(assignment.id, prevIndex);
    setCurrentIndex(prevIndex);
    setSelectedAnswer(questions[prevIndex]?.answer_id);
  };

  const handleComplete = async () => {
    if (selectedAnswer) {
      await updateProgress(currentQuestion.id, selectedAnswer);
    }
    await completeQuiz(assignment.id);
    router.push('/dashboard');
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <Progress value={progress} className="mb-4" />
        <CardTitle>{currentQuestion.questions.question_text}</CardTitle>
      </CardHeader>
      <CardContent>
        <RadioGroup value={selectedAnswer} onValueChange={setSelectedAnswer} className="space-y-4">
          {currentQuestion.questions.answers.map((answer) => (
            <div key={answer.id} className="flex items-center space-x-2">
              <RadioGroupItem value={answer.id} id={answer.id} />
              <Label htmlFor={answer.id}>{answer.answer_text}</Label>
            </div>
          ))}
        </RadioGroup>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button onClick={handlePrevious} disabled={currentIndex === 0} variant="outline">
          Previous
        </Button>
        {currentIndex < questions.length - 1 ? (
          <Button onClick={handleNext}>Next</Button>
        ) : (
          <Button onClick={handleComplete}>Complete</Button>
        )}
      </CardFooter>
    </Card>
  );
}
