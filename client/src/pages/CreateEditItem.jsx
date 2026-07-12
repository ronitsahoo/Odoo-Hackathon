import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api, { apiError } from '../api/axios.js';
import { useItemStore } from '../store/itemStore.js';
import Card from '../components/ui/Card.jsx';
import Input from '../components/ui/Input.jsx';
import Select from '../components/ui/Select.jsx';
import Button from '../components/ui/Button.jsx';
import RichTextEditor from '../components/RichTextEditor.jsx';
import ImageUploader from '../components/ImageUploader.jsx';
import Loader from '../components/ui/Loader.jsx';

const CATEGORIES = ['Question', 'Clothing', 'Bug', 'Booking', 'Other'];

/**
 * Create or edit an Item. Uses multipart/form-data so images upload alongside
 * the fields. Client-side validation mirrors the express-validator rules.
 * New items are created as 'pending' and go to the admin moderation queue.
 */
export default function CreateEditItem() {
  const { id } = useParams(); // present => edit mode
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { createItem, updateItem } = useItemStore();

  const [form, setForm] = useState({ title: '', description: '', category: 'Question', tags: '' });
  const [files, setFiles] = useState([]);
  const [existing, setExisting] = useState([]);
  const [removeImages, setRemoveImages] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  // Load the item in edit mode.
  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const { data } = await api.get(`/items/${id}`);
        const it = data.data.item;
        setForm({
          title: it.title,
          description: it.description,
          category: it.category,
          tags: (it.tags || []).join(', '),
        });
        setExisting(it.images || []);
      } catch (err) {
        toast.error(apiError(err));
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isEdit, navigate]);

  function validate() {
    const e = {};
    if (!form.title.trim()) e.title = 'Title is required';
    if (!form.description || form.description === '<p><br></p>') e.description = 'Description is required';
    if (!form.category) e.category = 'Category is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function onSubmit(ev) {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);

    // Build multipart payload (fields + files).
    const fd = new FormData();
    fd.append('title', form.title);
    fd.append('description', form.description);
    fd.append('category', form.category);
    fd.append('tags', form.tags);
    files.forEach((f) => fd.append('images', f));
    removeImages.forEach((p) => fd.append('removeImages', p));

    try {
      if (isEdit) {
        await updateItem(id, fd);
        toast.success('Item updated');
      } else {
        await createItem(fd);
        toast.success('Item created — pending admin approval');
      }
      navigate('/dashboard');
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loader label="Loading item…" />;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-2xl font-bold text-slate-900">
        {isEdit ? 'Edit item' : 'Create item'}
      </h1>
      <Card>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Input
            label="Title"
            name="title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            error={errors.title}
            placeholder="A short, clear title"
          />

          <Select
            label="Category"
            name="category"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            options={CATEGORIES}
            error={errors.category}
          />

          <RichTextEditor
            label="Description"
            value={form.description}
            onChange={(v) => setForm({ ...form, description: v })}
            error={errors.description}
            placeholder="Describe your item…"
          />

          <Input
            label="Tags (comma separated)"
            name="tags"
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
            placeholder="react, help, urgent"
          />

          <ImageUploader
            files={files}
            onChange={setFiles}
            existing={existing.filter((p) => !removeImages.includes(p))}
            onRemoveExisting={(p) => setRemoveImages((prev) => [...prev, p])}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {isEdit ? 'Save changes' : 'Create item'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
