'use client';

import { useRef, useState, useCallback } from 'react';
import api from '@/lib/api';

export type MicPermission = 'idle' | 'requesting' | 'granted' | 'denied';

interface UseMediaRecorderReturn {
  micPermission: MicPermission;
  isRecording: boolean;
  /**
   * Step 1 of the call flow.
   * Requests mic access. Returns true if granted, false if denied.
   * Call this BEFORE initiating the billing session.
   */
  requestMic: () => Promise<boolean>;
  /**
   * Step 2. Call after billing session is confirmed open.
   * Starts MediaRecorder using the already-granted stream.
   * Fetches a pre-signed upload URL from backend (ownership verified server-side).
   */
  startRecording: (sessionId: string) => Promise<void>;
  /**
   * Step 3. Stops recording, uploads blob directly to Supabase Storage
   * using the pre-signed URL. Returns the storage path for /calls/end.
   * Returns null if recording was not started or upload fails.
   */
  stopAndUpload: () => Promise<string | null>;
  /** Release mic and reset all state without uploading */
  cancel: () => void;
}

// Best codec in priority order
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

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const signedUrlRef = useRef<string | null>(null);   // pre-signed PUT url
  const storagePathRef = useRef<string | null>(null); // path to send to /calls/end
  const mimeTypeRef = useRef<string>('');

  // ─── STEP 1: Request mic ────────────────────────────────────────────────
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

  // ─── STEP 2: Start recording + fetch pre-signed URL ────────────────────
  const startRecording = useCallback(async (sessionId: string): Promise<void> => {
    if (!streamRef.current) return;

    chunksRef.current = [];
    signedUrlRef.current = null;
    storagePathRef.current = null;

    const mimeType = pickMimeType();
    const ext = mimeToExt(mimeType);
    mimeTypeRef.current = mimeType;

    // Fetch pre-signed upload URL from backend
    // Backend verifies: JWT valid + session belongs to this user + session is active
    // Storage path is set server-side — client cannot influence it
    try {
      const { data } = await api.post('/calls/recording-token', {
        session_id: sessionId,
        extension: ext,
      });
      signedUrlRef.current = data.signedUrl;
      storagePathRef.current = data.path;
    } catch (err) {
      // Failed to get upload token — record anyway, upload will be skipped
      console.warn('Could not get recording token:', err);
    }

    const recorder = new MediaRecorder(
      streamRef.current,
      mimeType ? { mimeType } : undefined,
    );
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data?.size > 0) chunksRef.current.push(e.data);
    };

    recorder.start(1000); // 1-second chunks
    setIsRecording(true);
  }, []);

  // ─── STEP 3: Stop + upload via pre-signed URL ─────────────────────────
  const stopAndUpload = useCallback((): Promise<string | null> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;

      if (!recorder || recorder.state === 'inactive') {
        resolve(null);
        return;
      }

      recorder.onstop = async () => {
        // Release mic immediately — browser mic indicator goes away
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setIsRecording(false);

        const chunks = chunksRef.current;
        const signedUrl = signedUrlRef.current;
        const storagePath = storagePathRef.current;
        chunksRef.current = [];

        if (!chunks.length || !signedUrl || !storagePath) {
          resolve(null);
          return;
        }

        const mimeType = mimeTypeRef.current || 'audio/webm';
        const blob = new Blob(chunks, { type: mimeType });

        // PUT directly to Supabase Storage using the pre-signed URL
        // No API key, no auth header — the signed URL IS the credential
        // Audio never touches NestJS server
        try {
          const res = await fetch(signedUrl, {
            method: 'PUT',
            headers: { 'Content-Type': mimeType },
            body: blob,
          });

          if (!res.ok) {
            console.error('Recording upload failed:', res.status, await res.text());
            resolve(null);
          } else {
            resolve(storagePath);
          }
        } catch (err) {
          console.error('Recording upload error:', err);
          resolve(null);
        }
      };

      recorder.stop();
    });
  }, []);

  // ─── CANCEL ─────────────────────────────────────────────────────────
  const cancel = useCallback(() => {
    if (recorderRef.current?.state !== 'inactive') recorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
    signedUrlRef.current = null;
    storagePathRef.current = null;
    setIsRecording(false);
    setMicPermission('idle');
  }, []);

  return { micPermission, isRecording, requestMic, startRecording, stopAndUpload, cancel };
}
