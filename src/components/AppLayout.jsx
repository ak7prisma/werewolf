import { Outlet } from 'react-router-dom';

import { NavTabs } from '@/components/NavTabs';

export function AppLayout() {
  return (
    <div className="flex min-h-screen items-start justify-center px-3.5 py-5 md:items-center md:py-10">
      <main className="w-full max-w-[480px] rounded-[20px] bg-card p-6 pb-8 text-center neo-border neo-shadow-lg md:max-w-[520px]">
        <NavTabs />
        <Outlet />
      </main>
    </div>
  );
}
