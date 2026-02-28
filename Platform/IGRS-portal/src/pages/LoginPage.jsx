import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await login(email, password);
      
      // Check if login was successful
      if (!response.success) {
        setError(response.error || 'Login failed');
        return;
      }
      
      console.log(' Login response:', response);
      console.log('👤 User data:', response.user);
      console.log('🆔 department_id:', response.user.department_id);
      console.log('🆔 user.id:', response.user.id);
      console.log('📋 role:', response.user.role);
      
      // Redirect based on role and department_id
      if (response.user.role === 'admin') {
        console.log('➡️ Redirecting to admin dashboard');
        navigate('/admin/dashboard');
      } else if (response.user.role === 'citizen') {
        console.log('➡️ Redirecting to citizen dashboard');
        navigate(`/citizen/${response.user.id}/dashboard`);
      } else if (response.user.role === 'department_officer' || response.user.role === 'department_head') {
        // Department officers MUST have department_id
        if (response.user.department_id) {
          console.log(`➡️ Redirecting to department portal: /department/${response.user.department_id}`);
          navigate(`/department/${response.user.department_id}`);
        } else {
          console.log('❌ ERROR: Department officer has no department_id!');
          setError('Your account is not properly configured. Please contact admin.');
          return;
        }
      } else {
        console.log('➡️ Unknown role, redirecting to home');
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">IGRS Portal</h1>
          <p className="text-gray-600 mt-2">Sign in to your account</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="your.email@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-600 hover:text-blue-700 font-medium">
              Register as Citizen
            </Link>
          </p>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            For official access, contact your administrator
          </p>
        </div>
      </div>
    </div>
  );
}
