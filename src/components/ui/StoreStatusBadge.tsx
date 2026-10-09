'use client';

import React, { useEffect, useState } from 'react';
import { Clock, CheckCircle2, XCircle } from 'lucide-react';
import { StoreCurrentStatus } from '@/lib/types';
import { useLanguage } from '@/context/LanguageContext';

export function StoreStatusBadge() {
  const { t } = useLanguage();
  const [status, setStatus] = useState<StoreCurrentStatus | null>(null);

  useEffect(() => {
    fetch('/api/store-status')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStatus(data.status);
        }
      })
      .catch(() => {});
  }, []);

  if (!status) return null;

  return (
    <div
      className={`badge ${status.isOpen ? 'badge-success' : 'badge-danger'}`}
      title={status.message}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0.35rem 0.65rem',
        fontSize: '0.8rem',
        cursor: 'help',
      }}
    >
      {status.isOpen ? (
        <>
          <CheckCircle2 size={14} style={{ marginRight: '0.3rem' }} />
          <span>{t.common.open}</span>
        </>
      ) : (
        <>
          <XCircle size={14} style={{ marginRight: '0.3rem' }} />
          <span>{t.common.closed}</span>
        </>
      )}
    </div>
  );
}
