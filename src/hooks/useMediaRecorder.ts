'use client';

import { useRef, useState, useCallback } from 'react';
import api from '@/lib/api';

export type MicPermission = 'idle' | 'requesting' | 'granted' | 'denied';

interface UseMediaRecorderReturn {
  micPermission: MicPermission;
  isRecording: boolean;
  requestMic: () => Promise<boolean>;
  startRecording: (sessionId: string) => Promise<void>;
  stopAndUpload: () => Promise<string | null>;
  cancel: () => void;
}

const MIME_PRIORITY = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/mp4',
];

function pickMimeType(): string {
  return MIME_PRIORITY.find((t) => MediaRecorder.isTypeSupported(t)) ?? '';
}

function mimeToExt(mimeType: string): 'webm' | 'ogg' | 'm4a' {
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('mp4')) return 'm4a';
  return 'webm';
}

export function useMediaRecorder(): UseMediaRecorderReturn {
  const [micPermission, setMicPermission] = useState<MicPermission>('idle');
  const [isRecording, setIsRecording] = useState(false);

  const streamRef       = useRef<MediaStream | null>(null);
  const recorderRef     = useRef<MediaRecorder | null>(null);
  const chunksRef       = useRef<Blob[]>([]);
  const signedUrlRef    = useRef<string | null>(null); // self-authenticating PUT URL
  const storagePathRef  = useRef<string | null>(null); // path to save in DB
  const mimeTypeRef     = useRef<string>('');

  // ─── STEP 1: Request mic ─────────────────────────────────────────────────
  const requestMic = useCallback(async (): Promise<boolean> => {
    setMicPermission('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setMicPermission('granted');
      return true;
    } catch {
      setMicPermission('denied');
      return false;
    }
  }, []);

  // ─── STEP 2: Start recording + fetch pre-signed upload URL ──────────────
  const startRecording = useCallback(async (sessionId: string): Promise<void> => {
    if (!streamRef.current) return;

    chunksRef.current    = [];
    signedUrlRef.current = null;
    storagePathRef.current = null;

    const mimeType = pickMimeType();
    mimeTypeRef.current = mimeType;
    const ext = mimeToExt(mimeType);

    try {
      // Backend: verifies JWT + session ownership + session is ACTIVE
      // Returns { signedUrl, token, path }
      // signedUrl already contains the token as a query param —
      //   it is self-authenticating. No Authorization header needed on PUT.
      const { data } = await api.post('/calls/recording-token', {
        session_id: sessionId,
        extension: ext,
      });
      signedUrlRef.current   = data.signedUrl;  // full URL incl. ?token=...
      storagePathRef.current = data.path;        // e.g. userId/sessionId.webm
    } catch (err) {
      console.warn('[Recording] Could not get upload token — call will proceed unrecorded:', err);
    }

    const recorder = new MediaRecorder(
      streamRef.current,
      mimeType ? { mimeType } : undefined,
    );
    recorderRef.current = recorder;
    recorder.ondataavailable = (e) => {
      if (e.data?.size > 0) chunksRef.current.push(e.data);
    };
    recorder.start(1000); // 1-second chunks for low memory pressure
    setIsRecording(true);
  }, []);

  // ─── STEP 3: Stop + upload directly to Supabase Storage ───────────────
  const stopAndUpload = useCallback((): Promise<string | null> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state === 'inactive') { resolve(null); return; }

      recorder.onstop = async () => {
        // Release mic immediately so browser mic indicator disappears
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setIsRecording(false);

        const chunks      = chunksRef.current;
        const signedUrl   = signedUrlRef.current;
        const storagePath = storagePathRef.current;
        chunksRef.current = [];

        if (!chunks.length || !signedUrl || !storagePath) {
          console.warn('[Recording] Nothing to upload (no chunks or no signed URL).');
          resolve(null);
          return;
        }

        const mimeType = mimeTypeRef.current || 'audio/webm';
        const blob = new Blob(chunks, { type: mimeType });
        console.log(`[Recording] Uploading ${(blob.size / 1024).toFixed(1)} KB to Supabase Storage…`);

        try {
          /**
           * Supabase Storage signed upload URL (from createSignedUploadUrl):
           *   - Method: PUT
           *   - URL: the signedUrl as-is (token is embedded as ?token=... query param)
           *   - Headers: ONLY Content-Type
           *   - NO Authorization header — that would override the token and cause 400
           *
           * Audio goes directly to Supabase, never touches NestJS.
           */
          const res = await fetch(signedUrl, {
            method: 'PUT',
            headers: { 'Content-Type': mimeType },
            body: blob,
          });

          if (!res.ok) {
            const body = await res.text();
            console.error(`[Recording] Upload failed — HTTP ${res.status}:`, body);
            resolve(null);
          } else {
            console.log('[Recording] Upload successful. Path:', storagePath);
            resolve(storagePath);
          }
        } catch (err) {
          console.error('[Recording] Upload threw an error:', err);
          resolve(null);
        }
      };

      recorder.stop();
    });
  }, []);

  // ─── CANCEL (mic denied / user aborted) ────────────────────────────────
  const cancel = useCallback(() => {
    if (recorderRef.current?.state !== 'inactive') recorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current      = null;
    recorderRef.current    = null;
    chunksRef.current      = [];
    signedUrlRef.current   = null;
    storagePathRef.current = null;
    setIsRecording(false);
    setMicPermission('idle');
  }, []);

  return { micPermission, isRecording, requestMic, startRecording, stopAndUpload, cancel };
}
