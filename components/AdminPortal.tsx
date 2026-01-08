
import React, { useState, useEffect } from 'react';
import type { Exam, AnswerKey, ExamVersion } from '../types';
import { XCircleIcon } from './Icons';

const CLASSES = ['9', '10', '11', '12'];
const GROUPS = ['Group 1', 'Group 2'];

export default function AdminPortal() {
  const [exams, setExams] = useState<Exam[]>([]);
  
  // Form state
  const [classLevel, setClassLevel] = useState('');
  const [group, setGroup] = useState('');
  const [subject, setSubject] = useState('');
  const [numberOfQuestions, setNumberOfQuestions] = useState<number>(20);
  const [codesString, setCodesString] = useState('');
  
  // State for generated key forms
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const [answerKeys, setAnswerKeys] = useState<{ [code: string]: AnswerKey }>({});

  useEffect(() => {
    try {
      const savedExams = localStorage.getItem('omr-exams');
      if (savedExams) {
        setExams(JSON.parse(savedExams));
      }
    } catch (error) {
      console.error("Failed to load exams from localStorage", error);
    }
  }, []);

  const handleGenerateKeyForms = () => {
    const codes = codesString.split(',').map(c => c.trim()).filter(c => c);
    if (codes.length !== 4) {
      alert('Please enter exactly 4 comma-separated codes.');
      return;
    }
    setGeneratedCodes(codes);
    // Initialize empty answer keys for each code
    const initialKeys: { [code: string]: AnswerKey } = {};
    codes.forEach(code => {
      initialKeys[code] = {};
    });
    setAnswerKeys(initialKeys);
  };

  const handleKeyChange = (code: string, qNumber: number, value: string) => {
    setAnswerKeys(prev => ({
      ...prev,
      [code]: {
        ...prev[code],
        [qNumber]: value.toUpperCase(),
      },
    }));
  };
  
  const resetForm = () => {
    setClassLevel('');
    setGroup('');
    setSubject('');
    setNumberOfQuestions(20);
    setCodesString('');
    setGeneratedCodes([]);
    setAnswerKeys({});
  };

  const handleSaveExam = () => {
    // Validation
    if (!classLevel || !group || !subject || generatedCodes.length !== 4) {
      alert('Please fill in all fields and generate the key forms.');
      return;
    }

    const allKeysComplete = generatedCodes.every(code => 
        Object.keys(answerKeys[code]).length === numberOfQuestions && 
        Object.values(answerKeys[code]).every(val => val)
    );

    if (!allKeysComplete) {
      alert('Please fill out all answers for all generated key codes.');
      return;
    }

    const newExam: Exam = {
      id: `exam-${new Date().toISOString()}`,
      classLevel,
      group,
      subject,
      numberOfQuestions,
      versions: generatedCodes.map(code => ({
        code,
        answerKey: answerKeys[code],
      })),
    };
    
    const updatedExams = [...exams, newExam];
    setExams(updatedExams);
    localStorage.setItem('omr-exams', JSON.stringify(updatedExams));
    resetForm();
  };

  const handleDeleteExam = (examId: string) => {
    if (window.confirm('Are you sure you want to delete this exam? This action is irreversible.')) {
      const updatedExams = exams.filter(exam => exam.id !== examId);
      setExams(updatedExams);
      localStorage.setItem('omr-exams', JSON.stringify(updatedExams));
    }
  };
  
  return (
    <div className="space-y-12">
      <div className="bg-white p-8 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-gray-800 border-b pb-4 mb-6">Create New Exam File</h2>
        
        {/* Step 1: Class, Group, Subject */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div>
            <label htmlFor="classLevel" className="block text-sm font-medium text-gray-700">Class</label>
            <select id="classLevel" value={classLevel} onChange={e => setClassLevel(e.target.value)} className="mt-1 block w-full input-style">
                <option value="" disabled>Select Class...</option>
                {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="group" className="block text-sm font-medium text-gray-700">Group</label>
             <select id="group" value={group} onChange={e => setGroup(e.target.value)} className="mt-1 block w-full input-style">
                <option value="" disabled>Select Group...</option>
                {GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700">Subject</label>
            <input type="text" id="subject" value={subject} onChange={e => setSubject(e.target.value)} className="mt-1 block w-full input-style"/>
          </div>
        </div>
        
        {/* Step 2: Questions and Codes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 border-t pt-6">
            <div>
                <label htmlFor="numQuestions" className="block text-sm font-medium text-gray-700">Number of Questions</label>
                <input type="number" id="numQuestions" value={numberOfQuestions} onChange={(e) => setNumberOfQuestions(Math.max(1, parseInt(e.target.value, 10) || 1))} className="mt-1 block w-full input-style"/>
            </div>
            <div>
                <label htmlFor="codes" className="block text-sm font-medium text-gray-700">4 Sheet Codes (comma-separated)</label>
                <input type="text" id="codes" value={codesString} placeholder="e.g. 2012,2013,2014,2015" onChange={e => setCodesString(e.target.value)} className="mt-1 block w-full input-style"/>
            </div>
        </div>

        <div className="flex justify-end mb-8">
            <button type="button" onClick={handleGenerateKeyForms} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              Generate Key Forms
            </button>
        </div>
        
        {/* Step 3: Fill Answer Keys */}
        {generatedCodes.length > 0 && (
          <div className="space-y-8 border-t pt-6">
            {generatedCodes.map(code => (
              <div key={code}>
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Answer Key for Code: <span className="font-bold text-green-700">{code}</span></h3>
                <div className="grid grid-cols-5 md:grid-cols-10 gap-4">
                  {Array.from({ length: numberOfQuestions }, (_, i) => i + 1).map(qNum => (
                    <div key={qNum}>
                      <label htmlFor={`q-${code}-${qNum}`} className="block text-xs font-medium text-gray-500 text-center">{qNum}</label>
                      <input type="text" id={`q-${code}-${qNum}`} maxLength={1} value={answerKeys[code]?.[qNum] || ''} onChange={(e) => handleKeyChange(code, qNum, e.target.value)} className="mt-1 block w-full text-center input-style"/>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="mt-8 pt-5 border-t">
          <div className="flex justify-end">
            <button type="button" onClick={handleSaveExam} className="ml-3 inline-flex justify-center py-3 px-8 border border-transparent shadow-sm text-lg font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
              Save Exam File
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-gray-800 border-b pb-4 mb-6">Saved Exams</h2>
        {exams.length === 0 ? <p className="text-gray-500">No exams have been created yet.</p> : (
          <ul className="divide-y divide-gray-200">
            {exams.map(exam => (
              <li key={exam.id} className="py-4 flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold text-gray-800">Class {exam.classLevel} - {exam.group} - {exam.subject}</p>
                  <p className="text-sm text-gray-500">{exam.numberOfQuestions} Questions | Codes: {exam.versions.map(v => v.code).join(', ')}</p>
                </div>
                <button onClick={() => handleDeleteExam(exam.id)} className="text-red-500 hover:text-red-700"><XCircleIcon className="h-6 w-6" /></button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

const styles = `.input-style { padding: 0.5rem 0.75rem; background-color: white; color: #111827; border: 1px solid #D1D5DB; border-radius: 0.375rem; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); outline: none; } .input-style:focus { --tw-ring-color: #10B981; border-color: #10B981; }`;
const styleSheet = document.createElement("style");
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);
