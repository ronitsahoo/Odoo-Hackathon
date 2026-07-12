import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore.js';
import Card from '../components/ui/Card.jsx';
import Input from '../components/ui/Input.jsx';
import Button from '../components/ui/Button.jsx';

/**
 * AssetFlow auth screen. One card: login fields on top, then a
 * divider and a "New here?" section that sends people to registration.
 * Purely presentational changes — login still POSTs to /auth/login and the
 * Create Account button routes to the existing /register flow.
 */
export default function Login() {
  const { login, apiError } = useAuthStore();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  function validate() {
    const e = {};
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function onSubmit(ev) {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const user = await login(form);
      toast.success(`Welcome back, ${user.name}!`);
      navigate('/'); // single dashboard for every role
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md py-10">
      <Card>
        {/* Brand + title */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center">
            <img 
              src="/images/af.png" 
              alt="AssetFlow" 
              className="h-full w-full object-contain"
            />
          </div>
          <h1 className="text-xl font-bold text-slate-800">AssetFlow — login</h1>
          <p className="text-sm text-slate-500">Sign in to your workspace.</p>
        </div>

        {/* Login fields */}
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Input
            label="Email"
            name="email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            error={errors.email}
            placeholder="name@company.com"
          />
          <div>
            <Input
              label="Password"
              name="password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              error={errors.password}
              placeholder="••••••••"
            />
            <div className="mt-1 text-right">
              {/* Visual stub — no reset flow yet. */}
              <button
                type="button"
                onClick={() => toast('Password reset isn’t available yet — contact an admin.')}
                className="text-sm font-medium text-brand-600 hover:underline"
              >
                Forgot password?
              </button>
            </div>
          </div>
          <Button type="submit" loading={loading} className="w-full">
            Log in
          </Button>
        </form>

        {/* Divider */}
        <div className="my-6 border-t border-slate-200" />

        {/* Create-account section */}
        <div className="space-y-3 text-center">
          <div>
            <h2 className="font-semibold text-slate-800">New here?</h2>
            <p className="text-sm text-slate-500">
              Sign up creates an employee account — admin roles assigned later.
            </p>
          </div>
          <Button variant="secondary" className="w-full" onClick={() => navigate('/register')}>
            Create Account
          </Button>
        </div>
      </Card>
    </div>
  );
}
