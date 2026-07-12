import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Pencil } from 'lucide-react';
import { useDepartmentStore } from '../../store/departmentStore.js';
import api, { apiError } from '../../api/axios.js';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import Loader from '../../components/ui/Loader.jsx';
import { input } from '../../lib/ui.js';

/**
 * Departments tab inside Organization setup (Screen 3).
 * Table: Department · Head · Parent Dept · Status.
 * Create/edit modal with head/parent dropdowns.
 */
export default function DepartmentsTab() {
  const { departments, loading, fetchDepartments, createDepartment, updateDepartment } =
    useDepartmentStore();
  const [users, setUsers] = useState([]);
  const [modal, setModal] = useState({ open: false, dept: null });
  const [form, setForm] = useState({ name: '', head: '', parentDepartment: '', status: 'active' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchDepartments();
    // Load all users for the Head dropdown.
    api.get('/users').then(({ data }) => setUsers(data.data.users)).catch(() => {});
  }, [fetchDepartments]);

  function openCreate() {
    setForm({ name: '', head: '', parentDepartment: '', status: 'active' });
    setModal({ open: true, dept: null });
  }

  function openEdit(dept) {
    setForm({
      name: dept.name,
      head: dept.head?._id || '',
      parentDepartment: dept.parentDepartment?._id || '',
      status: dept.status,
    });
    setModal({ open: true, dept });
  }

  function closeModal() {
    setModal({ open: false, dept: null });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        head: form.head || null,
        parentDepartment: form.parentDepartment || null,
        status: form.status,
      };
      if (modal.dept) {
        await updateDepartment(modal.dept._id, payload);
        toast.success('Department updated');
      } else {
        await createDepartment(payload);
        toast.success('Department created');
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
    window.addEventListener('org:add-department', handler);
    return () => window.removeEventListener('org:add-department', handler);
  }, []);

  if (loading && departments.length === 0) return <Loader label="Loading departments…" />;

  // Exclude current department from parent options to prevent self-reference.
  const parentOptions = departments
    .filter((d) => d._id !== modal.dept?._id)
    .map((d) => ({ value: d._id, label: d.name }));

  const userOptions = users
    .filter((u) => u.status === 'active')
    .map((u) => ({ value: u._id, label: `${u.name} (${u.email})` }));

  return (
    <div className="space-y-4">
      <Card padded={false} className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Head</th>
                <th className="px-4 py-3">Parent Dept</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {departments.map((d) => (
                <tr key={d._id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{d.name}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {d.head?.name || '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {d.parentDepartment?.name || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      color={
                        d.status === 'active'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-100 text-red-700'
                      }
                    >
                      {d.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(d)}>
                      <Pencil size={14} /> Edit
                    </Button>
                  </td>
                </tr>
              ))}
              {departments.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    No departments yet. Click "+ Add" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="text-xs text-slate-400 italic">
        Editing a department here also drives the picklist in Screens 4 &amp; 5.
      </p>

      {/* Create / Edit modal */}
      <Modal
        open={modal.open}
        onClose={closeModal}
        title={modal.dept ? 'Edit Department' : 'Create Department'}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={saving}>
              {modal.dept ? 'Save Changes' : 'Create'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Department Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Head</label>
            <select
              className={input}
              value={form.head}
              onChange={(e) => setForm((f) => ({ ...f, head: e.target.value }))}
            >
              <option value="">— None —</option>
              {userOptions.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Parent Department</label>
            <select
              className={input}
              value={form.parentDepartment}
              onChange={(e) => setForm((f) => ({ ...f, parentDepartment: e.target.value }))}
            >
              <option value="">— None —</option>
              {parentOptions.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <Select
            label="Status"
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
          />
        </form>
      </Modal>
    </div>
  );
}
