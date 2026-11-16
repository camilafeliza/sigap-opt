import { createSignal, createEffect, onCleanup, Show, on } from 'solid-js';
import { Portal } from 'solid-js/web';
import {
  Camera as CameraIcon,
  CameraSlash as CameraSlashIcon,
  ArrowsClockwise as FlipIcon,
  X as CloseIcon,
  UploadSimple as UploadIcon,
  Lightning as TorchIcon,
  DeviceMobileCamera as NativeCameraIcon,
} from 'phosphor-solid';

interface CameraModalProps {
  open: boolean;
  onClose: () => void;
  onCapture: (dataUrl: string) => void;
}

export function CameraModal(props: CameraModalProps) {
  let nativeCameraInputRef: HTMLInputElement | undefined;
  let galleryInputRef: HTMLInputElement | undefined;
  let activeMediaStream: MediaStream | null = null;
  let cameraSessionId = 0;
  let isStartingCamera = false;

  // Deteksi perangkat bergerak (ponsel / tablet vs laptop / workstation)
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
  const [videoEl, setVideoEl] = createSignal<HTMLVideoElement | null>(null);

  // Periksa apakah perangkat memiliki lebih dari 1 kamera fisik asli (bukan node virtual/metadata)
  const checkCameras = async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) {
        setHasMultipleCameras(false);
        return;
      }
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');

      if (videoDevices.length <= 1) {
        setHasMultipleCameras(false);
        return;
      }

      // Deteksi node ganda pada webcam Linux (e.g. /dev/video0 + /dev/video1 yang berbagi groupId atau label sama)
      const groupIds = new Set(videoDevices.map((d) => d.groupId).filter(Boolean));
      const labels = new Set(videoDevices.map((d) => d.label).filter(Boolean));

      // Jika seluruh perangkat video terhubung pada groupId yang sama atau label identik, hanya ada 1 webcam fisik
      if (groupIds.size === 1 || (labels.size === 1 && videoDevices.length > 1)) {
        setHasMultipleCameras(false);
        return;
      }

      setHasMultipleCameras(true);
    } catch (_) {
      setHasMultipleCameras(false);
    }
  };

  // Menghentikan streaming dan melepaskan hardware kamera secara absolut
  const stopStream = () => {
    cameraSessionId++;
    isStartingCamera = false;

    // 1. Matikan senter jika aktif
    if (isTorchOn() && activeMediaStream) {
      const track = activeMediaStream.getVideoTracks()[0];
      if (track) {
        try {
          (track as any).applyConstraints({ advanced: [{ torch: false }] });
        } catch (_) {}
      }
      setIsTorchOn(false);
    }

    // 2. Hentikan seluruh trek hardware pada activeMediaStream
    if (activeMediaStream) {
      activeMediaStream.getTracks().forEach((track) => {
        try {
          track.stop();
          track.enabled = false;
        } catch (_) {}
      });
      activeMediaStream = null;
    }

    // 3. Hentikan seluruh trek hardware pada signal stream
    const currentStream = stream();
    if (currentStream) {
      currentStream.getTracks().forEach((track) => {
        try {
          track.stop();
          track.enabled = false;
        } catch (_) {}
      });
      setStream(null);
    }

    // 4. Putuskan koneksi media pipeline dari elemen DOM video
    const video = videoEl();
    if (video) {
      try {
        video.pause();
      } catch (_) {}
      video.srcObject = null;
      try {
        // Pemanggilan load() penting di Chromium/WebKit agar V4L2 device file descriptor dilepas seketika
        video.load();
      } catch (_) {}
    }

    setIsVideoReady(false);
    setHasTorch(false);
  };

  // Reaktivitas menghubungkan media stream ke elemen video DOM
  createEffect(() => {
    const video = videoEl();
    const currentStream = stream();
    if (!video || !currentStream) return;

    // Pastikan konfigurasi video mematuhi autoplay browser
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');

    if (video.srcObject !== currentStream) {
      video.srcObject = currentStream;
    }

    const handleLoadedMetadata = () => {
      video.play().catch(() => {});
    };

    const handleCanPlay = () => {
      setIsVideoReady(true);
    };

    const handlePlaying = () => {
      setIsVideoReady(true);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('playing', handlePlaying);

    // Coba eksekusi play jika siap
    if (video.readyState >= 2) {
      setIsVideoReady(true);
    } else {
      video.play().then(() => setIsVideoReady(true)).catch(() => {});
    }

    // Fallback timer: jika frame telah tiba, pastikan ready tidak tertahan
    const readyTimer = setTimeout(() => {
      if (video && (video.videoWidth > 0 || video.readyState >= 1)) {
        setIsVideoReady(true);
      }
    }, 450);

    onCleanup(() => {
      clearTimeout(readyTimer);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('playing', handlePlaying);
    });
  });

  // Memulai streaming kamera dengan constraint aman dan fallback berlapis
  const startCamera = async (targetFacing: 'environment' | 'user' = facingMode()) => {
    if (!props.open) return;
    if (isStartingCamera) return;

    isStartingCamera = true;
    stopStream();
    setErrorMsg(null);
    setIsVideoReady(false);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      isStartingCamera = false;
      setErrorMsg(
        'Browser atau lingkungan ini tidak mengizinkan akses kamera langsung (membutuhkan HTTPS atau Localhost). Anda dapat menggunakan tombol Kamera Bawaan HP di bawah.'
      );
      return;
    }

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
        // Pada laptop/desktop, jangan gunakan facingMode agar Chromium tidak memilih node metadata /dev/video1
        videoConstraint = {
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
        // Fallback 1: Coba dengan constraint lebih fleksibel
        console.warn('Constraint ideal kamera gagal, mencoba fallback standar:', errConstraint);
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: isMobileDevice ? { facingMode: targetFacing } : true,
            audio: false,
          });
        } catch (_) {
          // Fallback 2: Minta video apa pun yang tersedia di sistem
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
      }

      // Validasi pembatalan jika modal ditutup saat proses otorisasi berjalan
      if (sessionId !== cameraSessionId || !props.open) {
        mediaStream.getTracks().forEach((track) => {
          try {
            track.stop();
            track.enabled = false;
          } catch (_) {}
        });
        isStartingCamera = false;
        return;
      }

      mediaStream.getVideoTracks().forEach((track) => {
        track.enabled = true;
      });

      activeMediaStream = mediaStream;
      setStream(mediaStream);

      // Cek kapabilitas senter
      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack && typeof (videoTrack as any).getCapabilities === 'function') {
        const capabilities = (videoTrack as any).getCapabilities();
        setHasTorch(Boolean(capabilities && capabilities.torch));
      }

      // Periksa keberadaan multi-kamera
      checkCameras();
      isStartingCamera = false;
    } catch (err: any) {
      if (sessionId !== cameraSessionId) return;
      isStartingCamera = false;

      console.warn('Akses kamera gagal:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMsg('Izin akses kamera ditolak. Silakan berikan izin kamera pada peramban Anda, atau gunakan opsi Kamera Bawaan HP.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorMsg('Sensor kamera tidak ditemukan pada perangkat Anda.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setErrorMsg('Kamera sedang digunakan oleh aplikasi lain atau sistem operasi. Tutup aplikasi yang menggunakan kamera, atau gunakan Kamera HP.');
      } else {
        setErrorMsg('Kamera tidak dapat diakses langsung. Anda tetap dapat memotret menggunakan Kamera Bawaan HP atau Galeri.');
      }
    }
  };

  // Toggle senter / torch (bila didukung perangkat)
  const toggleTorch = async () => {
    if (!activeMediaStream || !hasTorch()) return;
    const track = activeMediaStream.getVideoTracks()[0];
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
  const toggleFacingMode = async () => {
    if (isStartingCamera) return;
    const nextMode = facingMode() === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    await startCamera(nextMode);
  };

  // Tangkap gambar dari video feed
  const capturePhoto = () => {
    const video = videoEl();
    if (!video || !stream()) return;

    // Animasi flash shutter
    setIsShutterFlashing(true);
    setTimeout(() => setIsShutterFlashing(false), 150);

    const videoWidth = video.videoWidth || video.clientWidth || 640;
    const videoHeight = video.videoHeight || video.clientHeight || 480;

    // Skala dimensi maksimal 800px demi efisiensi transmisi dan pemrosesan AI
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
      if (facingMode() === 'user') {
        ctx.translate(targetWidth, 0);
        ctx.scale(-1, 1);
      }

      ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

      stopStream();
      props.onCapture(dataUrl);
    }
  };

  // Handler fallback tangkapan kamera bawaan HP atau berkas galeri
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

  // Matikan kamera jika window diminimize atau berganti tab
  const handleVisibilityChange = () => {
    if (document.hidden && props.open) {
      stopStream();
      props.onClose();
    }
  };

  // Reaktif HANYA terhadap perubahan props.open menggunakan on()
  createEffect(
    on(
      () => props.open,
      (isOpen) => {
        if (isOpen) {
          document.addEventListener('visibilitychange', handleVisibilityChange);
          startCamera(facingMode());
        } else {
          document.removeEventListener('visibilitychange', handleVisibilityChange);
          stopStream();
        }
      },
      { defer: false }
    )
  );

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
              {/* Tombol Senter / Torch bila didukung */}
              <Show when={hasTorch()}>
                <button
                  type="button"
                  onClick={toggleTorch}
                  class={`w-10 h-10 rounded-full backdrop-blur-md flex items-center justify-center transition-colors border shadow-lg active:scale-95 cursor-pointer ${
                    isTorchOn()
                      ? 'bg-amber-400 text-slate-950 border-amber-300'
                      : 'bg-slate-900/80 text-white border-white/10 hover:bg-slate-800'
                  }`}
                  title={isTorchOn() ? 'Matikan Senter' : 'Nyalakan Senter'}
                >
                  <TorchIcon size={18} weight={isTorchOn() ? 'fill' : 'bold'} />
                </button>
              </Show>

              {/* Tombol Balik Kamera (Khusus jika perangkat memiliki >1 kamera fisik) */}
              <Show when={hasMultipleCameras()}>
                <button
                  type="button"
                  onClick={toggleFacingMode}
                  class="w-10 h-10 rounded-full bg-slate-900/80 backdrop-blur-md text-white flex items-center justify-center hover:bg-slate-800 transition-colors border border-white/10 shadow-lg active:scale-95 cursor-pointer"
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
                class="w-10 h-10 rounded-full bg-slate-900/80 backdrop-blur-md text-white flex items-center justify-center hover:bg-slate-800 transition-colors border border-white/10 shadow-lg active:scale-95 cursor-pointer"
                title="Tutup Kamera"
              >
                <CloseIcon size={20} weight="bold" />
              </button>
            </div>
          </div>

          {/* Viewfinder Video Kamera */}
          <div class="relative flex-1 flex items-center justify-center overflow-hidden bg-black">
            <video
              ref={setVideoEl}
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
                    onClick={() => startCamera(facingMode())}
                    class="w-full py-2.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-display font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-orange-500/20 active:scale-95 cursor-pointer"
                  >
                    <FlipIcon size={16} weight="bold" />
                    <span>Coba Lagi</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => nativeCameraInputRef?.click()}
                    class="w-full py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-display font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-violet-600/20 active:scale-95 cursor-pointer"
                  >
                    <NativeCameraIcon size={16} weight="bold" />
                    <span>Gunakan Kamera Bawaan HP</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => galleryInputRef?.click()}
                    class="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-display font-bold text-xs transition-colors flex items-center justify-center gap-1.5 border border-white/20 active:scale-95 cursor-pointer"
                  >
                    <UploadIcon size={16} weight="bold" />
                    <span>Pilih dari Galeri / Berkas</span>
                  </button>
                </div>
              </div>
            </Show>
          </div>

          {/* Bottom Bar: Tombol Shutter Utama & Opsi Kamera HP / Galeri */}
          <div class="relative z-10 flex items-center justify-around p-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
            {/* Opsi Kamera Bawaan HP */}
            <button
              type="button"
              onClick={() => nativeCameraInputRef?.click()}
              class="flex flex-col items-center gap-1 text-white/80 hover:text-white transition-colors cursor-pointer"
              title="Gunakan Kamera Bawaan HP"
            >
              <div class="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-md active:scale-95">
                <NativeCameraIcon size={20} weight="bold" />
              </div>
              <span class="font-display text-[10px] font-bold">Kamera HP</span>
            </button>

            {/* Tombol Shutter Utama Pemotretan */}
            <div class="relative flex items-center justify-center">
              <button
                type="button"
                onClick={capturePhoto}
                disabled={!stream() || !!errorMsg()}
                class="w-20 h-20 rounded-full border-4 border-white/80 p-1 flex items-center justify-center transition-transform active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed group focus:outline-none cursor-pointer"
                title="Ambil Foto Sekarang"
              >
                <div class="w-full h-full rounded-full bg-orange-500 group-hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/50 flex items-center justify-center text-white">
                  <CameraIcon size={28} weight="fill" />
                </div>
              </button>
            </div>

            {/* Opsi Galeri */}
            <button
              type="button"
              onClick={() => galleryInputRef?.click()}
              class="flex flex-col items-center gap-1 text-white/80 hover:text-white transition-colors cursor-pointer"
              title="Unggah dari Galeri Foto"
            >
              <div class="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-md active:scale-95">
                <UploadIcon size={20} weight="bold" />
              </div>
              <span class="font-display text-[10px] font-bold">Galeri</span>
            </button>
          </div>

          {/* Hidden Inputs untuk Kamera Native dan Galeri */}
          <input
            ref={nativeCameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileFallback}
            class="hidden"
          />
          <input
            ref={galleryInputRef}
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
