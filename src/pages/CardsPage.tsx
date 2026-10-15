import { motion } from 'framer-motion';

import { Card } from '@/components/ui/card';
import { SectionTitle, Subtitle } from '@/components/SectionTitle';
import { useRoles } from '@/data/RolesContext';
import { cn } from '@/lib/utils';

const CATEGORY_STYLES = {
  evil: { bg: '#3a1519', badge: 'bg-primary text-primary-foreground' },
  active: { bg: '#123a26', badge: 'bg-success text-success-foreground' },
  variable: { bg: '#3a2b12', badge: 'bg-accent text-accent-foreground' },
  normal: { bg: '#262638', badge: 'bg-secondary text-secondary-foreground' },
};

export function CardsPage() {
  const { roles, source } = useRoles();

  return (
    <section className="flex flex-col items-center">
      <SectionTitle>Katalog Kartu</SectionTitle>
      <Subtitle>Kenali semua peran sebelum malam tiba.</Subtitle>
      {source === 'loading' ? (
        <p className="mt-1 text-xs font-semibold text-muted-foreground">Memuat katalog…</p>
      ) : source === 'fallback' ? (
        <p className="mt-1 text-xs font-semibold text-muted-foreground">
          Mode offline - memakai katalog bawaan.
        </p>
      ) : null}

      <div className="grid w-full grid-cols-2 gap-3">
        {roles.map((role, index) => {
          const Icon = role.icon;
          const style = CATEGORY_STYLES[role.category] ?? CATEGORY_STYLES.normal;
          return (
            <motion.div
              key={role.name}
              initial={{ opacity: 0, y: 16, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: index * 0.04, duration: 0.35, ease: 'easeOut' }}
              whileHover={{ y: -4 }}
              className="h-full"
            >
              <Card
                className="flex h-full flex-col items-center rounded-2xl px-3 py-4 text-center neo-shadow"
                style={{ backgroundColor: style.bg }}
              >
                <span
                  className={cn(
                    'grid size-16 shrink-0 place-items-center rounded-xl neo-border-2',
                    style.badge,
                  )}
                >
                  <Icon className="size-9" />
                </span>
                <strong className="mt-3 text-sm font-black tracking-wide text-foreground uppercase">
                  {role.name}
                </strong>
                <p className="mt-1.5 text-[11.5px] leading-snug font-semibold text-[#c5c5d5]">
                  {role.description}
                </p>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
