import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FaceDetector, FilesetResolver, type Detection } from '@mediapipe/tasks-vision';
import {
  Activity,
  AlertTriangle,
  Camera,
  CameraOff,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  UserX,
} from 'lucide-react';

export type InactivityReason = 'no_person' | 'no_movement' | 'camera_lost';

export interface CapturedMoment {
  id: string;
  timestampLabel: string;
  kind: 'enrolled' | 'movement' | 'manual' | 'alert';
  dataUrl: string;
  matchScore: number;
  motionPct: number;
}

interface CameraPresenceMonitorProps {
  activeMonitoring: boolean;
  inactivityLimitSeconds?: number;
  autoStart?: boolean;
  title?: string;
  onCameraStateChange?: (ready: boolean) => void;
  onEnrollmentChange?: (enrolled: boolean, photoDataUrl?: string) => void;
  onCaptureFrame?: (dataUrl: string) => void;
  onInactivityTrigger?: (reason: InactivityReason) => void;
  videoRefExternal?: React.RefObject<HTMLVideoElement | null>;
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function extractFaceFeatureVector(
  videoEl: HTMLVideoElement,
  detection: Detection,
  scratchCanvas: HTMLCanvasElement,
): number[] | null {
  const box = detection.boundingBox;
  const kp = detection.keypoints;
  if (!box || box.width < 24 || box.height < 24 || !kp || kp.length < 4) return null;

  // 1. Scale-invariant geometric ratios from MediaPipe 6 facial keypoints
  const rightEye = kp[0];
  const leftEye = kp[1];
  const nose = kp[2];
  const mouth = kp[3];
  const eyeDist = Math.max(0.01, Math.hypot(leftEye.x - rightEye.x, leftEye.y - rightEye.y));

  const geomFeatures = [
    (nose.x - (leftEye.x + rightEye.x) / 2) / eyeDist,
    (nose.y - (leftEye.y + rightEye.y) / 2) / eyeDist,
    (mouth.y - nose.y) / eyeDist,
    (mouth.y - (leftEye.y + rightEye.y) / 2) / eyeDist,
    box.width / Math.max(1, box.height),
    (leftEye.y - rightEye.y) / eyeDist,
  ];

  // 2. 4x4 normalized luminance patch inside the face bounding box
  scratchCanvas.width = 4;
  scratchCanvas.height = 4;
  const ctx = scratchCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  const sx = Math.max(0, box.originX);
  const sy = Math.max(0, box.originY);
  const sw = Math.min(videoEl.videoWidth - sx, box.width);
  const sh = Math.min(videoEl.videoHeight - sy, box.height);
  if (sw <= 4 || sh <= 4) return null;

  ctx.drawImage(videoEl, sx, sy, sw, sh, 0, 0, 4, 4);
  const data = ctx.getImageData(0, 0, 4, 4).data;
  const lumas: number[] = [];
  let sum = 0;
  for (let i = 0; i < data.length; i += 4) {
    const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    lumas.push(l);
    sum += l;
  }
  const mean = sum / 16;
  const normPatch = lumas.map((v) => (v - mean) / 64);

  return [...geomFeatures, ...normPatch];
}

export const CameraPresenceMonitor: React.FC<CameraPresenceMonitorProps> = ({
  activeMonitoring,
  inactivityLimitSeconds = 10,
  autoStart = false,
  title = 'Learner Camera Presence',
  onCameraStateChange,
  onEnrollmentChange,
  onCaptureFrame,
  onInactivityTrigger,
  videoRefExternal,
}) => {
  const internalVideoRef = useRef<HTMLVideoElement | null>(null);
  const videoRef = videoRefExternal || internalVideoRef;
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const analysisCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const featureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const prevFrameRef = useRef<Uint8ClampedArray | null>(null);
  const detectorRef = useRef<FaceDetector | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastFaceCenterRef = useRef<{ x: number; y: number } | null>(null);
  const idleAccumulatorRef = useRef<number>(0);
  const stablePersonFramesRef = useRef<number>(0);
  const lastMomentCapturedAtRef = useRef<number>(0);
  const enrolledDescriptorRef = useRef<number[] | null>(null);
  const triggeredRef = useRef<boolean>(false);
  const matchScoreRef = useRef<number>(0);
  const onInactivityRef = useRef(onInactivityTrigger);
  const onEnrollmentRef = useRef(onEnrollmentChange);
  const onCameraStateRef = useRef(onCameraStateChange);

  useEffect(() => {
    onInactivityRef.current = onInactivityTrigger;
  }, [onInactivityTrigger]);

  useEffect(() => {
    onEnrollmentRef.current = onEnrollmentChange;
  }, [onEnrollmentChange]);

  useEffect(() => {
    onCameraStateRef.current = onCameraStateChange;
  }, [onCameraStateChange]);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string>('');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [modelReady, setModelReady] = useState<boolean>(false);
  const [engineLabel, setEngineLabel] = useState<string>('Loading Local Face Model...');
  const [personPresent, setPersonPresent] = useState<boolean>(false);
  const [motionPct, setMotionPct] = useState<number>(0);
  const [matchScore, setMatchScore] = useState<number>(0);
  const [enrolledPhoto, setEnrolledPhoto] = useState<string | null>(null);
  const [moments, setMoments] = useState<CapturedMoment[]>([]);
  const [idleSeconds, setIdleSeconds] = useState<number>(0);
  const [lastAlert, setLastAlert] = useState<string>('');

  // Load local MediaPipe FaceDetector strictly for human face/person detection
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks('/mediapipe/wasm');
        const detector = await FaceDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: '/mediapipe/models/blaze_face_short_range.tflite',
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          minDetectionConfidence: 0.65,
          minSuppressionThreshold: 0.3,
        });
        if (!cancelled) {
          detectorRef.current = detector;
          setModelReady(true);
          setEngineLabel('Person-Only Tracker Ready');
        } else {
          detector.close();
        }
      } catch {
        if (!cancelled) {
          setModelReady(false);
          setEngineLabel('Face Model Unavailable');
          setCameraError('Unable to initialize local person-detection model.');
        }
      }
    })();

    return () => {
      cancelled = true;
      detectorRef.current?.close();
      detectorRef.current = null;
    };
  }, []);

  const captureThumbnail = useCallback((videoEl: HTMLVideoElement): string | null => {
    if (!videoEl || videoEl.videoWidth === 0) return null;
    const c = document.createElement('canvas');
    c.width = 240;
    c.height = Math.round((240 * videoEl.videoHeight) / Math.max(1, videoEl.videoWidth));
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(videoEl, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.8);
  }, []);

  const addMoment = useCallback(
    (videoEl: HTMLVideoElement, kind: CapturedMoment['kind'], score: number, motion: number) => {
      const thumb = captureThumbnail(videoEl);
      if (!thumb) return;
      const now = new Date();
      const label = `${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      setMoments((prev) => [
        {
          id: `mom_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
          timestampLabel: label,
          kind,
          dataUrl: thumb,
          matchScore: score,
          motionPct: motion,
        },
        ...prev.slice(0, 5),
      ]);
    },
    [captureThumbnail],
  );

  const resetEnrollment = useCallback(() => {
    enrolledDescriptorRef.current = null;
    stablePersonFramesRef.current = 0;
    matchScoreRef.current = 0;
    setEnrolledPhoto(null);
    setMatchScore(0);
    onEnrollmentRef.current?.(false);
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setStream(null);
    setPersonPresent(false);
    setMotionPct(0);
    setIdleSeconds(0);
    idleAccumulatorRef.current = 0;
    prevFrameRef.current = null;
    resetEnrollment();
    onCameraStateRef.current?.(false);
  }, [resetEnrollment]);

  const startCamera = useCallback(
    async (deviceIdOverride?: string) => {
      setCameraError('');
      setLastAlert('');
      triggeredRef.current = false;
      idleAccumulatorRef.current = 0;
      setIdleSeconds(0);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Browser MediaDevices API unavailable. Ensure HTTPS or localhost.');
        onCameraStateRef.current?.(false);
        return;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      const targetId = deviceIdOverride ?? selectedDeviceId;
      const primaryConstraints: MediaStreamConstraints = {
        video: targetId
          ? { deviceId: { exact: targetId }, width: { ideal: 640 }, height: { ideal: 480 } }
          : { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      };

      try {
        let acquired: MediaStream;
        try {
          acquired = await navigator.mediaDevices.getUserMedia(primaryConstraints);
        } catch {
          acquired = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }

        streamRef.current = acquired;
        setStream(acquired);
        onCameraStateRef.current?.(true);

        const allDevices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
        const videoInputs = allDevices.filter((d) => d.kind === 'videoinput');
        setDevices(videoInputs);
        const activeTrack = acquired.getVideoTracks()[0];
        const activeId = activeTrack?.getSettings().deviceId;
        if (activeId) setSelectedDeviceId(activeId);
      } catch (err) {
        const name = err instanceof DOMException ? err.name : '';
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          setCameraError('Camera permission denied. Allow camera access in your browser and retry.');
        } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
          setCameraError('No webcam device detected on this machine.');
        } else if (name === 'NotReadableError') {
          setCameraError('Camera is currently in use by another application.');
        } else {
          setCameraError(err instanceof Error ? err.message : 'Unable to start camera feed.');
        }
        onCameraStateRef.current?.(false);
      }
    },
    [selectedDeviceId],
  );

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    if (stream) {
      videoEl.srcObject = stream;
      videoEl.play().catch(() => undefined);
    } else {
      videoEl.srcObject = null;
    }
  }, [stream, videoRef]);

  useEffect(() => {
    if (autoStart) {
      startCamera();
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [autoStart]);

  // Real-time person-only tracking, enrollment photo training, & moment capture loop
  useEffect(() => {
    if (!stream || !modelReady) return;

    if (!analysisCanvasRef.current) {
      const c = document.createElement('canvas');
      c.width = 96;
      c.height = 72;
      analysisCanvasRef.current = c;
    }
    if (!featureCanvasRef.current) {
      featureCanvasRef.current = document.createElement('canvas');
    }

    const intervalMs = 350;
    const timer = window.setInterval(() => {
      const videoEl = videoRef.current;
      const track = stream.getVideoTracks()[0];

      if (!track || track.readyState !== 'live' || track.muted) {
        setPersonPresent(false);
        setMotionPct(0);
        if (activeMonitoring) {
          idleAccumulatorRef.current += intervalMs / 1000;
          setIdleSeconds(Math.floor(idleAccumulatorRef.current));
          if (idleAccumulatorRef.current >= inactivityLimitSeconds && !triggeredRef.current) {
            triggeredRef.current = true;
            setLastAlert('Camera video feed lost — session exited and restarted from 00:00.');
            onInactivityRef.current?.('camera_lost');
          }
        }
        return;
      }

      if (!videoEl || videoEl.readyState < 2 || videoEl.videoWidth === 0) return;

      // 1. Pixel movement computation
      const canvas = analysisCanvasRef.current!;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
      const frame = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const pixelCount = canvas.width * canvas.height;
      let changedPixels = 0;
      const prev = prevFrameRef.current;

      if (prev) {
        for (let i = 0; i < frame.length; i += 4) {
          const dR = Math.abs(frame[i] - prev[i]);
          const dG = Math.abs(frame[i + 1] - prev[i + 1]);
          const dB = Math.abs(frame[i + 2] - prev[i + 2]);
          if (dR + dG + dB > 42) changedPixels += 1;
        }
      }
      prevFrameRef.current = new Uint8ClampedArray(frame);
      const motion = Number(((changedPixels / pixelCount) * 100).toFixed(1));
      setMotionPct(motion);

      // 2. Strict Human-Only Detection via local MediaPipe FaceDetector (rejects lamps, sun/moon, walls)
      let validHumanFace = false;
      let faceMoved = false;
      let currentSim = 0;

      const overlay = overlayCanvasRef.current;
      if (overlay) {
        overlay.width = videoEl.videoWidth;
        overlay.height = videoEl.videoHeight;
        const octx = overlay.getContext('2d');
        octx?.clearRect(0, 0, overlay.width, overlay.height);

        if (detectorRef.current) {
          try {
            const result = detectorRef.current.detectForVideo(videoEl, performance.now());
            const det = result.detections[0];
            const score = det?.categories?.[0]?.score ?? 0;
            const box = det?.boundingBox;
            const aspect = box ? box.width / Math.max(1, box.height) : 0;

            if (
              det &&
              score >= 0.65 &&
              box &&
              aspect >= 0.5 &&
              aspect <= 1.7 &&
              det.keypoints &&
              det.keypoints.length >= 4
            ) {
              const descriptor = extractFaceFeatureVector(videoEl, det, featureCanvasRef.current!);
              if (descriptor) {
                validHumanFace = true;

                // Draw clean tracking reticle & facial anchor points
                if (octx) {
                  octx.strokeStyle = enrolledDescriptorRef.current ? '#10B981' : '#39D9FF';
                  octx.lineWidth = 2;
                  octx.strokeRect(box.originX, box.originY, box.width, box.height);
                  octx.fillStyle = '#39D9FF';
                  det.keypoints.slice(0, 4).forEach((k) => {
                    octx.beginPath();
                    octx.arc(k.x * overlay.width, k.y * overlay.height, 2.5, 0, Math.PI * 2);
                    octx.fill();
                  });
                }

                // Face center movement delta
                const cx = (box.originX + box.width / 2) / overlay.width;
                const cy = (box.originY + box.height / 2) / overlay.height;
                if (lastFaceCenterRef.current) {
                  const dist = Math.hypot(cx - lastFaceCenterRef.current.x, cy - lastFaceCenterRef.current.y);
                  if (dist > 0.01) faceMoved = true;
                }
                lastFaceCenterRef.current = { x: cx, y: cy };

                // Auto-Enrollment ("camera first takes a photo and trains efficiently")
                if (!enrolledDescriptorRef.current) {
                  stablePersonFramesRef.current += 1;
                  if (stablePersonFramesRef.current >= 4) {
                    enrolledDescriptorRef.current = descriptor;
                    const photoUrl = captureThumbnail(videoEl);
                    if (photoUrl) {
                      setEnrolledPhoto(photoUrl);
                      onEnrollmentRef.current?.(true, photoUrl);
                      addMoment(videoEl, 'enrolled', 100, motion);
                      lastMomentCapturedAtRef.current = Date.now();
                    }
                    matchScoreRef.current = 100;
                    setMatchScore(100);
                    currentSim = 100;
                  }
                } else {
                  const rawSim = cosineSimilarity(enrolledDescriptorRef.current, descriptor);
                  currentSim = Math.max(0, Math.min(100, Math.round(((rawSim + 0.2) / 1.2) * 100)));
                  matchScoreRef.current = currentSim;
                  setMatchScore(currentSim);
                }
              }
            } else {
              stablePersonFramesRef.current = 0;
              matchScoreRef.current = 0;
              setMatchScore(0);
            }
          } catch {
            validHumanFace = false;
          }
        }
      }

      setPersonPresent(validHumanFace);

      // Capture moments on active movement intervals once enrolled
      const nowMs = Date.now();
      if (
        validHumanFace &&
        enrolledDescriptorRef.current &&
        (motion >= 3.5 || faceMoved) &&
        nowMs - lastMomentCapturedAtRef.current > 8000
      ) {
        addMoment(videoEl, 'movement', currentSim || matchScoreRef.current, motion);
        lastMomentCapturedAtRef.current = nowMs;
      }

      const detectedMovement = motion >= 0.55 || faceMoved;

      if (activeMonitoring) {
        if (!validHumanFace || !detectedMovement) {
          idleAccumulatorRef.current += intervalMs / 1000;
          const elapsed = Math.floor(idleAccumulatorRef.current);
          setIdleSeconds(elapsed);

          if (idleAccumulatorRef.current >= inactivityLimitSeconds && !triggeredRef.current) {
            triggeredRef.current = true;
            const reason: InactivityReason = !validHumanFace ? 'no_person' : 'no_movement';
            addMoment(videoEl, 'alert', currentSim, motion);
            setLastAlert(
              reason === 'no_person'
                ? 'No human person detected on camera (non-person objects ignored) — session exited and restarted from 00:00.'
                : 'No movement detected on camera — session exited and restarted from 00:00.',
            );
            onInactivityRef.current?.(reason);
          }
        } else {
          idleAccumulatorRef.current = 0;
          triggeredRef.current = false;
          setIdleSeconds(0);
        }
      } else {
        idleAccumulatorRef.current = 0;
        triggeredRef.current = false;
        setIdleSeconds(0);
      }
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [
    stream,
    modelReady,
    activeMonitoring,
    inactivityLimitSeconds,
    addMoment,
    captureThumbnail,
    videoRef,
  ]);

  const handleManualSnapshot = () => {
    const videoEl = videoRef.current;
    if (!videoEl || !stream) return;
    if (!personPresent) {
      setLastAlert('Cannot capture learner snapshot: no human person detected in frame.');
      return;
    }
    const c = document.createElement('canvas');
    c.width = videoEl.videoWidth || 640;
    c.height = videoEl.videoHeight || 480;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoEl, 0, 0, c.width, c.height);
    const dataUrl = c.toDataURL('image/jpeg', 0.88);
    addMoment(videoEl, 'manual', matchScore, motionPct);
    onCaptureFrame?.(dataUrl);
  };

  const countdownRemaining = Math.max(0, inactivityLimitSeconds - idleSeconds);

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D19] overflow-hidden">
      <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <Camera className={`h-3.5 w-3.5 ${stream ? 'text-emerald-500' : 'text-slate-400'}`} />
          <span className="font-semibold">{title}</span>
          <span className="font-mono-tech text-[11px] text-slate-500 dark:text-[#96A4BA]">· {engineLabel}</span>
        </div>

        <div className="flex items-center gap-2">
          {devices.length > 1 && (
            <select
              value={selectedDeviceId}
              onChange={(e) => {
                setSelectedDeviceId(e.target.value);
                startCamera(e.target.value);
              }}
              className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0E1628] px-2 py-1 text-[11px]"
            >
              {devices.map((d, idx) => (
                <option key={d.deviceId || idx} value={d.deviceId}>
                  {d.label || `Camera ${idx + 1}`}
                </option>
              ))}
            </select>
          )}

          {stream ? (
            <button
              type="button"
              onClick={stopCamera}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-rose-500/15 text-rose-500 font-semibold hover:bg-rose-500/25 cursor-pointer"
            >
              <CameraOff className="h-3 w-3" />
              <span>Stop Camera</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => startCamera()}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#0284C7] dark:bg-[#39D9FF] text-white dark:text-[#080D19] font-semibold cursor-pointer"
            >
              <Camera className="h-3 w-3" />
              <span>Enable Camera</span>
            </button>
          )}
        </div>
      </div>

      {/* Live Video Stage */}
      <div className="relative aspect-[16/10] bg-[#04070E] flex items-center justify-center overflow-hidden">
        {stream ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              onLoadedMetadata={() => videoRef.current?.play().catch(() => undefined)}
              className="w-full h-full object-cover"
            />
            <canvas
              ref={overlayCanvasRef}
              className="pointer-events-none absolute inset-0 w-full h-full object-cover"
            />

            {/* Enrollment photo status badge inside stage */}
            {!enrolledPhoto && (
              <div className="absolute top-3 left-3 right-3 rounded-lg border border-[#39D9FF]/40 bg-[#080D19]/85 px-3 py-2 text-xs text-[#F4F7FC] flex items-center justify-between">
                <span>
                  {personPresent
                    ? 'Human face locked — capturing enrollment photo & training tracker...'
                    : 'Position your face in frame. Non-person objects (lights, walls, scenery) are ignored.'}
                </span>
              </div>
            )}

            {activeMonitoring && idleSeconds >= 2 && (
              <div className="absolute inset-x-3 bottom-3 rounded-lg border border-amber-500/50 bg-[#080D19]/90 px-3 py-2 text-xs text-amber-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-semibold">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  {!personPresent ? 'No human person detected in frame' : 'No movement detected'}
                </span>
                <span className="font-mono-tech font-bold">Restart in {countdownRemaining}s</span>
              </div>
            )}
          </>
        ) : (
          <div className="p-6 text-center space-y-2.5">
            <Camera className="h-8 w-8 text-slate-500 mx-auto" />
            <p className="text-xs font-medium text-slate-400">
              {cameraError || 'Camera preview is paused. Enable camera to capture your enrollment photo and start tracking.'}
            </p>
            <button
              type="button"
              onClick={() => startCamera()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#39D9FF] text-[#080D19] text-xs font-semibold cursor-pointer"
            >
              <RefreshCw className="h-3 w-3" />
              <span>{cameraError ? 'Retry Camera Access' : 'Start Camera Feed'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Live Presence, Enrollment & Motion Readout */}
      <div className="px-4 py-2.5 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`inline-flex items-center gap-1 font-semibold ${
              personPresent ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
            }`}
          >
            {personPresent ? <UserCheck className="h-3.5 w-3.5" /> : <UserX className="h-3.5 w-3.5" />}
            <span>{personPresent ? 'Person Locked' : 'No Person'}</span>
          </span>
          <span className="text-slate-400">·</span>
          <span className="inline-flex items-center gap-1 font-mono-tech text-slate-600 dark:text-[#96A4BA]">
            <Activity className="h-3.5 w-3.5 text-[#0284C7] dark:text-[#39D9FF]" />
            Motion: {motionPct}%
          </span>
          {enrolledPhoto && (
            <>
              <span className="text-slate-400">·</span>
              <span className="inline-flex items-center gap-1 font-mono-tech text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="h-3.5 w-3.5" />
                Trained Match: {matchScore}%
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {enrolledPhoto && (
            <button
              type="button"
              onClick={resetEnrollment}
              className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-[#96A4BA] hover:text-white cursor-pointer"
            >
              Retake Photo
            </button>
          )}
          {onCaptureFrame && stream && (
            <button
              type="button"
              onClick={handleManualSnapshot}
              className="px-2.5 py-1 rounded bg-emerald-600 text-white font-semibold hover:bg-emerald-500 cursor-pointer"
            >
              Capture Frame
            </button>
          )}
        </div>
      </div>

      {/* Enrollment Reference Photo + Captured Moments Filmstrip */}
      {(enrolledPhoto || moments.length > 0) && (
        <div className="px-4 py-2.5 border-t border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-[#0E1628]/70 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-slate-700 dark:text-[#F4F7FC] flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              Reference Photo & Captured Moments ({moments.length})
            </span>
            <span className="text-slate-500 dark:text-[#96A4BA]">On-device tracker trained</span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {moments.map((m) => (
              <div
                key={m.id}
                className="shrink-0 w-20 rounded-md overflow-hidden border border-slate-200 dark:border-slate-700 bg-[#080D19]"
              >
                <img src={m.dataUrl} alt={`Moment ${m.kind}`} className="w-full h-12 object-cover" />
                <div className="px-1.5 py-1 text-[9px] font-mono-tech text-[#96A4BA] flex items-center justify-between">
                  <span className="capitalize text-[#F4F7FC]">{m.kind}</span>
                  <span>{m.timestampLabel}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {lastAlert && (
        <div className="px-4 py-2 bg-rose-500/10 border-t border-rose-500/30 text-[11px] font-medium text-rose-600 dark:text-rose-400">
          {lastAlert}
        </div>
      )}
    </div>
  );
};
