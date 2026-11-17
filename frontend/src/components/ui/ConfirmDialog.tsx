import { Dialog as ArkDialog } from '@ark-ui/solid';
import { Portal } from 'solid-js/web';
import { Warning, Trash, X as XIcon } from 'phosphor-solid';
import { Button } from './Button';

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

export function ConfirmDialog(props: ConfirmDialogProps) {
  const handleCancel = () => {
    props.onOpenChange(false);
    props.onCancel?.();
  };

  const isDanger = () => (props.variant ?? 'danger') === 'danger';

  return (
    <ArkDialog.Root
      open={props.open}
      onOpenChange={(details) => props.onOpenChange(details.open)}
    >
      <Portal>
        {/* Backdrop 100% Layar Penuh */}
        <ArkDialog.Backdrop class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm transition-opacity duration-200" />

        {/* Positioner */}
        <ArkDialog.Positioner class="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <ArkDialog.Content class="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
            <div class="flex items-start gap-4">
              <div
                class={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  isDanger()
                    ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                    : 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                }`}
              >
                {isDanger() ? (
                  <Trash size={24} weight="bold" />
                ) : (
                  <Warning size={24} weight="bold" />
                )}
              </div>

              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between">
                  <ArkDialog.Title class="font-display font-black text-base text-slate-900 dark:text-slate-100">
                    {props.title}
                  </ArkDialog.Title>
                  <ArkDialog.CloseTrigger
                    onClick={handleCancel}
                    class="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  >
                    <XIcon size={16} weight="bold" />
                  </ArkDialog.CloseTrigger>
                </div>
                <ArkDialog.Description class="font-data text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  {props.description}
                </ArkDialog.Description>
              </div>
            </div>

            <div class="mt-6 flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                fullWidth
                disabled={props.loading}
                onClick={handleCancel}
              >
                {props.cancelText ?? 'Batal'}
              </Button>
              <Button
                variant={isDanger() ? 'danger' : 'primary'}
                size="sm"
                fullWidth
                loading={props.loading}
                onClick={props.onConfirm}
              >
                {props.confirmText ?? 'Hapus'}
              </Button>
            </div>
          </ArkDialog.Content>
        </ArkDialog.Positioner>
      </Portal>
    </ArkDialog.Root>
  );
}
