import { BookOpen, Play } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { NavLink } from 'react-router-dom';

import { cn } from '@/lib/utils';

interface TabItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const TABS: TabItem[] = [
  { to: '/', label: 'Main Game', icon: Play, end: true },
  { to: '/katalog', label: 'Katalog Kartu', icon: BookOpen },
];

export function NavTabs() {
  return (
    <nav aria-label="Navigasi utama" className="mb-6 flex gap-2.5">
      {TABS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              'flex flex-1 items-center justify-center gap-2 rounded-xl bg-secondary px-2.5 py-3 text-sm font-extrabold uppercase tracking-wide text-secondary-foreground neo-border neo-shadow transition',
              'hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-info hover:text-info-foreground hover:shadow-[6px_6px_0_#000]',
              isActive &&
                'bg-info text-info-foreground -translate-x-0.5 -translate-y-0.5 shadow-[6px_6px_0_#000]',
            )
          }
        >
          <Icon className="size-4" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
