import { createSignal, onMount, Show, For } from 'solid-js';
import { useAuth } from '../services/auth';
import { Navigate } from '@solidjs/router';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { DialogModal } from '../components/ui/Dialog';
import { CustomSelect } from '../components/ui/Select';
import {
  SlidersHorizontal as SlidersIcon,
  Plus as PlusIcon,
  Trash as TrashIcon,
  Leaf as LeafIcon,
  Bug as BugIcon,
  Target as TargetIcon,
  Scales as ScalesIcon,
  ShieldCheck as ShieldIcon,
  WarningCircle as WarningIcon,
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

// Preset saran OPT agronomi per Komoditas untuk mempermudah Administrator
const OPT_PRESETS_BY_KOMODITAS: Record<string, string[]> = {
  Padi: ['Wereng Batang Coklat', 'Penggerek Batang Padi', 'Blas Daun', 'Hawar Daun Bakteri', 'Walang Sangit'],
  Jagung: ['Ulat Grayak Jagung (FAW)', 'Penggerek Batang Jagung', 'Bulai Jagung', 'Bercak Daun'],
  Cabai: ['Kutu Daun (Aphids)', 'Lalat Buah', 'Antraknosa', 'Thrips'],
  'Bawang Merah': ['Ulat Grayak (Spodoptera)', 'Bercak Ungu (Alternaria)', 'Layu Fusarium'],
  Kedelai: ['Ulat Grayak', 'Kepik Hijau', 'Karat Daun', 'Ulat Penggulung Daun'],
};

const SATUAN_OPTIONS = ['%', 'ekor/rumpun', 'ekor/perangkap', 'larva/tanaman'];
const FASE_OPTIONS: ('Vegetatif' | 'Generatif' | 'Semua Fase')[] = ['Vegetatif', 'Generatif', 'Semua Fase'];

export default function AmbangEkonomi() {
  const auth = useAuth();

  // Strict RBAC Guard: Super Admin Only (GEMINI.md Bab 5 & 8)
  if (!auth.isSuperAdmin()) {
    return <Navigate href="/dashboard" />;
  }

  const [ambangList, setAmbangList] = createSignal<AmbangItem[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [filterKomoditas, setFilterKomoditas] = createSignal<string>('SEMUA');
  const [createModalOpen, setCreateModalOpen] = createSignal(false);
  const [selectedAmbang, setSelectedAmbang] = createSignal<AmbangItem | null>(null);
  const [isDeleting, setIsDeleting] = createSignal(false);

  // Form State: Variabel Identitas Konteks Wajib
  const [komoditas, setKomoditas] = createSignal('Padi');
  const [optNama, setOptNama] = createSignal('');
  const [fase, setFase] = createSignal<'Vegetatif' | 'Generatif' | 'Semua Fase'>('Vegetatif');

  // Form State: Nilai Ambang & Satuan Ukur Wajib
  const [satuan, setSatuan] = createSignal<string>('%');
  const [nilaiWaspada, setNilaiWaspada] = createSignal(5.0);
  const [nilaiAmbang, setNilaiAmbang] = createSignal(10.0);

  // Form State: Rekomendasi PHT Berjenjang
  const [rekomendasiAman, setRekomendasiAman] = createSignal(
    'Pemantauan rutin mingguan dan pelestarian agens hayati musuh alami.'
  );
  const [rekomendasiWaspada, setRekomendasiWaspada] = createSignal(
    'Pengendalian fisik/mekanis, sanitasi inang, dan aplikasi biopestisida.'
  );
  const [rekomendasiBahaya, setRekomendasiBahaya] = createSignal(
    'Intervensi darurat: Insektisida/fungisida kimia selektif sesuai prinsip tepat dosis.'
  );
  const [isSubmitting, setIsSubmitting] = createSignal(false);

  const fetchAmbang = async () => {
    try {
      const res = await fetch('/api/ambang-ekonomi');
      if (res.ok) {
        const data = await res.json();
        setAmbangList(data);
      }
    } catch {
      setAmbangList([]);
    } finally {
      setLoading(false);
    }
  };

  onMount(() => {
    fetchAmbang();
  });

  // Sinkronisasi otomatis saran rekomendasi saat komoditas atau OPT berubah
  const handleSelectOptPreset = (opt: string) => {
    setOptNama(opt);
    const k = komoditas();
    setRekomendasiAman(`Pemantauan berkala populasi musuh alami pada pertanaman ${k}.`);
    setRekomendasiWaspada(`Pengendalian mekanis, pemasangan perangkap likat/feromon, dan biopestisida pada ${k}.`);
    setRekomendasiBahaya(`Intervensi kimia darurat selektif terdaftar pengendali ${opt} dengan prinsip tepat dosis.`);
  };

  const filteredAmbang = () => {
    const k = filterKomoditas();
    if (k === 'SEMUA') return ambangList();
    return ambangList().filter((a) => a.komoditas.toLowerCase() === k.toLowerCase());
  };

  const handleCreateAmbang = async (e: Event) => {
    e.preventDefault();
    if (!optNama().trim()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        komoditas: komoditas(),
        opt: optNama().trim(),
        fase: fase(),
        satuan: satuan(),
        nilai_waspada_persen: Number(nilaiWaspada()),
        nilai_ambang_ekonomi_persen: Number(nilaiAmbang()),
        rekomendasi_aman: rekomendasiAman(),
        rekomendasi_waspada: rekomendasiWaspada(),
        rekomendasi_bahaya: rekomendasiBahaya(),
      };

      const res = await fetch('/api/ambang-ekonomi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(auth.token() ? { Authorization: `Bearer ${auth.token()}` } : {}),
        },
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

  const handleDeleteAmbang = async (id: string) => {
    if (!confirm('Hapus parameter ambang ekonomi ini?')) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/ambang-ekonomi/${id}`, {
        method: 'DELETE',
        headers: {
          ...(auth.token() ? { Authorization: `Bearer ${auth.token()}` } : {}),
        },
      });
      if (res.ok) {
        setSelectedAmbang(null);
        await fetchAmbang();
      }
    } finally {
      setIsDeleting(false);
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
          </div>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setOptNama('');
            setCreateModalOpen(true);
          }}
          class="shadow-brand-orange"
        >
          <PlusIcon size={16} weight="bold" />
          <span>Tambah</span>
        </Button>
      </div>

      {/* Filter Tabs Komoditas */}
      <div class="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {['SEMUA', 'Padi', 'Jagung', 'Cabai', 'Bawang Merah', 'Kedelai'].map((kom) => (
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
              <p class="font-data text-xs text-slate-400">Parameter ambang belum tersedia</p>
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
                  <div class="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span class="font-display text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                      {item.komoditas}
                    </span>
                    <span class="font-display text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {item.fase}
                    </span>
                    <span class="font-data text-[10px] text-slate-400 italic">
                      Satuan: {item.satuan}
                    </span>
                  </div>
                </div>

                <div class="text-right">
                  <span class="font-display text-[9px] font-bold text-slate-400 block">
                    AMBANG EKONOMI
                  </span>
                  <span class="font-display font-black text-base text-orange-600 dark:text-orange-400">
                    {item.nilai_ambang_ekonomi_persen} {item.satuan}
                  </span>
                </div>
              </div>

              {/* Progress Visual Threshold Bar */}
              <div class="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                <div class="flex justify-between text-[10px] font-display font-bold">
                  <span class="text-violet-600 dark:text-purple-400">
                    Waspada: {item.nilai_waspada_persen} {item.satuan}
                  </span>
                  <span class="text-orange-600 dark:text-orange-400">
                    Bahaya: ≥{item.nilai_ambang_ekonomi_persen} {item.satuan}
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
      >
        <Show when={selectedAmbang()}>
          {(item) => (
            <div class="space-y-3 pt-1">
              {/* Badge Identitas Konteks Lengkap */}
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="font-display text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                  Komoditas: {item().komoditas}
                </span>
                <span class="font-display text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  Fase: {item().fase}
                </span>
                <span class="font-display text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                  Satuan: {item().satuan}
                </span>
              </div>

              {/* Telemetri Angka Ambang */}
              <div class="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center">
                <div>
                  <span class="font-display text-[10px] font-bold text-slate-400">BATAS WASPADA</span>
                  <div class="font-display font-black text-lg text-amber-600 dark:text-amber-400">
                    {item().nilai_waspada_persen} {item().satuan}
                  </div>
                </div>
                <div>
                  <span class="font-display text-[10px] font-bold text-slate-400">AMBANG EKONOMI</span>
                  <div class="font-display font-black text-lg text-orange-600 dark:text-orange-400">
                    {item().nilai_ambang_ekonomi_persen} {item().satuan}
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

              <div class="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDeleteAmbang(item().id)}
                  disabled={isDeleting()}
                  class="px-4 py-2.5 rounded-xl border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 font-display font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Hapus Parameter Ini"
                >
                  <TrashIcon size={16} weight="bold" />
                  <span>Hapus</span>
                </button>
                <Button
                  variant="primary"
                  size="md"
                  fullWidth
                  onClick={() => setSelectedAmbang(null)}
                >
                  <span>Tutup</span>
                </Button>
              </div>
            </div>
          )}
        </Show>
      </DialogModal>

      {/* Ark UI Modal Tambah Ambang Ekonomi (Sesuai Konteks Agronomi Nyata) */}
      <DialogModal
        open={createModalOpen()}
        onOpenChange={setCreateModalOpen}
        title="Parameter Ambang Ekonomi"
      >
        <form onSubmit={handleCreateAmbang} class="space-y-3.5 pt-1">
          {/* 1. Variabel Identitas Konteks Wajib */}
          <div class="p-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/60 space-y-2.5">
            <span class="font-display text-[10px] font-black uppercase text-purple-900 dark:text-purple-300 block">
              1. Konteks Identitas Sasaran
            </span>

            {/* Komoditas */}
            <CustomSelect
              label="KOMODITAS TANAMAN TARGET"
              items={['Padi', 'Jagung', 'Cabai', 'Bawang Merah', 'Kedelai']}
              value={komoditas()}
              onChange={(val) => {
                setKomoditas(val);
                const presets = OPT_PRESETS_BY_KOMODITAS[val];
                if (presets && presets.length > 0) {
                  handleSelectOptPreset(presets[0]);
                }
              }}
            />

            {/* Nama Spesifik OPT */}
            <div>
              <label class="font-display block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                NAMA SPESIFIK OPT (HAMA / PENYAKIT)
              </label>
              <input
                type="text"
                value={optNama()}
                onInput={(e) => {
                  setOptNama(e.currentTarget.value);
                  updateRecommendations(komoditas(), e.currentTarget.value);
                }}
                placeholder="Contoh: Wereng Batang Coklat"
                class="font-data w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-violet-600 shadow-xs"
                required
              />

              {/* Quick Chips Preset OPT */}
              <Show when={OPT_PRESETS_BY_KOMODITAS[komoditas()]}>
                <div class="pt-1.5 flex items-center gap-1 flex-wrap">
                  <span class="text-[9px] font-bold text-slate-400 uppercase">Saran:</span>
                  <For each={OPT_PRESETS_BY_KOMODITAS[komoditas()]}>
                    {(p) => (
                      <button
                        type="button"
                        onClick={() => handleSelectOptPreset(p)}
                        class={`text-[9px] font-display font-bold px-2 py-0.5 rounded-lg border transition-all ${
                          optNama() === p
                            ? 'border-violet-500 bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {p}
                      </button>
                    )}
                  </For>
                </div>
              </Show>
            </div>

            {/* Fase Pertumbuhan Tanaman */}
            <div>
              <label class="font-display block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                FASE PERTUMBUHAN TANAMAN
              </label>
              <div class="grid grid-cols-3 gap-1 bg-white dark:bg-slate-900 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <For each={FASE_OPTIONS}>
                  {(f) => (
                    <button
                      type="button"
                      onClick={() => setFase(f)}
                      class={`py-1.5 text-[10px] font-display font-bold rounded-lg transition-all ${
                        fase() === f
                          ? 'bg-violet-600 text-white shadow-xs'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                      }`}
                    >
                      {f}
                    </button>
                  )}
                </For>
              </div>
            </div>
          </div>

          {/* 2. Besaran Nilai Ambang & Satuan Ukur Wajib */}
          <div class="p-3 rounded-xl bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200/80 dark:border-orange-900/60 space-y-2.5">
            <span class="font-display text-[10px] font-black uppercase text-orange-900 dark:text-orange-300 block">
              2. Parameter Batas & Satuan Ukur
            </span>

            {/* Satuan Ukur */}
            <div>
              <label class="font-display block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                SATUAN UKUR PARAMETER
              </label>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-1 bg-white dark:bg-slate-900 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <For each={SATUAN_OPTIONS}>
                  {(s) => (
                    <button
                      type="button"
                      onClick={() => setSatuan(s)}
                      class={`py-1 text-[10px] font-display font-bold rounded-lg transition-all text-center ${
                        satuan() === s
                          ? 'bg-orange-500 text-white shadow-xs'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {s}
                    </button>
                  )}
                </For>
              </div>
            </div>

            {/* Besaran Angka Numerik */}
            <div class="grid grid-cols-2 gap-2.5">
              <div>
                <label class="font-display block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  BATAS WASPADA ({satuan()})
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={nilaiWaspada()}
                  onInput={(e) => setNilaiWaspada(Number(e.currentTarget.value) || 0)}
                  class="font-data w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-amber-500 shadow-xs"
                  required
                />
              </div>

              <div>
                <label class="font-display block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  AMBANG EKONOMI ({satuan()})
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={nilaiAmbang()}
                  onInput={(e) => setNilaiAmbang(Number(e.currentTarget.value) || 0)}
                  class="font-data w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-orange-500 shadow-xs"
                  required
                />
              </div>
            </div>
          </div>

          {/* 3. Panduan Rekomendasi PHT Berjenjang */}
          <div class="space-y-2">
            <span class="font-display text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 block">
              3. Rekomendasi Tindakan PHT
            </span>

            <div>
              <label class="font-display block text-[10px] font-bold text-purple-700 dark:text-purple-400 mb-0.5">
                Zona Aman
              </label>
              <input
                type="text"
                value={rekomendasiAman()}
                onInput={(e) => setRekomendasiAman(e.currentTarget.value)}
                class="font-data w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-violet-600"
                required
              />
            </div>

            <div>
              <label class="font-display block text-[10px] font-bold text-amber-700 dark:text-amber-400 mb-0.5">
                Zona Waspada
              </label>
              <input
                type="text"
                value={rekomendasiWaspada()}
                onInput={(e) => setRekomendasiWaspada(e.currentTarget.value)}
                class="font-data w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <div>
              <label class="font-display block text-[10px] font-bold text-orange-700 dark:text-orange-400 mb-0.5">
                Zona Bahaya (Di Atas Ambang)
              </label>
              <input
                type="text"
                value={rekomendasiBahaya()}
                onInput={(e) => setRekomendasiBahaya(e.currentTarget.value)}
                class="font-data w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-orange-600"
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
