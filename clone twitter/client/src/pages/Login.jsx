import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, Loader2, AlertCircle } from 'lucide-react';
import TwitterIcon from '../components/TwitterIcon';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier || !password) {
      setError('Please enter your email or username and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await login(identifier, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid username/email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = (id, pwd) => {
    setIdentifier(id);
    setPassword(pwd);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 bg-black">
      <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-col items-center text-center mb-6">
          <TwitterIcon className="w-10 h-10 text-white mb-3" />
          <h2 className="text-xl font-bold text-white tracking-tight">
            Sign in to Twitter
          </h2>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
              Username or Email
            </label>
            <input
              type="text"
              required
              placeholder="e.g. alexrivera"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full bg-black border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-sky-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-sky-500 transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-semibold py-2.5 rounded-full shadow transition flex items-center justify-center space-x-2 mt-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Log In</span>
                <LogIn className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Demo Fast Login Buttons */}
        <div className="mt-6 pt-5 border-t border-zinc-800/80">
          <p className="text-xs text-zinc-500 text-center mb-2.5">
            Quick Demo Autofill:
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleDemo('alexrivera', 'password123')}
              className="text-xs bg-zinc-900 hover:bg-zinc-800 text-zinc-300 py-1.5 px-2 rounded-lg border border-zinc-800 transition truncate"
            >
              Demo Admin (Alex)
            </button>
            <button
              type="button"
              onClick={() => handleDemo('sarahc', 'password123')}
              className="text-xs bg-zinc-900 hover:bg-zinc-800 text-zinc-300 py-1.5 px-2 rounded-lg border border-zinc-800 transition truncate"
            >
              Demo User (Sarah)
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-zinc-500 mt-6">
          Don't have an account?{' '}
          <Link to="/signup" className="text-sky-400 font-semibold hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
