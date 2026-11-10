// The plain frame the MEP pages sit in: the QuoteMe name and a card.
import type { ReactNode } from 'react';

export function MepFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#FBFAF7] flex items-start justify-center px-4 py-16">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-xl p-6">
        <h1
          className="text-2xl font-bold text-[#2A2A2A] mb-4"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          QuoteMe
        </h1>
        {children}
      </div>
    </div>
  );
}
