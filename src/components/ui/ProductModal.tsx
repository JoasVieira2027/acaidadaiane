'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { X, Plus, Minus, Check, AlertCircle } from 'lucide-react';
import { Option, OptionGroup, Product, SelectedOption } from '@/lib/types';
import { useCart } from '@/context/CartContext';
import { useLanguage } from '@/context/LanguageContext';

type ProductModalProps = {
  product: Product;
  onClose: () => void;
};

export function ProductModal({ product, onClose }: ProductModalProps) {
  const { addItem } = useCart();
  const { t, localize } = useLanguage();

  const [quantity, setQuantity] = useState(1);
  const [selectedOptionsMap, setSelectedOptionsMap] = useState<Record<string, SelectedOption[]>>({});
  const [itemNotes, setItemNotes] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const productName = localize(product, 'name');
  const productDescription = localize(product, 'description');

  const basePrice = product.is_promo_active && product.promotional_price
    ? product.promotional_price
    : product.price;

  // Calcula adicional de todas as opções selecionadas
  const optionsTotal = Object.values(selectedOptionsMap)
    .flat()
    .reduce((sum, opt) => sum + opt.price * (opt.quantity || 1), 0);

  const finalUnitPrice = basePrice + optionsTotal;
  const finalTotalPrice = finalUnitPrice * quantity;

  const handleToggleOption = (group: OptionGroup, option: Option) => {
    setValidationError(null);
    const currentList = selectedOptionsMap[group.id] || [];
    const exists = currentList.find((o) => o.option_id === option.id);

    // Se é escolha única obrigatória (ex: Tamanho)
    if (group.max_options === 1) {
      setSelectedOptionsMap((prev) => ({
        ...prev,
        [group.id]: [
          {
            option_id: option.id,
            group_id: group.id,
            group_name: group.name,
            option_name: option.name,
            price: option.price,
            quantity: 1,
          },
        ],
      }));
      return;
    }

    // Se já foi selecionado, remove
    if (exists) {
      setSelectedOptionsMap((prev) => ({
        ...prev,
        [group.id]: currentList.filter((o) => o.option_id !== option.id),
      }));
      return;
    }

    // Se está no limite máximo de opções do grupo
    if (currentList.length >= group.max_options) {
      setValidationError(`Você já atingiu o limite de ${group.max_options} opções para "${group.name}".`);
      return;
    }

    // Adiciona nova opção
    setSelectedOptionsMap((prev) => ({
      ...prev,
      [group.id]: [
        ...currentList,
        {
          option_id: option.id,
          group_id: group.id,
          group_name: group.name,
          option_name: option.name,
          price: option.price,
          quantity: 1,
        },
      ],
    }));
  };

  const handleAddToCart = () => {
    // Validar se todos os grupos obrigatórios foram atendidos
    if (product.option_groups) {
      for (const group of product.option_groups) {
        if (!group.is_active) continue;
        const chosen = selectedOptionsMap[group.id] || [];
        if (group.is_required && chosen.length < group.min_options) {
          setValidationError(
            `Por favor, selecione pelo menos ${group.min_options} opção em "${group.name}".`
          );
          return;
        }
      }
    }

    const allSelected = Object.values(selectedOptionsMap).flat();
    addItem(product, quantity, allSelected, itemNotes.trim() || undefined);
    onClose();
  };

  const formattedFinalPrice = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(finalTotalPrice);

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px' }}
      >
        {/* Topo do Modal */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {productName}
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {productDescription}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary btn-sm"
            style={{ borderRadius: '50%', padding: '0.5rem', flexShrink: 0 }}
            aria-label="Fechar modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Corpo do Modal: Grupos de Opções */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto' }}>
          {validationError && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: 'var(--danger-bg)',
                color: 'var(--danger)',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
                fontWeight: 600,
              }}
            >
              <AlertCircle size={18} />
              <span>{validationError}</span>
            </div>
          )}

          {product.option_groups && product.option_groups.length > 0 ? (
            product.option_groups.map((group) => {
              if (!group.is_active) return null;
              const chosen = selectedOptionsMap[group.id] || [];

              return (
                <div
                  key={group.id}
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.25rem',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '0.85rem',
                    }}
                  >
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {localize(group, 'name')}
                      </h3>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {group.is_required ? t.common.required : t.common.optional} •{' '}
                        {group.max_options === 1
                          ? 'Escolha 1'
                          : `Até ${group.max_options} opções`}
                      </p>
                    </div>
                    <span className="badge badge-brand" style={{ fontSize: '0.75rem' }}>
                      {chosen.length}/{group.max_options}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {group.options &&
                      group.options.map((opt) => {
                        const isSelected = chosen.some((o) => o.option_id === opt.id);
                        return (
                          <button
                            type="button"
                            key={opt.id}
                            disabled={!opt.is_available}
                            onClick={() => handleToggleOption(group, opt)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '0.75rem 1rem',
                              borderRadius: 'var(--radius-md)',
                              backgroundColor: isSelected
                                ? 'var(--bg-accent-subtle)'
                                : 'var(--bg-secondary)',
                              border: isSelected
                                ? '2px solid var(--brand-primary)'
                                : '1px solid var(--border-color)',
                              opacity: opt.is_available ? 1 : 0.6,
                              cursor: opt.is_available ? 'pointer' : 'not-allowed',
                              transition: 'all 0.15s ease',
                              textAlign: 'left',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                              <div
                                style={{
                                  width: '20px',
                                  height: '20px',
                                  borderRadius: group.max_options === 1 ? '50%' : 'var(--radius-sm)',
                                  border: isSelected
                                    ? '2px solid var(--brand-primary)'
                                    : '2px solid var(--border-subtle)',
                                  backgroundColor: isSelected ? 'var(--brand-primary)' : 'transparent',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#ffffff',
                                }}
                              >
                                {isSelected && <Check size={14} strokeWidth={3} />}
                              </div>
                              <span
                                style={{
                                  fontSize: '0.9rem',
                                  fontWeight: isSelected ? 700 : 500,
                                  color: 'var(--text-primary)',
                                }}
                              >
                                {localize(opt, 'name')}
                                {!opt.is_available && (
                                  <span style={{ fontSize: '0.75rem', color: 'var(--danger)', marginLeft: '0.5rem' }}>
                                    ({t.common.unavailable})
                                  </span>
                                )}
                              </span>
                            </div>

                            <span
                              style={{
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                color: opt.price > 0 ? 'var(--brand-primary)' : 'var(--text-muted)',
                              }}
                            >
                              {opt.price > 0
                                ? `+ R$ ${opt.price.toFixed(2)}`
                                : t.common.free}
                            </span>
                          </button>
                        );
                      })}
                  </div>
                </div>
              );
            })
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Este produto não possui complementos opcionais.
            </p>
          )}

          {/* Observações do Cliente */}
          {product.allow_notes && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="item-notes" className="form-label">
                {t.menu.notesLabel}
              </label>
              <textarea
                id="item-notes"
                rows={2}
                value={itemNotes}
                onChange={(e) => setItemNotes(e.target.value)}
                placeholder={t.menu.notesPlaceholder}
                className="form-textarea"
                style={{ resize: 'vertical' }}
              />
            </div>
          )}
        </div>

        {/* Rodapé do Modal: Quantidade e Botão Adicionar */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderTop: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          {/* Stepper de Quantidade */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'var(--bg-tertiary)',
              padding: '0.35rem 0.6rem',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border-color)',
            }}
          >
            <button
              type="button"
              disabled={quantity <= 1}
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="btn btn-secondary btn-sm"
              style={{ borderRadius: '50%', padding: '0.3rem', width: '28px', height: '28px' }}
              aria-label="Diminuir quantidade"
            >
              <Minus size={14} />
            </button>
            <span style={{ fontWeight: 800, fontSize: '0.95rem', minWidth: '24px', textAlign: 'center' }}>
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              className="btn btn-secondary btn-sm"
              style={{ borderRadius: '50%', padding: '0.3rem', width: '28px', height: '28px' }}
              aria-label="Aumentar quantidade"
            >
              <Plus size={14} />
            </button>
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            className="btn btn-primary"
            style={{ flex: 1, padding: '0.85rem 1.5rem' }}
          >
            <span>{t.menu.addToCart}</span>
            <span style={{ opacity: 0.85, fontWeight: 700 }}>•</span>
            <span style={{ fontWeight: 800 }}>{formattedFinalPrice}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
