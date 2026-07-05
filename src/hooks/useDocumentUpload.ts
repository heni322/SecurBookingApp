/**
 * useDocumentUpload.ts — Bulletproof document upload hook.
 *
 * Responsibilities:
 *  • Client-side validation: size (≤ 10 MB), MIME whitelist, filename sanitisation
 *  • XHR upload with progress + retry (delegated to uploadService)
 *  • Draft persistence: AsyncStorage saves draft metadata between app restarts
 *  • Upload state machine: idle → validating → uploading → done | error
 *
 * RGPD Art.25 — Privacy by design:
 *  File URI is never logged in production builds.
 *
 * NOTE on magic-byte validation:
 *  Client-side validation reads the first bytes via fetch()+arrayBuffer()
 *  (Hermes supports this). Server (upload.controller.ts) also re-validates.
 *  Both checks use the relaxed JPEG SOI (FF D8, 2 bytes) to handle all
 *  JPEG variants (JFIF, EXIF, Adobe, etc.).
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { uploadDocument, UploadError } from '@services/uploadService';
import { MAX_DOCUMENT_SIZE_BYTES }       from '@constants/config';
import { compressImageForUpload }       from '@utils/imageCompression';

// ── Constants ─────────────────────────────────────────────────────────────────
const ALLOWED_MIMES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);


// Detect the real file format from magic bytes, independent of declared MIME.
function detectMime(b: Uint8Array): string | null {
  if (b.length < 4) return null;
  if (b[0] === 0xff && b[1] === 0xd8) return 'image/jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return 'application/pdf';
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46) return 'image/webp';
  // ISO-BMFF (HEIC/HEIF/AVIF): bytes 4-7 = "ftyp"
  if (b.length >= 12) {
    const ftyp = String.fromCharCode(b[4], b[5], b[6], b[7]);
    if (ftyp === 'ftyp') {
      const brand = String.fromCharCode(b[8], b[9], b[10], b[11]);
      if (brand.startsWith('avif')) return 'image/avif';
      return 'image/heic';
    }
  }
  return null;
}

/** Read the first 16 bytes of a local file via fetch + ArrayBuffer (Hermes-supported). */
async function readHeadBytes(uri: string): Promise<Uint8Array | null> {
  try {
    const res = await fetch(uri);
    const buf = await res.arrayBuffer();
    return new Uint8Array(buf).slice(0, 16);
  } catch {
    return null; // unreadable — skip validation, let server decide
  }
}
const DRAFT_KEY = 'doc_upload_draft_v2';
const SESSION_EXPIRED_MSG = 'Session expirée. Veuillez vous reconnecter.';

// ── Types ─────────────────────────────────────────────────────────────────────
export type UploadPhase = 'idle' | 'validating' | 'uploading' | 'done' | 'error';

export interface DocumentDraft {
  fileUri:       string;
  fileName:      string;
  fileMime:      string;
  fileSizeBytes: number;
  documentType:  string | null;
  expiresAt:     string | null;   // ISO date
  rgpdConsent:   boolean;
  documentNumber: string | null; // CNAPS carte pro number
}

export interface UploadedFile {
  url:        string;
  objectName: string;
  sha256:     string;
}

export interface UseDocumentUploadResult {
  phase:        UploadPhase;
  progress:     number;              // 0–100
  /** Last successful upload result. Persist `objectName`, not `url`. */
  uploaded:     UploadedFile | null;
  /** @deprecated use `uploaded.url` */
  uploadedUrl:  string | null;
  error:        string | null;
  draft:        DocumentDraft;

  setDraftField: <K extends keyof DocumentDraft>(key: K, value: DocumentDraft[K]) => void;
  pickFile:      (uri: string, name: string, mime: string, sizeBytes: number) => Promise<boolean>;
  /** Uploads the draft file. Returns the full upload result or null on error. */
  upload:        () => Promise<UploadedFile | null>;
  /** Abort an in-flight upload (user-initiated). Safe to call when idle. */
  cancel:        () => void;
  reset:         () => void;
}

