import { motion } from 'framer-motion';

import { Card } from '@/components/ui/card';
import { SectionTitle, Subtitle } from '@/components/SectionTitle';
import { CATALOG_ROLES } from '@/data/roles';

const CARD_BACKGROUNDS = ['#1f3d34', '#262638', '#3a1f2c'];

export function CardsPage() {
  return (
    <section className="flex flex-col items-center">
      <SectionTitle>Katalog Kartu</SectionTitle>
      <Subtitle>Kenali semua peran sebelum malam tiba.</Subtitle>

      <div className="flex w-full flex-col gap-2.5">
        {CATALOG_ROLES.map((role, index) => {
          const Icon = role.icon;
          return (
            <motion.div
              key={role.name}
              initial={{ opacity: 0, y: 14, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: index * 0.04, duration: 0.35, ease: 'easeOut' }}
            >
              <Card
                className="flex items-start gap-3 px-3.5 py-3 text-left"
                style={{ backgroundColor: CARD_BACKGROUNDS[index % CARD_BACKGROUNDS.length] }}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground neo-border-2">
                  <Icon className="size-5" />
                </span>
                <div>
                  <strong className="text-base font-black tracking-wide text-accent uppercase">
                    {role.name}
                  </strong>
                  <p className="mt-0.5 text-[13.5px] leading-snug font-semibold text-[#c5c5d5]">
                    {role.short}
                  </p>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
