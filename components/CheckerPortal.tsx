
import React, { useState, useEffect, useMemo } from 'react';
import { gradeOmrSheet } from '../services/geminiService';
import type { GradedAnswer, GradingResult, Exam, AnswerKey } from '../types';
import { CheckCircleIcon, DocumentArrowUpIcon, ExclamationCircleIcon, XCircleIcon } from './Icons';

const Loader: React.FC<{ message: string }> = ({ message }) => (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-white rounded-lg shadow-lg"><svg className="animate-spin -ml-1 mr-3 h-10 w-10 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><p className="mt-4 text-lg font-semibold text-gray-700">{message}</p><p className="text-sm text-gray-500">AI is analyzing the sheet. This may take a moment.</p></div>);
  
const ErrorDisplay: React.FC<{ message: string; onRetry: () => void }> = ({ message, onRetry }) => (
    <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-center"><ExclamationCircleIcon className="h-12 w-12 text-red-500 mx-auto" /><h3 className="text-xl font-semibold text-red-800 mt-4">An Error Occurred</h3><p className="text-red-600 mt-2">{message}</p><button onClick={onRetry} className="mt-6 inline-flex items-center px-6 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">Try Again</button></div>);

export default function CheckerPortal() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [sheetImage, setSheetImage] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [gradingResult, setGradingResult] = useState<GradingResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // State for cascading dropdowns
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedCode, setSelectedCode] = useState('');

  useEffect(() => {
    try {
      const savedExams = localStorage.getItem('omr-exams');
      if (savedExams) setExams(JSON.parse(savedExams));
    } catch(e) { console.error("Failed to load exams", e) }
  }, []);

  // Memoized lists for dropdowns
  const availableClasses = useMemo(() => [...new Set(exams.map(e => e.classLevel))], [exams]);
  const availableGroups = useMemo(() => selectedClass ? [...new Set(exams.filter(e => e.classLevel === selectedClass).map(e => e.group))] : [], [exams, selectedClass]);
  const availableSubjects = useMemo(() => selectedGroup ? exams.filter(e => e.classLevel === selectedClass && e.group === selectedGroup) : [], [exams, selectedClass, selectedGroup]);
  const selectedExam = useMemo(() => exams.find(e => e.id === selectedExamId), [exams, selectedExamId]);
  const availableCodes = useMemo(() => selectedExam?.versions.map(v => v.code) || [], [selectedExam]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]; setSheetImage(file); setImageUrl(URL.createObjectURL(file)); setGradingResult(null);
    }
  };
  
  const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
  });

  const handleGrade = async () => {
    const answerKey = selectedExam?.versions.find(v => v.code === selectedCode)?.answerKey;
    if (!sheetImage || !selectedExam || !answerKey) {
      setError("Please complete all selections and upload an OMR sheet.");
      return;
    }
    setIsLoading(true); setError(null); setGradingResult(null);

    try {
      const base64Image = await fileToBase64(sheetImage);
      const studentAnswers = await gradeOmrSheet(base64Image, selectedExam.numberOfQuestions);
      let correctCount = 0, incorrectCount = 0, unansweredCount = 0;
      
      const gradedAnswers: GradedAnswer[] = Object.entries(answerKey).map(([qNumStr, correctAns]) => {
        const qNum = parseInt(qNumStr, 10);
        const studentAns = studentAnswers[qNumStr] || 'Unanswered';
        let status: 'correct' | 'incorrect' | 'unanswered' = 'incorrect';
        // FIX: Cast `correctAns` to string. TypeScript can infer `correctAns` as `unknown`
        // from `Object.entries` on an object with an index signature, causing type errors.
        if (studentAns.toLowerCase() === 'unanswered') { unansweredCount++; status = 'unanswered'; } 
        else if (studentAns.toUpperCase() === (correctAns as string).toUpperCase()) { correctCount++; status = 'correct'; } 
        else { incorrectCount++; }
        return { questionNumber: qNum, correctAnswer: correctAns as string, studentAnswer: studentAns, status };
      });
      
      gradedAnswers.sort((a,b) => a.questionNumber - b.questionNumber);
      setGradingResult({ score: correctCount, totalQuestions: selectedExam.numberOfQuestions, correctCount, incorrectCount, unansweredCount, details: gradedAnswers });
    } catch (err: any) {
      setError(err.message || 'Failed to grade the sheet.');
    } finally { setIsLoading(false); }
  };
  
  const resetApp = () => { setSheetImage(null); setImageUrl(null); setGradingResult(null); setIsLoading(false); setError(null); };

  const renderContent = () => {
    if (isLoading) return <Loader message="Grading in Progress..." />;
    if (error) return <ErrorDisplay message={error} onRetry={() => { setError(null); setIsLoading(false); }} />;
    if (gradingResult) return renderResults();
    return renderSetup();
  };

  const renderSetup = () => (
    <div className="bg-white p-8 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 border-b pb-4 mb-6">1. Select Exam & Upload Sheet</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        {/* Class */}
        <div><label htmlFor="class-select" className="block text-sm font-medium text-gray-700">Class</label><select id="class-select" value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setSelectedGroup(''); setSelectedExamId(''); setSelectedCode(''); }} className="mt-1 block w-full select-style"><option value="" disabled>-- Choose Class --</option>{availableClasses.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
        {/* Group */}
        <div><label htmlFor="group-select" className="block text-sm font-medium text-gray-700">Group</label><select id="group-select" value={selectedGroup} onChange={e => { setSelectedGroup(e.target.value); setSelectedExamId(''); setSelectedCode(''); }} className="mt-1 block w-full select-style" disabled={!selectedClass}><option value="" disabled>-- Choose Group --</option>{availableGroups.map(g => <option key={g} value={g}>{g}</option>)}</select></div>
        {/* Subject */}
        <div><label htmlFor="subject-select" className="block text-sm font-medium text-gray-700">Subject</label><select id="subject-select" value={selectedExamId} onChange={e => { setSelectedExamId(e.target.value); setSelectedCode(''); }} className="mt-1 block w-full select-style" disabled={!selectedGroup}><option value="" disabled>-- Choose Subject --</option>{availableSubjects.map(s => <option key={s.id} value={s.id}>{s.subject}</option>)}</select></div>
        {/* Code */}
        <div><label htmlFor="code-select" className="block text-sm font-medium text-gray-700">Sheet Code</label><select id="code-select" value={selectedCode} onChange={e => setSelectedCode(e.target.value)} className="mt-1 block w-full select-style" disabled={!selectedExamId}><option value="" disabled>-- Choose Code --</option>{availableCodes.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
      </div>

      {exams.length === 0 && <p className="mt-2 text-sm text-gray-500">No exams found. Please create one in the Admin Portal.</p>}

      {selectedCode && (
          <>
            <div className="mt-6 border-t pt-6"><label className="block text-sm font-medium text-gray-700 mb-2">Upload OMR Sheet</label><div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md"><div className="space-y-1 text-center"><DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" /><div className="flex text-sm text-gray-600"><label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-green-600 hover:text-green-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-green-500"><span>Upload a file</span><input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept="image/*" /></label><p className="pl-1">or drag and drop</p></div><p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p></div></div></div>
            {imageUrl && <div className="mt-6 text-center"><p className="text-sm font-medium text-gray-900">Image Preview:</p><img src={imageUrl} alt="OMR Sheet Preview" className="mt-2 inline-block max-h-60 rounded-md border" /></div>}
            <div className="mt-8 pt-5 border-t"><div className="flex justify-end"><button type="button" onClick={handleGrade} disabled={!sheetImage || isLoading} className="ml-3 inline-flex justify-center py-3 px-8 border border-transparent shadow-sm text-lg font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed">Grade Sheet</button></div></div>
          </>
      )}
    </div>
  );

  const renderResults = () => {
    if (!gradingResult) return null;
    const { score, totalQuestions, correctCount, incorrectCount, unansweredCount, details } = gradingResult;
    const scorePercentage = (score / totalQuestions) * 100;
    let scoreColor = scorePercentage >= 75 ? 'text-green-600' : scorePercentage >= 40 ? 'text-yellow-600' : 'text-red-600';

    return (
        <div className="bg-white p-8 rounded-lg shadow-lg"><h2 className="text-2xl font-bold text-gray-800 border-b pb-4 mb-6">Grading Complete</h2><div className="grid grid-cols-1 md:grid-cols-2 gap-8"><div><h3 className="text-lg font-semibold text-gray-700 mb-4">Summary</h3><div className="bg-gray-50 p-6 rounded-lg text-center mb-6"><p className="text-xl text-gray-600">Total Score</p><p className={`text-6xl font-bold ${scoreColor}`}>{score} <span className="text-4xl text-gray-500">/ {totalQuestions}</span></p></div><div className="grid grid-cols-3 gap-4 text-center"><div className="bg-green-100 p-4 rounded-lg"><p className="text-sm font-medium text-green-800">Correct</p><p className="text-2xl font-bold text-green-700">{correctCount}</p></div><div className="bg-red-100 p-4 rounded-lg"><p className="text-sm font-medium text-red-800">Incorrect</p><p className="text-2xl font-bold text-red-700">{incorrectCount}</p></div><div className="bg-gray-200 p-4 rounded-lg"><p className="text-sm font-medium text-gray-800">Unanswered</p><p className="text-2xl font-bold text-gray-700">{unansweredCount}</p></div></div>{imageUrl && <div className="mt-8"><h3 className="text-lg font-semibold text-gray-700 mb-4">Submitted Sheet</h3><img src={imageUrl} alt="Graded OMR Sheet" className="w-full rounded-md border shadow-sm" /></div>}</div><div><h3 className="text-lg font-semibold text-gray-700 mb-4">Detailed Breakdown</h3><div className="overflow-y-auto max-h-[600px] border rounded-lg"><table className="min-w-full divide-y divide-gray-200"><thead className="bg-gray-50 sticky top-0"><tr><th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Q#</th><th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Correct</th><th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Your Answer</th><th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Result</th></tr></thead><tbody className="bg-white divide-y divide-gray-200">{details.map(item => (<tr key={item.questionNumber} className={item.status === 'incorrect' ? 'bg-red-50' : item.status === 'unanswered' ? 'bg-gray-50' : ''}><td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.questionNumber}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-bold">{item.correctAnswer}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.studentAnswer}</td><td className="px-6 py-4 whitespace-nowrap text-sm">{item.status === 'correct' ? <CheckCircleIcon className="h-5 w-5 text-green-500" /> : item.status === 'incorrect' ? <XCircleIcon className="h-5 w-5 text-red-500" /> : <span className="text-xs text-gray-500">-</span>}</td></tr>))}</tbody></table></div></div></div><div className="mt-8 pt-5 border-t"><div className="flex justify-end"><button type="button" onClick={resetApp} className="ml-3 inline-flex justify-center py-3 px-8 border border-transparent shadow-sm text-lg font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">Grade Another Sheet</button></div></div></div>);
  };
  
  return (<div>{renderContent()}</div>);
}

const styles = `.select-style { padding: 0.5rem 2.5rem 0.5rem 0.75rem; background-color: white; color: #111827; border: 1px solid #D1D5DB; border-radius: 0.375rem; -webkit-appearance: none; -moz-appearance: none; appearance: none; background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e"); background-position: right 0.5rem center; background-repeat: no-repeat; background-size: 1.5em 1.5em; } .select-style:focus { --tw-ring-color: #10B981; border-color: #10B981; }`;
const styleSheet = document.createElement("style");
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);