const INITIAL_DRAFT: DocumentDraft = {
  fileUri:       '',
  fileName:      '',
  fileMime:      '',
  fileSizeBytes: 0,
  documentType:  null,
  expiresAt:     null,
  rgpdConsent:   false,
  documentNumber: null,
};

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useDocumentUpload(
  options?: { namespace?: 'agent' | 'company' },
): UseDocumentUploadResult {
  const [phase,       setPhase]       = useState<UploadPhase>('idle');
  const [progress,    setProgress]    = useState(0);
  const [uploaded,    setUploaded]    = useState<UploadedFile | null>(null);
  const [error,       setError]       = useState<string | null>(null);
  const [draft,       setDraft]       = useState<DocumentDraft>(INITIAL_DRAFT);

  // ── Draft persistence ─────────────────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(DRAFT_KEY).then(raw => {
      if (!raw) return;
      try {
        const saved = JSON.parse(raw) as DocumentDraft;
        // Only restore metadata — never restore fileUri (file may have moved)
        setDraft(d => ({ ...d,
          documentType: saved.documentType,
          expiresAt:    saved.expiresAt,
          rgpdConsent:  saved.rgpdConsent,
        }));
      } catch { /* ignore corrupt draft */ }
    });
  }, []);

  const persistDraft = useCallback((d: DocumentDraft) => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function -- Best-effort draft persistence; storage failure is non-fatal
    AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(d)).catch(() => {});
  }, []);

  const setDraftField = useCallback(<K extends keyof DocumentDraft>(
    key: K, value: DocumentDraft[K],
  ) => {
    setDraft(prev => {
      const next = { ...prev, [key]: value };
      persistDraft(next);
      return next;
    });
  }, [persistDraft]);

  // ── File validation (MIME whitelist + size — magic bytes done server-side) ─
  const pickFile = useCallback(async (
    uri: string, name: string, mime: string, sizeBytes: number,
  ): Promise<boolean> => {
    setPhase('validating');
    setError(null);

    let normalised = mime.toLowerCase().split(';')[0].trim();
    // Normalize non-standard MIME aliases (Android pickers report image/jpg)
    if (normalised === 'image/jpg') normalised = 'image/jpeg';
    if (!ALLOWED_MIMES.has(normalised)) {
      setError(`Type non autorisé : ${mime}. Seuls PDF, JPEG, PNG et WebP sont acceptés.`);
      setPhase('error');
      return false;
    }

    // Client-side content detection — fast-fail before upload (avoids round-trip)
    const head = await readHeadBytes(uri);
    if (head) {
      const detected = detectMime(head);
      if (detected === 'image/heic' || detected === 'image/avif') {
        setError('Cette photo est au format HEIC/HEIF (format Apple/Android récent), non accepté. Convertissez-la en JPEG : ouvrez-la dans Galerie puis Partager > Enregistrer en JPEG, ou désactivez le format HEIC dans Réglages > Appareil photo > Format.');
        setPhase('error');
        return false;
      }
      if (detected && detected !== normalised) {
        setError(`Le contenu du fichier (${detected}) ne correspond pas au type déclaré (${normalised}). Le fichier a peut-être été renommé.`);
        setPhase('error');
        return false;
      }
      if (!detected) {
        const hex = Array.from(head.slice(0, 8)).map(x => x.toString(16).padStart(2, '0')).join(' ');
        setError(`Format de fichier non reconnu (octets : ${hex}). Utilisez un PDF, JPEG, PNG ou WebP valide.`);
        setPhase('error');
        return false;
      }
    }
    // Compress/downscale images before the size check (bandwidth + 10 MB cap).
    // PDFs and any compression failure pass through unchanged.
    const compressed = await compressImageForUpload(uri, normalised, sizeBytes);
    const finalUri = compressed.uri;
    const finalSize = compressed.sizeBytes;

    if (finalSize > MAX_DOCUMENT_SIZE_BYTES) {
      const mb = (finalSize / 1024 / 1024).toFixed(1);
      setError(`Fichier trop volumineux : ${mb} MB. Maximum autorisé : ${(MAX_DOCUMENT_SIZE_BYTES / 1024 / 1024).toFixed(0)} MB.`);
      setPhase('error');
      return false;
    }

    const next: DocumentDraft = {
      ...draft,
      fileUri:       finalUri,
      fileName:      sanitiseFilename(name),
      fileMime:      normalised,
      fileSizeBytes: finalSize,
    };
    setDraft(next);
    persistDraft(next);
    setPhase('idle');
    return true;
  }, [draft, persistDraft]);

  // ── Upload (delegated to shared service with retry + progress) ────────────
  const abortRef = useRef<AbortController | null>(null);

  const upload = useCallback(async (): Promise<UploadedFile | null> => {
    if (!draft.fileUri || !draft.fileName) {
      setError('Aucun fichier sélectionné.');
      return null;
    }

    setPhase('uploading');
    setProgress(0);
    setError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const result = await uploadDocument(
        draft.fileUri,
        draft.fileName,
        draft.fileMime,
        pct => setProgress(pct),
        controller.signal,
        options?.namespace === 'company'
          ? '/upload/partner-document'
          : '/upload/document',
      );
      const file: UploadedFile = {
        url:        result.url,
        objectName: result.objectName,
        sha256:     result.sha256,
      };
      setUploaded(file);
      setProgress(100);
      setPhase('done');
      // eslint-disable-next-line @typescript-eslint/no-empty-function -- Best-effort draft cleanup; storage failure is non-fatal
      AsyncStorage.removeItem(DRAFT_KEY).catch(() => {});
      return file;
    } catch (err) {
      const msg = err instanceof UploadError
        ? err.message
        : (err as Error)?.message ?? 'Échec de l\'envoi.';
      // Silent on user cancellation - return to idle with no error banner.
      if (err instanceof UploadError && err.code === 'CANCELLED') {
        setPhase('idle');
        setProgress(0);
        return null;
      }
      const finalMsg = (err instanceof UploadError && err.code === 'AUTH_EXPIRED')
        ? SESSION_EXPIRED_MSG
        : msg;
      setError(finalMsg);
      setPhase('error');
      return null;
    }
  }, [draft, options?.namespace]);

  const cancel = useCallback(() => {
    // User-initiated cancellation; aborts the in-flight XHR if any.
    abortRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    setPhase('idle');
    setProgress(0);
    setUploaded(null);
    setError(null);
    setDraft(INITIAL_DRAFT);
    // eslint-disable-next-line @typescript-eslint/no-empty-function -- Best-effort draft cleanup on unmount; storage failure is non-fatal
    AsyncStorage.removeItem(DRAFT_KEY).catch(() => {});
  }, []);

  return {
    phase, progress,
    uploaded,
    uploadedUrl: uploaded?.url ?? null,  // back-compat
    error, draft,
    setDraftField, pickFile, upload, cancel, reset,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function sanitiseFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._\-àâäéèêëîïôöùûüç]/g, '_').slice(0, 200);
}