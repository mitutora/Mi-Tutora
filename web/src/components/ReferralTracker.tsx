"use client";

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export function ReferralTracker() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      localStorage.setItem('mitutora_ref', refCode.trim().toUpperCase());
    }
  }, [searchParams]);

  return null;
}
