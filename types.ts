
export interface AnswerKey {
  [questionNumber: string]: string;
}

export interface StudentAnswers {
  [questionNumber: string]: string;
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

// Represents a single version of an exam (e.g., for a specific sheet code)
export interface ExamVersion {
  code: string;
  answerKey: AnswerKey;
}

// Represents a complete exam for a subject, containing multiple versions
export interface Exam {
  id: string;
  classLevel: string; // '9', '10', '11', '12'
  group: string;      // 'Group 1', 'Group 2'
  subject: string;
  numberOfQuestions: number;
  versions: ExamVersion[];
}
