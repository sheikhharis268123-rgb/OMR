

import React, { useState, useCallback, useMemo } from 'react';
import { gradeOmrSheet } from './services/geminiService';
import type { AnswerKey, GradedAnswer, GradingResult } from './types';
import { CheckCircleIcon, DocumentArrowUpIcon, ExclamationCircleIcon, SparklesIcon, XCircleIcon } from './components/Icons';

// Define components outside parent to prevent re-renders
const Header: React.FC = () => (
  <header className="bg-white shadow-md">
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex items-center space-x-4">
      <div className="bg-green-600 p-2 rounded-lg">
        <SparklesIcon className="h-8 w-8 text-white" />
      </div>
      <div>
        <h1 className="text-3xl font-bold text-gray-900">OMR Sheet Grader</h1>
        <p className="text-gray-500">Institute of BISE Multan</p>
      </div>
    </div>
  </header>
);

const Loader: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex flex-col items-center justify-center p-8 text-center bg-white rounded-lg shadow-lg">
    <svg className="animate-spin -ml-1 mr-3 h-10 w-10 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    <p className="mt-4 text-lg font-semibold text-gray-700">{message}</p>
    <p className="text-sm text-gray-500">AI is analyzing the sheet. This may take a moment.</p>
  </div>
);

const ErrorDisplay: React.FC<{ message: string; onRetry: () => void }> = ({ message, onRetry }) => (
  <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-center">
    <ExclamationCircleIcon className="h-12 w-12 text-red-500 mx-auto" />
    <h3 className="text-xl font-semibold text-red-800 mt-4">An Error Occurred</h3>
    <p className="text-red-600 mt-2">{message}</p>
    <button
      onClick={onRetry}
      className="mt-6 inline-flex items-center px-6 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
    >
      Try Again
    </button>
  </div>
);

