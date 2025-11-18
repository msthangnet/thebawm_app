

"use client";

import { useState, useEffect } from "react";
import { QuizInfo, QuizQuestion } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, doc, updateDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Send, CheckCircle, XCircle } from "lucide-react";
import Image from "next/image";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";

type AnswersState = Record<string, string[]>;

export function QuizAttempt({ quiz, questions, onFinish }: { quiz: QuizInfo; questions: QuizQuestion[]; onFinish: () => void; }) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<'intro' | 'active' | 'finished'>('intro');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswersState>({});
  const [timeLeft, setTimeLeft] = useState(quiz.timeLimitMinutes * 60);
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState(0);
  const [submissionId, setSubmissionId] = useState<string | null>(null);

  useEffect(() => {
    if (step !== 'active') return;
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [step, timeLeft]);

  const handleStartQuiz = async () => {
    if (!user) {
        toast({ title: "Error", description: "You must be logged in to start."});
        return;
    }
    setLoading(true);
    try {
        const newSubmissionRef = await addDoc(collection(db, "quizSubmissions"), {
            quizId: quiz.id,
            userId: user.uid,
            answers: {},
            score: 0,
            startedAt: serverTimestamp(),
            completedAt: null,
            status: 'started'
        });
        setSubmissionId(newSubmissionRef.id);
        setStep('active');
    } catch(error) {
        console.error("Error starting quiz attempt:", error);
        toast({ title: "Error", description: "Could not start the quiz. Please try again." });
    } finally {
        setLoading(false);
    }
  }

  const handleAnswerChange = (questionId: string, answer: string, isMultiChoice: boolean) => {
    setAnswers(prev => {
      const existingAnswers = prev[questionId] || [];
      if (isMultiChoice) {
        if (existingAnswers.includes(answer)) {
          return { ...prev, [questionId]: existingAnswers.filter(a => a !== answer) };
        } else {
          return { ...prev, [questionId]: [...existingAnswers, answer] };
        }
      } else {
        return { ...prev, [questionId]: [answer] };
      }
    });
  };

  const calculateScore = () => {
    let totalScore = 0;
    questions.forEach(q => {
      const userAnswers = (answers[q.id] || []).sort();
      const correctAnswers = q.correctAnswers.sort();
      
      let isCorrect = false;
      if (q.answerType === 'checkbox') {
        isCorrect = userAnswers.length === correctAnswers.length && userAnswers.every((val, index) => val === correctAnswers[index]);
      } else {
        isCorrect = userAnswers.length === 1 && correctAnswers.includes(userAnswers[0]);
      }

      if (isCorrect) {
        totalScore += q.points;
      }
    });
    return totalScore;
  };

  const handleSubmit = async () => {
    setLoading(true);
    const finalScore = calculateScore();
    setScore(finalScore);
    
    if (user && submissionId) {
        try {
            const submissionRef = doc(db, "quizSubmissions", submissionId);
            await updateDoc(submissionRef, {
                answers: answers,
                score: finalScore,
                completedAt: serverTimestamp(),
                status: 'completed'
            });
        } catch (error) {
            console.error("Error saving submission:", error);
            toast({title: "Error", description: "Could not save your quiz results.", variant: "destructive"});
        }
    }
    
    setStep('finished');
    setLoading(false);
  };
  
  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onFinish()}>
        <DialogContent className="max-w-4xl w-full p-0" onPointerDownOutside={(e) => e.preventDefault()}>
            {step === 'intro' && (
                <div className="p-6 text-center space-y-4">
                    <DialogHeader>
                        <DialogTitle className="text-2xl">You are about to start "{quiz.name}"</DialogTitle>
                        <DialogDescription>
                            There are {questions.length} questions. You will have {quiz.timeLimitMinutes} minutes to complete the quiz.
                        </DialogDescription>
                    </DialogHeader>
                    <Button onClick={handleStartQuiz} size="lg" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm & Start Quiz
                    </Button>
                </div>
            )}
             {step === 'active' && currentQuestion && (
                 <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <CardTitle>Question {currentQuestionIndex + 1} of {questions.length}</CardTitle>
                        <div className="font-mono text-lg bg-muted px-3 py-1 rounded-md">
                            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                        </div>
                    </div>
                    <Progress value={progress} className="mb-6" />

                    <div className="space-y-6">
                        <h2 className="text-xl font-semibold">{currentQuestion.questionText}</h2>
                        {currentQuestion.imageUrl && (
                            <div className="relative h-64 w-full">
                                <Image src={currentQuestion.imageUrl} alt="Question image" fill objectFit="contain" className="rounded-md" />
                            </div>
                        )}
                        
                        <div className="space-y-4">
                            {currentQuestion.answerType === 'radio' && currentQuestion.options && (
                                <RadioGroup onValueChange={(val) => handleAnswerChange(currentQuestion.id, val, false)} value={(answers[currentQuestion.id] || [])[0]}>
                                {currentQuestion.options.map(opt => (
                                    <div key={opt.id} className="flex items-center space-x-2">
                                        <RadioGroupItem value={opt.id} id={opt.id} />
                                        <Label htmlFor={opt.id}>{opt.text}</Label>
                                    </div>
                                ))}
                                </RadioGroup>
                            )}
                            {currentQuestion.answerType === 'checkbox' && currentQuestion.options && (
                                <div className="space-y-2">
                                {currentQuestion.options.map(opt => (
                                    <div key={opt.id} className="flex items-center space-x-2">
                                        <Checkbox 
                                            id={opt.id} 
                                            checked={(answers[currentQuestion.id] || []).includes(opt.id)}
                                            onCheckedChange={() => handleAnswerChange(currentQuestion.id, opt.id, true)}
                                        />
                                        <Label htmlFor={opt.id}>{opt.text}</Label>
                                    </div>
                                ))}
                                </div>
                            )}
                            {currentQuestion.answerType === 'text' && (
                                <Input 
                                    placeholder="Type your answer" 
                                    value={(answers[currentQuestion.id] || [])[0] || ''} 
                                    onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value, false)}
                                />
                            )}
                            {currentQuestion.answerType === 'true_false' && (
                                <RadioGroup onValueChange={(val) => handleAnswerChange(currentQuestion.id, val, false)} value={(answers[currentQuestion.id] || [])[0]} className="flex gap-4">
                                    <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="true" id="true" />
                                    <Label htmlFor="true">True</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="false" id="false" />
                                    <Label htmlFor="false">False</Label>
                                    </div>
                                </RadioGroup>
                            )}
                        </div>

                        <div className="flex justify-end pt-4">
                            {currentQuestionIndex < questions.length - 1 ? (
                                <Button onClick={() => setCurrentQuestionIndex(i => i + 1)}>Next</Button>
                            ) : (
                                <Button onClick={handleSubmit} disabled={loading}>
                                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4" />}
                                    Submit
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {step === 'finished' && (
                 <div className="p-6 text-center space-y-4">
                    <DialogHeader>
                        <DialogTitle className="text-2xl">Yay, you made it!</DialogTitle>
                        <DialogDescription>
                            You have successfully completed the quiz. Check the leaderboard to see your rank!
                        </DialogDescription>
                    </DialogHeader>
                    <p className="text-4xl font-bold">{score} / {questions.reduce((acc, q) => acc + q.points, 0)}</p>
                    <Button onClick={onFinish}>Okay</Button>
                </div>
            )}
             <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                <XCircle className="h-6 w-6" />
                <span className="sr-only">Close</span>
            </DialogClose>
        </DialogContent>
    </Dialog>
  );
}
