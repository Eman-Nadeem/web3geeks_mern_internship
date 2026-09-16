'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Package, ArrowLeft, ArrowRight, DollarSign, Box, Tag, Image as ImageIcon, Link2 } from 'lucide-react';

export default function NewProductPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('10');
  const [category, setCategory] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [status, setStatus] = useState<'DRAFT' | 'ACTIVE'>('ACTIVE');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleNameChange = (val: string) => {
    setName(val);
    const derived = val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setSlug(derived);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
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
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        href="/vendor/products"
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Products
      </Link>

      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Create New Product</h2>
        <p className="text-xs text-slate-400 mt-1">
          Add an authentic item to your store catalog. Vendor ownership is automatically bound on the server.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800 text-xs text-rose-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-8 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-5 shadow-xl">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Product Name *</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g. Wireless Ergonomic Mouse"
            className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Product Slug (URL identifier) *</label>
          <div className="relative">
            <Link2 className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              pattern="^[a-z0-9-]+$"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              placeholder="e.g. wireless-ergonomic-mouse"
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-emerald-400 font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Description *</label>
          <textarea
            rows={4}
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detailed features, technical specifications, warranty, and craftsmanship details..."
            className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Price ($ USD) *</label>
            <div className="relative">
              <DollarSign className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="49.99"
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Available Stock Units *</label>
            <div className="relative">
              <Box className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="number"
                min="0"
                required
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="10"
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Category *</label>
            <div className="relative">
              <Tag className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Electronics, Audio, Accessories"
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Initial Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'DRAFT' | 'ACTIVE')}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="ACTIVE">ACTIVE (Published to store)</option>
              <option value="DRAFT">DRAFT (Hidden from catalog)</option>
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
              placeholder="https://images.unsplash.com/..."
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow-md shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
        >
          {loading ? 'Creating product...' : 'Create & Publish Product'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
