'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
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
  History,
  Boxes,
  RefreshCw,
} from 'lucide-react';

interface ProductImage {
  id?: string;
  url: string;
  isPrimary: boolean;
  order: number;
}

interface ProductVariant {
  id?: string;
  sku: string;
  optionKey: string;
  optionValue: string;
  price: string;
  stockQuantity: string;
  imageUrl: string;
}

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [compareAtPrice, setCompareAtPrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState('0');
  const [lowStockThreshold, setLowStockThreshold] = useState('5');
  const [status, setStatus] = useState<'DRAFT' | 'ACTIVE' | 'OUT_OF_STOCK' | 'ARCHIVED'>('ACTIVE');

  // Images State
  const [images, setImages] = useState<ProductImage[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  // Variants State
  const [hasVariants, setHasVariants] = useState(false);
  const [variants, setVariants] = useState<ProductVariant[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    fetch(`/api/vendor/products/${productId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          const p = data.data;
          setName(p.name);
          setSlug(p.slug);
          setSku(p.sku || '');
          setDescription(p.description);
          setCategory(p.category);
          setPrice(p.price.toString());
          setCompareAtPrice(p.compareAtPrice ? p.compareAtPrice.toString() : '');
          setStockQuantity(p.stockQuantity.toString());
          setLowStockThreshold(p.lowStockThreshold ? p.lowStockThreshold.toString() : '5');
          setStatus(p.status);

          if (p.images && p.images.length > 0) {
            setImages(p.images);
          } else if (p.imageUrl) {
            setImages([{ url: p.imageUrl, isPrimary: true, order: 0 }]);
          }

          if (p.variants && p.variants.length > 0) {
            setHasVariants(true);
            setVariants(
              p.variants.map((v: any) => {
                const keys = Object.keys(v.options || {});
                return {
                  id: v.id,
                  sku: v.sku,
                  optionKey: keys[0] || 'Option',
                  optionValue: v.options ? v.options[keys[0]] : '',
                  price: v.price ? v.price.toString() : '',
                  stockQuantity: v.stockQuantity.toString(),
                  imageUrl: v.imageUrl || '',
                };
              })
            );
          }
        } else {
          setError(data.error || 'Failed to load product');
        }
      })
      .catch(() => setError('Failed to load product details'))
      .finally(() => setLoading(false));
  }, [productId]);

  // Cloudinary Upload Handler
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

  const updateVariant = (index: number, field: keyof ProductVariant, val: string) => {
    setVariants((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [field]: val } : v))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setSaving(true);

    try {
      const formattedVariants = hasVariants
        ? variants
            .filter((v) => v.sku && v.optionKey && v.optionValue)
            .map((v) => ({
              id: v.id,
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
        compareAtPrice: compareAtPrice ? parseFloat(compareAtPrice) : null,
        stockQuantity: parseInt(stockQuantity, 10) || 0,
        lowStockThreshold: parseInt(lowStockThreshold, 10) || 5,
        category,
        status,
        images,
        variants: formattedVariants,
      };

      const res = await fetch(`/api/vendor/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.details && typeof data.details === 'object') {
          setFieldErrors(data.details);
        }
        setError(data.error || 'Failed to update product.');
        setSaving(false);
        return;
      }

      router.push('/vendor/products');
      router.refresh();
    } catch {
      setError('An unexpected error occurred. Please try again.');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
        <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" />
        Loading product details...
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/vendor/products"
          className="inline-flex items-center gap-2 text-xs font-semibold text-(--text-on-dark-muted) hover:text-(--text-on-dark) transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Products
        </Link>
        <Link
          href="/vendor/inventory"
          className="text-xs text-emerald-400 hover:underline flex items-center gap-1 font-medium"
        >
          <Boxes className="w-3.5 h-3.5" />
          Inventory Stock Manager
        </Link>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-(--text-on-dark) tracking-tight">Edit Product</h2>
        <p className="text-xs text-(--text-on-dark-muted) mt-1">
          Modify product specifications, Cloudinary images, pricing, and variant options.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-8 rounded-3xl bg-(--surface-card) border border-(--border-dark) space-y-6 shadow-xl">
        {/* Section 1: Basic Information */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-(--text-on-dark) uppercase tracking-wider border-b border-(--border-dark) pb-2">
            1. Basic Information
          </h3>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-(--text-on-dark-muted)">Product Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 bg-(--surface-card-subtle) border border-(--border-dark) rounded-xl text-xs text-(--text-on-dark) placeholder-(--text-on-dark-muted) focus:outline-none focus:border-emerald-500"
            />
            {fieldErrors.name && <p className="text-[11px] text-rose-400">{fieldErrors.name[0]}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-(--text-on-dark-muted)">Product SKU *</label>
              <input
                type="text"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                className="w-full px-3.5 py-2 bg-(--surface-card-subtle) border border-(--border-dark) rounded-xl text-xs text-(--text-on-dark) font-mono focus:outline-none focus:border-emerald-500"
              />
              {fieldErrors.sku && <p className="text-[11px] text-rose-400">{fieldErrors.sku[0]}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-(--text-on-dark-muted)">Product Slug (Public URL identifier) *</label>
              <div className="relative">
                <Link2 className="w-4 h-4 text-(--text-on-dark-muted) absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  pattern="^[a-z0-9-]+$"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase())}
                  className="w-full pl-9 pr-3 py-2 bg-(--surface-card-subtle) border border-(--border-dark) rounded-xl text-xs text-emerald-400 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
              {fieldErrors.slug && <p className="text-[11px] text-rose-400">{fieldErrors.slug[0]}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-(--text-on-dark-muted)">Category *</label>
              <div className="relative">
                <Tag className="w-4 h-4 text-(--text-on-dark-muted) absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-(--surface-card-subtle) border border-(--border-dark) rounded-xl text-xs text-(--text-on-dark) focus:outline-none focus:border-emerald-500"
                />
              </div>
              {fieldErrors.category && <p className="text-[11px] text-rose-400">{fieldErrors.category[0]}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-(--text-on-dark-muted)">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-(--surface-card-subtle) border border-(--border-dark) rounded-xl text-xs text-(--text-on-dark) focus:outline-none focus:border-emerald-500"
              >
                <option value="ACTIVE">ACTIVE (Published)</option>
                <option value="DRAFT">DRAFT (Hidden)</option>
                <option value="OUT_OF_STOCK">OUT_OF_STOCK</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-(--text-on-dark-muted)">Description *</label>
            <textarea
              rows={4}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 bg-(--surface-card-subtle) border border-(--border-dark) rounded-xl text-xs text-(--text-on-dark) focus:outline-none focus:border-emerald-500"
            />
            {fieldErrors.description && <p className="text-[11px] text-rose-400">{fieldErrors.description[0]}</p>}
          </div>
        </div>

        {/* Section 2: Pricing & Stock Inventory */}
        <div className="space-y-4 pt-2">
          <h3 className="text-sm font-bold text-(--text-on-dark) uppercase tracking-wider border-b border-(--border-dark) pb-2">
            2. Pricing & Stock Inventory
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-(--text-on-dark-muted)">Selling Price ($ USD) *</label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-(--text-on-dark-muted) absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-(--surface-card-subtle) border border-(--border-dark) rounded-xl text-xs text-(--text-on-dark) focus:outline-none focus:border-emerald-500"
                />
              </div>
              {fieldErrors.price && <p className="text-[11px] text-rose-400">{fieldErrors.price[0]}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-(--text-on-dark-muted)">Compare-at Price ($ USD)</label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-(--text-on-dark-muted) absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={compareAtPrice}
                  onChange={(e) => setCompareAtPrice(e.target.value)}
                  placeholder="e.g. 159.99"
                  className="w-full pl-9 pr-3 py-2 bg-(--surface-card-subtle) border border-(--border-dark) rounded-xl text-xs text-(--text-on-dark) focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-(--text-on-dark-muted)">Stock Units *</label>
              <div className="relative">
                <Box className="w-4 h-4 text-(--text-on-dark-muted) absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  min="0"
                  required
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-(--surface-card-subtle) border border-(--border-dark) rounded-xl text-xs text-(--text-on-dark) focus:outline-none focus:border-emerald-500"
                />
              </div>
              {fieldErrors.stockQuantity && <p className="text-[11px] text-rose-400">{fieldErrors.stockQuantity[0]}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-(--text-on-dark-muted)">Low-Stock Alert Threshold *</label>
              <input
                type="number"
                min="0"
                required
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(e.target.value)}
                className="w-full px-3.5 py-2 bg-(--surface-card-subtle) border border-(--border-dark) rounded-xl text-xs text-(--text-on-dark) focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Multi-Image Cloudinary Upload */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between border-b border-(--border-dark) pb-2">
            <h3 className="text-sm font-bold text-(--text-on-dark) uppercase tracking-wider">
              3. Product Images (Cloudinary & URLs)
            </h3>
            <span className="text-[11px] text-(--text-on-dark-muted)">Star = Primary Image</span>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              <div className="sm:col-span-8 flex items-center gap-2">
                <input
                  type="url"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="Paste direct image URL (https://...)"
                  className="w-full px-3.5 py-2 bg-(--surface-card-subtle) border border-(--border-dark) rounded-xl text-xs text-(--text-on-dark) placeholder-(--text-on-dark-muted) focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleAddImageUrl}
                  className="px-3.5 py-2 bg-(--surface-card-subtle) hover:bg-emerald-600 hover:text-white border border-(--border-dark) text-(--text-on-dark) rounded-xl text-xs font-semibold shrink-0 transition-colors"
                >
                  Add URL
                </button>
              </div>

              <div className="sm:col-span-4">
                <label className="w-full px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-md transition-colors">
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

            {images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    className={`relative rounded-xl border p-2 bg-(--surface-card-subtle) flex flex-col items-center gap-2 ${
                      img.isPrimary ? 'border-emerald-500 ring-2 ring-emerald-500/30' : 'border-(--border-dark)'
                    }`}
                  >
                    <img src={img.url} alt="" className="w-full h-24 object-contain rounded-lg bg-(--bg-canvas)" />
                    <div className="flex items-center justify-between w-full text-xs pt-1 border-t border-(--border-dark)">
                      <button
                        type="button"
                        onClick={() => setPrimaryImage(idx)}
                        className={`flex items-center gap-1 text-[11px] font-semibold ${
                          img.isPrimary ? 'text-emerald-500' : 'text-(--text-on-dark-muted) hover:text-(--text-on-dark)'
                        }`}
                      >
                        <Star className={`w-3.5 h-3.5 ${img.isPrimary ? 'fill-emerald-500' : ''}`} />
                        {img.isPrimary ? 'Primary' : 'Set Primary'}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="text-(--text-on-dark-muted) hover:text-rose-400 p-1 transition-colors"
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

        {/* Section 4: Variants */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between border-b border-(--border-dark) pb-2">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-bold text-(--text-on-dark) uppercase tracking-wider">
                4. Product Variants
              </h3>
            </div>
            <label className="flex items-center gap-2 text-xs text-(--text-on-dark-muted) cursor-pointer">
              <input
                type="checkbox"
                checked={hasVariants}
                onChange={(e) => setHasVariants(e.target.checked)}
                className="w-4 h-4 accent-emerald-500 rounded"
              />
              <span>Enable product options / variants</span>
            </label>
          </div>

          {hasVariants && (
            <div className="space-y-3">
              {variants.map((v, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-(--surface-card-subtle) border border-(--border-dark) space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-(--text-on-dark)">Variant #{idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeVariantRow(idx)}
                      className="text-(--text-on-dark-muted) hover:text-rose-400 text-xs flex items-center gap-1 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[11px] text-(--text-on-dark-muted) block mb-1">Option Name</label>
                      <input
                        type="text"
                        value={v.optionKey}
                        onChange={(e) => updateVariant(idx, 'optionKey', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-(--surface-card) border border-(--border-dark) rounded-lg text-xs text-(--text-on-dark)"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-(--text-on-dark-muted) block mb-1">Option Value</label>
                      <input
                        type="text"
                        value={v.optionValue}
                        onChange={(e) => updateVariant(idx, 'optionValue', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-(--surface-card) border border-(--border-dark) rounded-lg text-xs text-(--text-on-dark)"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-(--text-on-dark-muted) block mb-1">Variant SKU *</label>
                      <input
                        type="text"
                        required={hasVariants}
                        value={v.sku}
                        onChange={(e) => updateVariant(idx, 'sku', e.target.value.toUpperCase())}
                        className="w-full px-2.5 py-1.5 bg-(--surface-card) border border-(--border-dark) rounded-lg text-xs text-(--text-on-dark) font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-(--text-on-dark-muted) block mb-1">Stock Units *</label>
                      <input
                        type="number"
                        min="0"
                        required={hasVariants}
                        value={v.stockQuantity}
                        onChange={(e) => updateVariant(idx, 'stockQuantity', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-(--surface-card) border border-(--border-dark) rounded-lg text-xs text-(--text-on-dark)"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addVariantRow}
                className="px-3.5 py-2 bg-(--surface-card-subtle) hover:bg-emerald-600 hover:text-white border border-(--border-dark) text-(--text-on-dark) rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
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
          disabled={saving || uploadingImage}
          className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow-md shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving changes...' : 'Save Product Changes'}
        </button>
      </form>
    </div>
  );
}
