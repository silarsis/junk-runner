import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Clock, Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Item, CleaningJob } from '@/types/game';
import { cn } from '@/lib/utils';

interface CleaningScreenProps {
  stash: Item[];
  cleaningJobs: CleaningJob[];
  maxSlots: number;
  onStartCleaning: (itemId: string) => void;
  onCollectCleaned: (jobId: string) => void;
  onClose: () => void;
}

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function CleaningScreen({
  stash,
  cleaningJobs,
  maxSlots,
  onStartCleaning,
  onCollectCleaned,
  onClose,
}: CleaningScreenProps) {
  const [, setTick] = useState(0);
  const dirtyItems = stash.filter(item => item.isDirty);

  // Update every second to show progress
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const getJobProgress = (job: CleaningJob) => {
    const elapsed = Date.now() - job.startTime;
    const progress = Math.min(1, elapsed / job.duration);
    const remaining = Math.max(0, job.duration - elapsed);
    return { progress, remaining, isComplete: progress >= 1 };
  };

  const getRarityClass = (rarity: string) => {
    switch (rarity) {
      case 'uncommon': return 'rarity-uncommon';
      case 'rare': return 'rarity-rare';
      case 'epic': return 'rarity-epic';
      case 'legendary': return 'rarity-legendary';
      default: return 'rarity-common';
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-background flex flex-col"
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '100%' }}
    >
      {/* Header */}
      <header className="industrial-panel p-4 flex items-center justify-between">
        <h2 className="text-xl font-industrial text-primary">Cleaning Station</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </header>

      <main className="flex-1 p-4 overflow-y-auto">
        {/* Active Cleaning Slots */}
        <section className="mb-6">
          <h3 className="text-sm font-industrial text-muted-foreground mb-3">
            Cleaning Slots ({cleaningJobs.length}/{maxSlots})
          </h3>
          <div className="space-y-3">
            {Array.from({ length: maxSlots }).map((_, index) => {
              const job = cleaningJobs[index];
              
              if (!job) {
                return (
                  <div
                    key={`slot-${index}`}
                    className="industrial-panel p-4 rounded-lg border-2 border-dashed border-border"
                  >
                    <p className="text-sm text-muted-foreground text-center">
                      Empty Slot
                    </p>
                  </div>
                );
              }

              const { progress, remaining, isComplete } = getJobProgress(job);

              return (
                <motion.div
                  key={job.jobId}
                  className="industrial-panel p-4 rounded-lg"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">{job.item.icon}</span>
                    <div className="flex-1">
                      <p className={cn("font-medium", getRarityClass(job.item.rarity))}>
                        {job.item.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {job.item.condition}% condition
                      </p>
                    </div>
                    {isComplete ? (
                      <Button
                        variant="action"
                        size="sm"
                        onClick={() => onCollectCleaned(job.jobId)}
                      >
                        <Check className="w-4 h-4" />
                        Collect
                      </Button>
                    ) : (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span className="font-mono text-sm">{formatTime(remaining)}</span>
                      </div>
                    )}
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className={cn(
                        "h-full",
                        isComplete ? "bg-accent" : "bg-primary"
                      )}
                      style={{ width: `${progress * 100}%` }}
                      animate={isComplete ? { opacity: [1, 0.7, 1] } : {}}
                      transition={isComplete ? { repeat: Infinity, duration: 1 } : {}}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Dirty Items */}
        <section>
          <h3 className="text-sm font-industrial text-muted-foreground mb-3">
            Dirty Items ({dirtyItems.length})
          </h3>
          <div className="space-y-2">
            {dirtyItems.map(item => (
              <motion.div
                key={item.id}
                className="industrial-panel p-3 rounded-lg flex items-center gap-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <span className="text-xl opacity-70">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-medium", getRarityClass(item.rarity))}>
                    {item.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.condition}% • Needs cleaning
                  </p>
                </div>
                <Button
                  variant="steel"
                  size="sm"
                  onClick={() => onStartCleaning(item.id)}
                >
                  <Sparkles className="w-4 h-4" />
                  Clean
                </Button>
              </motion.div>
            ))}
            {dirtyItems.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No dirty items in stash
              </p>
            )}
          </div>
        </section>
      </main>
    </motion.div>
  );
}
