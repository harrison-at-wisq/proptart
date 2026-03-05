'use client';

import React from 'react';

interface MicrositeFooterProps {
  customerLogoBase64?: string;
}

export function MicrositeFooter({ customerLogoBase64 }: MicrositeFooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer
      id="footer"
      className="py-12 text-white"
      style={{ background: '#03143B' }}
    >
      <div className="max-w-5xl mx-auto px-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <img src="/wisq-logo.svg" alt="Wisq" className="h-8 w-8 invert brightness-0" style={{ filter: 'brightness(0) invert(1)' }} />
            {customerLogoBase64 && (
              <>
                <span className="text-white/20 text-sm">&times;</span>
                <img src={customerLogoBase64} alt="Customer" className="h-8 w-auto max-w-[100px] object-contain brightness-0 invert" />
              </>
            )}
            <span className="text-white/50 text-sm">wisq.com</span>
          </div>
          <div className="text-white/40 text-xs text-center sm:text-right">
            <p>Confidential &amp; Proprietary</p>
            <p>&copy; {year} Wisq, Inc. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
