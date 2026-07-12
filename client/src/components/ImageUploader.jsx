import { useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { label as labelCls } from '../lib/ui.js';

/**
 * Image picker with previews. Holds File objects in local state and reports
 * them up via onChange(files). The parent appends them to FormData under the
 * field name the server expects ('images'). Existing image paths (edit mode)
 * are shown separately and removable via onRemoveExisting.
 */
export default function ImageUploader({
  label = 'Images',
  files = [],
  onChange,
  existing = [],
  onRemoveExisting,
  max = 5,
}) {
  const inputRef = useRef(null);
  const [previews, setPreviews] = useState([]);

  function handleSelect(e) {
    const picked = Array.from(e.target.files || []);
    const next = [...files, ...picked].slice(0, max);
    onChange(next);
    setPreviews(next.map((f) => URL.createObjectURL(f)));
  }

  function removeNew(idx) {
    const next = files.filter((_, i) => i !== idx);
    onChange(next);
    setPreviews(next.map((f) => URL.createObjectURL(f)));
  }

  return (
    <div>
      {label && <label className={labelCls}>{label}</label>}
      <div className="flex flex-wrap gap-3">
        {/* Already-saved images (edit mode) */}
        {existing.map((path) => (
          <div key={path} className="relative h-20 w-20 overflow-hidden rounded-lg border border-slate-200">
            <img src={path} alt="" className="h-full w-full object-cover" />
            {onRemoveExisting && (
              <button
                type="button"
                onClick={() => onRemoveExisting(path)}
                className="absolute right-0.5 top-0.5 rounded-full bg-black/50 p-0.5 text-white"
              >
                <X size={12} />
              </button>
            )}
          </div>
        ))}

        {/* Newly picked images */}
        {previews.map((src, idx) => (
          <div key={src} className="relative h-20 w-20 overflow-hidden rounded-lg border border-slate-200">
            <img src={src} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => removeNew(idx)}
              className="absolute right-0.5 top-0.5 rounded-full bg-black/50 p-0.5 text-white"
            >
              <X size={12} />
            </button>
          </div>
        ))}

        {/* Add button */}
        {existing.length + files.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-300 text-slate-400 hover:border-brand-400 hover:text-brand-500"
          >
            <ImagePlus size={20} />
            <span className="text-[10px]">Add</span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={handleSelect}
      />
    </div>
  );
}
