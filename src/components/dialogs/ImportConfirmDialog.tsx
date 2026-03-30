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

interface ImportConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReplace: () => void;
  onMerge: () => void;
}

export function ImportConfirmDialog({
  open,
  onOpenChange,
  onReplace,
  onMerge,
}: ImportConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Import notes</AlertDialogTitle>
          <AlertDialogDescription>
            You already have existing notes. Do you want to merge the imported notes with your current ones, or replace everything?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="outline" onClick={onMerge}>
            Merge
          </AlertDialogAction>
          <AlertDialogAction variant="destructive" onClick={onReplace}>
            Replace
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
