import { Link } from 'react-router-dom';
import Button from '../components/ui/Button.jsx';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <p className="text-5xl font-bold text-brand-600">404</p>
      <p className="text-slate-500">This page doesn't exist.</p>
      <Link to="/">
        <Button>Back to browse</Button>
      </Link>
    </div>
  );
}
