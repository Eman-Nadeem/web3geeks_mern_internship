'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  DollarSign,
  Box,
  Tag,
  Image as ImageIcon,
  Link2,
  Upload,
  Plus,
  Trash2,
  Star,
  Layers,
  CheckCircle2,
} from 'lucide-react';

interface LocalImage {
  url: string;
  isPrimary: boolean;
  order: number;
}

interface LocalVariant {
  sku: string;
  optionKey: string;
  optionValue: string;
  price: string;
  stockQuantity: string;
  imageUrl: string;
}

export default function NewProductPage() {
  const router = useRouter();

  // Basic Details
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [compareAtPrice, setCompareAtPrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState('10');
  const [lowStockThreshold, setLowStockThreshold] = useState('5');
  const [status, setStatus] = useState<'ACTIVE' | 'DRAFT'>('ACTIVE');

  // Images State
  const [images, setImages] = useState<LocalImage[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  // Variants State
  const [hasVariants, setHasVariants] = useState(false);
  const [variants, setVariants] = useState<LocalVariant[]>([
    { sku: '', optionKey: 'Size', optionValue: 'Standard', price: '', stockQuantity: '10', imageUrl: '' },
  ]);

  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);

  const handleNameChange = (val: string) => {
    setName(val);
    const derivedSlug = val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setSlug(derivedSlug);

    // Auto-suggest SKU if empty
    if (!sku) {
      const initials = val
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 4);
      const randNum = Math.floor(100 + Math.random() * 900);
      setSku(`${initials || 'PRD'}-${randNum}`);
    }
  };

  // Cloudinary File Upload Handler
  const handleCloudinaryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload/cloudinary', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload image to Cloudinary');
      }

      const uploadedUrl = data.data?.url || data.url;
      if (uploadedUrl) {
        setImages((prev) => [
          ...prev,
          {
            url: uploadedUrl,
            isPrimary: prev.length === 0,
            order: prev.length,
          },
        ]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Image upload failed');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleAddImageUrl = () => {
    if (!newImageUrl.trim()) return;
    setImages((prev) => [
      ...prev,
      {
        url: newImageUrl.trim(),
        isPrimary: prev.length === 0,
        order: prev.length,
      },
    ]);
    setNewImageUrl('');
  };

  const setPrimaryImage = (index: number) => {
    setImages((prev) =>
      prev.map((img, i) => ({
        ...img,
        isPrimary: i === index,
      }))
    );
  };

  const removeImage = (index: number) => {
    setImages((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      if (updated.length > 0 && !updated.some((img) => img.isPrimary)) {
        updated[0].isPrimary = true;
      }
      return updated.map((img, idx) => ({ ...img, order: idx }));
    });
  };

  // Variant Helpers
  const addVariantRow = () => {
    setVariants((prev) => [
      ...prev,
      {
        sku: `${sku || 'VAR'}-${prev.length + 1}`,
        optionKey: 'Color',
        optionValue: '',
        price: '',
        stockQuantity: '10',
        imageUrl: '',
      },
    ]);
  };

  const removeVariantRow = (index: number) => {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const updateVariant = (index: number, field: keyof LocalVariant, val: string) => {
    setVariants((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [field]: val } : v))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setLoading(true);

    try {
      // Format variants payload
      const formattedVariants = hasVariants
        ? variants
            .filter((v) => v.sku && v.optionKey && v.optionValue)
            .map((v) => ({
              sku: v.sku.trim(),
              options: { [v.optionKey.trim()]: v.optionValue.trim() },
              price: v.price ? parseFloat(v.price) : undefined,
              stockQuantity: parseInt(v.stockQuantity, 10) || 0,
              imageUrl: v.imageUrl?.trim() || undefined,
            }))
        : [];

      const payload = {
        name,
        slug,
        sku,
        description,
        price: parseFloat(price),
        compareAtPrice: compareAtPrice ? parseFloat(compareAtPrice) : undefined,
        stockQuantity: parseInt(stockQuantity, 10) || 0,
        lowStockThreshold: parseInt(lowStockThreshold, 10) || 5,
        category,
        status,
        images,
        variants: formattedVariants,
      };

      const res = await fetch('/api/vendor/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.details && typeof data.details === 'object') {
          setFieldErrors(data.details);
        }
        setError(data.error || 'Failed to create product.');
        setLoading(false);
        return;
      }

      router.push('/vendor/products');
      router.refresh();
    } catch {
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        href="/vendor/products"
        className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-on-dark-muted)] hover:text-[var(--text-on-dark)] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Products
      </Link>

      <div>
        <h2 className="text-2xl font-bold text-[var(--text-on-dark)] tracking-tight">Add New Product</h2>
        <p className="text-xs text-[var(--text-on-dark-muted)] mt-1">
          Create a product listing with SKU codes, multi-image Cloudinary uploads, and product variants.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-500">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-8 rounded-3xl bg-[var(--surface-card)] border border-[var(--border-dark)] space-y-6 shadow-sm">
        {/* Section 1: Basic Information */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-[var(--text-on-dark)] uppercase tracking-wider border-b border-[var(--border-dark)] pb-2">
            1. Basic Information
          </h3>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text-on-dark)]">Product Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Wireless Ergonomic Mechanical Keyboard"
              className="w-full px-3.5 py-2 bg-[var(--surface-card-subtle)] border border-[var(--border-dark)] rounded-xl text-xs text-[var(--text-on-dark)] placeholder:text-[var(--text-on-dark-muted)] focus:outline-none focus:border-emerald-500"
            />
            {fieldErrors.name && <p className="text-[11px] text-rose-500">{fieldErrors.name[0]}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-on-dark)]">Product SKU (Unique to your store) *</label>
              <input
                type="text"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                placeholder="e.g. NT-KB-001"
                className="w-full px-3.5 py-2 bg-[var(--surface-card-subtle)] border border-[var(--border-dark)] rounded-xl text-xs text-[var(--text-on-dark)] font-mono placeholder:text-[var(--text-on-dark-muted)] focus:outline-none focus:border-emerald-500"
              />
              {fieldErrors.sku && <p className="text-[11px] text-rose-500">{fieldErrors.sku[0]}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-on-dark)]">Product Slug (Public URL) *</label>
              <div className="relative">
                <Link2 className="w-4 h-4 text-[var(--text-on-dark-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  pattern="^[a-z0-9-]+$"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase())}
                  placeholder="wireless-ergonomic-mechanical-keyboard"
                  className="w-full pl-9 pr-3 py-2 bg-[var(--surface-card-subtle)] border border-[var(--border-dark)] rounded-xl text-xs text-emerald-600 dark:text-emerald-400 font-mono placeholder:text-[var(--text-on-dark-muted)] focus:outline-none focus:border-emerald-500"
                />
              </div>
              {fieldErrors.slug && <p className="text-[11px] text-rose-500">{fieldErrors.slug[0]}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-on-dark)]">Category *</label>
              <div className="relative">
                <Tag className="w-4 h-4 text-[var(--text-on-dark-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. Electronics, Audio, Accessories"
                  className="w-full pl-9 pr-3 py-2 bg-[var(--surface-card-subtle)] border border-[var(--border-dark)] rounded-xl text-xs text-[var(--text-on-dark)] placeholder:text-[var(--text-on-dark-muted)] focus:outline-none focus:border-emerald-500"
                />
              </div>
              {fieldErrors.category && <p className="text-[11px] text-rose-500">{fieldErrors.category[0]}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-on-dark)]">Publication Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'ACTIVE' | 'DRAFT')}
                className="w-full px-3 py-2 bg-[var(--surface-card-subtle)] border border-[var(--border-dark)] rounded-xl text-xs text-[var(--text-on-dark)] focus:outline-none focus:border-emerald-500"
              >
                <option value="ACTIVE">ACTIVE (Published to marketplace)</option>
                <option value="DRAFT">DRAFT (Saved as hidden draft)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text-on-dark)]">Description *</label>
            <textarea
              rows={4}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed specifications, features, warranty, and craftsmanship details..."
              className="w-full p-3 bg-[var(--surface-card-subtle)] border border-[var(--border-dark)] rounded-xl text-xs text-[var(--text-on-dark)] placeholder:text-[var(--text-on-dark-muted)] focus:outline-none focus:border-emerald-500"
            />
            {fieldErrors.description && <p className="text-[11px] text-rose-500">{fieldErrors.description[0]}</p>}
          </div>
        </div>

        {/* Section 2: Pricing & Stock Inventory */}
        <div className="space-y-4 pt-2">
          <h3 className="text-sm font-bold text-[var(--text-on-dark)] uppercase tracking-wider border-b border-[var(--border-dark)] pb-2">
            2. Pricing & Stock Inventory
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-on-dark)]">Selling Price ($ USD) *</label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-[var(--text-on-dark-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="129.99"
                  className="w-full pl-9 pr-3 py-2 bg-[var(--surface-card-subtle)] border border-[var(--border-dark)] rounded-xl text-xs text-[var(--text-on-dark)] placeholder:text-[var(--text-on-dark-muted)] focus:outline-none focus:border-emerald-500"
                />
              </div>
              {fieldErrors.price && <p className="text-[11px] text-rose-500">{fieldErrors.price[0]}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-on-dark)]">Compare-at Price ($ USD) - Optional</label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-[var(--text-on-dark-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={compareAtPrice}
                  onChange={(e) => setCompareAtPrice(e.target.value)}
                  placeholder="159.99"
                  className="w-full pl-9 pr-3 py-2 bg-[var(--surface-card-subtle)] border border-[var(--border-dark)] rounded-xl text-xs text-[var(--text-on-dark)] placeholder:text-[var(--text-on-dark-muted)] focus:outline-none focus:border-emerald-500"
                />
              </div>
              {fieldErrors.compareAtPrice && <p className="text-[11px] text-rose-500">{fieldErrors.compareAtPrice[0]}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-on-dark)]">Initial Stock Units *</label>
              <div className="relative">
                <Box className="w-4 h-4 text-[var(--text-on-dark-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  min="0"
                  required
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                  placeholder="10"
                  className="w-full pl-9 pr-3 py-2 bg-[var(--surface-card-subtle)] border border-[var(--border-dark)] rounded-xl text-xs text-[var(--text-on-dark)] placeholder:text-[var(--text-on-dark-muted)] focus:outline-none focus:border-emerald-500"
                />
              </div>
              {fieldErrors.stockQuantity && <p className="text-[11px] text-rose-500">{fieldErrors.stockQuantity[0]}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-on-dark)]">Low-Stock Alert Threshold *</label>
              <input
                type="number"
                min="0"
                required
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(e.target.value)}
                placeholder="5"
                className="w-full px-3.5 py-2 bg-[var(--surface-card-subtle)] border border-[var(--border-dark)] rounded-xl text-xs text-[var(--text-on-dark)] placeholder:text-[var(--text-on-dark-muted)] focus:outline-none focus:border-emerald-500"
              />
              {fieldErrors.lowStockThreshold && <p className="text-[11px] text-rose-500">{fieldErrors.lowStockThreshold[0]}</p>}
            </div>
          </div>
        </div>

        {/* Section 3: Multi-Image Cloudinary Upload */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between border-b border-[var(--border-dark)] pb-2">
            <h3 className="text-sm font-bold text-[var(--text-on-dark)] uppercase tracking-wider">
              3. Product Images (Cloudinary & URLs)
            </h3>
            <span className="text-[11px] text-[var(--text-on-dark-muted)]">Star = Primary Image</span>
          </div>

          <div className="space-y-3">
            {/* Upload or URL input */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              <div className="sm:col-span-8 flex items-center gap-2">
                <input
                  type="url"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="Paste direct image URL (https://...)"
                  className="w-full px-3.5 py-2 bg-[var(--surface-card-subtle)] border border-[var(--border-dark)] rounded-xl text-xs text-[var(--text-on-dark)] placeholder:text-[var(--text-on-dark-muted)] focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleAddImageUrl}
                  className="px-3 py-2 bg-[var(--surface-card-subtle)] hover:bg-[var(--border-dark)] text-[var(--text-on-dark)] border border-[var(--border-dark)] rounded-xl text-xs font-semibold shrink-0 cursor-pointer"
                >
                  Add URL
                </button>
              </div>

              <div className="sm:col-span-4">
                <label className="w-full px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-colors">
                  <Upload className="w-4 h-4" />
                  <span>{uploadingImage ? 'Uploading...' : 'Upload Cloudinary'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingImage}
                    onChange={handleCloudinaryUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Images Gallery Manager */}
            {images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    className={`relative rounded-xl border p-2 bg-[var(--surface-card-subtle)] flex flex-col items-center gap-2 ${
                      img.isPrimary ? 'border-emerald-500 ring-2 ring-emerald-500/30' : 'border-[var(--border-dark)]'
                    }`}
                  >
                    <img src={img.url} alt="" className="w-full h-24 object-contain rounded-lg bg-[var(--surface-card)]" />
                    <div className="flex items-center justify-between w-full text-xs pt-1 border-t border-[var(--border-dark)]">
                      <button
                        type="button"
                        onClick={() => setPrimaryImage(idx)}
                        className={`flex items-center gap-1 text-[11px] font-semibold cursor-pointer ${
                          img.isPrimary ? 'text-emerald-500 font-bold' : 'text-[var(--text-on-dark-muted)] hover:text-[var(--text-on-dark)]'
                        }`}
                      >
                        <Star className={`w-3.5 h-3.5 ${img.isPrimary ? 'fill-emerald-500 text-emerald-500' : ''}`} />
                        {img.isPrimary ? 'Primary' : 'Set Primary'}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="text-[var(--text-on-dark-muted)] hover:text-rose-500 p-1 cursor-pointer"
                        title="Remove Image"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Section 4: Product Variants */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between border-b border-[var(--border-dark)] pb-2">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-500" />
              <h3 className="text-sm font-bold text-[var(--text-on-dark)] uppercase tracking-wider">
                4. Product Variants (Optional)
              </h3>
            </div>
            <label className="flex items-center gap-2 text-xs text-[var(--text-on-dark)] cursor-pointer">
              <input
                type="checkbox"
                checked={hasVariants}
                onChange={(e) => setHasVariants(e.target.checked)}
                className="w-4 h-4 accent-emerald-500 rounded"
              />
              <span>This product has options (e.g. Size, Color)</span>
            </label>
          </div>

          {hasVariants && (
            <div className="space-y-3">
              <p className="text-[11px] text-[var(--text-on-dark-muted)]">
                When variants are configured, stock and pricing can be set per variant. Parent stock is computed automatically.
              </p>

              {variants.map((v, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-[var(--surface-card-subtle)] border border-[var(--border-dark)] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[var(--text-on-dark)]">Variant #{idx + 1}</span>
                    {variants.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeVariantRow(idx)}
                        className="text-[var(--text-on-dark-muted)] hover:text-rose-500 text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[11px] text-[var(--text-on-dark-muted)] block mb-1">Option Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Color, Size"
                        value={v.optionKey}
                        onChange={(e) => updateVariant(idx, 'optionKey', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[var(--surface-card)] border border-[var(--border-dark)] rounded-lg text-xs text-[var(--text-on-dark)]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-[var(--text-on-dark-muted)] block mb-1">Option Value</label>
                      <input
                        type="text"
                        placeholder="e.g. Matte Black, Large"
                        value={v.optionValue}
                        onChange={(e) => updateVariant(idx, 'optionValue', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[var(--surface-card)] border border-[var(--border-dark)] rounded-lg text-xs text-[var(--text-on-dark)]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-[var(--text-on-dark-muted)] block mb-1">Variant SKU *</label>
                      <input
                        type="text"
                        required={hasVariants}
                        placeholder="e.g. KB-01-BLK"
                        value={v.sku}
                        onChange={(e) => updateVariant(idx, 'sku', e.target.value.toUpperCase())}
                        className="w-full px-2.5 py-1.5 bg-[var(--surface-card)] border border-[var(--border-dark)] rounded-lg text-xs text-[var(--text-on-dark)] font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-[var(--text-on-dark-muted)] block mb-1">Stock Units *</label>
                      <input
                        type="number"
                        min="0"
                        required={hasVariants}
                        value={v.stockQuantity}
                        onChange={(e) => updateVariant(idx, 'stockQuantity', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[var(--surface-card)] border border-[var(--border-dark)] rounded-lg text-xs text-[var(--text-on-dark)]"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addVariantRow}
                className="px-3.5 py-2 bg-[var(--surface-card-subtle)] hover:bg-[var(--border-dark)] text-[var(--text-on-dark)] border border-[var(--border-dark)] rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Another Variant
              </button>
            </div>
          )}
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading || uploadingImage}
          className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 mt-4 cursor-pointer"
        >
          {loading ? 'Creating product...' : 'Create & Save Product'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
