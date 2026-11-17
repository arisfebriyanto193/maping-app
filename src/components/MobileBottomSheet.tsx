'use client';

import React, { useState } from 'react';
import { ChevronUp, ChevronDown, Sliders } from 'lucide-react';

interface MobileBottomSheetProps {
  children: React.ReactNode;
  title: string;
}

export default function MobileBottomSheet({ children, title }: MobileBottomSheetProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 transition-all duration-300">
      {/* Drawer Container */}
      <div
        className={`bg-slate-900/95 backdrop-blur-md border-t border-slate-700 rounded-t-2xl shadow-2xl transition-all duration-300 ${
          isOpen ? 'max-h-[82vh] pb-6' : 'max-h-14'
        }`}
      >
        {/* Header / Grab Handle */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full h-14 px-4 flex items-center justify-between cursor-pointer border-b border-slate-800/80"
        >
          <div className="flex items-center gap-2 font-semibold text-slate-200 text-sm">
            <Sliders className="w-4 h-4 text-sky-400" />
            <span>{title}</span>
          </div>

          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <span>{isOpen ? 'Tutup Panel' : 'Atur Parameter'}</span>
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </div>
        </button>

        {/* Content */}
        {isOpen && (
          <div className="p-4 overflow-y-auto max-h-[70vh]">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
