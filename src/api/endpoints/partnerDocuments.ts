import apiClient from '@api/client';
import type {
  ApiResponse, PartnerDocument,
  CreatePartnerDocumentPayload, PartnerComplianceStatus,
} from '@models/index';

/**
 * Endpoints pour les documents légaux de la société partenaire.
 * Source : PROFIL-DOCUMENTS.xlsx, onglet "Partenaire".
 *
 * Authorization: PARTNER role required. Caller must be authenticated as the
 * society owner; `/me` resolves to the JWT-derived company.
 */
export const partnerDocumentsApi = {
  /** GET /partner-documents/me — mes documents société. */
  getMyDocuments: () =>
    apiClient.get<ApiResponse<PartnerDocument[]>>('/partner-documents/me'),

  /**
   * GET /partner-documents/me/compliance
   * Statut complet (mandatory + optional + progress + RGPD notice).
   */
  getComplianceStatus: () =>
    apiClient.get<ApiResponse<PartnerComplianceStatus>>('/partner-documents/me/compliance'),

  /**
   * GET /partner-documents/me/:id/file-url
   * Régénère une URL signée 24h. À appeler avant d'ouvrir un fichier dont
   * la fileUrl stockée peut avoir expiré.
   */
  getFileUrl: (id: string) =>
    apiClient.get<ApiResponse<{ url: string }>>(`/partner-documents/me/${id}/file-url`),

  /**
   * POST /partner-documents/me — soumettre un document société.
   * Inclure `objectName` et `sha256` retournés par /upload/document.
   */
  addDocument: (p: CreatePartnerDocumentPayload) =>
    apiClient.post<ApiResponse<PartnerDocument>>('/partner-documents/me', p),

  /**
   * DELETE /partner-documents/me/:id — supprimer PENDING/REJECTED.
   * Les documents APPROVED ne peuvent pas être supprimés (rétention RGPD).
   */
  deleteDocument: (id: string) =>
    apiClient.delete<ApiResponse<{ success: boolean; message: string }>>(
      `/partner-documents/me/${id}`,
    ),
};
