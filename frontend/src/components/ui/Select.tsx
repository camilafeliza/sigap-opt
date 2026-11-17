import { createListCollection, Select as ArkSelect } from "@ark-ui/solid";
import { CaretDown, Check } from "phosphor-solid";
import { createMemo, For, Show } from "solid-js";

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface CustomSelectProps {
  label?: string;
  items: SelectOption[] | string[];
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  onChange?: (value: string) => void;
  class?: string;
  triggerClass?: string;
}

/**
 * CustomSelect - Dropdown Kustom Ark UI (@ark-ui/solid) untuk Ekosistem sigap-opt
 * Memenuhi hukum Antislop UI:
 * - Menggantikan elemen native <select> browser secara absolut
 * - Beroperasi secara andal di dalam Modal Dialog maupun halaman biasa tanpa terblokir isolasi Portal/FocusTrap
 * - Transisi menu melayang statis (transition-none, bebas efek bounce/transform scale)
 * - Ikonografi Phosphor Icons (CaretDown, Check)
 * - Dukungan tema gelap (Dark Mode) dan terang (Light Mode)
 */
export function CustomSelect(props: CustomSelectProps) {
  const normalizedItems = createMemo<SelectOption[]>(() => {
    return props.items.map((item) =>
      typeof item === "string" ? { label: item, value: item } : item
    );
  });

  const collection = createMemo(() =>
    createListCollection({
      items: normalizedItems(),
      itemToString: (item) => item.label,
      itemToValue: (item) => item.value,
    })
  );

  return (
    <ArkSelect.Root
      collection={collection()}
      value={props.value !== undefined ? [props.value] : props.defaultValue ? [props.defaultValue] : []}
      onValueChange={(details) => {
        if (details.value.length > 0 && props.onChange) {
          props.onChange(details.value[0]);
        }
      }}
      disabled={props.disabled}
      name={props.name}
      positioning={{ sameWidth: true, gutter: 4, placement: "bottom-start" }}
      class={`relative w-full flex flex-col gap-1.5 ${props.class || ""}`}
    >
      <Show when={props.label}>
        <ArkSelect.Label class="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1 font-display">
          {props.label}
          <Show when={props.required}>
            <span class="text-orange-500">*</span>
          </Show>
        </ArkSelect.Label>
      </Show>

      <ArkSelect.Control class="relative w-full">
        <ArkSelect.Trigger
          class={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-600 focus:border-transparent transition-colors duration-150 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
            props.triggerClass || ""
          }`}
        >
          <ArkSelect.ValueText
            placeholder={props.placeholder || "Pilih opsi..."}
            class="truncate text-left text-sm font-medium"
          />
          <ArkSelect.Indicator class="text-slate-400 dark:text-slate-500 transition-transform duration-200 data-[state=open]:rotate-180 flex items-center justify-center">
            <CaretDown size={16} weight="bold" />
          </ArkSelect.Indicator>
        </ArkSelect.Trigger>
      </ArkSelect.Control>

      <ArkSelect.Positioner class="z-[70]">
        <ArkSelect.Content class="w-[--reference-width] max-h-60 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1.5 shadow-xl shadow-black/10 dark:shadow-black/40 focus:outline-none transition-none">
          <ArkSelect.List class="flex flex-col gap-0.5">
            <For each={normalizedItems()}>
              {(item) => (
                <ArkSelect.Item
                  item={item}
                  class="flex items-center justify-between px-3 py-2 rounded-lg text-sm text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 data-[highlighted]:bg-slate-100 dark:data-[highlighted]:bg-slate-700/60 data-[state=checked]:font-semibold data-[state=checked]:text-violet-600 dark:data-[state=checked]:text-violet-400 cursor-pointer select-none transition-none"
                >
                  <ArkSelect.ItemText class="truncate">{item.label}</ArkSelect.ItemText>
                  <ArkSelect.ItemIndicator class="text-violet-600 dark:text-violet-400">
                    <Check size={16} weight="bold" />
                  </ArkSelect.ItemIndicator>
                </ArkSelect.Item>
              )}
            </For>
          </ArkSelect.List>
        </ArkSelect.Content>
      </ArkSelect.Positioner>

      <ArkSelect.HiddenSelect />
    </ArkSelect.Root>
  );
}
