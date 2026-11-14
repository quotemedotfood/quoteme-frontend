// The frame the MEP pages sit in: the PairMe name and a card (Moose
// 2026-11-13: the MEP pages say PairMe, not QuoteMe). wide for the account
// list, narrow for sign-in.
import type { ReactNode } from 'react';

export function MepFrame({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-screen bg-[#FBFAF7] flex items-start justify-center px-4 py-10 sm:py-16">
      <div className={`w-full ${wide ? 'max-w-4xl' : 'max-w-md'} bg-white border border-gray-200 rounded-xl p-4 sm:p-6`}>
        <h1
          className="text-2xl font-bold text-[#2A2A2A] mb-4"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          PairMe
        </h1>
        {children}
      </div>
    </div>
  );
}
