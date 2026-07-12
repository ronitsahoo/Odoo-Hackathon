import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAssetStore } from '../../store/assetStore.js';
import { btn, input, label, errorText, card, cardPad } from '../../lib/ui.js';
import Select from '../../components/ui/Select.jsx';
import ImageUploader from '../../components/ImageUploader.jsx';
import api from '../../api/axios.js';

/**
 * Register Asset form: name, category (reveals custom fields),
 * serial, cost, condition, location, department, bookable, photos.
 * On success, show the assigned asset tag.
 */
export default function RegisterAsset() {
  const navigate = useNavigate();
  const { createAsset } = useAssetStore();

  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const [form, setForm] = useState({
    name: '',
    category: '',
    serialNumber: '',
    acquisitionDate: '',
    acquisitionCost: '',
    condition: '',
    location: '',
    department: '',
    isBookable: false,
    customFieldValues: {},
  });
  const [photos, setPhotos] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Load categories and departments
  useEffect(() => {
    async function loadOptions() {
      try {
        const [catRes, deptRes] = await Promise.all([
          api.get('/categories'),
          api.get('/departments'),
        ]);
        setCategories(catRes.data.data.categories.filter((c) => c.status === 'active'));
        setDepartments(deptRes.data.data.departments.filter((d) => d.status === 'active'));
      } catch (err) {
        toast.error('Failed to load options');
      }
    }
    loadOptions();
  }, []);

  // When category changes, fetch its custom fields and reset custom values
  useEffect(() => {
    if (form.category) {
      const cat = categories.find((c) => c._id === form.category);
      setSelectedCategory(cat);
      setForm((prev) => ({ ...prev, customFieldValues: {} }));
    } else {
      setSelectedCategory(null);
    }
  }, [form.category, categories]);

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  }

  function handleCustomFieldChange(label, value) {
    setForm((prev) => ({
      ...prev,
      customFieldValues: { ...prev.customFieldValues, [label]: value },
    }));
  }

  function validate() {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = 'Asset name is required';
    if (!form.category) newErrors.category = 'Category is required';
    if (form.acquisitionDate) {
      const picked = new Date(form.acquisitionDate);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (picked > today) newErrors.acquisitionDate = 'Acquisition date cannot be in the future';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('category', form.category);
      if (form.serialNumber) formData.append('serialNumber', form.serialNumber);
      if (form.acquisitionDate) formData.append('acquisitionDate', form.acquisitionDate);
      if (form.acquisitionCost) formData.append('acquisitionCost', form.acquisitionCost);
      if (form.condition) formData.append('condition', form.condition);
      if (form.location) formData.append('location', form.location);
      if (form.department) formData.append('department', form.department);
      formData.append('isBookable', form.isBookable);
      if (Object.keys(form.customFieldValues).length > 0) {
        formData.append('customFieldValues', JSON.stringify(form.customFieldValues));
      }
      photos.forEach((file) => formData.append('photos', file));

      const asset = await createAsset(formData);
      toast.success(`Asset registered: ${asset.assetTag}`);
      navigate('/assets');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to register asset');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <button onClick={() => navigate('/assets')} className="mb-4 flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
        <ArrowLeft size={16} /> Back to Assets
      </button>

      <div className={`${card} ${cardPad}`}>
        <h1 className="mb-6 text-2xl font-bold text-slate-900">Register Asset</h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div>
            <label className={label}>
              Asset Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className={input}
              placeholder="e.g. Dell Latitude 5420"
            />
            {errors.name && <p className={errorText}>{errors.name}</p>}
          </div>

          {/* Category */}
          <div>
            <label className={label}>
              Category <span className="text-red-500">*</span>
            </label>
            <Select
              value={form.category}
              onChange={(e) => handleChange('category', e.target.value)}
              options={[
                { value: '', label: 'Select a category' },
                ...categories.map((c) => ({ value: c._id, label: c.name })),
              ]}
            />
            {errors.category && <p className={errorText}>{errors.category}</p>}
          </div>

          {/* Custom fields (if category selected and has custom fields) */}
          {selectedCategory?.customFields?.length > 0 && (
            <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-700">
                Custom fields for {selectedCategory.name}
              </p>
              {selectedCategory.customFields.map((field) => (
                <div key={field.label}>
                  <label className={label}>{field.label}</label>
                  {field.type === 'text' && (
                    <input
                      type="text"
                      value={form.customFieldValues[field.label] || ''}
                      onChange={(e) => handleCustomFieldChange(field.label, e.target.value)}
                      className={input}
                    />
                  )}
                  {field.type === 'number' && (
                    <input
                      type="number"
                      value={form.customFieldValues[field.label] || ''}
                      onChange={(e) => handleCustomFieldChange(field.label, e.target.value)}
                      className={input}
                    />
                  )}
                  {field.type === 'date' && (
                    <input
                      type="date"
                      value={form.customFieldValues[field.label] || ''}
                      onChange={(e) => handleCustomFieldChange(field.label, e.target.value)}
                      className={input}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Serial Number */}
          <div>
            <label className={label}>Serial Number</label>
            <input
              type="text"
              value={form.serialNumber}
              onChange={(e) => handleChange('serialNumber', e.target.value)}
              className={input}
              placeholder="e.g. DL5420-12345"
            />
          </div>

          {/* Acquisition Date (cannot be in the future) */}
          <div>
            <label className={label}>Acquisition Date</label>
            <input
              type="date"
              value={form.acquisitionDate}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => handleChange('acquisitionDate', e.target.value)}
              className={input}
            />
            {errors.acquisitionDate && <p className={errorText}>{errors.acquisitionDate}</p>}
          </div>

          {/* Acquisition Cost */}
          <div>
            <label className={label}>Acquisition Cost (₹)</label>
            <input
              type="number"
              value={form.acquisitionCost}
              onChange={(e) => handleChange('acquisitionCost', e.target.value)}
              className={input}
              placeholder="e.g. 85000"
            />
          </div>

          {/* Condition */}
          <div>
            <label className={label}>Condition</label>
            <input
              type="text"
              value={form.condition}
              onChange={(e) => handleChange('condition', e.target.value)}
              className={input}
              placeholder="e.g. Good, Excellent, Needs repair"
            />
          </div>

          {/* Location */}
          <div>
            <label className={label}>Location</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => handleChange('location', e.target.value)}
              className={input}
              placeholder="e.g. HQ Floor 2, Warehouse"
            />
          </div>

          {/* Department */}
          <div>
            <label className={label}>Department</label>
            <Select
              value={form.department}
              onChange={(e) => handleChange('department', e.target.value)}
              options={[
                { value: '', label: 'None' },
                ...departments.map((d) => ({ value: d._id, label: d.name })),
              ]}
            />
          </div>

          {/* Is Bookable */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isBookable"
              checked={form.isBookable}
              onChange={(e) => handleChange('isBookable', e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-2 focus:ring-brand-500/40"
            />
            <label htmlFor="isBookable" className="text-sm text-slate-700">
              This asset is bookable
            </label>
          </div>

          {/* Photos */}
          <div>
            <ImageUploader label="Photos" files={photos} onChange={setPhotos} max={10} />
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => navigate('/assets')}
              className={`${btn.base} ${btn.secondary} ${btn.md}`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`${btn.base} ${btn.primary} ${btn.md} flex-1`}
            >
              {submitting ? 'Registering...' : 'Register Asset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
