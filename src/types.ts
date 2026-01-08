// FIX: Changed questionNumber index type from number to string for compatibility with Object.entries. This fixes type inference issues in App.tsx.
export interface AnswerKey {
  [questionNumber: string]: string; // e.g., { "1": 'A', "2": 'C', ... }
}

export interface StudentAnswers {
  [questionNumber: string]: string; // e.g., { "1": "A", "2": "D", "3": "Unanswered" }
}

export interface GradedAnswer {
  questionNumber: number;
  correctAnswer: string;
  studentAnswer: string;
  status: 'correct' | 'incorrect' | 'unanswered';
}

export interface GradingResult {
  score: number;
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  details: GradedAnswer[];
}