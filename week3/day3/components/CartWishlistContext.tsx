'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface CartItem {
  id: string;
  name: string;
  slug?: string;
  price: number;
  imageUrl?: string | null;
  category?: string;
  variantId?: string | null;
  sku?: string;
  vendor: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string | null;
  };
  quantity: number;
}

export interface FavoriteItem {
  id: string;
  name: string;
  slug?: string;
  price: number;
  imageUrl?: string | null;
  category?: string;
  stock?: number;
  rating?: number;
  reviewsCount?: number;
  vendor: {
    id: string;
    name: string;
    slug: string;
  };
}

interface CartWishlistContextType {
  cart: CartItem[];
  favorites: FavoriteItem[];
  cartCount: number;
  favoritesCount: number;
  addToCart: (item: Omit<CartItem, 'quantity'>, qty?: number) => Promise<boolean>;
  removeFromCart: (id: string) => Promise<void>;
  updateQuantity: (id: string, qty: number) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
  toggleFavorite: (item: FavoriteItem) => void;
  removeFromFavorites: (id: string) => void;
  isFavorite: (id: string) => boolean;
}

const CartWishlistContext = createContext<CartWishlistContextType>({
  cart: [],
  favorites: [],
  cartCount: 0,
  favoritesCount: 0,
  addToCart: async () => false,
  removeFromCart: async () => {},
  updateQuantity: async () => {},
  clearCart: async () => {},
  refreshCart: async () => {},
  toggleFavorite: () => {},
  removeFromFavorites: () => {},
  isFavorite: () => false,
});

export function CartWishlistProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [mounted, setMounted] = useState(false);

  // Sync from server if logged in, otherwise localStorage
  const refreshCart = useCallback(async () => {
    try {
      const res = await fetch('/api/cart');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data?.vendorGroups) {
          const serverItems: CartItem[] = [];
          for (const group of json.data.vendorGroups) {
            for (const item of group.items) {
              serverItems.push({
                id: item.id,
                name: item.productName,
                slug: item.productSlug,
                price: item.unitPrice,
                imageUrl: item.imageUrl,
                variantId: item.variantId,
                sku: item.sku,
                vendor: {
                  id: group.vendor.id,
                  name: group.vendor.name,
                  slug: group.vendor.slug,
                  logoUrl: group.vendor.logoUrl,
                },
                quantity: item.quantity,
              });
            }
          }
          setCart(serverItems);
          return;
        }
      }
    } catch {
      // Fall back to localStorage
    }

    try {
      const savedCart = localStorage.getItem('nexus_cart');
      if (savedCart) {
        setCart(JSON.parse(savedCart));
      }
    } catch (e) {
      console.error('Failed to load cart from localStorage:', e);
    }
  }, []);

  useEffect(() => {
    refreshCart();
    try {
      const savedFavorites = localStorage.getItem('nexus_favorites');
      if (savedFavorites) {
        setFavorites(JSON.parse(savedFavorites));
      }
    } catch (e) {
      console.error('Failed to load favorites from localStorage:', e);
    }
    setMounted(true);
  }, [refreshCart]);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('nexus_cart', JSON.stringify(cart));
    }
  }, [cart, mounted]);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('nexus_favorites', JSON.stringify(favorites));
    }
  }, [favorites, mounted]);

  const addToCart = async (item: Omit<CartItem, 'quantity'>, qty: number = 1): Promise<boolean> => {
    // Attempt server addition
    try {
      const res = await fetch('/api/cart/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: item.id,
          variantId: item.variantId || null,
          quantity: qty,
        }),
      });
      if (res.ok) {
        await refreshCart();
        return true;
      }
    } catch {
      // Offline / fallback to local state
    }

    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id && i.variantId === item.variantId);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id && i.variantId === item.variantId
            ? { ...i, quantity: i.quantity + qty }
            : i
        );
      }
      return [...prev, { ...item, quantity: qty }];
    });
    return true;
  };

  const removeFromCart = async (id: string) => {
    try {
      await fetch(`/api/cart/items/${id}`, { method: 'DELETE' });
    } catch {
      // Fallback
    }
    setCart((prev) => prev.filter((i) => i.id !== id));
  };

  const updateQuantity = async (id: string, qty: number) => {
    if (qty <= 0) {
      await removeFromCart(id);
      return;
    }

    try {
      await fetch(`/api/cart/items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: qty }),
      });
    } catch {
      // Fallback
    }

    setCart((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity: qty } : i))
    );
  };

  const clearCart = async () => {
    try {
      await fetch('/api/cart', { method: 'DELETE' });
    } catch {
      // Fallback
    }
    setCart([]);
  };

  const toggleFavorite = (item: FavoriteItem) => {
    setFavorites((prev) => {
      const exists = prev.some((f) => f.id === item.id);
      if (exists) {
        return prev.filter((f) => f.id !== item.id);
      }
      return [...prev, item];
    });
  };

  const removeFromFavorites = (id: string) => {
    setFavorites((prev) => prev.filter((f) => f.id !== id));
  };

  const isFavorite = (id: string) => {
    return favorites.some((f) => f.id === id);
  };

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const favoritesCount = favorites.length;

  return (
    <CartWishlistContext.Provider
      value={{
        cart,
        favorites,
        cartCount,
        favoritesCount,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        refreshCart,
        toggleFavorite,
        removeFromFavorites,
        isFavorite,
      }}
    >
      {children}
    </CartWishlistContext.Provider>
  );
}

export function useCartWishlist() {
  return useContext(CartWishlistContext);
}
