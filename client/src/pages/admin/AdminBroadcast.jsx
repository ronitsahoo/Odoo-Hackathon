import { useState } from 'react';
import toast from 'react-hot-toast';
import { Megaphone } from 'lucide-react';
import api, { apiError } from '../../api/axios.js';
import Card from '../../components/ui/Card.jsx';
import Input from '../../components/ui/Input.jsx';
import Textarea from '../../components/ui/Textarea.jsx';
import Button from '../../components/ui/Button.jsx';

/**
 * Broadcast: send one announcement that becomes a Notification for every user
 * and is pushed to each of their sockets in real time (their bells increment).
 */
export default function AdminBroadcast() {
  const [message, setMessage] = useState('');
  const [link, setLink] = useState('');
  const [sending, setSending] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    if (!message.trim()) return toast.error('Message is required');
    setSending(true);
    try {
      const { data } = await api.post('/admin/broadcast', { message, link });
      toast.success(`Sent to ${data.data.count} users`);
      setMessage('');
      setLink('');
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
        <Megaphone size={24} /> Broadcast
      </h1>
      <Card>
        <form onSubmit={onSubmit} className="space-y-4">
          <Textarea
            label="Announcement"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="e.g. Scheduled maintenance tonight at 10pm."
          />
          <Input
            label="Link (optional)"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="/dashboard"
          />
          <div className="flex justify-end">
            <Button type="submit" loading={sending}>
              <Megaphone size={16} /> Send to all users
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
