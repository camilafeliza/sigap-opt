import { Show, For } from 'solid-js';
import { DialogModal } from '../ui/Dialog';
import { Button } from '../ui/Button';
import type { ObservasiItem } from '../../pages/Dashboard';
import { Printer, FileArrowDown, ShieldCheck, WarningCircle } from 'phosphor-solid';

interface PrintReportModalProps {
  open: boolean;
  onClose: () => void;
  observations: ObservasiItem[];
  totalUsers: number;
  totalPetak: number;
  avgAiConfidence: number;
  unconfiguredCount: number;
  onExportCsv: () => void;
}

export function PrintReportModal(props: PrintReportModalProps) {
  const printDate = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const bahayaList = () => props.observations.filter((o) => o.status_bahaya === 'BAHAYA');
  const waspadaList = () => props.observations.filter((o) => o.status_bahaya === 'WASPADA');

  const avgIntensity = () => {
    if (!props.observations.length) return '0.0';
    const sum = props.observations.reduce((acc, cur) => acc + cur.intensitas_persen, 0);
    return (sum / props.observations.length).toFixed(1);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <DialogModal
      open={props.open}
      onOpenChange={(isOpen) => {
        if (!isOpen) props.onClose();
      }}
      title="Dokumen Rekapitulasi Fisik"
      description="Laporan Resmi Pengawasan PHT & Sebaran Organisme Pengganggu Wilayah"
    >
      <div class="space-y-4">
        {/* Preview Lembar Dokumen Fisik (Print-ready container) */}
        <div class="p-4 bg-white text-slate-900 rounded-xl border border-slate-300 shadow-sm space-y-3 text-left font-data text-xs max-h-[60vh] overflow-y-auto">
          {/* Header Dokumen Resmi */}
          <div class="border-b-2 border-slate-900 pb-2 flex items-center justify-between">
            <div>
              <h1 class="font-display text-sm font-black tracking-wider uppercase text-slate-900">
                SIGAP-OPT: REKAPITULASI PENGAWASAN PHT REGIONAL
              </h1>
              <p class="text-[10px] text-slate-600">
                Sistem Terpadu Identifikasi AI & Pemantauan Ambang Ekonomi Lapangan
              </p>
            </div>
            <div class="text-right text-[10px] text-slate-500 font-mono">
              <div>Tanggal: {printDate}</div>
              <div>Status: RESMI</div>
            </div>
          </div>

          {/* Matriks Telemetri Wilayah */}
          <div class="grid grid-cols-4 gap-2 p-2.5 bg-slate-100 rounded-lg text-center font-display">
            <div>
              <span class="text-[9px] text-slate-500 block uppercase">PENGGUNA</span>
              <span class="text-sm font-black text-slate-900">{props.totalUsers}</span>
            </div>
            <div>
              <span class="text-[9px] text-slate-500 block uppercase">PETAK LAHAN</span>
              <span class="text-sm font-black text-slate-900">{props.totalPetak}</span>
            </div>
            <div>
              <span class="text-[9px] text-slate-500 block uppercase">RATA KERUSAKAN</span>
              <span class="text-sm font-black text-orange-600">{avgIntensity()}%</span>
            </div>
            <div>
              <span class="text-[9px] text-slate-500 block uppercase">STATUS WILAYAH</span>
              <span class={`text-[11px] font-black ${bahayaList().length > 0 ? 'text-orange-600' : 'text-purple-700'}`}>
                {bahayaList().length > 0 ? `${bahayaList().length} HOTSPOT` : 'TERKENDALI'}
              </span>
            </div>
          </div>

          {/* Tabel Pengamatan Lapangan */}
          <div class="space-y-1">
            <span class="font-display text-[10px] font-black text-slate-700 uppercase tracking-wider block">
              Daftar Titik Pengamatan Lapangan ({props.observations.length} Petak)
            </span>
            <table class="w-full text-[10px] border-collapse">
              <thead>
                <tr class="bg-slate-200 text-slate-700 font-bold border-b border-slate-300">
                  <th class="p-1.5 text-left">Petak</th>
                  <th class="p-1.5 text-left">Komoditas</th>
                  <th class="p-1.5 text-left">Hama Terdeteksi</th>
                  <th class="p-1.5 text-center">Sampel</th>
                  <th class="p-1.5 text-right">Intensitas</th>
                  <th class="p-1.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                <For each={props.observations}>
                  {(obs) => (
                    <tr class="border-b border-slate-200 even:bg-slate-50">
                      <td class="p-1.5 font-bold">{obs.petak}</td>
                      <td class="p-1.5">{obs.komoditas}</td>
                      <td class="p-1.5">{obs.opt_nama}</td>
                      <td class="p-1.5 text-center">{obs.total_terserang}/{obs.total_sampel}</td>
                      <td class="p-1.5 text-right font-bold">{obs.intensitas_persen}%</td>
                      <td class="p-1.5 text-center font-bold">
                        <span
                          class={`px-1.5 py-0.5 rounded text-[8px] uppercase ${
                            obs.status_bahaya === 'BAHAYA'
                              ? 'bg-orange-100 text-orange-800'
                              : obs.status_bahaya === 'WASPADA'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {obs.status_bahaya}
                        </span>
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>

          {/* Audit Data Master & Kinerja AI */}
          <div class="p-2 bg-slate-50 rounded border border-slate-200 text-[10px] space-y-1">
            <div class="flex items-center justify-between">
              <span class="font-bold text-slate-700">Audit Kinerja AI Vision:</span>
              <span class="text-purple-700 font-mono font-bold">Tingkat Keyakinan {props.avgAiConfidence}%</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="font-bold text-slate-700">Audit Integritas Data Master:</span>
              <span class={props.unconfiguredCount > 0 ? 'text-orange-700 font-bold' : 'text-purple-700 font-bold'}>
                {props.unconfiguredCount > 0
                  ? `Perhatian: ${props.unconfiguredCount} OPT belum memiliki nilai ambang`
                  : 'Seluruh formula ambang batas ekonomi terverifikasi'}
              </span>
            </div>
          </div>

          {/* Kolom Tanda Tangan Resmi */}
          <div class="pt-4 flex justify-between text-[10px] text-center">
            <div>
              <p class="text-slate-500">Petugas POPT Wilayah</p>
              <div class="h-10" />
              <p class="font-bold border-t border-slate-400 pt-0.5 min-w-[120px]">( ................................ )</p>
            </div>
            <div>
              <p class="text-slate-500">Super Administrator</p>
              <div class="h-10" />
              <p class="font-bold border-t border-slate-400 pt-0.5 min-w-[120px]">( Administrator PHT )</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div class="grid grid-cols-2 gap-2 pt-1">
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handlePrint}
            class="shadow-brand-orange"
          >
            <Printer size={18} weight="bold" />
            <span>Cetak Dokumen Fisik</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={props.onExportCsv}
          >
            <FileArrowDown size={18} weight="bold" />
            <span>Unduh CSV</span>
          </Button>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          fullWidth
          onClick={props.onClose}
        >
          <span>Tutup</span>
        </Button>
      </div>
    </DialogModal>
  );
}
