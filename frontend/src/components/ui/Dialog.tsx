import { JSX } from 'solid-js';
import { Dialog as ArkDialog } from '@ark-ui/solid';
import { Portal } from 'solid-js/web';
import { X as XIcon } from 'phosphor-solid';

interface CustomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: JSX.Element;
}

export function DialogModal(props: CustomDialogProps) {
  return (
    <ArkDialog.Root
      open={props.open}
      onOpenChange={(details) => props.onOpenChange(details.open)}
    >
      <Portal>
        {/* Backdrop 100% Layar Penuh (Di-teleport ke document.body via Portal) */}
        <ArkDialog.Backdrop class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm transition-opacity duration-200" />
        
        {/* Positioner Membentang Penuh di Atas Backdrop */}
        <ArkDialog.Positioner class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
          <ArkDialog.Content class="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <ArkDialog.Title class="font-display font-black text-base text-slate-900 dark:text-slate-100">
                  {props.title}
                </ArkDialog.Title>
                {props.description && (
                  <ArkDialog.Description class="font-data text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {props.description}
                  </ArkDialog.Description>
                )}
              </div>
              <ArkDialog.CloseTrigger class="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <XIcon size={20} weight="bold" />
              </ArkDialog.CloseTrigger>
            </div>

            <div class="pt-4">{props.children}</div>
          </ArkDialog.Content>
        </ArkDialog.Positioner>
      </Portal>
    </ArkDialog.Root>
  );
}
