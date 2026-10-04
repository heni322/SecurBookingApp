/**
 * sentry.ts — crash reporting for the client app (pre-launch audit
 * 2026-10-02, H4). Mirrors the agent app's setup.
 *
 * Starts only when `config.features.crashReporting` is on AND `config.sentryDsn` is
 * set (environments.ts). `npm run validate:release` refuses a production or
 * staging build that has crash reporting on with an empty DSN, so a release
 * cannot ship silent.
 *
 * Privacy: no request or response bodies, no Authorization header, no query
 * strings with credentials, and only the user id and role as user context.
 */
import * as Sentry from '@sentry/react-native';
import { config } from '@config';

const enabled = (): boolean => config.features.crashReporting && !!config.sentryDsn;

const SENSITIVE_QS = /([?&])(token|access_token|refresh_token|code|id_token|password|otp|client_secret)=([^&]*)/gi;

export function scrubUrl(url: string | undefined): string | undefined {
  if (!url) return url;
  return url.replace(SENSITIVE_QS, (_m, sep: string, key: string) => `${sep}${key}=***`);
}

let started = false;

export function initSentry(): void {
  if (started || !enabled()) return;
  started = true;

  Sentry.init({
    dsn: config.sentryDsn,
    environment: config.env,
    release: `provalk-client@${config.appVersion}`,
    sampleRate: 1.0,
    tracesSampleRate: 0,
    enableNative: true,
    enableNativeCrashHandling: true,
    enableAutoSessionTracking: true,
    maxBreadcrumbs: 50,
    attachStacktrace: true,
    sendDefaultPii: false,

    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.category === 'console' && breadcrumb.level === 'debug') return null;
      if (
        (breadcrumb.category === 'http' || breadcrumb.category === 'xhr' || breadcrumb.category === 'fetch') &&
        breadcrumb.data
      ) {
        const data = breadcrumb.data as Record<string, unknown>;
        if (typeof data.url === 'string') data.url = scrubUrl(data.url);
        delete data.body;
        delete data.response_body;
      }
      return breadcrumb;
    },

    beforeSend(event) {
      if (event.request?.url) event.request.url = scrubUrl(event.request.url) ?? event.request.url;
      if (event.request?.headers) {
        const headers = event.request.headers as Record<string, string>;
        delete headers.Authorization;
        delete headers.authorization;
      }
      if (event.request) delete event.request.data;
      return event;
    },
  });
}

/** User context: id and role only, never e-mail, name or phone. */
export function setSentryUser(user: { id: string; role?: string } | null): void {
  if (!started) return;
  if (!user) {
    Sentry.setUser(null);
    return;
  }
  Sentry.setUser({ id: user.id });
  if (user.role) Sentry.setTag('user_role', user.role);
}

/** A handled error the user saw (5xx, render crash caught by ErrorBoundary). */
export function captureHandledError(err: unknown, context?: Record<string, unknown>): void {
  if (!started) return;
  Sentry.captureException(err, context ? { extra: context } : undefined);
}
