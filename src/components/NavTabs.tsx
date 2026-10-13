import { BookOpen, Play, Wifi } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { NavLink } from 'react-router-dom';

import { cn } from '@/lib/utils';

interface TabItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  beta?: boolean;
}

const TABS: TabItem[] = [
  { to: '/', label: 'Offline', icon: Play, end: true },
  { to: '/online', label: 'Online', icon: Wifi, beta: true },
  { to: '/katalog', label: 'Katalog', icon: BookOpen },
];

export function NavTabs() {
  return (
    <nav aria-label="Navigasi utama" className="mb-6 flex gap-2.5">
      {TABS.map(({ to, label, icon: Icon, end, beta }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              'relative flex flex-1 items-center justify-center gap-2 rounded-xl bg-secondary px-2.5 py-3 text-sm font-extrabold uppercase tracking-wide text-secondary-foreground neo-border neo-shadow transition',
              'hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-info hover:text-info-foreground hover:shadow-[6px_6px_0_#000]',
              isActive &&
                'bg-info text-info-foreground -translate-x-0.5 -translate-y-0.5 shadow-[6px_6px_0_#000]',
            )
          }
        >
          <Icon className="size-4" />
          {label}
          {beta ? (
            <span className="absolute -top-2 -right-1.5 rounded-full bg-accent px-1.5 py-0.5 text-[9px] font-black tracking-wider text-accent-foreground uppercase neo-border">
              Beta
            </span>
          ) : null}
        </NavLink>
      ))}
    </nav>
  );
}
