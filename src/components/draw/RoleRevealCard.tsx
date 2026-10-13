import { motion } from 'framer-motion';

import { getRole } from '@/data/roles';
import { cn } from '@/lib/utils';

export function RoleRevealCard({ role }: { role: string | null }) {
  const roleData = role ? getRole(role) : null;
  if (!roleData) return null;
  const Icon = roleData.icon;
  const isWerewolf = role === 'Werewolf';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 220, damping: 20 }}
      className={cn(
        'relative my-4.5 overflow-hidden rounded-[18px] px-4 py-6.5 neo-border-2',
        isWerewolf ? 'bg-[#1f1020] neo-shadow-primary' : 'bg-[#141422] neo-shadow-accent',
      )}
    >
      <Icon
        className={cn(
          'mx-auto mb-3 size-16 animate-float',
          isWerewolf ? 'text-primary' : 'text-accent',
        )}
      />
      <div
        className={cn(
          'mb-3 inline-block rounded-[10px] px-4 py-1.5 text-[26px] font-black tracking-widest uppercase neo-border-2 shadow-[3px_3px_0_#000]',
          isWerewolf ? 'bg-primary text-primary-foreground' : 'bg-accent text-accent-foreground',
        )}
      >
        {role}
      </div>
      <p className="px-1.5 text-sm leading-relaxed font-semibold text-[#c8c8d8]">
        {roleData.description}
      </p>
    </motion.div>
  );
}
