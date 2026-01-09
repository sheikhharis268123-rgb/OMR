
import React, { useState } from 'react';

type LoginProps = {
  onLoginSuccess: () => void;
};

const ADMIN_ID = '990990';
const ADMIN_PASS = 'Haris@1122@11';

export default function Login({ onLoginSuccess }: LoginProps) {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userId === ADMIN_ID && password === ADMIN_PASS) {
      setError('');
      onLoginSuccess();
    } else {
      setError('Invalid User ID or Password.');
    }
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow-lg max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-center text-gray-800 mb-8">Admin Login</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="userId" className="block text-sm font-medium text-gray-700">
            User ID
          </label>
          <input
            type="text"
            id="userId"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            required
            className="mt-1 block w-full input-style"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-1 block w-full input-style"
          />
        </div>
        
        {error && <p className="text-sm text-red-600 text-center">{error}</p>}

        <div>
          <button
            type="submit"
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            Login
          </button>
        </div>
      </form>
    </div>
  );
}

const styles = `.input-style { padding: 0.5rem 0.75rem; background-color: white; color: #111827; border: 1px solid #D1D5DB; border-radius: 0.375rem; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); outline: none; } .input-style:focus { --tw-ring-color: #10B981; border-color: #10B981; }`;
const styleSheet = document.createElement("style");
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);
