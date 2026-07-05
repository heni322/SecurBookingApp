/**
 * uploadService — shared XHR multipart uploader with progress + retry.
 *
 * Used by:
 *  - useDocumentUpload (agent/partner document flow)
 *  - CheckinScreen / CheckoutScreen (proof photos)
 *  - EditProfileScreen (avatar)
 *
 * Why XHR (not fetch): fetch() does not surface upload progress events in
 * React Native. XHR upload.onprogress is the only reliable way to get
 * accurate progress for files that may be slow to upload (10 MB on 4G).
 *
 * Why a Promise wrapper: keeps callers async/await friendly while preserving
 * the underlying XHR for cancellation if we add an AbortController later.
 */

import { tokenStorage } from './tokenStorage';
import { API_BASE_URL, API_TIMEOUT } from '@constants/config';
import { refreshAccessToken } from '@api/client';

export interface UploadOptions {
  /** Endpoint path under API_BASE_URL, e.g. '/upload/document' */
  endpoint:    string;
  /** Local file URI (must be file://) */
  uri:         string;
  /** Filename to send in the multipart part */
  fileName:    string;
  /** MIME type, lowercase, no charset suffix */
  mimeType:    string;
  /** 0–100 progress callback */
  onProgress?: (pct: number) => void;
  /** Override timeout (ms). Default 60s. */
  timeoutMs?:  number;
  /** Optional AbortSignal — abort() cancels the in-flight upload. */
  signal?:     AbortSignal;
}

export interface UploadResult {
  /** Parsed JSON body of the response */
  body:    any;
  /** HTTP status code */
  status:  number;
}

export class UploadError extends Error {
  constructor(
    message:        string,
    public readonly code:   string,
    public readonly status?: number,
    public readonly body?:   unknown,
    /** Server-advertised back-off (ms) parsed from the Retry-After header on 429. */
    public readonly retryAfterMs?: number,
  ) {
    super(message);
    this.name = 'UploadError';
  }
}

/**
 * Parse an HTTP Retry-After header into milliseconds.
 * Accepts either delta-seconds ("120") or an HTTP-date. Returns null when
 * absent/unparseable so callers fall back to their own back-off.
 */
function parseRetryAfter(headerValue: string | null): number | null {
  if (!headerValue) return null;
  const secs = Number(headerValue.trim());
  if (Number.isFinite(secs) && secs >= 0) return secs * 1000;
  const dateMs = Date.parse(headerValue);
  if (!Number.isNaN(dateMs)) {
    const delta = dateMs - Date.now();
    return delta > 0 ? delta : 0;
  }
  return null;
}

const RETRY_MAX_DEFAULT  = 3;
const RETRY_BASE_DELAY   = 1_000;   // 1s, 2s, 4s
const DEFAULT_TIMEOUT_MS = 60_000;

/** Single-shot multipart upload (no retry). Returns the parsed body. */
export function uploadMultipartOnce(opts: UploadOptions): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const token = tokenStorage.getAccessToken();
    const form  = new FormData();
    // Normalize non-standard MIME before sending (Android pickers may report image/jpg)
    const safeMime = opts.mimeType === 'image/jpg' ? 'image/jpeg' : opts.mimeType;
    form.append('file', {
      uri:  (opts.uri.startsWith('content://') || opts.uri.startsWith('file://')) ? opts.uri : 'file://' + opts.uri,
      name: opts.fileName,
      type: safeMime,
    });

    const xhr = new XMLHttpRequest();

    // Cancellation: abort the in-flight XHR when the caller's AbortSignal fires.
    if (opts.signal?.aborted) {
      return reject(new UploadError('Upload cancelled by user.', 'CANCELLED'));
    }
    const onAbort = () => xhr.abort();
    if (opts.signal) opts.signal.addEventListener('abort', onAbort);
    xhr.onabort   = () => reject(new UploadError('Upload cancelled by user.', 'CANCELLED'));
    // onloadend fires on success, error, timeout AND abort — single cleanup point.
    xhr.onloadend = () => { if (opts.signal) opts.signal.removeEventListener('abort', onAbort); };

    xhr.open('POST', `${API_BASE_URL}${opts.endpoint}`);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.timeout = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    if (opts.onProgress) {
      xhr.upload.onprogress = e => {
        if (e.lengthComputable) {
          opts.onProgress!(Math.round((e.loaded / e.total) * 100));
        }
      };
    }

    xhr.onload = () => {
      let body: any;
      try { body = JSON.parse(xhr.responseText); }
      catch {
        return reject(new UploadError(
          `Réponse non-JSON du serveur (status ${xhr.status})`,
          `HTTP_${xhr.status}`,
          xhr.status,
          xhr.responseText,
        ));
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ body, status: xhr.status });
      } else {
        const msg = body?.data?.message ?? body?.message ?? `Erreur HTTP ${xhr.status}`;
        // On 429 the backend (ApiThrottlerGuard, 5 uploads/min/user) sends a
        // Retry-After header. Capture it so the retry loop honours it instead
        // of immediately re-hitting the limit.
        const retryAfterMs =
          xhr.status === 429
            ? parseRetryAfter(xhr.getResponseHeader('Retry-After')) ?? undefined
            : undefined;
        reject(new UploadError(msg, `HTTP_${xhr.status}`, xhr.status, body, retryAfterMs));
      }
    };

    xhr.onerror   = () => reject(new UploadError(
      'Erreur réseau — vérifiez votre connexion Internet.',
      'NETWORK_ERROR',
    ));
    xhr.ontimeout = () => reject(new UploadError(
      'Délai d\'attente dépassé. Réessayez sur Wi-Fi.',
      'TIMEOUT',
    ));

    xhr.send(form);
  });
}

