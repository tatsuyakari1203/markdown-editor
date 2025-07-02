import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Alert, AlertDescription } from './ui/Alert';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { FileText, Edit3, Eye, Zap } from 'lucide-react';

type AuthMode = 'login' | 'register';

export function LoginForm() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login, register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (mode === 'register') {
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          return;
        }
        const result = await register(username, password);
        if (!result.success) {
          setError(result.message);
        } else {
          // Auto-switch to login mode after successful registration
          setSuccessMessage('Registration successful! Please sign in with your credentials.');
          setMode('login');
          setPassword('');
          setConfirmPassword('');
          setError('');
          // Clear success message after 5 seconds
          setTimeout(() => {
            setSuccessMessage('');
          }, 5000);
        }
      } else {
        const result = await login(username, password);
        if (!result.success) {
          setError(result.message);
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setError('');
    setSuccessMessage('');
    setUsername('');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="flex min-h-screen">
        {/* Left Panel - Authentication Form */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-md space-y-8">
            {/* Header */}
            <div className="text-center">
              <div className="flex items-center justify-center mb-8">
                <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg">
                  <FileText className="w-8 h-8 text-black dark:text-white" />
                </div>
              </div>
              <h2 className="text-3xl font-light text-black dark:text-white">
                {mode === 'login' ? 'Welcome back' : 'Create account'}
              </h2>
              <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                {mode === 'login'
                  ? 'Sign in to access your markdown workspace'
                  : 'Join KMDE and start creating amazing documents'
                }
              </p>
            </div>

            {/* Form */}
            <div className="bg-gray-50 dark:bg-gray-950 p-8 rounded-xl">
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <Alert variant="destructive" className="bg-red-50 dark:bg-red-950/50 border-0 rounded-lg">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                {successMessage && (
                  <Alert className="bg-green-50 dark:bg-green-950/50 border-0 rounded-lg text-green-800 dark:text-green-400">
                    <AlertDescription>{successMessage}</AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-6">
                  <div>
                    <label htmlFor="username" className="block text-sm font-medium text-black dark:text-white mb-3">
                      Username
                    </label>
                    <Input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      disabled={isLoading}
                      placeholder="Enter your username"
                      className="bg-white dark:bg-gray-900 border-0 focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-700 rounded-lg"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-black dark:text-white mb-3">
                      Password
                    </label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      placeholder="Enter your password"
                      className="bg-white dark:bg-gray-900 border-0 focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-700 rounded-lg"
                    />
                  </div>
                  
                  {mode === 'register' && (
                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-black dark:text-white mb-3">
                        Confirm Password
                      </label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        disabled={isLoading}
                        placeholder="Confirm your password"
                        className="bg-white dark:bg-gray-900 border-0 focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-700 rounded-lg"
                      />
                    </div>
                  )}
                </div>
                
                <Button
                  type="submit"
                  className="w-full bg-black hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200 text-white dark:text-black border-0 rounded-lg py-3 font-medium transition-colors"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <LoadingSpinner size="sm" className="mr-2" />
                  ) : null}
                  {mode === 'login' ? 'Sign In' : 'Create Account'}
                </Button>
              </form>
              
              {/* Mode Toggle */}
              <div className="mt-8 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
                  <button
                    type="button"
                    onClick={toggleMode}
                    className="ml-2 font-medium text-black dark:text-white hover:text-gray-600 dark:hover:text-gray-400 transition-colors underline decoration-1 underline-offset-2"
                    disabled={isLoading}
                  >
                    {mode === 'login' ? 'Sign up' : 'Sign in'}
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - App Description */}
        <div className="hidden lg:flex lg:flex-1 bg-black dark:bg-white relative">
          <div className="flex items-center justify-center w-full p-12">
            <div className="max-w-md text-center text-white dark:text-black">
              <div className="mb-12">
                <h1 className="text-4xl font-light mb-4">KMDE</h1>
                <p className="text-lg text-gray-300 dark:text-gray-700">Knowledge Markdown Editor</p>
              </div>
              
              <div className="space-y-8">
                <div className="flex items-center space-x-6">
                   <div className="bg-gray-800 dark:bg-gray-200 p-3 rounded-lg">
                     <Edit3 className="w-6 h-6 text-white dark:text-black" />
                   </div>
                  <div className="text-left">
                    <h3 className="font-medium mb-1">Rich Editing</h3>
                    <p className="text-sm text-gray-300 dark:text-gray-700">Powerful markdown editor with live preview</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-6">
                   <div className="bg-gray-800 dark:bg-gray-200 p-3 rounded-lg">
                     <Eye className="w-6 h-6 text-white dark:text-black" />
                   </div>
                  <div className="text-left">
                    <h3 className="font-medium mb-1">Live Preview</h3>
                    <p className="text-sm text-gray-300 dark:text-gray-700">See your changes in real-time</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-6">
                   <div className="bg-gray-800 dark:bg-gray-200 p-3 rounded-lg">
                     <Zap className="w-6 h-6 text-white dark:text-black" />
                   </div>
                  <div className="text-left">
                    <h3 className="font-medium mb-1">AI-Powered</h3>
                    <p className="text-sm text-gray-300 dark:text-gray-700">Smart assistance for better writing</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-12 p-6 bg-gray-800/50 dark:bg-gray-200/50 rounded-xl">
                 <p className="text-sm text-gray-300 dark:text-gray-700">
                   "The perfect tool for creating, editing, and managing markdown documents with modern features and AI assistance."
                 </p>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}