"use client";

import React, { use } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default function LegalPage({ params }: { params: Promise<{ policy: string }> }) {
  const unwrappedParams = use(params);
  const policy = unwrappedParams.policy;

  const validPolicies = ['privacy-policy', 'terms-and-conditions', 'refund-policy'];
  
  if (!validPolicies.includes(policy)) {
    notFound();
  }

  const titles: Record<string, string> = {
    'privacy-policy': 'Privacy Policy',
    'terms-and-conditions': 'Terms and Conditions',
    'refund-policy': 'Refund Policy'
  };

  const title = titles[policy];
  const pdfUrl = `/pdfs/${policy}.pdf`;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-[#063831] py-4 px-6 md:px-12 flex items-center justify-between sticky top-0 z-10 shadow-md">
        <div className="flex items-center gap-4">
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
            MiTutora
          </h1>
        </div>
        <div className="text-sm font-bold text-emerald-100 uppercase tracking-widest hidden sm:block">
          {title}
        </div>
      </header>

      {/* Main Content (PDF Viewer) */}
      <main className="flex-1 w-full max-w-6xl mx-auto p-3 sm:p-4 md:p-6 flex flex-col">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 flex-1 overflow-hidden flex flex-col min-h-[85vh]">
          <div className="bg-gray-100 px-4 sm:px-6 py-3 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0">
            <h2 className="font-bold text-gray-700 text-sm sm:text-base">{title}</h2>
            <a 
              href={pdfUrl} 
              download 
              className="w-full sm:w-auto text-center text-xs font-bold bg-white px-3 py-2 sm:py-1.5 rounded-lg text-[#00a992] border border-[#00a992]/20 hover:bg-[#00a992]/5 transition-colors"
            >
              Download PDF
            </a>
          </div>
          <iframe 
            src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`} 
            className="w-full flex-1 border-none min-h-[80vh]"
            title={title}
          />
        </div>
      </main>
      
      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6 px-4 text-center text-xs sm:text-sm text-gray-500">
        <p>&copy; {new Date().getFullYear()} Mi-Tutora. All rights reserved.</p>
        <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2 mt-3">
          <Link href="/legal/privacy-policy" className="hover:text-[#00a992] transition-colors whitespace-nowrap">Privacy</Link>
          <span className="hidden sm:inline">&bull;</span>
          <Link href="/legal/terms-and-conditions" className="hover:text-[#00a992] transition-colors whitespace-nowrap">Terms</Link>
          <span className="hidden sm:inline">&bull;</span>
          <Link href="/legal/refund-policy" className="hover:text-[#00a992] transition-colors whitespace-nowrap">Refunds</Link>
        </div>
      </footer>
    </div>
  );
}
