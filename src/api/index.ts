export { default as apiClient } from './client';

// Auth
export { authApi }           from './endpoints/auth';

// Profile utilisateur
export { usersApi }          from './endpoints/users';

// Catalogue
export { serviceTypesApi }   from './endpoints/serviceTypes';

// Flux principal client
export { missionsApi }       from './endpoints/missions';
export { quotesApi }         from './endpoints/quotes';
export { bookingsApi }       from './endpoints/bookings';
export { paymentsApi }       from './endpoints/payments';

// Communication & post-mission
export { conversationsApi }  from './endpoints/conversations';
export { notificationsApi }  from './endpoints/notifications';
export { ratingsApi }        from './endpoints/ratings';
export { disputesApi }       from './endpoints/disputes';

// Upload fichiers
export { uploadApi }         from './endpoints/upload';
export type { UploadDocumentResponse } from './endpoints/upload';

// SOS
export { sosApi }            from './endpoints/sos';
