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

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const signedUrlRef = useRef<string | null>(null);
  const uploadTokenRef = useRef<string | null>(null); // Bearer token for the PUT
  const storagePathRef = useRef<string | null>(null);
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

  // ─── STEP 2: Start recording + fetch pre-signed upload token ──────────────
  const startRecording = useCallback(async (sessionId: string): Promise<void> => {
    if (!streamRef.current) return;

    chunksRef.current = [];
    signedUrlRef.current = null;
    uploadTokenRef.current = null;
    storagePathRef.current = null;

    const mimeType = pickMimeType();
    const ext = mimeToExt(mimeType);
    mimeTypeRef.current = mimeType;

    try {
      // Backend verifies JWT + session ownership + active status
      // Returns { signedUrl, token, path }
      // signedUrl = the Supabase Storage endpoint to PUT to
      // token     = Bearer token that authorises this specific upload
      // path      = storage path to store in DB after upload
      const { data } = await api.post('/calls/recording-token', {
        session_id: sessionId,
        extension: ext,
      });
      signedUrlRef.current = data.signedUrl;
      uploadTokenRef.current = data.token;
      storagePathRef.current = data.path;
    } catch (err) {
      console.warn('Could not get recording token — call will not be recorded:', err);
    }

    const recorder = new MediaRecorder(
      streamRef.current,
      mimeType ? { mimeType } : undefined,
    );
    recorderRef.current = recorder;
    recorder.ondataavailable = (e) => {
      if (e.data?.size > 0) chunksRef.current.push(e.data);
    };
    recorder.start(1000);
    setIsRecording(true);
  }, []);

  // ─── STEP 3: Stop + upload via pre-signed URL ─────────────────────────
  const stopAndUpload = useCallback((): Promise<string | null> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state === 'inactive') { resolve(null); return; }

      recorder.onstop = async () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setIsRecording(false);

        const chunks = chunksRef.current;
        const signedUrl = signedUrlRef.current;
        const uploadToken = uploadTokenRef.current;
        const storagePath = storagePathRef.current;
        chunksRef.current = [];

        if (!chunks.length || !signedUrl || !uploadToken || !storagePath) {
          resolve(null);
          return;
        }

        const mimeType = mimeTypeRef.current || 'audio/webm';
        const blob = new Blob(chunks, { type: mimeType });

        try {
          /**
           * Supabase Storage signed upload requires:
           *   Method:  PUT
           *   URL:     the signedUrl from createSignedUploadUrl
           *   Headers: Authorization: Bearer <token>   ← THIS was missing
           *            Content-Type: <mime>
           *
           * The token is single-use and expires in 5 minutes.
           * Audio never touches NestJS — goes directly to Supabase Storage.
           */
          const res = await fetch(signedUrl, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${uploadToken}`,
              'Content-Type': mimeType,
            },
            body: blob,
          });

          if (!res.ok) {
            const errText = await res.text();
            console.error(`Recording upload failed [${res.status}]:`, errText);
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
    uploadTokenRef.current = null;
    storagePathRef.current = null;
    setIsRecording(false);
    setMicPermission('idle');
  }, []);

  return { micPermission, isRecording, requestMic, startRecording, stopAndUpload, cancel };
}
