import { motion } from 'framer-motion';
import { X, Map, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { JunkyardPreview } from './JunkyardPreview';
import { Biome } from '@/data/biomes';

interface ScavengeScreenProps {
  biome: Biome;
  seed: number;
  hasActiveJunkyard: boolean;
  onEnterJunkyard: () => void;
  onAbandonJunkyard: () => void;
  onClose: () => void;
}

export function ScavengeScreen({
  biome,
  seed,
  hasActiveJunkyard,
  onEnterJunkyard,
  onAbandonJunkyard,
  onClose,
}: ScavengeScreenProps) {
  return (
    <motion.div
      className="fixed inset-0 z-50 bg-background flex flex-col"
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '100%' }}
    >
      {/* Header */}
      <header className="industrial-panel p-4 flex items-center justify-between">
        <h2 className="text-xl font-industrial text-primary">Scavenge</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </header>

      <main className="flex-1 p-4 overflow-y-auto flex flex-col gap-4">
        {/* Junkyard Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <JunkyardPreview biome={biome} seed={seed} />
        </motion.div>

        {/* Main Action - Enter Junkyard */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Button
            variant="action"
            size="xl"
            className="w-full py-8"
            onClick={onEnterJunkyard}
          >
            <Map className="w-6 h-6" />
            {hasActiveJunkyard ? 'Continue Scavenging' : 'Enter Junkyard'}
          </Button>
          {hasActiveJunkyard && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              Your progress is saved - return to where you left off
            </p>
          )}
        </motion.div>

        {/* Abandon Junkyard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-auto"
        >
          <Button
            variant="danger"
            className="w-full"
            onClick={onAbandonJunkyard}
          >
            <Trash2 className="w-4 h-4" />
            {hasActiveJunkyard ? 'Abandon Junkyard' : 'Find Different Junkyard'}
          </Button>
          <p className="text-xs text-destructive/70 text-center mt-2">
            {hasActiveJunkyard 
              ? 'Warning: This will permanently lose your current junkyard progress!'
              : 'Generate a new junkyard with fresh loot'}
          </p>
        </motion.div>
      </main>
    </motion.div>
  );
}
