import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useCategoryStore } from '../../store/categoryStore.js';
import { apiError } from '../../api/axios.js';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import Loader from '../../components/ui/Loader.jsx';
import { input } from '../../lib/ui.js';

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
];

/**
 * Categories tab inside Organization setup (Screen 3).
 * Table: Name · #Fields · Status.
 * Create/edit modal with dynamic customFields editor.
 */
export default function CategoriesTab() {
  const { categories, loading, fetchCategories, createCategory, updateCategory } =
    useCategoryStore();
  const [modal, setModal] = useState({ open: false, cat: null });
  const [form, setForm] = useState({ name: '', status: 'active', customFields: [] });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  function openCreate() {
    setForm({ name: '', status: 'active', customFields: [] });
    setModal({ open: true, cat: null });
  }

  function openEdit(cat) {
    setForm({
      name: cat.name,
      status: cat.status,
      customFields: cat.customFields?.length
        ? cat.customFields.map((f) => ({ label: f.label, type: f.type }))
        : [],
    });
    setModal({ open: true, cat });
  }

  function closeModal() {
    setModal({ open: false, cat: null });
  }

  // Custom fields CRUD within the form.
  function addField() {
    setForm((f) => ({
      ...f,
      customFields: [...f.customFields, { label: '', type: 'text' }],
    }));
  }

  function updateField(idx, key, value) {
    setForm((f) => ({
      ...f,
      customFields: f.customFields.map((cf, i) =>
        i === idx ? { ...cf, [key]: value } : cf
      ),
    }));
  }

  function removeField(idx) {
    setForm((f) => ({
      ...f,
      customFields: f.customFields.filter((_, i) => i !== idx),
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        status: form.status,
        customFields: form.customFields.filter((f) => f.label.trim()),
      };
      if (modal.cat) {
        await updateCategory(modal.cat._id, payload);
        toast.success('Category updated');
      } else {
        await createCategory(payload);
        toast.success('Category created');
      }
      closeModal();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  // Expose openCreate to OrganizationSetup's "+ Add" button via window event.
  useEffect(() => {
    const handler = () => openCreate();
    window.addEventListener('org:add-category', handler);
    return () => window.removeEventListener('org:add-category', handler);
  }, []);

  if (loading && categories.length === 0) return <Loader label="Loading categories…" />;

  return (
    <div className="space-y-4">
      <Card padded={false} className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">#Fields</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categories.map((c) => (
                <tr key={c._id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{c.name}</td>
                  <td className="px-4 py-3 text-slate-500">{c.customFields?.length || 0}</td>
                  <td className="px-4 py-3">
                    <Badge
                      color={
                        c.status === 'active'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-100 text-red-700'
                      }
                    >
                      {c.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(c)}>
                      <Pencil size={14} /> Edit
                    </Button>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                    No categories yet. Click "+ Add" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create / Edit modal */}
      <Modal
        open={modal.open}
        onClose={closeModal}
        title={modal.cat ? 'Edit Category' : 'Create Category'}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={saving}>
              {modal.cat ? 'Save Changes' : 'Create'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Category Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
          <Select
            label="Status"
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
          />

          {/* Dynamic custom fields editor */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-700">Custom Fields</label>
              <Button type="button" size="sm" variant="ghost" onClick={addField}>
                <Plus size={14} /> Add field
              </Button>
            </div>
            {form.customFields.length === 0 && (
              <p className="text-xs text-slate-400">No custom fields. Module 3 will use these for asset forms.</p>
            )}
            <div className="space-y-2">
              {form.customFields.map((cf, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    className={`${input} flex-1`}
                    placeholder="Field label"
                    value={cf.label}
                    onChange={(e) => updateField(idx, 'label', e.target.value)}
                  />
                  <select
                    className={`${input} w-28`}
                    value={cf.type}
                    onChange={(e) => updateField(idx, 'type', e.target.value)}
                  >
                    {FIELD_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeField(idx)}
                    className="rounded p-1.5 text-red-500 hover:bg-red-50 transition"
                    title="Remove field"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
