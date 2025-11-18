

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import type { QuizInfo, QuizQuestion } from "@/lib/types";
import React, { ReactNode } from "react";
import { notFound } from 'next/navigation';


export default async function QuizLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { quizId: string };
}) {

  return (
    <div>
      <div className="container mx-auto px-4 py-8">
        {children}
      </div>
    </div>
  );
}
