import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, useUiStore } from '@/stores';
import { Button, Input } from '@/components/ui';
import { HiMoon, HiSun } from 'react-icons/hi2';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuthStore();
  const { darkMode, toggleDarkMode } = useUiStore();

  const [form, setForm] = useState({
    tenantCode: '',
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.tenantCode.trim()) errs.tenantCode = 'Organization code is required';
    if (!form.email.trim()) errs.email = 'Email is required';
    if (!form.password) errs.password = 'Password is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      await login(form);
      const stored = useAuthStore.getState();
      navigate(stored.user?.role === 'Admin' ? '/admin' : '/member');
    } catch {
      // toast already shown by interceptor
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-50 px-4 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="absolute right-4 top-4">
        <button
          onClick={toggleDarkMode}
          className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          {darkMode ? <HiSun className="h-5 w-5" /> : <HiMoon className="h-5 w-5" />}
        </button>
      </div>

      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 text-xl font-bold text-white shadow-lg shadow-primary-600/30">
            F
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">FeeAutomate</h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">Sign in to your account</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Organization Code"
              placeholder="e.g. acme-gym"
              value={form.tenantCode}
              onChange={(e) => setForm({ ...form, tenantCode: e.target.value })}
              error={errors.tenantCode}
            />
            <Input
              label="Email"
              type="email"
              placeholder="admin@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              error={errors.email}
            />
            <Input
              label="Password"
              type="password"
              placeholder="Enter your password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              error={errors.password}
            />
            <Button type="submit" isLoading={isLoading} className="w-full">
              Sign In
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
          Automated fee management for modern organizations
        </p>
      </div>
    </div>
  );
}