/**
 * Upload with exponential backoff retry: 1s → 2s → 4s.
 * Only retries on NETWORK_ERROR / TIMEOUT / 5xx.
 * 4xx errors are not retried (client mistakes — validation failures, auth).
 */
export async function uploadMultipart(
  opts: UploadOptions,
  retryMax = RETRY_MAX_DEFAULT,
): Promise<UploadResult> {
  let attempt = 0;
  let lastErr: UploadError | null = null;
  let didAuthRetry = false;

  while (attempt < retryMax) {
    try {
      return await uploadMultipartOnce(opts);
    } catch (err) {
      const uploadErr = err instanceof UploadError ? err : new UploadError(
        (err as Error)?.message ?? 'Échec inconnu',
        'UNKNOWN',
      );
      lastErr = uploadErr;

      // 401 → access token expired mid-upload. The XHR uploader bypasses the
      // axios interceptor, so refresh once here (single-flight, shared with the
      // interceptor) and retry immediately without consuming a retry slot.
      if (uploadErr.status === 401 && !didAuthRetry) {
        didAuthRetry = true;
        try {
          await refreshAccessToken();
          continue;
        } catch {
          throw new UploadError('Session expired.', 'AUTH_EXPIRED', 401);
        }
      }

      const isRateLimited = uploadErr.status === 429;
      const isRetryable =
        isRateLimited ||
        uploadErr.code === 'NETWORK_ERROR' ||
        uploadErr.code === 'TIMEOUT' ||
        (uploadErr.status !== undefined && uploadErr.status >= 500);

      if (!isRetryable) throw uploadErr;

      attempt++;
      if (attempt >= retryMax) break;

      // Honour the server Retry-After on 429 (5 uploads/min/user). Otherwise
      // exponential back-off: 1s -> 2s -> 4s. Cap the rate-limit wait so a
      // misconfigured header cannot freeze the UI for minutes.
      const backoff = RETRY_BASE_DELAY * Math.pow(2, attempt - 1);
      const wait = isRateLimited && uploadErr.retryAfterMs !== undefined
        ? Math.min(uploadErr.retryAfterMs, 60_000)
        : backoff;
      if (__DEV__) {
        const why = isRateLimited ? `429 (Retry-After ${Math.round(wait / 1000)}s)` : uploadErr.code;
        console.warn(`[upload] Attempt ${attempt} failed (${why}), retrying in ${wait}ms`);
      }
      await new Promise<void>(r => setTimeout(() => r(), wait));
    }
  }

  throw lastErr ?? new UploadError('Échec après plusieurs tentatives.', 'RETRY_EXHAUSTED');
}

/** Result of a document upload — what the backend returns. */
export interface DocumentUploadResult {
  /** 24h presigned URL — only for immediate use, persist objectName instead. */
  url:        string;
  /** MinIO object key (e.g. agents/{userId}/{uuid}.pdf). Persist this. */
  objectName: string;
  /** SHA-256 hex digest computed server-side at upload time. Audit trail. */
  sha256:     string;
}

/** Convenience wrapper for document uploads — returns the full result. */
export async function uploadDocument(
  uri:        string,
  fileName:   string,
  mimeType:   string,
  onProgress?: (pct: number) => void,
  signal?:    AbortSignal,
  endpoint: '/upload/document' | '/upload/partner-document' = '/upload/document',
): Promise<DocumentUploadResult> {
  const { body } = await uploadMultipart({
    endpoint,
    uri, fileName, mimeType,
    onProgress,
    signal,
  });
  // Backend envelope: { success, data: { url, objectName, sha256 } }
  const data = body?.data ?? body;
  if (!data?.url) {
    throw new UploadError('URL manquante dans la réponse serveur', 'BAD_RESPONSE');
  }
  return {
    url:        data.url,
    objectName: data.objectName ?? '',
    sha256:     data.sha256     ?? '',
  };
}

/** Convenience wrapper for avatar uploads. Returns the avatarUrl. */
export async function uploadAvatar(
  uri:        string,
  fileName:   string,
  mimeType:   string,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const { body } = await uploadMultipart({
    endpoint:  '/upload/avatar',
    uri, fileName, mimeType,
    onProgress,
  });
  const avatarUrl = body?.data?.avatarUrl ?? body?.avatarUrl;
  if (!avatarUrl) throw new UploadError('avatarUrl manquante dans la réponse', 'BAD_RESPONSE');
  return avatarUrl;
}

// API_TIMEOUT is re-exported for callers that want to enforce a custom timeout.
export { API_TIMEOUT };
