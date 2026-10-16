import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, Loader2, AlertCircle } from 'lucide-react';
import TwitterIcon from '../components/TwitterIcon';
import { useAuth } from '../context/AuthContext';

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    bio: '',
    role: 'user'
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.username || !formData.email || !formData.password) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await signup(formData);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 bg-black">
      <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-col items-center text-center mb-6">
          <TwitterIcon className="w-10 h-10 text-white mb-3" />
          <h2 className="text-xl font-bold text-white tracking-tight">
            Create your Twitter account
          </h2>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
              Name *
            </label>
            <input
              type="text"
              name="name"
              required
              placeholder="e.g. Alex Rivera"
              value={formData.name}
              onChange={handleChange}
              className="w-full bg-black border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-sky-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
              Username *
            </label>
            <input
              type="text"
              name="username"
              required
              placeholder="e.g. alexrivera"
              value={formData.username}
              onChange={handleChange}
              className="w-full bg-black border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-sky-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
              Email *
            </label>
            <input
              type="email"
              name="email"
              required
              placeholder="alex@example.com"
              value={formData.email}
              onChange={handleChange}
              className="w-full bg-black border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-sky-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
              Password (min 6 characters) *
            </label>
            <input
              type="password"
              name="password"
              required
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              className="w-full bg-black border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-sky-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
              Bio (optional)
            </label>
            <input
              type="text"
              name="bio"
              placeholder="A few words about you"
              maxLength={160}
              value={formData.bio}
              onChange={handleChange}
              className="w-full bg-black border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-sky-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
              Role
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full bg-black border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-sky-500 transition cursor-pointer"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-semibold py-2.5 rounded-full shadow transition flex items-center justify-center space-x-2 mt-4"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Create Account</span>
                <UserPlus className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-zinc-500 mt-5">
          Already have an account?{' '}
          <Link to="/login" className="text-sky-400 font-semibold hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
