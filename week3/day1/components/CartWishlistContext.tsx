'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface CartItem {
  id: string;
  name: string;
  slug?: string;
  price: number;
  imageUrl?: string | null;
  category?: string;
  vendor: {
    id: string;
    name: string;
    slug: string;
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
  addToCart: (item: Omit<CartItem, 'quantity'>, qty?: number) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, qty: number) => void;
  clearCart: () => void;
  toggleFavorite: (item: FavoriteItem) => void;
  removeFromFavorites: (id: string) => void;
  isFavorite: (id: string) => boolean;
}

const CartWishlistContext = createContext<CartWishlistContextType>({
  cart: [],
  favorites: [],
  cartCount: 0,
  favoritesCount: 0,
  addToCart: () => {},
  removeFromCart: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  toggleFavorite: () => {},
  removeFromFavorites: () => {},
  isFavorite: () => false,
});

export function CartWishlistProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const savedCart = localStorage.getItem('nexus_cart');
      if (savedCart) {
        setCart(JSON.parse(savedCart));
      }
      const savedFavorites = localStorage.getItem('nexus_favorites');
      if (savedFavorites) {
        setFavorites(JSON.parse(savedFavorites));
      }
    } catch (e) {
      console.error('Failed to load cart/favorites from localStorage:', e);
    }
    setMounted(true);
  }, []);

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

  const addToCart = (item: Omit<CartItem, 'quantity'>, qty: number = 1) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + qty } : i
        );
      }
      return [...prev, { ...item, quantity: qty }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  };

  const updateQuantity = (id: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(id);
      return;
    }
    setCart((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity: qty } : i))
    );
  };

  const clearCart = () => {
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
