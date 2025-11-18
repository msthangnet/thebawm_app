

"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { QuizInfo, QuizQuestion } from "@/lib/types";
import { db, storage } from "@/lib/firebase";
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, onSnapshot, query, orderBy } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, PlusCircle, Trash2, X, Image as ImageIcon, Edit, Check } from "lucide-react";
import Image from "next/image";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const optionSchema = z.object({
  id: z.string().default(() => crypto.randomUUID()),
  text: z.string().optional(),
  imageUrl: z.string().optional(),
});

const questionFormSchema = z.object({
  questionText: z.string().min(1, "Question text is required."),
  imageUrl: z.string().optional(),
  answerType: z.enum(['radio', 'checkbox', 'text', 'true_false', 'image']),
  options: z.array(optionSchema).optional(),
  correctAnswers: z.array(z.string()).min(1, "At least one correct answer is required."),
  points: z.coerce.number().min(1, "Points must be at least 1."),
  imageFile: z.any().optional(),
});

type QuestionFormValues = z.infer<typeof questionFormSchema>;

function QuestionForm({ quiz, question, onFinished }: { quiz: QuizInfo; question?: QuizQuestion, onFinished: () => void }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(question?.imageUrl || null);
  
  const form = useForm<QuestionFormValues>({
    resolver: zodResolver(questionFormSchema),
    defaultValues: question ? {
      ...question,
      correctAnswers: question.correctAnswers || [],
    } : {
      questionText: "",
      answerType: "radio",
      options: [{ id: crypto.randomUUID(), text: "" }, { id: crypto.randomUUID(), text: "" }],
      correctAnswers: [],
      points: 1,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "options",
  });

  const answerType = form.watch("answerType");

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          form.setValue("imageFile", file);
          setImagePreview(URL.createObjectURL(file));
      }
  };

  const onSubmit = async (data: QuestionFormValues) => {
    setLoading(true);
    try {
        let imageUrl = question?.imageUrl || "";
        if (data.imageFile) {
            const file = data.imageFile as File;
            const storageRef = ref(storage, `quizzes/${quiz.id}/questions/${Date.now()}_${file.name}`);
            const uploadResult = await uploadBytes(storageRef, file);
            imageUrl = await getDownloadURL(uploadResult.ref);
        }

        const questionData = {
            quizId: quiz.id,
            questionText: data.questionText,
            imageUrl: imageUrl,
            answerType: data.answerType,
            options: data.options || [],
            correctAnswers: data.correctAnswers,
            points: data.points,
        };

        if (question) {
            await updateDoc(doc(db, "quizzes", quiz.id, "questions", question.id), questionData);
            toast({ title: "Question Updated!" });
        } else {
            await addDoc(collection(db, "quizzes", quiz.id, "questions"), {
                ...questionData,
                createdAt: serverTimestamp(),
            });
            toast({ title: "Question Added!" });
        }
        onFinished();
    } catch (error) {
        console.error("Error saving question:", error);
        toast({ title: "Error", description: "Could not save the question.", variant: "destructive" });
    } finally {
        setLoading(false);
    }
  };
  
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-2">
            <Label htmlFor="question-text">Question Text</Label>
            <Textarea id="question-text" {...form.register("questionText")} />
            {form.formState.errors.questionText && <p className="text-sm text-destructive">{form.formState.errors.questionText.message}</p>}
        </div>

        <div className="space-y-2">
            <Label htmlFor="image-file">Question Image (Optional)</Label>
            <Input id="image-file" type="file" accept="image/*" onChange={handleImageFileChange} />
            {imagePreview && <Image src={imagePreview} alt="Preview" width={100} height={100} className="rounded-md mt-2" />}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label>Answer Type</Label>
                <Select value={answerType} onValueChange={(value) => form.setValue('answerType', value as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="radio">Single Choice (Radio)</SelectItem>
                        <SelectItem value="checkbox">Multiple Choice (Checkbox)</SelectItem>
                        <SelectItem value="text">Text Input</SelectItem>
                        <SelectItem value="true_false">True/False</SelectItem>
                    </SelectContent>
                </Select>
            </div>
             <div className="space-y-2">
                <Label htmlFor="points">Points</Label>
                <Input id="points" type="number" {...form.register("points")} />
                {form.formState.errors.points && <p className="text-sm text-destructive">{form.formState.errors.points.message}</p>}
            </div>
        </div>

        {(answerType === 'radio' || answerType === 'checkbox') && (
            <div className="space-y-4">
                <Label>Options & Correct Answer</Label>
                <div className="space-y-2">
                    {fields.map((field, index) => (
                        <div key={field.id} className="flex items-center gap-2">
                            <Controller
                                control={form.control}
                                name="correctAnswers"
                                render={({ field: controllerField }) => {
                                    const optionId = form.getValues(`options.${index}.id`);
                                    return answerType === 'radio' ? (
                                        <RadioGroup onValueChange={(val) => controllerField.onChange([val])} value={controllerField.value?.[0]}>
                                            <RadioGroupItem value={optionId} id={`correct-ans-${index}`}/>
                                        </RadioGroup>
                                    ) : (
                                        <Checkbox
                                            checked={controllerField.value?.includes(optionId)}
                                            onCheckedChange={(checked) => {
                                                return checked
                                                    ? controllerField.onChange([...(controllerField.value || []), optionId])
                                                    : controllerField.onChange(controllerField.value?.filter(v => v !== optionId))
                                            }}
                                        />
                                    )
                                }}
                            />
                            <Input placeholder={`Option ${index + 1}`} {...form.register(`options.${index}.text`)} />
                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => append({ id: crypto.randomUUID(), text: "" })}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Option
                </Button>
            </div>
        )}
        
        {answerType === 'true_false' && (
             <div className="space-y-2">
                <Label>Correct Answer</Label>
                <Controller
                    control={form.control}
                    name="correctAnswers"
                    render={({ field }) => (
                        <RadioGroup onValueChange={(val) => field.onChange([val])} value={field.value?.[0]} className="flex gap-4">
                           <div className="flex items-center gap-2"><RadioGroupItem value="true" id="true" /><Label htmlFor="true">True</Label></div>
                           <div className="flex items-center gap-2"><RadioGroupItem value="false" id="false" /><Label htmlFor="false">False</Label></div>
                        </RadioGroup>
                    )}
                />
            </div>
        )}

        {answerType === 'text' && (
             <div className="space-y-2">
                <Label>Correct Answer</Label>
                <Input placeholder="Enter the exact correct answer" {...form.register('correctAnswers.0')} />
             </div>
        )}
        
         {form.formState.errors.correctAnswers && <p className="text-sm text-destructive">{form.formState.errors.correctAnswers.message}</p>}


        <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onFinished}>Cancel</Button>
            <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {question ? 'Update Question' : 'Add Question'}
            </Button>
        </div>
    </form>
  )
}


export function CreateQuestionsTab({ quiz, initialQuestions }: { quiz: QuizInfo, initialQuestions: QuizQuestion[] }) {
  const [questions, setQuestions] = useState<QuizQuestion[]>(initialQuestions);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | undefined>();

  useEffect(() => {
    const q = query(collection(db, "quizzes", quiz.id, "questions"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedQuestions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuizQuestion));
        setQuestions(fetchedQuestions);
        setLoading(false);
    });
    return () => unsubscribe();
  }, [quiz.id]);

  const openAddDialog = () => {
    setEditingQuestion(undefined);
    setDialogOpen(true);
  };

  const openEditDialog = (question: QuizQuestion) => {
    setEditingQuestion(question);
    setDialogOpen(true);
  };
  
  const handleDeleteQuestion = async (questionId: string) => {
      await deleteDoc(doc(db, "quizzes", quiz.id, "questions", questionId));
  }

  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-center">
        <div>
            <CardTitle>Manage Questions</CardTitle>
            <CardDescription>Add, edit, or remove questions for this quiz.</CardDescription>
        </div>
         <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
                <Button onClick={openAddDialog}><PlusCircle className="mr-2 h-4 w-4" /> Add Question</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{editingQuestion ? 'Edit Question' : 'Add a New Question'}</DialogTitle>
                </DialogHeader>
                <QuestionForm quiz={quiz} question={editingQuestion} onFinished={() => setDialogOpen(false)}/>
            </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
            <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
        ) : questions.length > 0 ? (
            <div className="space-y-4">
                {questions.map((q, index) => (
                    <div key={q.id} className="border p-4 rounded-lg flex justify-between items-start">
                        <div>
                            <p className="font-semibold">{index + 1}. {q.questionText}</p>
                            <p className="text-sm text-muted-foreground mt-1">Type: {q.answerType} &middot; Points: {q.points}</p>
                        </div>
                        <div className="flex gap-2">
                             <Button variant="ghost" size="icon" onClick={() => openEditDialog(q)}>
                                <Edit className="h-4 w-4" />
                            </Button>
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>This will permanently delete this question.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteQuestion(q.id)}>Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </div>
                ))}
            </div>
        ) : (
            <p className="text-center text-muted-foreground py-8">No questions have been added to this quiz yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
