import { useState } from 'react';
import toast from 'react-hot-toast';
import { Upload } from 'lucide-react';
import api, { apiError } from '../api/axios.js';
import { useAuthStore } from '../store/authStore.js';
import Card from '../components/ui/Card.jsx';
import Input from '../components/ui/Input.jsx';
import Textarea from '../components/ui/Textarea.jsx';
import Button from '../components/ui/Button.jsx';

/**
 * Editable profile: name, bio, avatar upload, and a public/private toggle.
 * Avatar upload reuses the generic /items image endpoint? No — we POST the file
 * to a tiny inline handler: here we upload via the same multipart flow using a
 * dedicated field on the profile update (kept simple: upload then save path).
 */
export default function Profile() {
  const { user, updateProfile } = useAuthStore();
  const [form, setForm] = useState({
    name: user?.name || '',
    bio: user?.bio || '',
    isPublic: user?.isPublic ?? true,
    avatar: user?.avatar || '',
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function onAvatar(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    // Reuse the item upload endpoint's storage by posting to a generic upload.
    // For the template we upload through the item create's multer path via a
    // dedicated lightweight endpoint would be ideal; here we use a data URL
    // fallback so avatars work with zero extra backend routes.
    const reader = new FileReader();
    reader.onload = () => {
      setForm((f) => ({ ...f, avatar: reader.result }));
      setUploading(false);
      toast.success('Avatar ready — save to apply');
    };
    reader.onerror = () => {
      setUploading(false);
      toast.error('Could not read image');
    };
    reader.readAsDataURL(file);
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Name is required');
    setSaving(true);
    try {
      await updateProfile(form);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-4 text-2xl font-bold text-slate-900">Profile</h1>
      <Card>
        <form onSubmit={onSubmit} className="space-y-4">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            {form.avatar ? (
              <img src={form.avatar} alt="" className="h-16 w-16 rounded-full object-cover" />
            ) : (
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-xl font-semibold text-brand-700">
                {form.name?.[0]?.toUpperCase() || '?'}
              </span>
            )}
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
              <Upload size={16} />
              {uploading ? 'Reading…' : 'Change avatar'}
              <input type="file" accept="image/*" hidden onChange={onAvatar} />
            </label>
          </div>

          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Textarea
            label="Bio"
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            placeholder="Tell others about yourself…"
          />
          <Input label="Email" value={user.email} disabled />

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.isPublic}
              onChange={(e) => setForm({ ...form, isPublic: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            Public profile (others can see your bio)
          </label>

          <div className="flex justify-end">
            <Button type="submit" loading={saving}>
              Save changes
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
