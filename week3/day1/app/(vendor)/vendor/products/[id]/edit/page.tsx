'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, DollarSign, Box, Tag, Image as ImageIcon, Link2 } from 'lucide-react';

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('0');
  const [category, setCategory] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [status, setStatus] = useState<'DRAFT' | 'ACTIVE' | 'ARCHIVED'>('ACTIVE');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/products/${productId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          const p = data.data;
          setName(p.name);
          setSlug(p.slug);
          setDescription(p.description);
          setPrice(p.price.toString());
          setStock(p.stock.toString());
          setCategory(p.category);
          setImageUrl(p.imageUrl || '');
          setStatus(p.status);
        } else {
          setError(data.error || 'Failed to load product');
        }
      })
      .catch(() => setError('Failed to load product details'))
      .finally(() => setLoading(false));
  }, [productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          slug,
          description,
          price: parseFloat(price),
          stock: parseInt(stock, 10),
          category,
          imageUrl: imageUrl || undefined,
          status,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to update product.');
        setSaving(false);
        return;
      }

      router.push('/vendor/products');
      router.refresh();
    } catch {
      setError('An unexpected error occurred.');
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-xs text-slate-500">Loading product details...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        href="/vendor/products"
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Products
      </Link>

      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Edit Product</h2>
        <p className="text-xs text-slate-400 mt-1">
          Modify product details, pricing, and stock levels. Changes update your store immediately.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800 text-xs text-rose-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-8 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-5 shadow-xl">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Product Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Slug</label>
          <div className="relative">
            <Link2 className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              pattern="^[a-z0-9-]+$"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-emerald-400 font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Description</label>
          <textarea
            rows={4}
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Price ($ USD)</label>
            <div className="relative">
              <DollarSign className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Stock Units</label>
            <div className="relative">
              <Box className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="number"
                min="0"
                required
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Category</label>
            <div className="relative">
              <Tag className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'DRAFT' | 'ACTIVE' | 'ARCHIVED')}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="ACTIVE">ACTIVE (Published)</option>
              <option value="DRAFT">DRAFT (Hidden)</option>
              <option value="ARCHIVED">ARCHIVED (Discontinued)</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Image URL</label>
          <div className="relative">
            <ImageIcon className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow-md shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving changes...' : 'Save Product Changes'}
        </button>
      </form>
    </div>
  );
}
