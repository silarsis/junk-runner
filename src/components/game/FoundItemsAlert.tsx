import { Item } from '@/types/game';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

interface FoundItemsAlertProps {
  items: Item[];
  open: boolean;
  onClose: () => void;
}

const RARITY_COLORS: Record<string, string> = {
  common: 'text-muted-foreground',
  uncommon: 'text-green-500',
  rare: 'text-blue-500',
  epic: 'text-purple-500',
  legendary: 'text-amber-500',
};

export function FoundItemsAlert({ items, open, onClose }: FoundItemsAlertProps) {
  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            📦 Found Items!
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 mt-2">
              {items.length === 0 ? (
                <p className="text-muted-foreground">Nothing useful found...</p>
              ) : (
                <ul className="space-y-1">
                  {items.map((item) => (
                    <li 
                      key={item.id} 
                      className={cn(
                        "flex items-center gap-2 text-sm",
                        RARITY_COLORS[item.rarity] || 'text-foreground'
                      )}
                    >
                      <span>{item.icon}</span>
                      <span className="font-medium">{item.name}</span>
                      <span className="text-xs opacity-60 capitalize">({item.rarity})</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={onClose}>OK</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
