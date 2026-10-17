'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { X, CreditCard, Banknote, QrCode, MessageSquare, AlertCircle, Loader2 } from 'lucide-react';
import { PaymentMethod } from '@/lib/types';
import { useCart } from '@/context/CartContext';
import { useLanguage } from '@/context/LanguageContext';

export function CheckoutModal() {
  const router = useRouter();
  const {
    items,
    orderType,
    neighborhood,
    coupon,
    totalAmount,
    clearCart,
    isCheckoutModalOpen,
    setIsCheckoutModalOpen,
  } = useCart();
  const { t } = useLanguage();

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [reference, setReference] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // Anti-duplo-clique: bloqueia envio duplicado
  const submittingRef = useRef(false);


  const scrollBodyRef = useRef<HTMLDivElement>(null);

  if (!isCheckoutModalOpen) return null;

  const formatPhoneInput = (value: string) => {
    // Remove tudo que não é dígito e limita a 11 dígitos (DDD + 9 dígitos)
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const scrollToTop = () => {
    scrollBodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Bloquear se já está processando (evita pedido duplicado por cliques rápidos)
    if (submittingRef.current || loading) return;
    submittingRef.current = true;
    setErrorMsg(null);

    if (!customerName.trim()) {
      setErrorMsg('Por favor, informe seu nome completo.');
      scrollToTop();
      submittingRef.current = false;
      return;
    }

    const cleanPhone = customerPhone.replace(/\D/g, '');
    if (cleanPhone.length < 8) {
      setErrorMsg('Por favor, informe um telefone ou WhatsApp válido com DDD.');
      scrollToTop();
      submittingRef.current = false;
      return;
    }

    if (orderType === 'delivery') {
      if (!street.trim()) {
        setErrorMsg('Informe o nome da rua ou avenida para entrega.');
        scrollToTop();
        submittingRef.current = false;
        return;
      }
      if (!neighborhood) {
        setErrorMsg('Selecione seu bairro de entrega no carrinho.');
        scrollToTop();
        submittingRef.current = false;
        return;
      }
    }

    setLoading(true);

    try {
      const payload = {
        customer_name: customerName.trim(),
        customer_phone: cleanPhone,
        order_type: orderType,
        neighborhood_id: orderType === 'delivery' ? neighborhood?.id : null,
        address_street: orderType === 'delivery' ? street.trim() : null,
        address_number: orderType === 'delivery' ? number.trim() : null,
        address_complement: orderType === 'delivery' ? complement.trim() : null,
        address_reference: orderType === 'delivery' ? reference.trim() : null,
        order_notes: orderNotes.trim() || null,
        payment_method: paymentMethod,
        coupon_code: coupon ? coupon.code : null,
        items: items.map((item) => ({
          product_id: item.product.id,
          product_name: item.product.name,
          quantity: item.quantity,
          notes: item.notes,
          selected_options: item.selected_options.map((opt) => ({
            option_id: opt.option_id,
            group_name: opt.group_name,
            option_name: opt.option_name,
            quantity: opt.quantity,
          })),
        })),
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.message || 'Erro ao registrar pedido.');
        scrollToTop();
        setLoading(false);
        submittingRef.current = false;
        return;
      }

      // Limpar carrinho e redirecionar para a página do pedido
      const targetCode = data.order?.order_code || data.order?.id;
      if (targetCode) {
        clearCart();
        setIsCheckoutModalOpen(false);
        window.location.href = `/pedido/${targetCode}`;
      } else {
        setErrorMsg('Pedido registrado, mas não foi possível carregar os detalhes. Verifique em Acompanhamento.');
        scrollToTop();
        setLoading(false);
        submittingRef.current = false;
      }
    } catch {
      setErrorMsg('Falha de conexão com o servidor. Verifique sua internet.');
      scrollToTop();
      setLoading(false);
      submittingRef.current = false;
    }
  };

  return (
    <div className="modal-overlay" onClick={() => setIsCheckoutModalOpen(false)}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '580px',
          maxHeight: '92dvh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Topo do Modal (Fixo) */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{t.checkout.title}</h2>
          <button
            type="button"
            onClick={() => setIsCheckoutModalOpen(false)}
            className="btn btn-secondary btn-sm"
            style={{ borderRadius: '50%', padding: '0.45rem' }}
            aria-label="Fechar checkout"
          >
            <X size={18} />
          </button>
        </div>

        {/* Formulário com corpo rolável e rodapé fixo */}
        <form
          onSubmit={handleSubmit}
          noValidate
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          {/* Corpo Rolável do Formulário */}
          <div
            ref={scrollBodyRef}
            className="checkout-modal-body"
            style={{
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
              flex: 1,
              minHeight: 0,
            }}
          >
            {errorMsg && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backgroundColor: 'var(--danger-bg)',
                  color: 'var(--danger)',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                }}
              >
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Dados Pessoais */}
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
                {t.checkout.customerInfo}
              </h3>
              <div className="checkout-grid-2">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">{t.checkout.fullName} *</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Seu nome"
                    className="form-input"
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">{t.checkout.phone} *</label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(formatPhoneInput(e.target.value))}
                    placeholder="(81) 99999-9999"
                    className="form-input"
                    maxLength={16}
                    inputMode="numeric"
                  />
                </div>
              </div>
            </div>

            {/* Endereço de Entrega se modalidade for delivery */}
            {orderType === 'delivery' && (
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
                  {t.checkout.addressInfo} {neighborhood?.name ? `(${neighborhood.name})` : ''}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div className="checkout-grid-street">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">{t.checkout.street} *</label>
                      <input
                        type="text"
                        required
                        value={street}
                        onChange={(e) => setStreet(e.target.value)}
                        placeholder="Rua, avenida ou praça"
                        className="form-input"
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">{t.checkout.number}</label>
                      <input
                        type="text"
                        value={number}
                        onChange={(e) => setNumber(e.target.value)}
                        placeholder="120"
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="checkout-grid-2">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">{t.checkout.complement}</label>
                      <input
                        type="text"
                        value={complement}
                        onChange={(e) => setComplement(e.target.value)}
                        placeholder="Apto 102, Bloco B"
                        className="form-input"
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">{t.checkout.reference}</label>
                      <input
                        type="text"
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        placeholder="Ao lado da farmácia"
                        className="form-input"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Forma de Pagamento */}
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
                {t.checkout.paymentMethod}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: paymentMethod === 'pix' ? '2px solid var(--brand-primary)' : '1px solid var(--border-color)',
                    backgroundColor: paymentMethod === 'pix' ? 'var(--bg-accent-subtle)' : 'var(--bg-tertiary)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name="payment_method"
                    value="pix"
                    checked={paymentMethod === 'pix'}
                    onChange={() => setPaymentMethod('pix')}
                  />
                  <QrCode size={20} style={{ color: 'var(--brand-primary)' }} />
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{t.checkout.pix}</span>
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: paymentMethod === 'cash' ? '2px solid var(--brand-primary)' : '1px solid var(--border-color)',
                    backgroundColor: paymentMethod === 'cash' ? 'var(--bg-accent-subtle)' : 'var(--bg-tertiary)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name="payment_method"
                    value="cash"
                    checked={paymentMethod === 'cash'}
                    onChange={() => setPaymentMethod('cash')}
                  />
                  <Banknote size={20} style={{ color: 'var(--brand-primary)' }} />
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{t.checkout.cash}</span>
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: paymentMethod === 'card_delivery' ? '2px solid var(--brand-primary)' : '1px solid var(--border-color)',
                    backgroundColor: paymentMethod === 'card_delivery' ? 'var(--bg-accent-subtle)' : 'var(--bg-tertiary)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name="payment_method"
                    value="card_delivery"
                    checked={paymentMethod === 'card_delivery'}
                    onChange={() => setPaymentMethod('card_delivery')}
                  />
                  <CreditCard size={20} style={{ color: 'var(--brand-primary)' }} />
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{t.checkout.cardDelivery}</span>
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: paymentMethod === 'card_link' ? '2px solid var(--brand-primary)' : '1px solid var(--border-color)',
                    backgroundColor: paymentMethod === 'card_link' ? 'var(--bg-accent-subtle)' : 'var(--bg-tertiary)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name="payment_method"
                    value="card_link"
                    checked={paymentMethod === 'card_link'}
                    onChange={() => setPaymentMethod('card_link')}
                  />
                  <MessageSquare size={20} style={{ color: 'var(--brand-primary)' }} />
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{t.checkout.cardLink}</span>
                </label>
              </div>
            </div>

            {/* Observações Gerais */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">{t.checkout.orderNotes}</label>
              <textarea
                rows={2}
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="Ex: tocar interfone, deixar na portaria..."
                className="form-textarea"
              />
            </div>
          </div>

          {/* Rodapé Fixo com Botão de Confirmação */}
          <div
            className="checkout-modal-footer"
            style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-secondary)',
              flexShrink: 0,
            }}
          >
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-lg"
              style={{ width: '100%', gap: '0.5rem' }}
            >
              {loading ? (
                <>
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  {t.checkout.processing}
                </>
              ) : `${t.checkout.confirmOrder} • R$ ${totalAmount.toFixed(2)}`}
            </button>
          </div>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </form>
      </div>
    </div>
  );
}
