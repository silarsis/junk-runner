import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Item } from '@/types/game';
import { cn } from '@/lib/utils';

interface StashModalProps {
  stash: Item[];
  isOpen: boolean;
  onClose: () => void;
}

const getRarityClass = (rarity: string) => {
  switch (rarity) {
    case 'uncommon': return 'rarity-uncommon';
    case 'rare': return 'rarity-rare';
    case 'epic': return 'rarity-epic';
    case 'legendary': return 'rarity-legendary';
    default: return 'rarity-common';
  }
};

export function StashModal({ stash, isOpen, onClose }: StashModalProps) {
  if (!isOpen) return null;

  // Guard against partially-corrupted save data causing render crashes
  const safeStash = stash.filter(
    (item): item is Item => !!item && typeof (item as any).id === 'string'
  );

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-background flex flex-col"
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '100%' }}
    >
      <header className="industrial-panel p-4 flex items-center justify-between">
        <h2 className="text-xl font-industrial text-primary">Stash</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </header>

      <main className="flex-1 p-4 overflow-y-auto">
        <p className="text-sm text-muted-foreground mb-4">
          {safeStash.length} item{safeStash.length !== 1 ? 's' : ''} in stash
        </p>

        <div className="space-y-2">
          {safeStash.map(item => (
            <motion.div
              key={item.id}
              className="industrial-panel p-3 rounded-lg flex items-center gap-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <span className={cn('text-xl', item.isDirty && 'opacity-70')}>{item.icon}</span>
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm font-medium', getRarityClass(item.rarity))}>
                  {item.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.condition}% condition
                  {item.isDirty && ' • Dirty'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-mono text-accent">{item.baseValue}¢</p>
                <p className="text-[10px] text-muted-foreground">{item.category}</p>
              </div>
            </motion.div>
          ))}

          {safeStash.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Your stash is empty. Transfer items from your bag after scavenging!
            </p>
          )}
        </div>
      </main>
    </motion.div>
  );
}
