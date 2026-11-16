import { createSignal, onMount, Show, For } from 'solid-js';
import { useAuth } from '../services/auth';
import { Navigate } from '@solidjs/router';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { DialogModal } from '../components/ui/Dialog';
import {
  SlidersHorizontal as SlidersIcon,
  Plus as PlusIcon,
  ShieldCheck as ShieldIcon,
  WarningCircle as WarningIcon,
  Leaf as LeafIcon,
  Sliders as ParamIcon,
} from 'phosphor-solid';

interface AmbangItem {
  id: string;
  komoditas: string;
  opt: string;
  fase: string;
  nilai_waspada_persen: number;
  nilai_ambang_ekonomi_persen: number;
  satuan: string;
  rekomendasi_aman: string;
  rekomendasi_waspada: string;
  rekomendasi_bahaya: string;
}

export default function AmbangEkonomi() {
  const auth = useAuth();

  // Strict RBAC Guard: Super Admin Only
  if (!auth.isSuperAdmin()) {
    return <Navigate href="/dashboard" />;
  }

  const [ambangList, setAmbangList] = createSignal<AmbangItem[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [filterKomoditas, setFilterKomoditas] = createSignal<string>('SEMUA');
  const [createModalOpen, setCreateModalOpen] = createSignal(false);
  const [selectedAmbang, setSelectedAmbang] = createSignal<AmbangItem | null>(null);

  // Form State
  const [komoditas, setKomoditas] = createSignal('Padi');
  const [optNama, setOptNama] = createSignal('');
  const [fase, setFase] = createSignal<'Vegetatif' | 'Generatif'>('Vegetatif');
  const [nilaiWaspada, setNilaiWaspada] = createSignal(5.0);
  const [nilaiAmbang, setNilaiAmbang] = createSignal(10.0);
  const [isSubmitting, setIsSubmitting] = createSignal(false);

  const fetchAmbang = async () => {
    try {
      const res = await fetch('/api/ambang-ekonomi');
      if (res.ok) {
        const data = await res.json();
        setAmbangList(data);
      }
    } catch {
      // Fallback
      setAmbangList([
        {
          id: 'ambang-01',
          komoditas: 'Padi',
          opt: 'Wereng Batang Coklat (Nilaparvata lugens)',
          fase: 'Vegetatif',
          nilai_waspada_persen: 5.0,
          nilai_ambang_ekonomi_persen: 10.0,
          satuan: '%',
          rekomendasi_aman: 'Pemantauan rutin dan pelestarian musuh alami.',
          rekomendasi_waspada: 'Pengeringan sawah berselang dan agens hayati Beauveria bassiana.',
          rekomendasi_bahaya: 'Aplikasi insektisida kimia selektif pimetrozin/buprofezin tepat sasaran.',
        },
        {
          id: 'ambang-02',
          komoditas: 'Padi',
          opt: 'Penggerek Batang Padi (Scirpophaga incertulas)',
          fase: 'Vegetatif',
          nilai_waspada_persen: 3.0,
          nilai_ambang_ekonomi_persen: 6.0,
          satuan: '%',
          rekomendasi_aman: 'Sanitasi jerami dan pengamatan kelompok telur.',
          rekomendasi_waspada: 'Pelepasan parasitoid telur Trichogramma japonicum.',
          rekomendasi_bahaya: 'Insektisida sistemik granula pada perakaran.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  onMount(() => {
    fetchAmbang();
  });

  const filteredAmbang = () => {
    const k = filterKomoditas();
    if (k === 'SEMUA') return ambangList();
    return ambangList().filter((a) => a.komoditas.toLowerCase() === k.toLowerCase());
  };

  const handleCreateAmbang = async (e: Event) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        komoditas: komoditas(),
        opt: optNama(),
        fase: fase(),
        nilai_waspada_persen: Number(nilaiWaspada()),
        nilai_ambang_ekonomi_persen: Number(nilaiAmbang()),
        satuan: '%',
        rekomendasi_aman: 'Pemantauan rutin populasi musuh alami.',
        rekomendasi_waspada: 'Pengendalian mekanis dan aplikasi biopestisida.',
        rekomendasi_bahaya: 'Intervensi kimia selektif sesuai prinsip PHT.',
      };

      const res = await fetch('/api/ambang-ekonomi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await fetchAmbang();
        setCreateModalOpen(false);
        setOptNama('');
      }
    } catch {
      setCreateModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div class="p-4 space-y-4">
      {/* Header Bar */}
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center">
            <SlidersIcon size={20} weight="bold" />
          </div>
          <div>
            <h1 class="font-display font-black text-lg text-slate-900 dark:text-slate-100">
              Ambang Ekonomi
            </h1>
            <p class="font-data text-xs text-slate-500 dark:text-slate-400">
              Master Parameter Ambang PHT
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setCreateModalOpen(true)}
          class="shadow-brand-orange"
        >
          <PlusIcon size={16} weight="bold" />
          <span>Tambah</span>
        </Button>
      </div>

      {/* Filter Tabs Komoditas */}
      <div class="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {['SEMUA', 'Padi', 'Jagung', 'Cabai', 'Bawang Merah'].map((kom) => (
          <button
            type="button"
            onClick={() => setFilterKomoditas(kom)}
            class={`font-display text-[11px] font-bold px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
              filterKomoditas() === kom
                ? 'bg-slate-900 dark:bg-violet-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {kom}
          </button>
        ))}
      </div>

      {/* List Parameter Ambang */}
      <div class="space-y-3">
        <For
          each={filteredAmbang()}
          fallback={
            <div class="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
              <SlidersIcon size={28} weight="duotone" class="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
              <p class="font-data text-xs text-slate-400">Data ambang belum tersedia</p>
            </div>
          }
        >
          {(item) => (
            <Card
              variant="elevated"
              class="p-4 space-y-3 dark:bg-slate-900 dark:border-slate-800 hover:border-violet-300 dark:hover:border-violet-600 transition-all cursor-pointer"
              onClick={() => setSelectedAmbang(item)}
            >
              <div class="flex items-start justify-between">
                <div>
                  <span class="font-display font-black text-sm text-slate-900 dark:text-slate-100 leading-tight block">
                    {item.opt}
                  </span>
                  <div class="flex items-center gap-1.5 mt-1">
                    <span class="font-display text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                      {item.komoditas}
                    </span>
                    <span class="font-data text-[10px] text-slate-400">
                      Fase: {item.fase}
                    </span>
                  </div>
                </div>

                <div class="text-right">
                  <span class="font-display text-[9px] font-bold text-slate-400 block">
                    AMBANG EKONOMI
                  </span>
                  <span class="font-display font-black text-base text-orange-600 dark:text-orange-400">
                    {item.nilai_ambang_ekonomi_persen}%
                  </span>
                </div>
              </div>

              {/* Progress Visual Threshold Bar */}
              <div class="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                <div class="flex justify-between text-[10px] font-display font-bold">
                  <span class="text-violet-600 dark:text-purple-400">
                    Waspada: {item.nilai_waspada_persen}%
                  </span>
                  <span class="text-orange-600 dark:text-orange-400">
                    Bahaya: ≥{item.nilai_ambang_ekonomi_persen}%
                  </span>
                </div>

                <div class="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                  <div class="w-1/3 bg-violet-500/70" />
                  <div class="w-1/3 bg-amber-500/70" />
                  <div class="w-1/3 bg-orange-600/80" />
                </div>
              </div>
            </Card>
          )}
        </For>
      </div>

      {/* Ark UI Modal Detail Ambang & Rekomendasi PHT */}
      <DialogModal
        open={!!selectedAmbang()}
        onOpenChange={(open) => {
          if (!open) setSelectedAmbang(null);
        }}
        title={`Parameter: ${selectedAmbang()?.opt ?? ''}`}
        description={`${selectedAmbang()?.komoditas ?? ''} (${selectedAmbang()?.fase ?? ''})`}
      >
        <Show when={selectedAmbang()}>
          {(item) => (
            <div class="space-y-3 pt-1">
              {/* Telemetri Angka Ambang */}
              <div class="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center">
                <div>
                  <span class="font-display text-[10px] font-bold text-slate-400">BATAS WASPADA</span>
                  <div class="font-display font-black text-lg text-amber-600 dark:text-amber-400">
                    {item().nilai_waspada_persen}%
                  </div>
                </div>
                <div>
                  <span class="font-display text-[10px] font-bold text-slate-400">AMBANG EKONOMI</span>
                  <div class="font-display font-black text-lg text-orange-600 dark:text-orange-400">
                    {item().nilai_ambang_ekonomi_persen}%
                  </div>
                </div>
              </div>

              {/* Rekomendasi Tiap Zona */}
              <div class="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 space-y-1">
                <span class="font-display text-[10px] font-black uppercase text-purple-900 dark:text-purple-200">
                  Rekomendasi Aman
                </span>
                <p class="font-data text-xs text-purple-950 dark:text-purple-300">
                  {item().rekomendasi_aman}
                </p>
              </div>

              <div class="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 space-y-1">
                <span class="font-display text-[10px] font-black uppercase text-amber-900 dark:text-amber-200">
                  Rekomendasi Waspada
                </span>
                <p class="font-data text-xs text-amber-950 dark:text-amber-300">
                  {item().rekomendasi_waspada}
                </p>
              </div>

              <div class="p-3 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 space-y-1">
                <span class="font-display text-[10px] font-black uppercase text-orange-900 dark:text-orange-200">
                  Rekomendasi Bahaya (Di Atas Ambang)
                </span>
                <p class="font-data text-xs text-orange-950 dark:text-orange-300">
                  {item().rekomendasi_bahaya}
                </p>
              </div>

              <Button
                variant="primary"
                size="md"
                fullWidth
                onClick={() => setSelectedAmbang(null)}
              >
                <span>Tutup</span>
              </Button>
            </div>
          )}
        </Show>
      </DialogModal>

      {/* Ark UI Modal Tambah Ambang Ekonomi */}
      <DialogModal
        open={createModalOpen()}
        onOpenChange={setCreateModalOpen}
        title="Tambah Parameter Ambang"
        description="Standar PHT berbasis agronomi"
      >
        <form onSubmit={handleCreateAmbang} class="space-y-3 pt-1">
          <div>
            <label class="font-display block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
              KOMODITAS
            </label>
            <select
              value={komoditas()}
              onChange={(e) => setKomoditas(e.currentTarget.value)}
              class="font-data w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-violet-600"
            >
              <option value="Padi">Padi</option>
              <option value="Jagung">Jagung</option>
              <option value="Cabai">Cabai</option>
              <option value="Bawang Merah">Bawang Merah</option>
            </select>
          </div>

          <div>
            <label class="font-display block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
              NAMA OPT (HAMA / PENYAKIT)
            </label>
            <input
              type="text"
              value={optNama()}
              onInput={(e) => setOptNama(e.currentTarget.value)}
              placeholder="Contoh: Walang Sangit"
              class="font-data w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-violet-600"
              required
            />
          </div>

          <div class="grid grid-cols-2 gap-2.5">
            <div>
              <label class="font-display block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                BATAS WASPADA (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={nilaiWaspada()}
                onInput={(e) => setNilaiWaspada(Number(e.currentTarget.value) || 5.0)}
                class="font-data w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-violet-600"
                required
              />
            </div>

            <div>
              <label class="font-display block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                AMBANG EKONOMI (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={nilaiAmbang()}
                onInput={(e) => setNilaiAmbang(Number(e.currentTarget.value) || 10.0)}
                class="font-data w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-orange-500"
                required
              />
            </div>
          </div>

          <div class="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              fullWidth
              loading={isSubmitting()}
              class="shadow-brand-orange"
            >
              <span>Simpan Parameter</span>
            </Button>
          </div>
        </form>
      </DialogModal>
    </div>
  );
}
