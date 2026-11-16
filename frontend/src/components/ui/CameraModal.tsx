import { createSignal, createEffect, onCleanup, Show } from 'solid-js';
import { Portal } from 'solid-js/web';
import {
  Camera as CameraIcon,
  CameraSlash as CameraSlashIcon,
  ArrowsClockwise as FlipIcon,
  X as CloseIcon,
  UploadSimple as UploadIcon,
  WarningCircle as WarningIcon,
} from 'phosphor-solid';

interface CameraModalProps {
  open: boolean;
  onClose: () => void;
  onCapture: (dataUrl: string) => void;
}

export function CameraModal(props: CameraModalProps) {
  let videoRef: HTMLVideoElement | undefined;
  let fileInputRef: HTMLInputElement | undefined;

  const [stream, setStream] = createSignal<MediaStream | null>(null);
  const [errorMsg, setErrorMsg] = createSignal<string | null>(null);
  const [facingMode, setFacingMode] = createSignal<'environment' | 'user'>('environment');
  const [hasMultipleCameras, setHasMultipleCameras] = createSignal(false);
  const [isShutterFlashing, setIsShutterFlashing] = createSignal(false);

  // Periksa apakah perangkat memiliki lebih dari 1 kamera (kamera depan & belakang)
  const checkCameras = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === 'videoinput');
        setHasMultipleCameras(videoDevices.length > 1);
      }
    } catch (_) {
      // Abaikan jika browser tidak mengizinkan enumerasi sebelum izin diberikan
    }
  };

  // Menghentikan seluruh trek kamera aktif
  const stopStream = () => {
    const currentStream = stream();
    if (currentStream) {
      currentStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (_) {}
      });
      setStream(null);
    }
    if (videoRef) {
      videoRef.srcObject = null;
    }
  };

  // Memulai streaming kamera
  const startCamera = async (facing: 'environment' | 'user' = facingMode()) => {
    stopStream();
    setErrorMsg(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMsg('Perangkat atau browser ini tidak mendukung akses kamera langsung.');
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);

      if (videoRef) {
        videoRef.srcObject = mediaStream;
        await videoRef.play().catch(() => {});
      }

      checkCameras();
    } catch (err: any) {
      console.warn('Akses kamera gagal:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMsg('Izin akses kamera ditolak. Silakan izinkan akses kamera di pengaturan browser.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorMsg('Kamera tidak ditemukan pada perangkat Anda.');
      } else {
        setErrorMsg('Gagal mengaktifkan kamera. Anda dapat memilih foto dari berkas/galeri.');
      }
    }
  };

  // Switch kamera depan / belakang
  const toggleFacingMode = () => {
    const nextMode = facingMode() === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Tangkap gambar dari video feed
  const capturePhoto = () => {
    if (!videoRef || !stream()) return;

    // Efek flash shutter
    setIsShutterFlashing(true);
    setTimeout(() => setIsShutterFlashing(false), 150);

    const videoWidth = videoRef.videoWidth || 640;
    const videoHeight = videoRef.videoHeight || 480;

    // Skala dimensi maksimal 800px untuk kompresi efisien
    const maxDim = 800;
    let targetWidth = videoWidth;
    let targetHeight = videoHeight;

    if (targetWidth > maxDim || targetHeight > maxDim) {
      if (targetWidth > targetHeight) {
        targetHeight = Math.round((targetHeight * maxDim) / targetWidth);
        targetWidth = maxDim;
      } else {
        targetWidth = Math.round((targetWidth * maxDim) / targetHeight);
        targetHeight = maxDim;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // Jika kamera depan, flip horizontal agar natural (efek cermin)
      if (facingMode() === 'user') {
        ctx.translate(targetWidth, 0);
        ctx.scale(-1, 1);
      }

      ctx.drawImage(videoRef, 0, 0, targetWidth, targetHeight);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

      // Hentikan streaming kamera dan kirim data citra
      stopStream();
      props.onCapture(dataUrl);
    }
  };

  // Handler fallback pilih dari galeri / file
  const handleFileFallback = (e: Event) => {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (evt) => {
        const rawBase64 = evt.target?.result as string;
        stopStream();
        props.onCapture(rawBase64);
      };
      reader.readAsDataURL(file);
    }
  };

  // Reaktif terhadap perubahan prop open
  createEffect(() => {
    if (props.open) {
      startCamera();
    } else {
      stopStream();
    }
  });

  // Bersihkan trek media saat komponen di-unmount
  onCleanup(() => {
    stopStream();
  });

  return (
    <Show when={props.open}>
      <Portal>
        <div class="fixed inset-0 z-50 bg-black flex flex-col justify-between select-none animate-in fade-in duration-200">
          {/* Top Bar: Kontrol Kamera */}
          <div class="relative z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
            <div class="flex items-center gap-2 text-white">
              <div class="w-8 h-8 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center border border-orange-500/30">
                <CameraIcon size={18} weight="bold" />
              </div>
              <span class="font-display font-bold text-xs tracking-wide">Kamera OPT</span>
            </div>

            <div class="flex items-center gap-2">
              {/* Tombol Balik Kamera (Depan / Belakang) */}
              <Show when={hasMultipleCameras()}>
                <button
                  type="button"
                  onClick={toggleFacingMode}
                  class="w-10 h-10 rounded-full bg-slate-900/80 backdrop-blur-md text-white flex items-center justify-center hover:bg-slate-800 transition-colors border border-white/10 shadow-lg active:scale-95"
                  title="Balik Kamera"
                >
                  <FlipIcon size={18} weight="bold" />
                </button>
              </Show>

              {/* Tombol Tutup Kamera */}
              <button
                type="button"
                onClick={() => {
                  stopStream();
                  props.onClose();
                }}
                class="w-10 h-10 rounded-full bg-slate-900/80 backdrop-blur-md text-white flex items-center justify-center hover:bg-slate-800 transition-colors border border-white/10 shadow-lg active:scale-95"
                title="Tutup Kamera"
              >
                <CloseIcon size={20} weight="bold" />
              </button>
            </div>
          </div>

          {/* Viewfinder Video Kamera */}
          <div class="relative flex-1 flex items-center justify-center overflow-hidden bg-black">
            <video
              ref={videoRef}
              autoplay
              playsinline
              muted
              class={`w-full h-full object-cover transition-transform ${
                facingMode() === 'user' ? 'scale-x-[-1]' : ''
              }`}
            />

            {/* Flash Overlay saat memotret */}
            <Show when={isShutterFlashing()}>
              <div class="absolute inset-0 bg-white z-20 pointer-events-none animate-out fade-out duration-150" />
            </Show>

            {/* Target Reticle / Bingkai Panduan Pemotretan Organ Tanaman */}
            <Show when={!errorMsg()}>
              <div class="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
                <div class="relative w-64 h-64 sm:w-72 sm:h-72 border-2 border-white/30 rounded-3xl shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]">
                  {/* Sudut Penanda Target Oranye */}
                  <div class="absolute -top-1 -left-1 w-5 h-5 border-t-3 border-l-3 border-orange-500 rounded-tl-xl" />
                  <div class="absolute -top-1 -right-1 w-5 h-5 border-t-3 border-r-3 border-orange-500 rounded-tr-xl" />
                  <div class="absolute -bottom-1 -left-1 w-5 h-5 border-b-3 border-l-3 border-orange-500 rounded-bl-xl" />
                  <div class="absolute -bottom-1 -right-1 w-5 h-5 border-b-3 border-r-3 border-orange-500 rounded-br-xl" />

                  {/* Titik Fokus Tengah */}
                  <div class="absolute inset-0 flex items-center justify-center">
                    <div class="w-3 h-3 rounded-full border border-orange-400/60 bg-orange-500/20" />
                  </div>

                  <div class="absolute -bottom-8 left-0 right-0 text-center">
                    <span class="font-display font-medium text-[11px] text-white/90 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full border border-white/10">
                      Arahkan kamera ke hama / gejala daun
                    </span>
                  </div>
                </div>
              </div>
            </Show>

            {/* Tampilan Error / Izin Ditolak */}
            <Show when={errorMsg()}>
              <div class="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center z-30">
                <div class="w-16 h-16 rounded-2xl bg-orange-500/20 text-orange-400 flex items-center justify-center mb-3 border border-orange-500/30">
                  <CameraSlashIcon size={32} weight="bold" />
                </div>
                <h4 class="font-display font-black text-sm text-white mb-1.5">Akses Kamera Terkendala</h4>
                <p class="font-data text-xs text-slate-300 max-w-xs mb-5 leading-relaxed">{errorMsg()}</p>
                <div class="flex flex-col gap-2.5 w-full max-w-xs">
                  <button
                    type="button"
                    onClick={() => startCamera()}
                    class="w-full py-2.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-display font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-orange-500/20 active:scale-95"
                  >
                    <FlipIcon size={16} weight="bold" />
                    <span>Coba Lagi</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef?.click()}
                    class="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-display font-bold text-xs transition-colors flex items-center justify-center gap-1.5 border border-white/20 active:scale-95"
                  >
                    <UploadIcon size={16} weight="bold" />
                    <span>Pilih dari Galeri / Berkas</span>
                  </button>
                </div>
              </div>
            </Show>
          </div>

          {/* Bottom Bar: Tombol Shutter Utama & Opsi Fallback */}
          <div class="relative z-10 flex items-center justify-around p-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
            {/* Tombol Buka Galeri */}
            <button
              type="button"
              onClick={() => fileInputRef?.click()}
              class="flex flex-col items-center gap-1 text-white/80 hover:text-white transition-colors"
              title="Unggah Foto dari Galeri"
            >
              <div class="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-md active:scale-95">
                <UploadIcon size={20} weight="bold" />
              </div>
              <span class="font-display text-[10px] font-bold">Galeri</span>
            </button>

            {/* Tombol Shutter Utama Pemotretan */}
            <div class="relative flex items-center justify-center">
              <button
                type="button"
                onClick={capturePhoto}
                disabled={!stream() || !!errorMsg()}
                class="w-20 h-20 rounded-full border-4 border-white/80 p-1 flex items-center justify-center transition-transform active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed group focus:outline-none"
                title="Ambil Foto Sekarang"
              >
                <div class="w-full h-full rounded-full bg-orange-500 group-hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/50 flex items-center justify-center text-white">
                  <CameraIcon size={28} weight="fill" />
                </div>
              </button>
            </div>

            {/* Tombol Tutup / Batal */}
            <button
              type="button"
              onClick={() => {
                stopStream();
                props.onClose();
              }}
              class="flex flex-col items-center gap-1 text-white/80 hover:text-white transition-colors"
              title="Batal"
            >
              <div class="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-md active:scale-95">
                <CloseIcon size={20} weight="bold" />
              </div>
              <span class="font-display text-[10px] font-bold">Batal</span>
            </button>
          </div>

          {/* Hidden File Input untuk Fallback */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileFallback}
            class="hidden"
          />
        </div>
      </Portal>
    </Show>
  );
}
