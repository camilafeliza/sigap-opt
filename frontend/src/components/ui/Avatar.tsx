import { Show } from 'solid-js';
import { useAvatar } from '../../services/avatar';

interface AvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showIndicator?: boolean;
  class?: string;
  onClick?: () => void;
}

export function Avatar(props: AvatarProps) {
  const { avatarUri } = useAvatar();

  const sizeClasses = {
    sm: 'w-8 h-8 ring-1',
    md: 'w-9 h-9 ring-2',
    lg: 'w-12 h-12 ring-2',
    xl: 'w-16 h-16 ring-4',
  };

  const indicatorClasses = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
    xl: 'w-3.5 h-3.5',
  };

  const selectedSize = () => props.size || 'md';

  return (
    <div
      class={`relative inline-flex items-center justify-center flex-shrink-0 ${
        props.onClick ? 'cursor-pointer active:scale-95 transition-transform' : ''
      } ${props.class || ''}`}
      onClick={() => props.onClick?.()}
    >
      <div
        class={`${sizeClasses[selectedSize()]} rounded-full overflow-hidden bg-gradient-to-tr from-purple-100 to-violet-50 dark:from-purple-950 dark:to-slate-800 ring-purple-100 dark:ring-purple-900/60 shadow-sm flex items-center justify-center transition-all`}
      >
        <img
          src={avatarUri()}
          alt="3D Avatar Kartun"
          class="w-full h-full object-cover transform hover:scale-105 transition-transform duration-200"
          loading="eager"
        />
      </div>

      <Show when={props.showIndicator ?? true}>
        <span
          class={`absolute bottom-0 right-0 ${indicatorClasses[selectedSize()]} rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900 shadow-xs`}
        />
      </Show>
    </div>
  );
}
