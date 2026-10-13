'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Printer, ArrowLeft } from 'lucide-react';
import { Order } from '@/lib/types';
import { initialOrders } from '@/lib/data/mockData';

export default function OrderPrintPage() {
  const params = useParams();
  const id = (params.id as string) || '';

  const [order, setOrder] = useState<Order | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const [printFormat, setPrintFormat] = useState<'80mm' | '58mm' | 'a4'>('80mm');

  useEffect(() => {
    fetch('/api/store-status', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.settings) setSettings(data.settings);
      })
      .catch(() => {});

    fetch(`/api/orders/${id}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.order) {
          setOrder(data.order);
        } else {
          // Fallback para orders locais
          const found = initialOrders.find((o) => o.order_code === id || o.id === id);
          if (found) setOrder(found);
        }
      })
      .catch(() => {
        const found = initialOrders.find((o) => o.order_code === id || o.id === id);
        if (found) setOrder(found);
      });
  }, [id]);

  if (!order) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <p>Carregando dados do pedido para impressão...</p>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  const containerClass =
    printFormat === '80mm'
      ? 'print-thermal-80mm'
      : printFormat === '58mm'
      ? 'print-thermal-58mm'
      : 'print-a4';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#ffffff', color: '#000000', padding: '1.5rem' }}>
      {/* Barra de controle no topo (oculta na impressão) */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '2rem',
          paddingBottom: '1rem',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <Link href="/admin/pedidos" className="btn btn-secondary btn-sm">
          <ArrowLeft size={16} />
          <span>Voltar aos Pedidos</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Formato:</span>
            <button
              type="button"
              onClick={() => setPrintFormat('80mm')}
              className={`btn btn-sm ${printFormat === '80mm' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Térmica 80mm
            </button>
            <button
              type="button"
              onClick={() => setPrintFormat('58mm')}
              className={`btn btn-sm ${printFormat === '58mm' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Térmica 58mm
            </button>
            <button
              type="button"
              onClick={() => setPrintFormat('a4')}
              className={`btn btn-sm ${printFormat === 'a4' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Folha A4
            </button>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="btn btn-primary"
            style={{ padding: '0.65rem 1.25rem' }}
          >
            <Printer size={18} />
            <span>Imprimir Pedido</span>
          </button>
        </div>
      </div>

      {/* Comprovante Formatado */}
      <div
        className={containerClass}
        style={{
          border: '1px solid #cbd5e1',
          padding: '1.25rem',
          borderRadius: printFormat === 'a4' ? '8px' : '0',
          backgroundColor: '#ffffff',
          color: '#000000',
        }}
      >
        {/* Cabeçalho do Estabelecimento */}
        <div style={{ textAlign: 'center', borderBottom: '1px dashed #000000', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 900, textTransform: 'uppercase' }}>
            {settings?.store_name || 'AÇAÍ DAIANE'}
          </h2>
          <p style={{ fontSize: '0.75rem' }}>
            {settings?.address_text || 'Av. Conselheiro Aguiar, 1450 - Boa Viagem'}
          </p>
          <p style={{ fontSize: '0.75rem' }}>
            WhatsApp: {settings?.whatsapp_number || '(81) 99999-8888'}
          </p>
          <p style={{ fontSize: '0.7rem', marginTop: '0.25rem' }}>*** COMPROVANTE INTERNO DO PEDIDO ***</p>
        </div>

        {/* Identificação do Pedido */}
        <div style={{ borderBottom: '1px dashed #000000', paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '1.1rem' }}>
            <span>PEDIDO #{order.order_code}</span>
            <span>{order.order_type === 'delivery' ? 'ENTREGA' : 'RETIRADA'}</span>
          </div>
          <div style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}>
            Data/Hora: {new Date(order.created_at).toLocaleString('pt-BR', { timeZone: 'America/Recife' })}
          </div>
          <div style={{ fontSize: '0.75rem' }}>
            Status: {order.order_status.toUpperCase()}
          </div>
        </div>

        {/* Dados do Cliente */}
        <div style={{ borderBottom: '1px dashed #000000', paddingBottom: '0.5rem', marginBottom: '0.75rem', fontSize: '0.8rem' }}>
          <div><strong>Cliente:</strong> {order.customer_name}</div>
          <div><strong>Telefone:</strong> {order.customer_phone}</div>
          {order.order_type === 'delivery' && (
            <div style={{ marginTop: '0.3rem' }}>
              <div><strong>Bairro:</strong> {order.neighborhood_name}</div>
              <div><strong>Endereço:</strong> {order.address_street}, nº {order.address_number}</div>
              {order.address_complement && <div><strong>Comp.:</strong> {order.address_complement}</div>}
              {order.address_reference && <div><strong>Ref.:</strong> {order.address_reference}</div>}
            </div>
          )}
        </div>

        {/* Itens do Pedido */}
        <div style={{ borderBottom: '1px dashed #000000', paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>
          <div style={{ fontWeight: 800, fontSize: '0.85rem', marginBottom: '0.35rem' }}>ITENS DO PEDIDO</div>
          {order.items?.map((item, index) => (
            <div key={item.id || index} style={{ marginBottom: '0.5rem', fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                <span>{item.quantity}x {item.product_name}</span>
                <span>R$ {item.total_price.toFixed(2)}</span>
              </div>
              {item.selected_options && item.selected_options.length > 0 && (() => {
                const grouped = item.selected_options.reduce<Record<string, string[]>>((acc, opt) => {
                  const gName = opt.group_name || 'Opção';
                  if (!acc[gName]) acc[gName] = [];
                  const priceStr = opt.price > 0 ? ` (+R$ ${(opt.price * (opt.quantity || 1)).toFixed(2)})` : '';
                  const qtyStr = (opt.quantity && opt.quantity > 1) ? `${opt.quantity}x ` : '';
                  acc[gName].push(`${qtyStr}${opt.option_name}${priceStr}`);
                  return acc;
                }, {});

                return (
                  <div style={{ paddingLeft: '0.5rem', marginTop: '0.2rem' }}>
                    {Object.entries(grouped).map(([gName, names]) => (
                      <div key={gName} style={{ fontSize: '0.72rem' }}>
                        <strong>• {gName}:</strong> {names.join(', ')}
                      </div>
                    ))}
                  </div>
                );
              })()}
              {item.item_notes && (
                <div style={{ fontSize: '0.72rem', fontStyle: 'italic', paddingLeft: '0.5rem' }}>
                  Obs: {item.item_notes}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Observações Gerais */}
        {order.order_notes && (
          <div style={{ borderBottom: '1px dashed #000000', paddingBottom: '0.5rem', marginBottom: '0.75rem', fontSize: '0.75rem' }}>
            <strong>OBSERVAÇÕES:</strong>
            <p>{order.order_notes}</p>
          </div>
        )}

        {/* Totais e Pagamento */}
        <div style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Subtotal:</span>
            <span>R$ {order.subtotal.toFixed(2)}</span>
          </div>
          {order.discount_amount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Desconto ({order.coupon_code || 'Cupom'}):</span>
              <span>- R$ {order.discount_amount.toFixed(2)}</span>
            </div>
          )}
          {order.order_type === 'delivery' && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Taxa de Entrega:</span>
              <span>{order.delivery_fee === 0 ? 'Grátis' : `R$ ${order.delivery_fee.toFixed(2)}`}</span>
            </div>
          )}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontWeight: 900,
              fontSize: '1.05rem',
              marginTop: '0.35rem',
              paddingTop: '0.35rem',
              borderTop: '1px solid #000000',
            }}
          >
            <span>TOTAL:</span>
            <span>R$ {order.total_amount.toFixed(2)}</span>
          </div>

          <div style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}>
            <div><strong>Pagamento:</strong> {order.payment_method.toUpperCase()}</div>
            <div><strong>Status Pagamento:</strong> {order.payment_status.toUpperCase()}</div>
          </div>
        </div>

        {/* Rodapé Interno */}
        <div style={{ textAlign: 'center', fontSize: '0.65rem', borderTop: '1px dashed #000000', paddingTop: '0.5rem' }}>
          <p>Impresso em {new Date().toLocaleString('pt-BR', { timeZone: 'America/Recife' })}</p>
          <p>Sistema Açaí Daiane • Não é documento fiscal</p>
        </div>
      </div>
    </div>
  );
}
