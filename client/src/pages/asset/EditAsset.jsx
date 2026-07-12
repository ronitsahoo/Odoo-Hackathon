import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAssetStore } from '../../store/assetStore.js';
import { btn, input, label, errorText, card, cardPad } from '../../lib/ui.js';
import Select from '../../components/ui/Select.jsx';
import ImageUploader from '../../components/ImageUploader.jsx';
import Loader from '../../components/ui/Loader.jsx';
import api from '../../api/axios.js';

/**
 * Edit Asset form: similar to register but pre-filled with existing data.
 * Asset tag is read-only. Not a workflow transition — just field edits.
 */
export default function EditAsset() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { updateAsset } = useAssetStore();

  const [asset, setAsset] = useState(null);
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    name: '',
    category: '',
    serialNumber: '',
    acquisitionDate: '',
    acquisitionCost: '',
    condition: '',
    location: '',
    department: '',
    status: 'Available',
    isBookable: false,
    customFieldValues: {},
  });
  const [photos, setPhotos] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Load asset + options
  useEffect(() => {
    async function loadData() {
      try {
        const [assetRes, catRes, deptRes] = await Promise.all([
          api.get(`/assets/${id}`),
          api.get('/categories'),
          api.get('/departments'),
        ]);
        const assetData = assetRes.data.data.asset;
        setAsset(assetData);
        setCategories(catRes.data.data.categories.filter((c) => c.status === 'active'));
        setDepartments(deptRes.data.data.departments.filter((d) => d.status === 'active'));

        // Pre-fill form
        setForm({
          name: assetData.name,
          category: assetData.category?._id || assetData.category || '',
          serialNumber: assetData.serialNumber || '',
          acquisitionDate: assetData.acquisitionDate
            ? new Date(assetData.acquisitionDate).toISOString().split('T')[0]
            : '',
          acquisitionCost: assetData.acquisitionCost || '',
          condition: assetData.condition || '',
          location: assetData.location || '',
          department: assetData.department?._id || '',
          status: assetData.status || 'Available',
          isBookable: assetData.isBookable || false,
          customFieldValues:
            assetData.customFieldValues && typeof assetData.customFieldValues === 'object'
              ? assetData.customFieldValues
              : {},
        });
      } catch (err) {
        console.error('Failed to load asset:', err);
        toast.error(err.response?.data?.message || 'Failed to load asset');
        navigate('/assets');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id, navigate]);

  // When category changes, update selected category
  useEffect(() => {
    if (form.category) {
      const cat = categories.find((c) => c._id === form.category);
      setSelectedCategory(cat);
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
      formData.append('status', form.status);
      formData.append('isBookable', form.isBookable);
      if (Object.keys(form.customFieldValues).length > 0) {
        formData.append('customFieldValues', JSON.stringify(form.customFieldValues));
      }
      photos.forEach((file) => formData.append('photos', file));

      await updateAsset(id, formData);
      toast.success('Asset updated successfully');
      navigate(`/assets/${id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update asset');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <Loader />;
  if (!asset) return null;

  return (
    <div className="mx-auto max-w-3xl">
      <button
        onClick={() => navigate(`/assets/${id}`)}
        className="mb-4 flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft size={16} /> Back to Asset
      </button>

      <div className={`${card} ${cardPad}`}>
        <h1 className="mb-2 text-2xl font-bold text-slate-900">Edit Asset</h1>
        <p className="mb-6 text-sm text-slate-600 font-mono">{asset.assetTag} (read-only)</p>

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

          {/* Custom fields */}
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
            />
          </div>

          {/* Acquisition Date */}
          <div>
            <label className={label}>Acquisition Date</label>
            <input
              type="date"
              value={form.acquisitionDate}
              onChange={(e) => handleChange('acquisitionDate', e.target.value)}
              className={input}
            />
          </div>

          {/* Acquisition Cost */}
          <div>
            <label className={label}>Acquisition Cost (₹)</label>
            <input
              type="number"
              value={form.acquisitionCost}
              onChange={(e) => handleChange('acquisitionCost', e.target.value)}
              className={input}
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

          {/* Status — managers/admins can set the full lifecycle set incl. terminal states */}
          <div>
            <label className={label}>Status</label>
            <Select
              value={form.status}
              onChange={(e) => handleChange('status', e.target.value)}
              options={[
                'Available', 'Allocated', 'Reserved', 'Under Maintenance', 'Lost', 'Retired', 'Disposed',
              ].map((s) => ({ value: s, label: s }))}
            />
            <p className="mt-1 text-xs text-slate-400">Lost / Retired / Disposed assets are not allocatable or bookable.</p>
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
            <ImageUploader
              label="Photos"
              files={photos}
              onChange={setPhotos}
              existing={asset.photos || []}
              max={10}
            />
            <p className="mt-1 text-xs text-slate-500">New photos are added to the existing ones.</p>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => navigate(`/assets/${id}`)}
              className={`${btn.base} ${btn.secondary} ${btn.md}`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`${btn.base} ${btn.primary} ${btn.md} flex-1`}
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
