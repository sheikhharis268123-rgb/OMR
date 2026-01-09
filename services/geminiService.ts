
import { GoogleGenAI, Type } from "@google/genai";
import type { StudentAnswers } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function gradeOmrSheet(base64Image: string, numberOfQuestions: number): Promise<StudentAnswers> {
  const prompt = `
    You are an expert OMR (Optical Mark Recognition) sheet grading assistant.
    Your task is to analyze the provided image of an OMR answer sheet and extract the student's marked answers.
    The sheet contains answers for ${numberOfQuestions} questions.
    For each question number from 1 to ${numberOfQuestions}, identify which option (A, B, C, or D) is filled in.

    Follow these rules precisely:
    1. If a single option is clearly filled for a question, record that option (e.g., "A", "B", "C", "D").
    2. If no option is filled for a question, record it as "Unanswered".
    3. If more than one option is filled for a single question, record it as "Multiple".
    4. Ignore any stray marks or partially filled bubbles that are not clearly marked. Focus on the most confidently filled bubble.

    Return your analysis as a single, valid JSON array of objects.
    Each object in the array should represent a question and have two string properties: "questionNumber" and "answer".
    The "answer" should be the corresponding marked answer ("A", "B", "C", "D"), "Unanswered", or "Multiple".

    Example for 5 questions:
    [
      { "questionNumber": "1", "answer": "C" },
      { "questionNumber": "2", "answer": "A" },
      { "questionNumber": "3", "answer": "Unanswered" },
      { "questionNumber": "4", "answer": "D" },
      { "questionNumber": "5", "answer": "Multiple" }
    ]

    Analyze the image and provide the JSON output. Do not include any other text, explanations, or markdown formatting.
  `;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // Using a powerful model for better accuracy in vision tasks
      contents: { 
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image,
            },
          },
          { text: prompt },
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              questionNumber: { type: Type.STRING },
              answer: { type: Type.STRING },
            },
            required: ['questionNumber', 'answer'],
          },
        },
      },
    });

    if (!response.text) {
        throw new Error("The AI model returned an empty response. The image might be unclear.");
    }
    
    let jsonString = response.text.trim();
    
    const parsedResponse: {questionNumber: string, answer: string}[] = JSON.parse(jsonString);
    
    const studentAnswers = parsedResponse.reduce((acc, item) => {
      acc[item.questionNumber] = item.answer;
      return acc;
    }, {} as StudentAnswers);

    return studentAnswers;

  } catch (error: any) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof SyntaxError) {
        throw new Error("Failed to parse the AI model's response. The format was invalid.");
    }
    throw new Error(`An error occurred while communicating with the AI model: ${error.message}`);
  }
}