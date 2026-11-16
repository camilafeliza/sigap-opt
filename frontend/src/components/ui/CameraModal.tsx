import { createSignal, createEffect, onCleanup, Show } from 'solid-js';
import { Portal } from 'solid-js/web';
import {
  Camera as CameraIcon,
  CameraSlash as CameraSlashIcon,
  ArrowsClockwise as FlipIcon,
  X as CloseIcon,
  UploadSimple as UploadIcon,
  Lightning as TorchIcon,
} from 'phosphor-solid';

interface CameraModalProps {
  open: boolean;
  onClose: () => void;
  onCapture: (dataUrl: string) => void;
}

export function CameraModal(props: CameraModalProps) {
  let videoRef: HTMLVideoElement | undefined;
  let fileInputRef: HTMLInputElement | undefined;
  let activeStream: MediaStream | null = null;
  let cameraSessionId = 0;

  // Deteksi perangkat bergerak (mobile phone vs desktop/laptop)
  const isMobile = () => {
    if (typeof navigator === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  };

  const [stream, setStream] = createSignal<MediaStream | null>(null);
  const [errorMsg, setErrorMsg] = createSignal<string | null>(null);
  const [facingMode, setFacingMode] = createSignal<'environment' | 'user'>(
    isMobile() ? 'environment' : 'user'
  );
  const [hasMultipleCameras, setHasMultipleCameras] = createSignal(false);
  const [isVideoReady, setIsVideoReady] = createSignal(false);
  const [isShutterFlashing, setIsShutterFlashing] = createSignal(false);
  const [hasTorch, setHasTorch] = createSignal(false);
  const [isTorchOn, setIsTorchOn] = createSignal(false);

  // Periksa apakah perangkat memiliki lebih dari 1 kamera
  const checkCameras = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === 'videoinput');
        setHasMultipleCameras(videoDevices.length > 1);
      }
    } catch (_) {}
  };

  // Menghentikan seluruh trek kamera aktif secara absolut
  const stopStream = () => {
    // 1. Batalkan sesi pemanggilan getUserMedia yang sedang berjalan di background
    cameraSessionId++;

    // 2. Matikan hardware kamera pada activeStream
    if (activeStream) {
      activeStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (_) {}
      });
      activeStream = null;
    }

    // 3. Matikan hardware kamera pada signal stream jika ada
    const currentStream = stream();
    if (currentStream) {
      currentStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (_) {}
      });
      setStream(null);
    }

    // 4. Putuskan sumber media dari elemen video
    if (videoRef) {
      try {
        videoRef.pause();
      } catch (_) {}
      videoRef.srcObject = null;
    }

    setIsVideoReady(false);
    setIsTorchOn(false);
    setHasTorch(false);
  };

  // Sambungkan stream ke elemen video saat keduanya tersedia
  const attachStreamToVideo = () => {
    const currentStream = activeStream || stream();
    if (!videoRef || !currentStream) return;

    if (videoRef.srcObject !== currentStream) {
      videoRef.srcObject = currentStream;
    }

    videoRef.onloadedmetadata = () => {
      videoRef?.play().catch(() => {});
    };

    videoRef.onloadeddata = () => {
      setIsVideoReady(true);
    };

    videoRef.onplaying = () => {
      setIsVideoReady(true);
    };

    videoRef.play().then(() => {
      setIsVideoReady(true);
    }).catch(() => {});
  };

  // Memulai streaming kamera dengan session lock & fallback adaptif
  const startCamera = async (targetFacing: 'environment' | 'user' = facingMode()) => {
    stopStream();
    setErrorMsg(null);
    setIsVideoReady(false);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMsg('Browser atau lingkungan ini tidak mendukung akses kamera langsung (MediaDevices API).');
      return;
    }

    // Ambil session ID saat ini untuk mendeteksi pembatalan asynchronous
    const sessionId = ++cameraSessionId;

    try {
      const isMobileDevice = isMobile();
      let videoConstraint: MediaTrackConstraints;

      if (isMobileDevice) {
        videoConstraint = {
          facingMode: { ideal: targetFacing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        };
      } else {
        // Pada desktop/laptop, gunakan facingMode non-ideal atau default agar tidak memilih node metadata
        videoConstraint = {
          facingMode: targetFacing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        };
      }

      let mediaStream: MediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraint,
          audio: false,
        });
      } catch (errConstraint) {
        // Fallback: Jika constraint spesifik gagal, minta video dasar perangkat
        console.warn('Constraint ideal gagal, mencoba fallback standar:', errConstraint);
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      // Periksa apakah modal ditutup pengguna saat getUserMedia sedang menunggu izin/inisialisasi
      if (sessionId !== cameraSessionId || !props.open) {
        mediaStream.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch (_) {}
        });
        return;
      }

      // Pastikan seluruh video track aktif
      mediaStream.getVideoTracks().forEach((track) => {
        track.enabled = true;
      });

      // Simpan stream aktif ke variabel mutable dan signal
      activeStream = mediaStream;
      setStream(mediaStream);

      // Cek dukungan senter / torch (khusus kamera belakang)
      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack && typeof (videoTrack as any).getCapabilities === 'function') {
        const capabilities = (videoTrack as any).getCapabilities();
        setHasTorch(Boolean(capabilities && capabilities.torch));
      }

      // Sambungkan ke elemen video
      attachStreamToVideo();

      // Periksa jumlah kamera yang tersedia
      checkCameras();
    } catch (err: any) {
      if (sessionId !== cameraSessionId) return;

      console.warn('Akses kamera gagal:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMsg('Izin akses kamera ditolak. Silakan izinkan akses kamera pada ikon gembok/pengaturan situs di browser Anda.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorMsg('Sensor kamera tidak ditemukan pada perangkat Anda.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setErrorMsg('Kamera sedang digunakan oleh aplikasi lain (Zoom, Meet, dll) atau sistem operasi.');
      } else {
        setErrorMsg('Gagal mengaktifkan kamera. Silakan periksa izin perangkat atau pilih foto dari galeri.');
      }
    }
  };

  // Toggle senter / torch
  const toggleTorch = async () => {
    if (!activeStream || !hasTorch()) return;
    const track = activeStream.getVideoTracks()[0];
    if (track) {
      const nextTorch = !isTorchOn();
      try {
        await (track as any).applyConstraints({
          advanced: [{ torch: nextTorch }],
        });
        setIsTorchOn(nextTorch);
      } catch (_) {}
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
    if (!videoRef || !activeStream) return;

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

  // Matikan kamera saat pengguna beralih tab atau minimize window browser
  const handleVisibilityChange = () => {
    if (document.hidden && props.open) {
      stopStream();
      props.onClose();
    }
  };

  // Reaktif terhadap perubahan prop open
  createEffect(() => {
    if (props.open) {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      startCamera();
    } else {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      stopStream();
    }
  });

  // Bersihkan trek media saat komponen di-unmount
  onCleanup(() => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
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
              {/* Tombol Senter / Torch jika didukung */}
              <Show when={hasTorch()}>
                <button
                  type="button"
                  onClick={toggleTorch}
                  class={`w-10 h-10 rounded-full backdrop-blur-md flex items-center justify-center transition-colors border shadow-lg active:scale-95 ${
                    isTorchOn()
                      ? 'bg-amber-400 text-slate-950 border-amber-300'
                      : 'bg-slate-900/80 text-white border-white/10 hover:bg-slate-800'
                  }`}
                  title={isTorchOn() ? 'Matikan Senter' : 'Nyalakan Senter'}
                >
                  <TorchIcon size={18} weight={isTorchOn() ? 'fill' : 'bold'} />
                </button>
              </Show>

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
              ref={(el) => {
                videoRef = el;
                attachStreamToVideo();
              }}
              autoplay
              playsinline
              muted
              class={`w-full h-full object-cover transition-transform ${
                facingMode() === 'user' ? 'scale-x-[-1]' : ''
              }`}
            />

            {/* Indikator Loading Sensor Kamera */}
            <Show when={!isVideoReady() && !errorMsg()}>
              <div class="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10 pointer-events-none">
                <div class="w-10 h-10 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mb-3" />
                <span class="font-display font-bold text-xs text-slate-300">
                  Mengaktifkan sensor kamera...
                </span>
              </div>
            </Show>

            {/* Flash Overlay saat memotret */}
            <Show when={isShutterFlashing()}>
              <div class="absolute inset-0 bg-white z-20 pointer-events-none animate-out fade-out duration-150" />
            </Show>

            {/* Target Reticle / Bingkai Panduan Pemotretan Organ Tanaman */}
            <Show when={!errorMsg() && isVideoReady()}>
              <div class="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
                <div class="relative w-64 h-64 sm:w-72 sm:h-72 border-2 border-white/40 rounded-3xl">
                  {/* Sudut Penanda Target Oranye */}
                  <div class="absolute -top-1 -left-1 w-5 h-5 border-t-3 border-l-3 border-orange-500 rounded-tl-xl" />
                  <div class="absolute -top-1 -right-1 w-5 h-5 border-t-3 border-r-3 border-orange-500 rounded-tr-xl" />
                  <div class="absolute -bottom-1 -left-1 w-5 h-5 border-b-3 border-l-3 border-orange-500 rounded-bl-xl" />
                  <div class="absolute -bottom-1 -right-1 w-5 h-5 border-b-3 border-r-3 border-orange-500 rounded-br-xl" />

                  {/* Titik Fokus Tengah */}
                  <div class="absolute inset-0 flex items-center justify-center">
                    <div class="w-2.5 h-2.5 rounded-full border border-orange-400 bg-orange-500/30" />
                  </div>

                  <div class="absolute -bottom-8 left-0 right-0 text-center">
                    <span class="font-display font-bold text-[11px] text-white/95 bg-black/70 backdrop-blur-sm px-3.5 py-1 rounded-full border border-white/10 shadow-sm">
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
                disabled={!activeStream || !isVideoReady() || !!errorMsg()}
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
