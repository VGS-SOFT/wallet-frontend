'use client';

import { useRef, useState, useCallback } from 'react';
import { supabaseStorage, RECORDINGS_BUCKET } from '@/lib/supabaseStorage';

export type MicPermission = 'idle' | 'requesting' | 'granted' | 'denied';

interface UseMediaRecorderReturn {
  micPermission: MicPermission;
  isRecording: boolean;
  requestMicAndStart: (sessionId: string, userId: string) => Promise<void>;
  stopAndUpload: () => Promise<string | null>; // returns storage path or null
  cancelRecording: () => void;
}

export function useMediaRecorder(): UseMediaRecorderReturn {
  const [micPermission, setMicPermission] = useState<MicPermission>('idle');
  const [isRecording, setIsRecording] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const storagePathRef = useRef<string | null>(null);

  // ─── Request mic permission and start recording ──────────────────────
  const requestMicAndStart = useCallback(async (sessionId: string, userId: string) => {
    setMicPermission('requesting');
    chunksRef.current = [];
    storagePathRef.current = null;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setMicPermission('granted');

      // Pick best supported format
      const mimeType = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
      ].find((t) => MediaRecorder.isTypeSupported(t)) ?? '';

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      // Storage path: {userId}/{sessionId}.webm
      // RLS policy allows upload only to the user's own folder
      const ext = mimeType.includes('ogg') ? 'ogg' : mimeType.includes('mp4') ? 'm4a' : 'webm';
      storagePathRef.current = `${userId}/${sessionId}.${ext}`;

      recorder.start(1000); // collect chunks every 1 second
      setIsRecording(true);
    } catch {
      // User denied mic or browser doesn't support it
      setMicPermission('denied');
    }
  }, []);

  // ─── Stop recording and upload to Supabase Storage ───────────────────
  const stopAndUpload = useCallback((): Promise<string | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        resolve(null);
        return;
      }

      recorder.onstop = async () => {
        // Stop all mic tracks to release the browser mic indicator
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setIsRecording(false);

        if (chunksRef.current.length === 0 || !storagePathRef.current) {
          resolve(null);
          return;
        }

        const mimeType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        chunksRef.current = [];

        // Upload to Supabase Storage
        const { error } = await supabaseStorage.storage
          .from(RECORDINGS_BUCKET)
          .upload(storagePathRef.current, blob, {
            contentType: mimeType,
            upsert: true, // overwrite if session was retried
          });

        if (error) {
          console.error('Recording upload failed:', error.message);
          resolve(null);
        } else {
          resolve(storagePathRef.current);
        }
      };

      recorder.stop();
    });
  }, []);

  // ─── Cancel without uploading (mic denied or user aborted) ───────────
  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current?.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    storagePathRef.current = null;
    setIsRecording(false);
    setMicPermission('idle');
  }, []);

  return {
    micPermission,
    isRecording,
    requestMicAndStart,
    stopAndUpload,
    cancelRecording,
  };
}
