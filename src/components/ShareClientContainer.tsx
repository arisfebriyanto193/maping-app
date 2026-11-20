'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { DroneMissionRecord } from '@/types/drone';

const ShareMapViewer = dynamic(() => import('@/components/ShareMapViewer'), {
  ssr: false,
  loading: () => (
    <div className="w-screen h-screen bg-slate-900 flex flex-col items-center justify-center text-white gap-3">
      <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
      <span className="text-sm font-bold text-slate-300">Memuat Peta & Rute Drone...</span>
    </div>
  ),
});

interface ShareClientContainerProps {
  mission: DroneMissionRecord & { creator_username?: string };
}

export default function ShareClientContainer({ mission }: ShareClientContainerProps) {
  return <ShareMapViewer mission={mission} />;
}
