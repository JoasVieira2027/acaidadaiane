'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { CartItem, Coupon, Neighborhood, Product, SelectedOption } from '../lib/types';

type CartContextType = {
  items: CartItem[];
  addItem: (product: Product, quantity: number, selectedOptions: SelectedOption[], notes?: string) => void;
  updateQuantity: (cartId: string, quantity: number) => void;
  removeItem: (cartId: string) => void;
  clearCart: () => void;
  orderType: 'delivery' | 'pickup';
  setOrderType: (type: 'delivery' | 'pickup') => void;
  neighborhood: Neighborhood | null;
  setNeighborhood: (nb: Neighborhood | null) => void;
  coupon: Coupon | null;
  applyCoupon: (code: string) => Promise<{ success: boolean; message: string }>;
  removeCoupon: () => void;
  subtotal: number;
  deliveryFee: number;
  discountAmount: number;
  totalAmount: number;
  totalItemCount: number;
  isFreeDeliveryEligible: boolean;
  minOrderDifference: number;
  isCartDrawerOpen: boolean;
  setIsCartDrawerOpen: (open: boolean) => void;
  isCheckoutModalOpen: boolean;
  setIsCheckoutModalOpen: (open: boolean) => void;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('delivery');
  const [neighborhood, setNeighborhood] = useState<Neighborhood | null>(null);
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Carregar carrinho salvo
  useEffect(() => {
    try {
      const saved = localStorage.getItem('acai_cart');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.items)) setItems(parsed.items);
        if (parsed.orderType) setOrderType(parsed.orderType);
        if (parsed.neighborhood) setNeighborhood(parsed.neighborhood);
        if (parsed.coupon) setCoupon(parsed.coupon);
      }
    } catch (e) {
      console.error('Erro ao restaurar carrinho:', e);
    }
    setIsMounted(true);
  }, []);

  // Salvar no localStorage sempre que houver alteração
  useEffect(() => {
    if (!isMounted) return;
    try {
      localStorage.setItem(
        'acai_cart',
        JSON.stringify({ items, orderType, neighborhood, coupon })
      );
    } catch (e) {
      console.error('Erro ao salvar carrinho:', e);
    }
  }, [items, orderType, neighborhood, coupon, isMounted]);

  const addItem = (
    product: Product,
    quantity: number,
    selectedOptions: SelectedOption[],
    notes?: string
  ) => {
    const basePrice = product.is_promo_active && product.promotional_price
      ? product.promotional_price
      : product.price;

    const optionsAdditional = selectedOptions.reduce(
      (sum, opt) => sum + (opt.price * (opt.quantity || 1)),
      0
    );

    const unitPrice = basePrice + optionsAdditional;
    const totalPrice = unitPrice * quantity;

    const newItem: CartItem = {
      cart_id: `${product.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      product,
      quantity,
      selected_options: selectedOptions,
      notes,
      unit_price: unitPrice,
      total_price: totalPrice,
    };

    setItems((prev) => [...prev, newItem]);
    setIsCartDrawerOpen(true);
  };

  const updateQuantity = (cartId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(cartId);
      return;
    }
    setItems((prev) =>
      prev.map((item) => {
        if (item.cart_id === cartId) {
          return {
            ...item,
            quantity,
            total_price: item.unit_price * quantity,
          };
        }
        return item;
      })
    );
  };

  const removeItem = (cartId: string) => {
    setItems((prev) => prev.filter((item) => item.cart_id !== cartId));
  };

  const clearCart = () => {
    setItems([]);
    setCoupon(null);
  };

  // Cálculos financeiros
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.total_price, 0);
  }, [items]);

  const totalItemCount = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }, [items]);

  const isFreeDeliveryEligible = useMemo(() => {
    if (orderType !== 'delivery' || !neighborhood) return false;
    if (neighborhood.free_delivery_threshold && subtotal >= neighborhood.free_delivery_threshold) {
      return true;
    }
    return false;
  }, [orderType, neighborhood, subtotal]);

  const deliveryFee = useMemo(() => {
    if (orderType === 'pickup') return 0;
    if (!neighborhood) return 0;
    if (isFreeDeliveryEligible) return 0;
    return neighborhood.delivery_fee || 0;
  }, [orderType, neighborhood, isFreeDeliveryEligible]);

  const minOrderDifference = useMemo(() => {
    if (orderType !== 'delivery' || !neighborhood) return 0;
    if (neighborhood.min_order_amount && subtotal < neighborhood.min_order_amount) {
      return neighborhood.min_order_amount - subtotal;
    }
    return 0;
  }, [orderType, neighborhood, subtotal]);

  const discountAmount = useMemo(() => {
    if (!coupon || subtotal <= 0) return 0;
    if (coupon.min_order_amount && subtotal < coupon.min_order_amount) {
      return 0;
    }
    if (coupon.discount_type === 'percentage') {
      return Number(((subtotal * coupon.discount_value) / 100).toFixed(2));
    }
    return Math.min(coupon.discount_value, subtotal);
  }, [coupon, subtotal]);

  const totalAmount = useMemo(() => {
    const rawTotal = subtotal - discountAmount + deliveryFee;
    return Math.max(0, Number(rawTotal.toFixed(2)));
  }, [subtotal, discountAmount, deliveryFee]);

  const applyCoupon = async (code: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, subtotal }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, message: data.message || 'Cupom inválido ou expirado.' };
      }
      setCoupon(data.coupon);
      return { success: true, message: 'Cupom aplicado com sucesso!' };
    } catch {
      return { success: false, message: 'Erro ao validar cupom.' };
    }
  };

  const removeCoupon = () => {
    setCoupon(null);
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        orderType,
        setOrderType,
        neighborhood,
        setNeighborhood,
        coupon,
        applyCoupon,
        removeCoupon,
        subtotal,
        deliveryFee,
        discountAmount,
        totalAmount,
        totalItemCount,
        isFreeDeliveryEligible,
        minOrderDifference,
        isCartDrawerOpen,
        setIsCartDrawerOpen,
        isCheckoutModalOpen,
        setIsCheckoutModalOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart deve ser usado dentro de CartProvider');
  }
  return context;
}
