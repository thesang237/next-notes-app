'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CloudUpload, Merge, X } from 'lucide-react';

interface SyncConflictDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  localCount: number;
  cloudCount: number;
  onMerge: () => void;
  onUseCloud: () => void;
  onCancel: () => void;
}

export function SyncConflictDialog({
  open,
  onOpenChange,
  localCount,
  cloudCount,
  onMerge,
  onUseCloud,
  onCancel,
}: SyncConflictDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Sync conflict</AlertDialogTitle>
          <AlertDialogDescription>
            You have{' '}
            <span className="font-medium text-foreground">
              {localCount} local {localCount === 1 ? 'note' : 'notes'}
            </span>{' '}
            and your account already has{' '}
            <span className="font-medium text-foreground">
              {cloudCount} cloud {cloudCount === 1 ? 'note' : 'notes'}
            </span>
            . How would you like to handle this?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            <X className="size-3.5" />
            Cancel sign-in
          </AlertDialogCancel>
          <AlertDialogAction variant="outline" onClick={onMerge}>
            <Merge className="size-3.5" />
            Merge both
          </AlertDialogAction>
          <AlertDialogAction variant="destructive" onClick={onUseCloud}>
            <CloudUpload className="size-3.5" />
            Use cloud data
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
