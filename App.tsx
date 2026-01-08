
import React, { useState } from 'react';
import AdminPortal from './components/AdminPortal';
import CheckerPortal from './components/CheckerPortal';
import { SparklesIcon } from './components/Icons';

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

export default function App() {
  const [activePortal, setActivePortal] = useState<'checker' | 'admin'>('checker');

  const navButtonClasses = (portal: 'checker' | 'admin') => 
    `px-6 py-3 text-lg font-semibold rounded-t-lg focus:outline-none transition-colors duration-200 ${
      activePortal === portal
        ? 'bg-white text-green-700 shadow-inner'
        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
    }`;

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <main>
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <nav className="flex space-x-2">
              <button
                onClick={() => setActivePortal('checker')}
                className={navButtonClasses('checker')}
                aria-current={activePortal === 'checker' ? 'page' : undefined}
              >
                Checker Portal
              </button>
              <button
                onClick={() => setActivePortal('admin')}
                className={navButtonClasses('admin')}
                aria-current={activePortal === 'admin' ? 'page' : undefined}
              >
                Admin Portal
              </button>
            </nav>
          </div>
          
          <div className="portal-content">
            {activePortal === 'checker' && <CheckerPortal />}
            {activePortal === 'admin' && <AdminPortal />}
          </div>
        </div>
      </main>
    </div>
  );
}
