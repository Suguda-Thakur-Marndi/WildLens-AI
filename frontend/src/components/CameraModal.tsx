'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File, previewUrl: string) => void;
}

type CameraState = 'requesting' | 'streaming' | 'captured' | 'error';

export default function CameraModal({ isOpen, onClose, onCapture }: CameraModalProps) {
  const [state, setState] = useState<CameraState>('requesting');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [errorType, setErrorType] = useState<string>('');
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Stop all active media tracks completely
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.warn('Error stopping track:', e);
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Check if multiple cameras are available (e.g. front & rear)
  const checkCameraDevices = useCallback(async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === 'videoinput');
        setHasMultipleCameras(videoDevices.length > 1);
      }
    } catch {
      // ignore
    }
  }, []);

  // Initialize and start camera stream with proper error classification
  const startCamera = useCallback(
    async (mode: 'environment' | 'user' = facingMode) => {
      stopStream();
      setState('requesting');
      setErrorMessage('');
      setErrorType('');

      // Check for secure context requirement
      if (typeof window !== 'undefined') {
        const isLocalhost =
          window.location.hostname === 'localhost' ||
          window.location.hostname === '127.0.0.1' ||
          window.location.hostname === '[::1]';

        if (!window.isSecureContext && !isLocalhost) {
          setState('error');
          setErrorType('insecure_context');
          setErrorMessage(
            'Camera access requires a secure HTTPS connection or trusted localhost origin. Current origin is insecure HTTP.'
          );
          return;
        }
      }

      // Check mediaDevices support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setState('error');
        setErrorType('unsupported');
        setErrorMessage(
          'Your browser does not support the Web MediaDevices camera API. Please use the image upload option or switch to a modern browser (Chrome, Firefox, Safari, Edge).'
        );
        return;
      }

      const constraints: MediaStreamConstraints = {
        audio: false,
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      };

      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch((playErr) => {
              console.warn('Video play interrupted:', playErr);
            });
          };
        }

        setState('streaming');
        checkCameraDevices();
      } catch (err: any) {
        console.error('Camera initialization error:', err);
        stopStream();
        setState('error');

        const errName = err.name || '';
        if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
          setErrorType('permission_denied');
          setErrorMessage(
            'Camera permission was denied. Please allow camera access in your browser settings (look for the camera icon in your address bar) and try again.'
          );
        } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
          setErrorType('no_device');
          setErrorMessage(
            'No camera hardware detected on this device. You can still photograph organisms with an external camera and upload the image file.'
          );
        } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
          setErrorType('in_use');
          setErrorMessage(
            'Camera is currently in use by another application or tab (e.g. video conferencing or another browser window). Please close other apps using the camera and try again.'
          );
        } else if (errName === 'OverconstrainedError') {
          // Fallback to basic video constraint without ideal facingMode
          try {
            const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            streamRef.current = fallbackStream;
            if (videoRef.current) {
              videoRef.current.srcObject = fallbackStream;
              videoRef.current.play();
            }
            setState('streaming');
            return;
          } catch {
            setErrorType('overconstrained');
            setErrorMessage(`Could not satisfy camera constraints: ${err.message || errName}`);
          }
        } else {
          setErrorType('general');
          setErrorMessage(
            `Unable to access camera: ${err.message || 'Unknown camera initialization error'}.`
          );
        }
      }
    },
    [facingMode, stopStream, checkCameraDevices]
  );

  // Initialize camera when modal opens
  useEffect(() => {
    if (isOpen) {
      setCapturedBlob(null);
      setCapturedPreview(null);
      startCamera(facingMode);
    } else {
      stopStream();
    }

    return () => {
      stopStream();
    };
  }, [isOpen, startCamera, facingMode, stopStream]);

  // Clean up object URL when capturedPreview changes
  useEffect(() => {
    return () => {
      if (capturedPreview && capturedPreview.startsWith('blob:')) {
        URL.revokeObjectURL(capturedPreview);
      }
    };
  }, [capturedPreview]);

  // Toggle front/rear camera
  const handleToggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Capture frame from video stream to canvas
  const handleCaptureFrame = () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw frame
    ctx.drawImage(video, 0, 0, width, height);

    // Convert to JPEG Blob
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const preview = URL.createObjectURL(blob);
        setCapturedBlob(blob);
        setCapturedPreview(preview);
        setState('captured');
      },
      'image/jpeg',
      0.92
    );
  };

  // Retake photo: discard captured frame and resume video stream
  const handleRetake = () => {
    if (capturedPreview && capturedPreview.startsWith('blob:')) {
      URL.revokeObjectURL(capturedPreview);
    }
    setCapturedBlob(null);
    setCapturedPreview(null);
    setState('streaming');
  };

  // Confirm photo: pass to identification workflow and close
  const handleConfirm = () => {
    if (!capturedBlob || !capturedPreview) return;

    const filename = `wildlens_capture_${Date.now()}.jpg`;
    const file = new File([capturedBlob], filename, { type: 'image/jpeg' });

    stopStream();
    onCapture(file, capturedPreview);
    onClose();
  };

  // Close and clean up
  const handleClose = () => {
    stopStream();
    if (capturedPreview && capturedPreview.startsWith('blob:')) {
      URL.revokeObjectURL(capturedPreview);
    }
    setCapturedBlob(null);
    setCapturedPreview(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="camera-modal-title"
      className="fixed inset-0 z-50 bg-[#093421]/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 animate-fadeIn overflow-y-auto"
    >
      <div className="relative w-full max-w-2xl bg-[#0d170f] rounded-2xl overflow-hidden border border-[#2e5936] shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[95vh] my-auto">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 bg-[#122316] border-b border-[#2e5936] text-[#f4fff4]">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-[#8fc0a9] animate-pulse flex-shrink-0"></span>
            <span
              id="camera-modal-title"
              className="font-label-sm text-[11px] sm:text-xs uppercase tracking-wider font-bold text-[#8fc0a9] truncate"
            >
              {state === 'captured' ? 'Review Specimen Frame' : 'Live Botanical Viewfinder'}
            </span>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {hasMultipleCameras && state === 'streaming' && (
              <button
                type="button"
                onClick={handleToggleFacingMode}
                className="w-10 h-10 rounded-lg text-[#a3b899] hover:text-[#f4fff4] hover:bg-[#1e3a24] transition-colors flex items-center justify-center"
                title="Switch Camera (Front / Rear)"
                aria-label="Switch Camera (Front / Rear)"
              >
                <span className="material-symbols-outlined text-[20px]">flip_camera_ios</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleClose}
              className="w-10 h-10 rounded-lg text-[#a3b899] hover:text-[#f4fff4] hover:bg-[#1e3a24] transition-colors flex items-center justify-center"
              title="Close Camera"
              aria-label="Close Camera"
            >
              <span className="material-symbols-outlined text-[22px]">close</span>
            </button>
          </div>
        </div>

        {/* Viewport Area */}
        <div className="relative aspect-[4/3] max-h-[48vh] sm:max-h-[60vh] w-full bg-black overflow-hidden flex items-center justify-center select-none">
          {/* Live Video Preview */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              state === 'streaming' ? 'opacity-100' : 'opacity-0 hidden'
            }`}
          />

          {/* Captured Still Preview */}
          {state === 'captured' && capturedPreview && (
            <img
              src={capturedPreview}
              alt="Captured Specimen"
              className="w-full h-full object-cover"
            />
          )}

          {/* Loading / Requesting Camera State */}
          {state === 'requesting' && (
            <div className="flex flex-col items-center justify-center gap-3 text-[#f4fff4] p-6 text-center">
              <span className="w-8 h-8 border-3 border-[#8fc0a9] border-t-transparent rounded-full animate-spin"></span>
              <p className="text-sm font-medium text-[#d0e0d4]">
                Initializing camera sensor & requesting browser permission...
              </p>
              <span className="text-xs text-[#a3b899]">
                Look for the browser permission prompt in your address bar
              </span>
            </div>
          )}

          {/* Error State */}
          {state === 'error' && (
            <div className="flex flex-col items-center justify-center gap-4 text-[#f4fff4] p-6 text-center max-w-md">
              <div className="w-14 h-14 rounded-full bg-red-950/80 border border-red-500/40 flex items-center justify-center text-red-400">
                <span className="material-symbols-outlined text-[32px]">no_photography</span>
              </div>

              <div className="space-y-1">
                <h4 className="text-base font-bold text-red-300">
                  {errorType === 'permission_denied'
                    ? 'Camera Permission Denied'
                    : errorType === 'no_device'
                    ? 'No Camera Detected'
                    : errorType === 'in_use'
                    ? 'Camera Currently In Use'
                    : errorType === 'insecure_context'
                    ? 'Insecure Context (Requires HTTPS)'
                    : 'Camera Unavailable'}
                </h4>
                <p className="text-xs text-[#d0e0d4] leading-relaxed">{errorMessage}</p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => startCamera(facingMode)}
                  className="px-4 py-2 rounded-lg bg-[#2e5936] text-[#f4fff4] text-xs font-semibold hover:bg-[#4a7c59] transition-colors border border-[#8fc0a9] flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">refresh</span>
                  <span>Try Again</span>
                </button>

                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 rounded-lg bg-[#182f1d] text-[#a3b899] text-xs font-semibold hover:text-[#f4fff4] transition-colors border border-[#2e5936]"
                >
                  Use Image Upload Instead
                </button>
              </div>
            </div>
          )}

          {/* Viewfinder Optical Loupe Grid / Crop Marks Overlay (when streaming) */}
          {state === 'streaming' && (
            <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between">
              {/* Top Corners */}
              <div className="flex justify-between">
                <div className="w-8 h-8 border-t-2 border-l-2 border-[#8fc0a9]/80 rounded-tl-sm"></div>
                <div className="w-8 h-8 border-t-2 border-r-2 border-[#8fc0a9]/80 rounded-tr-sm"></div>
              </div>

              {/* Center Crosshair Target */}
              <div className="self-center flex items-center justify-center opacity-40">
                <span className="material-symbols-outlined text-[#8fc0a9] text-[36px]">
                  filter_center_focus
                </span>
              </div>

              {/* Bottom Corners */}
              <div className="flex justify-between">
                <div className="w-8 h-8 border-b-2 border-l-2 border-[#8fc0a9]/80 rounded-bl-sm"></div>
                <div className="w-8 h-8 border-b-2 border-r-2 border-[#8fc0a9]/80 rounded-tr-sm"></div>
              </div>
            </div>
          )}

          {/* Hidden Canvas for Frame Capture */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Bottom Control Bar */}
        <div className="p-3 sm:p-5 bg-[#122316] border-t border-[#2e5936] flex flex-col gap-2.5 sm:gap-3">
          {state === 'streaming' && (
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleClose}
                className="px-3 sm:px-4 py-2 rounded-lg text-xs font-semibold text-[#a3b899] hover:text-[#f4fff4] hover:bg-[#1e3a24] transition-colors min-h-[44px] min-w-[60px] flex items-center justify-center"
              >
                Cancel
              </button>

              {/* Shutter Trigger Button (Concentric double ring) */}
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={handleCaptureFrame}
                  aria-label="Capture specimen photo"
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-4 border-[#8fc0a9] bg-transparent p-1 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform group shadow-lg"
                >
                  <div className="w-full h-full rounded-full bg-[#8fc0a9] group-hover:bg-[#a5d1b5] transition-colors flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#093421] text-[24px] sm:text-[26px]">
                      photo_camera
                    </span>
                  </div>
                </button>
                <span className="text-[11px] text-[#a3b899] mt-1 font-medium">Capture</span>
              </div>

              {/* Spacer / Facing Mode Toggle */}
              {hasMultipleCameras ? (
                <button
                  type="button"
                  onClick={handleToggleFacingMode}
                  className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold text-[#a3b899] hover:text-[#f4fff4] hover:bg-[#1e3a24] transition-colors flex items-center justify-center gap-1 min-h-[44px] min-w-[44px]"
                  title="Switch camera"
                >
                  <span className="material-symbols-outlined text-[18px]">cameraswitch</span>
                  <span className="hidden sm:inline">Flip</span>
                </button>
              ) : (
                <div className="w-14"></div>
              )}
            </div>
          )}

          {state === 'captured' && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={handleRetake}
                className="flex-1 py-3 px-4 rounded-xl bg-[#182f1d] border border-[#2e5936] text-[#f4fff4] text-xs sm:text-sm font-semibold hover:bg-[#23452a] transition-colors flex items-center justify-center gap-2 min-h-[44px]"
              >
                <span className="material-symbols-outlined text-[18px]">replay</span>
                <span>Retake Photo</span>
              </button>

              <button
                type="button"
                onClick={handleConfirm}
                className="flex-1 py-3 px-4 rounded-xl bg-[#8fc0a9] text-[#093421] text-xs sm:text-sm font-bold hover:bg-[#a5d1b5] transition-colors flex items-center justify-center gap-2 shadow-md min-h-[44px]"
              >
                <span className="material-symbols-outlined text-[18px]">check</span>
                <span>Use This Photo</span>
              </button>
            </div>
          )}

          {state === 'streaming' && (
            <p className="text-[11px] text-center text-[#747d74] leading-relaxed">
              Hold the camera steady in diffuse natural light. Avoid casting harsh shadows across the organism.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
