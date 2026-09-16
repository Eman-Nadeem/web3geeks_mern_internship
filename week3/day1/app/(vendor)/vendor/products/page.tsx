'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { StatusBadge } from '@/components/StatusBadge';
import { 
  Package, 
  PlusCircle, 
  Trash2, 
  Edit3, 
  AlertCircle, 
  ExternalLink, 
  Box, 
  Check 
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  imageUrl: string | null;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  createdAt: string;
}

export default function VendorProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchProducts = async () => {
    try {
      const meRes = await fetch('/api/auth/me');
      const meData = await meRes.json();
      if (!meData.success || !meData.data?.vendor) {
        setError('Vendor profile not found');
        setLoading(false);
        return;
      }

      const vendorId = meData.data.vendor.id;
      const res = await fetch(`/api/vendors/${vendorId}/products`);
      const data = await res.json();
      if (data.success) {
        setProducts(data.data);
      } else {
        setError(data.error || 'Failed to fetch products');
      }
    } catch {
      setError('An error occurred while loading products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Failed to delete product.');
        setDeletingId(null);
        return;
      }

      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch {
      alert('An error occurred while deleting the product.');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredProducts = products.filter((p) => {
    if (statusFilter === 'ALL') return true;
    return p.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Product Inventory</h2>
          <p className="text-xs text-slate-400 mt-1">
            Manage your store&apos;s product listings, stock levels, and publication status.
          </p>
        </div>

        <Link
          href="/vendor/products/new"
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          Add New Product
        </Link>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800 text-xs text-rose-300">
          {error}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        {['ALL', 'ACTIVE', 'DRAFT', 'ARCHIVED'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
              statusFilter === st
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            {st.toLowerCase()} ({products.filter((p) => (st === 'ALL' ? true : p.status === st)).length})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-slate-500">Loading products...</div>
      ) : filteredProducts.length === 0 ? (
        <div className="py-16 rounded-2xl bg-slate-900/40 border border-slate-800 text-center space-y-3">
          <Box className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-300">No products match this filter</h3>
          <p className="text-xs text-slate-500">Add a new item to your catalog or switch filter tabs.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-4 font-semibold">Product</th>
                  <th className="p-4 font-semibold">Category</th>
                  <th className="p-4 font-semibold">Price</th>
                  <th className="p-4 font-semibold">Stock</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <Box className="w-4 h-4 text-slate-500" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-white text-xs">{product.name}</div>
                          <span className="text-[11px] text-slate-500 font-mono">slug: {product.slug}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-slate-400 font-medium">{product.category}</td>
                    <td className="p-4 font-bold text-emerald-400">${product.price.toFixed(2)}</td>
                    <td className="p-4">
                      <span className={product.stock === 0 ? 'text-amber-400 font-bold' : 'text-slate-300'}>
                        {product.stock} units
                      </span>
                    </td>
                    <td className="p-4">
                      <StatusBadge status={product.status} />
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/vendor/products/${product.id}/edit`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                          title="Edit Product"
                        >
                          <Edit3 className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(product.id, product.name)}
                          disabled={deletingId === product.id}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors disabled:opacity-50"
                          title="Delete Product"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
