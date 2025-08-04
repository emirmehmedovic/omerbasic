'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Product } from '@/generated/prisma/client';
import { useSession } from 'next-auth/react';

// Definicija tipa za stavku u korpi
export interface CartItem extends Product {
  quantity: number;
}

// Definicija tipa za vrijednost konteksta
interface CartContextType {
  cartItems: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  cartCount: number;
  cartTotal: number;
}

// Kreiranje konteksta s početnom vrijednošću undefined
const CartContext = createContext<CartContextType | undefined>(undefined);

// Hook za lakše korištenje konteksta
export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

// Provider komponenta
interface CartProviderProps {
  children: ReactNode;
}

export const CartProvider = ({ children }: CartProviderProps) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const { data: session } = useSession();

  // Učitavanje korpe iz localStorage-a pri prvom renderiranju i dohvaćanje ažuriranih cijena
  useEffect(() => {
    // Koristimo ključ specifičan za korisnika
    const cartKey = session?.user?.id ? `cart_${session.user.id}` : 'cart_guest';
    const storedCart = localStorage.getItem(cartKey);
    
    if (storedCart) {
      const parsedCart = JSON.parse(storedCart);
      setCartItems(parsedCart);
      
      // Dohvati ažurirane cijene s B2B popustom ako postoje proizvodi u košarici
      if (parsedCart.length > 0) {
        fetchUpdatedPrices(parsedCart);
      }
    } else {
      // Ako nema košarice za trenutnog korisnika, očisti trenutnu košaricu
      setCartItems([]);
    }
  }, [session?.user?.id]); // Ponovno učitaj košaricu kad se promijeni korisnik
  
  // Funkcija za dohvaćanje ažuriranih cijena s B2B popustom
  const fetchUpdatedPrices = async (items: CartItem[]) => {
    try {
      const productIds = items.map(item => item.id);
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productIds }),
      });
      
      if (!response.ok) {
        throw new Error('Greška prilikom dohvaćanja cijena');
      }
      
      const data = await response.json();
      
      // Ažuriraj cijene proizvoda u košarici
      if (data.products && data.products.length > 0) {
        setCartItems(prevItems => {
          return prevItems.map(item => {
            const updatedProduct = data.products.find((p: Product) => p.id === item.id);
            if (updatedProduct) {
              return {
                ...item,
                price: updatedProduct.price,
                originalPrice: updatedProduct.originalPrice,
              };
            }
            return item;
          });
        });
      }
    } catch (error) {
      console.error('Greška prilikom dohvaćanja ažuriranih cijena:', error);
    }
  };

  // Spremanje korpe u localStorage kad god se promijeni, koristeći ključ specifičan za korisnika
  useEffect(() => {
    // Kreiramo ključ za košaricu koji uključuje ID korisnika ako je prijavljen
    const cartKey = session?.user?.id ? `cart_${session.user.id}` : 'cart_guest';
    localStorage.setItem(cartKey, JSON.stringify(cartItems));
  }, [cartItems, session?.user?.id]);

  const addToCart = async (product: Product) => {
    // Dohvati ažuriranu cijenu s B2B popustom za ovaj proizvod
    try {
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productIds: [product.id] }),
      });
      
      if (!response.ok) {
        throw new Error('Greška prilikom dohvaćanja cijene');
      }
      
      const data = await response.json();
      let productToAdd = product;
      
      // Koristi ažuriranu cijenu ako je dostupna
      if (data.products && data.products.length > 0) {
        productToAdd = data.products[0];
      }
      
      // Dodaj proizvod u košaricu
      setCartItems(prevItems => {
        const existingItem = prevItems.find(item => item.id === productToAdd.id);
        if (existingItem) {
          // Ako proizvod već postoji, samo povećaj količinu
          return prevItems.map(item =>
            item.id === productToAdd.id ? { ...item, quantity: item.quantity + 1 } : item
          );
        } else {
          // Ako ne postoji, dodaj ga s količinom 1
          return [...prevItems, { ...productToAdd, quantity: 1 }];
        }
      });
    } catch (error) {
      console.error('Greška prilikom dodavanja proizvoda u košaricu:', error);
      // Fallback na standardno dodavanje ako API ne radi
      setCartItems(prevItems => {
        const existingItem = prevItems.find(item => item.id === product.id);
        if (existingItem) {
          return prevItems.map(item =>
            item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
          );
        } else {
          return [...prevItems, { ...product, quantity: 1 }];
        }
      });
    }
  };

  const removeFromCart = (productId: string) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      // Ako je količina 0 ili manja, ukloni proizvod
      removeFromCart(productId);
    } else {
      setCartItems(prevItems =>
        prevItems.map(item =>
          item.id === productId ? { ...item, quantity } : item
        )
      );
    }
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const cartCount = cartItems.reduce((count, item) => count + item.quantity, 0);

  // Koristi već diskontiranu cijenu iz API-ja koja je već postavljena u product.price
  const cartTotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);

  const value = {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    cartCount,
    cartTotal,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
