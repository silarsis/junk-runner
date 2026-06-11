import { motion, AnimatePresence } from 'framer-motion';
import { Mail, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StoryEmail } from '@/types/game';
import { useEffect } from 'react';

interface EmailModalProps {
  emails: StoryEmail[];
  onDismiss: (emailId: string) => void;
}

/**
 * Shows pending story emails one at a time as a centered popup. Dismissing
 * the current email reveals the next, until the queue is empty.
 */
export function EmailModal({ emails, onDismiss }: EmailModalProps) {
  const current = emails[0];

  // Lock background scroll when an email is open
  useEffect(() => {
    if (!current) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [current]);

  return (
    <AnimatePresence>
      {current && (
        <motion.div
          key={current.id}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="industrial-panel w-full max-w-md rounded-lg overflow-hidden"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
          >
            <header className="flex items-center justify-between p-3 bg-muted/40 border-b border-border">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                <span className="text-xs font-industrial uppercase tracking-wider text-muted-foreground">
                  New Message {emails.length > 1 ? `(${emails.length - 1} more)` : ''}
                </span>
              </div>
              <button
                onClick={() => onDismiss(current.id)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close email"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            <div className="p-4 space-y-3">
              <div className="text-xs text-muted-foreground">
                <p><span className="text-foreground/70">From:</span> {current.from}</p>
              </div>
              <h2 className="text-lg font-industrial text-primary leading-tight">
                {current.subject}
              </h2>
              <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                {current.body}
              </p>
            </div>

            <footer className="p-3 border-t border-border">
              <Button
                variant="action"
                className="w-full"
                onClick={() => onDismiss(current.id)}
              >
                {emails.length > 1 ? 'Next message' : 'Close'}
              </Button>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