export default function App() {
  const [numberOfQuestions, setNumberOfQuestions] = useState<number>(20);
  const [answerKey, setAnswerKey] = useState<AnswerKey>({});
  const [sheetImage, setSheetImage] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [gradingResult, setGradingResult] = useState<GradingResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isSetupComplete = useMemo(() => {
    if (!sheetImage) return false;
    const keyAnswers = Object.values(answerKey);
    return keyAnswers.length === numberOfQuestions && keyAnswers.every(ans => ans);
  }, [sheetImage, answerKey, numberOfQuestions]);

  const handleKeyChange = (qNumber: number, value: string) => {
    setAnswerKey(prev => ({ ...prev, [qNumber]: value.toUpperCase() }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSheetImage(file);
      setImageUrl(URL.createObjectURL(file));
    }
  };
  
  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = (reader.result as string).split(',')[1];
        resolve(result);
      };
      reader.onerror = error => reject(error);
    });

  const handleGrade = async () => {
    if (!sheetImage) {
      setError("Please upload an OMR sheet image.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setGradingResult(null);

    try {
      const base64Image = await fileToBase64(sheetImage);
      const studentAnswers = await gradeOmrSheet(base64Image, numberOfQuestions);

      let correctCount = 0;
      let incorrectCount = 0;
      let unansweredCount = 0;

      const gradedAnswers: GradedAnswer[] = Object.entries(answerKey).map(([qNumStr, correctAns]) => {
        const qNum = parseInt(qNumStr, 10);
        // FIX: Use the string key `qNumStr` for lookup in `studentAnswers` for type safety.
        const studentAns = studentAnswers[qNumStr] || 'Unanswered';
        let status: 'correct' | 'incorrect' | 'unanswered' = 'incorrect';

        // FIX: Cast `correctAns` to string. TypeScript can infer `correctAns` as `unknown`
        // from `Object.entries` on an object with an index signature, causing type errors.
        if (studentAns.toLowerCase() === 'unanswered') {
          unansweredCount++;
          status = 'unanswered';
        } else if (studentAns.toUpperCase() === (correctAns as string).toUpperCase()) {
          correctCount++;
          status = 'correct';
        } else {
          incorrectCount++;
        }

        return {
          questionNumber: qNum,
          correctAnswer: correctAns as string,
          studentAnswer: studentAns,
          status,
        };
      });
      
      gradedAnswers.sort((a,b) => a.questionNumber - b.questionNumber);
      
      setGradingResult({
        score: correctCount,
        totalQuestions: numberOfQuestions,
        correctCount,
        incorrectCount,
        unansweredCount,
        details: gradedAnswers,
      });

    } catch (err: any) {
      setError(err.message || 'Failed to grade the sheet. Please check the image and try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const resetApp = () => {
      setAnswerKey({});
      setSheetImage(null);
      setImageUrl(null);
      setGradingResult(null);
      setIsLoading(false);
      setError(null);
  };

  const renderContent = () => {
    if (isLoading) {
      return <Loader message="Grading in Progress..." />;
    }
    if (error) {
        return <ErrorDisplay message={error} onRetry={() => {
            setError(null);
            setIsLoading(false);
        }} />;
    }
    if (gradingResult) {
      return renderResults();
    }
    return renderSetup();
  };
  
  const renderSetup = () => (
    <div className="bg-white p-8 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 border-b pb-4 mb-6">1. Setup Answer Key & Upload Sheet</h2>
      
      <div className="mb-6">
        <label htmlFor="numQuestions" className="block text-sm font-medium text-gray-700">Number of Questions</label>
        <input
          type="number"
          id="numQuestions"
          value={numberOfQuestions}
          onChange={(e) => setNumberOfQuestions(Math.max(1, parseInt(e.target.value, 10) || 1))}
          className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
        />
      </div>

      <div className="grid grid-cols-5 md:grid-cols-10 gap-4 mb-8">
        {Array.from({ length: numberOfQuestions }, (_, i) => i + 1).map(qNum => (
          <div key={qNum}>
            <label htmlFor={`q-${qNum}`} className="block text-xs font-medium text-gray-500 text-center">{qNum}</label>
            <input
              type="text"
              id={`q-${qNum}`}
              maxLength={1}
              value={answerKey[qNum] || ''}
              onChange={(e) => handleKeyChange(qNum, e.target.value)}
              className="mt-1 block w-full text-center border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
            />
          </div>
        ))}
      </div>
      
      <div className="mt-6">
         <label className="block text-sm font-medium text-gray-700 mb-2">Upload OMR Sheet</label>
         <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
            <div className="space-y-1 text-center">
               <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
               <div className="flex text-sm text-gray-600">
                  <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-green-600 hover:text-green-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-green-500">
                     <span>Upload a file</span>
                     <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept="image/*" />
                  </label>
                  <p className="pl-1">or drag and drop</p>
               </div>
               <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
            </div>
         </div>
      </div>

      {imageUrl && (
        <div className="mt-6 text-center">
            <p className="text-sm font-medium text-gray-900">Image Preview:</p>
            <img src={imageUrl} alt="OMR Sheet Preview" className="mt-2 inline-block max-h-60 rounded-md border" />
        </div>
      )}

      <div className="mt-8 pt-5 border-t">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleGrade}
            disabled={!isSetupComplete || isLoading}
            className="ml-3 inline-flex justify-center py-3 px-8 border border-transparent shadow-sm text-lg font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Grade Sheet
          </button>
        </div>
      </div>
    </div>
  );

  const renderResults = () => {
    if (!gradingResult) return null;
    const { score, totalQuestions, correctCount, incorrectCount, unansweredCount, details } = gradingResult;

    const scorePercentage = (score / totalQuestions) * 100;
    let scoreColor = 'text-green-600';
    if(scorePercentage < 75) scoreColor = 'text-yellow-600';
    if(scorePercentage < 40) scoreColor = 'text-red-600';

    return (
        <div className="bg-white p-8 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold text-gray-800 border-b pb-4 mb-6">Grading Complete</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">Summary</h3>
                    <div className="bg-gray-50 p-6 rounded-lg text-center mb-6">
                        <p className="text-xl text-gray-600">Total Score</p>
                        <p className={`text-6xl font-bold ${scoreColor}`}>{score} <span className="text-4xl text-gray-500">/ {totalQuestions}</span></p>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="bg-green-100 p-4 rounded-lg">
                            <p className="text-sm font-medium text-green-800">Correct</p>
                            <p className="text-2xl font-bold text-green-700">{correctCount}</p>
                        </div>
                        <div className="bg-red-100 p-4 rounded-lg">
                            <p className="text-sm font-medium text-red-800">Incorrect</p>
                            <p className="text-2xl font-bold text-red-700">{incorrectCount}</p>
                        </div>
                        <div className="bg-gray-200 p-4 rounded-lg">
                            <p className="text-sm font-medium text-gray-800">Unanswered</p>
                            <p className="text-2xl font-bold text-gray-700">{unansweredCount}</p>
                        </div>
                    </div>
                    {imageUrl && (
                        <div className="mt-8">
                            <h3 className="text-lg font-semibold text-gray-700 mb-4">Submitted Sheet</h3>
                            <img src={imageUrl} alt="Graded OMR Sheet" className="w-full rounded-md border shadow-sm" />
                        </div>
                    )}
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">Detailed Breakdown</h3>
                    <div className="overflow-y-auto max-h-[600px] border rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Q#</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Correct</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Your Answer</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Result</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {details.map(item => (
                                    <tr key={item.questionNumber} className={item.status === 'incorrect' ? 'bg-red-50' : item.status === 'unanswered' ? 'bg-gray-50' : ''}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.questionNumber}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-bold">{item.correctAnswer}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.studentAnswer}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            {item.status === 'correct' && <CheckCircleIcon className="h-5 w-5 text-green-500" />}
                                            {item.status === 'incorrect' && <XCircleIcon className="h-5 w-5 text-red-500" />}
                                            {item.status === 'unanswered' && <span className="text-xs text-gray-500">-</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            <div className="mt-8 pt-5 border-t">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={resetApp}
                  className="ml-3 inline-flex justify-center py-3 px-8 border border-transparent shadow-sm text-lg font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Grade Another Sheet
                </button>
              </div>
            </div>
        </div>
    );
  };
  
  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <main>
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}