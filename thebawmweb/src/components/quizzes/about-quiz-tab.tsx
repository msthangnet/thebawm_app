
"use client";

import { QuizInfo } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Info, Calendar, Clock, Lock, Globe, Repeat, Timer } from "lucide-react";
import { format } from "date-fns";

export function AboutQuizTab({ quiz }: { quiz: QuizInfo }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>About {quiz.name}</CardTitle>
                <CardDescription>Information about this quiz.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {quiz.description && (
                     <div>
                        <h3 className="font-semibold mb-2">Description</h3>
                        <p className="text-muted-foreground">{quiz.description}</p>
                    </div>
                )}
                 <div className="grid md:grid-cols-2 gap-4 pt-4">
                    <div className="flex items-center gap-3">
                        <Info className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm">Category: <span className="font-semibold">{quiz.category}</span></span>
                    </div>
                     <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm">Created on: <span className="font-semibold">{format(new Date(quiz.createdAt), 'PP')}</span></span>
                    </div>
                     <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-muted-foreground" />
                         <span className="text-sm">Starts: <span className="font-semibold">{format(new Date(quiz.startDate), 'PPp')}</span></span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm">Ends: <span className="font-semibold">{format(new Date(quiz.endDate), 'PPp')}</span></span>
                    </div>
                    <div className="flex items-center gap-3">
                        {quiz.quizType === 'private' ? <Lock className="h-5 w-5 text-muted-foreground" /> : <Globe className="h-5 w-5 text-muted-foreground" />}
                        <span className="text-sm">Privacy: <span className="font-semibold">{quiz.quizType.charAt(0).toUpperCase() + quiz.quizType.slice(1)}</span></span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Timer className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm">Time Limit: <span className="font-semibold">{quiz.timeLimitMinutes} minutes</span></span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Repeat className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm">Attempts Allowed: <span className="font-semibold">{quiz.attemptLimit}</span></span>
                    </div>
                 </div>

            </CardContent>
        </Card>
    )
}
