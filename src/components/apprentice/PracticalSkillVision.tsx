import React, { useState } from 'react';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Eye,
  Mic,
  ShieldAlert,
  ShieldCheck,
  Upload,
  Wrench,
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { AppImage } from '../ui/DesignPrimitives.tsx';
import { CameraPresenceMonitor, type InactivityReason } from '../camera/CameraPresenceMonitor.tsx';
import type { ApprenticeBundle } from './ApprenticeDashboard.tsx';
import type { PracticalSubmission } from '../../types.ts';

export const PracticalSkillVision: React.FC<{
  data: ApprenticeBundle;
  onRefresh: () => void;
  onOpenOral: (submissionId: string) => void;
}> = ({ data, onRefresh, onOpenOral }) => {
  const { apiFetch, addToast } = useApp();
  const [selectedTaskId, setSelectedTaskId] = useState(data.practicalTasks[0]?.id || '');
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string>(data.submissions[0]?.id || '');
  const [activeMarkerIdx, setActiveMarkerIdx] = useState(0);

  // Submission composer state
  const [captureSource, setCaptureSource] = useState<'demo' | 'upload' | 'camera'>('camera');
  const [notes, setNotes] = useState('Mounted 40A isolator, 30mA RCCB, and MCB bank; terminated copper busbars with ferrules and checked supply meter.');
  const [uploadedPreview, setUploadedPreview] = useState<{ base64: string; mime: string; name: string } | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraEnrolled, setCameraEnrolled] = useState(false);
  const [recordingSessionActive, setRecordingSessionActive] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [capturedSnap, setCapturedSnap] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [safetyConfirmed, setSafetyConfirmed] = useState(true);

  React.useEffect(() => {
    if (!recordingSessionActive) return;
    const t = window.setInterval(() => {
      setRecordingSeconds((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(t);
  }, [recordingSessionActive]);

  const handlePracticalCameraInactivity = (reason: InactivityReason) => {
    setRecordingSessionActive(false);
    setRecordingSeconds(0);
    setCapturedSnap(null);
    addToast({
      title: 'Workbench Session Restarted from 00:00',
      message:
        reason === 'no_person'
          ? 'No person detected in camera frame for 10s. Recording exited and reset to 00:00.'
          : 'No movement detected for 10s. Recording exited and reset to 00:00.',
      variant: 'warning',
    });
  };

  const selectedTask = data.practicalTasks.find((t) => t.id === selectedTaskId) || data.practicalTasks[0];
  const activeSubmission: PracticalSubmission | undefined =
    data.submissions.find((s) => s.id === selectedSubmissionId) || data.submissions[0];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const res = String(reader.result || '');
      const base64 = res.split(',')[1] || '';
      setUploadedPreview({
        base64,
        mime: file.type.startsWith('image/') ? file.type : 'image/jpeg',
        name: file.name,
      });
      setCaptureSource('upload');
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!selectedTask) return;
    if (!safetyConfirmed) {
      addToast({ title: 'Confirm Safety Guidelines', message: 'Check the PPE & isolation confirmation first.', variant: 'warning' });
      return;
    }

    setAnalyzing(true);
    try {
      let imageBase64: string | undefined;
      let imageMimeType: string | undefined;
      let mediaLabel = `${selectedTask.title} — Demo Workbench Evidence`;
      let mediaType: PracticalSubmission['mediaType'] = 'demo_capture';
      let useDemoWorkshopFrame = false;

      if (captureSource === 'camera') {
        if (!capturedSnap) {
          addToast({
            title: 'Capture Workbench Frame First',
            message: 'Click "Capture Frame" on the live camera feed, or switch to Demo Workshop Capture.',
            variant: 'warning',
          });
          setAnalyzing(false);
          return;
        }
        imageBase64 = capturedSnap.split(',')[1];
        imageMimeType = 'image/jpeg';
        mediaLabel = `Live Camera Workbench Capture (${new Date().toLocaleTimeString()})`;
        mediaType = 'webcam_recording';
      } else if (captureSource === 'upload' && uploadedPreview) {
        imageBase64 = uploadedPreview.base64;
        imageMimeType = uploadedPreview.mime;
        mediaLabel = uploadedPreview.name;
        mediaType = 'uploaded_video';
      } else {
        useDemoWorkshopFrame = true;
      }

      const res = await apiFetch<{ submission: PracticalSubmission }>('/api/practical/analyze', {
        method: 'POST',
        body: JSON.stringify({
          taskId: selectedTask.id,
          mediaLabel,
          mediaType,
          durationSeconds: 112,
          notes,
          challengeCode: `IQ-CHK-${Math.floor(100 + Math.random() * 899)}`,
          imageBase64,
          imageMimeType,
          useDemoWorkshopFrame,
        }),
      });

      setSelectedSubmissionId(res.submission.id);
      setActiveMarkerIdx(0);
      addToast({
        title: 'AI Skill Vision Analysis Complete',
        message: 'Preliminary observations generated. Proceed to Adaptive Oral Exam.',
        variant: 'success',
      });
      onRefresh();
    } catch (err) {
      addToast({
        title: 'Skill Vision Analysis Failed',
        message: err instanceof Error ? err.message : 'Unable to analyze evidence',
        variant: 'error',
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const markers = activeSubmission?.aiAnalysis.timelineMarkers || [];
  const activeMarker = markers[activeMarkerIdx];

  return (
    <div className="space-y-6">
      {/* Task & Evidence Submission Composer */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1628] p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-[#0284C7] dark:text-[#39D9FF]">Signature Capability · Practical Intelligence</p>
            <h2 className="mt-1 font-display text-xl font-bold">AI Practical Skill Vision Workspace</h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#080D19] px-3 py-2 text-xs font-semibold max-w-sm"
            >
              {data.practicalTasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedTask && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 border-t border-slate-200 dark:border-slate-800 pt-5">
            <div className="lg:col-span-5 space-y-3 text-xs">
              <p className="font-semibold text-sm">{selectedTask.title}</p>
              <p className="text-slate-600 dark:text-[#96A4BA]">{selectedTask.description}</p>
              <div>
                <p className="font-semibold text-slate-900 dark:text-[#F4F7FC] mb-1">Required Tools</p>
                <p className="text-slate-600 dark:text-[#96A4BA]">{selectedTask.requiredTools.join(' · ')}</p>
              </div>
              <div>
                <p className="font-semibold text-amber-600 dark:text-amber-400 mb-1">Safety Guidelines</p>
                <ul className="space-y-1 text-slate-600 dark:text-[#96A4BA]">
                  {selectedTask.safetyGuidelines.map((sg, i) => (
                    <li key={i}>• {sg}</li>
                  ))}
                </ul>
              </div>
              <label className="flex items-center gap-2 pt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={safetyConfirmed}
                  onChange={(e) => setSafetyConfirmed(e.target.checked)}
                  className="rounded border-slate-400"
                />
                <span className="font-medium">I confirm PPE and safe isolation procedures were followed.</span>
              </label>
            </div>

            <div className="lg:col-span-7 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRecordingSessionActive(false);
                    setCaptureSource('camera');
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                    captureSource === 'camera'
                      ? 'border-[#0284C7] dark:border-[#39D9FF] bg-[#0284C7]/10 text-[#0284C7] dark:text-[#39D9FF]'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <Camera className="h-3.5 w-3.5" />
                  <span>Live Camera Phase</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRecordingSessionActive(false);
                    setCaptureSource('demo');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                    captureSource === 'demo'
                      ? 'border-[#0284C7] dark:border-[#39D9FF] bg-[#0284C7]/10 text-[#0284C7] dark:text-[#39D9FF]'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  Demo Workshop Capture
                </button>
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-[#131F35] cursor-pointer">
                  <Upload className="h-3.5 w-3.5" />
                  <span>Upload Workbench Photo</span>
                  <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </label>
              </div>

              {captureSource === 'camera' && (
                <div className="space-y-3">
                  <CameraPresenceMonitor
                    activeMonitoring={recordingSessionActive}
                    inactivityLimitSeconds={10}
                    autoStart={true}
                    title="Workbench Camera Presence & Motion Guard"
                    onCameraStateChange={setCameraReady}
                    onEnrollmentChange={(enrolled) => setCameraEnrolled(enrolled)}
                    onCaptureFrame={(dataUrl) => {
                      setCapturedSnap(dataUrl);
                      setRecordingSessionActive(false);
                      addToast({ title: 'Workbench Frame Captured', variant: 'success' });
                    }}
                    onInactivityTrigger={handlePracticalCameraInactivity}
                  />

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <button
                      type="button"
                      disabled={!cameraReady || !cameraEnrolled}
                      onClick={() => {
                        if (recordingSessionActive) {
                          setRecordingSessionActive(false);
                        } else {
                          setRecordingSeconds(0);
                          setRecordingSessionActive(true);
                        }
                      }}
                      className={`px-3.5 py-1.5 rounded-lg font-semibold cursor-pointer disabled:opacity-40 ${
                        recordingSessionActive
                          ? 'bg-rose-600 text-white'
                          : 'bg-[#537CFF] text-white'
                      }`}
                    >
                      {recordingSessionActive
                        ? `Monitoring Demonstration (00:${String(recordingSeconds).padStart(2, '0')}) — Click to Stop`
                        : 'Start Timed Camera Demonstration'}
                    </button>

                    {cameraReady && !cameraEnrolled && !capturedSnap && (
                      <span className="text-amber-600 dark:text-amber-400 font-medium">
                        Face camera to capture reference photo before starting demonstration
                      </span>
                    )}

                    {capturedSnap && (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        Captured frame ready for Gemini Skill Vision
                      </span>
                    )}
                  </div>
                </div>
              )}

              {captureSource === 'upload' && uploadedPreview && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  Loaded evidence image: {uploadedPreview.name}
                </p>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-[#96A4BA] mb-1">
                  Bench Work Notes & Challenge Context
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#080D19] p-2.5 text-xs"
                />
              </div>

              <button
                type="button"
                disabled={analyzing}
                onClick={handleAnalyze}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0284C7] dark:bg-[#39D9FF] text-white dark:text-[#080D19] text-xs font-semibold hover:opacity-90 disabled:opacity-50 cursor-pointer"
              >
                <Eye className="h-4 w-4" />
                <span>{analyzing ? 'Running Gemini Practical Vision...' : 'Submit & Run AI Skill Vision'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Split-Screen Inspection Workspace */}
      {activeSubmission && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-slate-500 dark:text-[#96A4BA]">Evidence History:</span>
              {data.submissions.map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => {
                    setSelectedSubmissionId(sub.id);
                    setActiveMarkerIdx(0);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                    activeSubmission.id === sub.id
                      ? 'border-[#0284C7] dark:border-[#39D9FF] bg-[#0284C7]/10 text-[#0284C7] dark:text-[#39D9FF]'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {sub.competencyCode} · {sub.status.replace('_', ' ')}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => onOpenOral(activeSubmission.id)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#537CFF] text-white text-xs font-semibold hover:opacity-90 cursor-pointer"
            >
              <Mic className="h-3.5 w-3.5" />
              <span>
                {activeSubmission.oralExam.status === 'completed'
                  ? `Review Oral Exam (${activeSubmission.oralExam.overallScore}%)`
                  : 'Start Adaptive Oral Exam'}
              </span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Video / Frame Stage & Evidence Timestamps */}
            <div className="lg:col-span-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1628] overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="font-semibold truncate">{activeSubmission.mediaLabel}</span>
                {activeSubmission.isDemoSample && (
                  <span className="font-mono-tech text-[#0284C7] dark:text-[#39D9FF] shrink-0">Demo Sample</span>
                )}
              </div>

              <div className="relative aspect-[4/3] bg-[#080D19]">
                <AppImage
                  src="/src/assets/images/vision_switchgear_bench_1795499741948.jpg"
                  alt={activeSubmission.taskTitle}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#080D19]/90 via-transparent to-transparent" />
                {activeMarker && (
                  <div className="absolute bottom-4 left-4 right-4 rounded-xl border border-white/15 bg-[#080D19]/85 backdrop-blur p-3.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono-tech text-[#39D9FF]">
                        00:{String(activeMarker.timestampSeconds).padStart(2, '0')} · {activeMarker.label}
                      </span>
                      <span
                        className={
                          activeMarker.confidence === 'insufficient_evidence'
                            ? 'text-amber-400 font-semibold'
                            : 'text-emerald-400 font-semibold'
                        }
                      >
                        {activeMarker.confidence === 'insufficient_evidence' ? 'Insufficient Evidence' : 'High Confidence'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#F4F7FC]">{activeMarker.observation}</p>
                  </div>
                )}
              </div>

              <div className="p-4 space-y-2">
                <p className="text-xs font-semibold text-slate-500 dark:text-[#96A4BA]">Evidence Timeline Markers</p>
                <div className="space-y-1.5">
                  {markers.map((m, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveMarkerIdx(idx)}
                      className={`w-full text-left rounded-lg border px-3 py-2 text-xs flex items-center justify-between gap-2 cursor-pointer ${
                        activeMarkerIdx === idx
                          ? 'border-[#0284C7] dark:border-[#39D9FF] bg-[#0284C7]/5 dark:bg-[#131F35]'
                          : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <span className="truncate">
                        <span className="font-mono-tech text-[#0284C7] dark:text-[#39D9FF] mr-2">
                          {Math.floor(m.timestampSeconds / 60)}:{String(m.timestampSeconds % 60).padStart(2, '0')}
                        </span>
                        {m.label}
                      </span>
                      <span
                        className={`shrink-0 font-semibold ${
                          m.confidence === 'insufficient_evidence' ? 'text-amber-500' : 'text-emerald-500'
                        }`}
                      >
                        {m.confidence === 'insufficient_evidence' ? 'Review Needed' : 'Observed'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Preliminary AI Observations, Rubric & Integrity Radar */}
            <div className="lg:col-span-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1628] p-6 space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono-tech text-xs text-[#0284C7] dark:text-[#39D9FF]">
                    {activeSubmission.competencyCode} · {activeSubmission.aiAnalysis.model || 'gemini-4-hydrogen'}
                  </p>
                  <h3 className="mt-1 font-display text-lg font-bold">Preliminary Skill Vision Report</h3>
                </div>
                <div className="text-right">
                  <p className="font-display text-2xl font-extrabold tabular-nums text-[#0284C7] dark:text-[#39D9FF]">
                    {activeSubmission.aiAnalysis.overallPreliminaryScore}%
                  </p>
                  <p className="text-[11px] text-slate-500">Preliminary Only</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-[#96A4BA] leading-relaxed">
                {activeSubmission.aiAnalysis.summary}
              </p>

              {/* Detected Tools & Safety */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="rounded-xl bg-slate-50 dark:bg-[#131F35] p-3.5">
                  <p className="font-semibold flex items-center gap-1.5 mb-2">
                    <Wrench className="h-3.5 w-3.5 text-[#0284C7] dark:text-[#39D9FF]" />
                    <span>Detected Tools</span>
                  </p>
                  <ul className="space-y-1 text-slate-600 dark:text-[#96A4BA]">
                    {activeSubmission.aiAnalysis.detectedTools.map((tool, i) => (
                      <li key={i}>• {tool}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl bg-slate-50 dark:bg-[#131F35] p-3.5">
                  <p className="font-semibold flex items-center gap-1.5 mb-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Safety Observations</span>
                  </p>
                  <ul className="space-y-1 text-slate-600 dark:text-[#96A4BA]">
                    {activeSubmission.aiAnalysis.safetyObservations.map((obs, i) => (
                      <li key={i}>• {obs}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Rubric Matrix */}
              <div className="space-y-2 text-xs">
                <p className="font-semibold">Rubric Assessment</p>
                {activeSubmission.aiAnalysis.rubricResults.map((r, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 flex items-start justify-between gap-3"
                  >
                    <div>
                      <p className="font-semibold">{r.criterion}</p>
                      <p className="text-slate-500 dark:text-[#96A4BA] mt-0.5">{r.notes}</p>
                    </div>
                    <span
                      className={`shrink-0 font-semibold ${
                        r.status === 'observed'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : r.status === 'partial'
                          ? 'text-[#0284C7] dark:text-[#39D9FF]'
                          : 'text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {r.status === 'insufficient_evidence'
                        ? 'Insufficient Evidence'
                        : r.status === 'partial'
                        ? 'Partial'
                        : 'Observed'}
                    </span>
                  </div>
                ))}
              </div>

              {/* Missing Evidence */}
              {activeSubmission.aiAnalysis.missingEvidence.length > 0 && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs space-y-1">
                  <p className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>Requires Assessor Review</span>
                  </p>
                  {activeSubmission.aiAnalysis.missingEvidence.map((me, i) => (
                    <p key={i} className="text-slate-700 dark:text-amber-200">
                      • {me}
                    </p>
                  ))}
                </div>
              )}

              {/* Integrity Radar Summary */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 text-xs flex items-start gap-2.5">
                {activeSubmission.integrityCheck.riskLevel === 'low' ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-semibold">
                    Integrity Radar · {activeSubmission.integrityCheck.riskLevel.toUpperCase()} Risk ·{' '}
                    <span className="font-mono-tech">{activeSubmission.integrityCheck.fileHash.slice(0, 22)}...</span>
                  </p>
                  <p className="text-slate-600 dark:text-[#96A4BA] mt-0.5">{activeSubmission.integrityCheck.notes}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
