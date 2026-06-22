import apiClient from '@api/client';
import type { ApiResponse } from '@models/index';

export interface UploadDocumentResponse {
  url: string;
  sha256?: string;
  objectName?: string;
}

export interface UploadAvatarResponse {
  avatarUrl: string;
}

const buildForm = (fileUri: string, fileName: string, mimeType: string) => {
  const form = new FormData();
  form.append('file', { uri: fileUri, name: fileName, type: mimeType } as unknown as Blob);
  return form;
};

/**
 * Les uploads passent désormais par `apiClient` (et non plus par un axios brut)
 * afin de bénéficier de :
 *   • l'injection automatique du Bearer token,
 *   • le refresh transparent du token sur 401 (un token expirant en plein
 *     upload est ré-essayé au lieu d'échouer),
 *   • le logging de dev centralisé.
 *
 * On force `Content-Type: undefined` pour qu'axios/React Native positionne
 * lui-même l'en-tête `multipart/form-data; boundary=…` à partir du FormData.
 */
const MULTIPART_CONFIG = {
  headers: { 'Content-Type': 'multipart/form-data' },
  timeout: 60_000,
};

export const uploadApi = {
  /** Upload un document agent (PDF, image) — URL signée 24 h */
  uploadDocument: async (
    fileUri:  string,
    fileName: string,
    mimeType: string,
  ): Promise<ApiResponse<UploadDocumentResponse>> => {
    const { data } = await apiClient.post<ApiResponse<UploadDocumentResponse>>(
      '/upload/document',
      buildForm(fileUri, fileName, mimeType),
      MULTIPART_CONFIG,
    );
    return data;
  },

  /** Upload la photo de profil client — URL publique permanente, BDD mise à jour côté serveur */
  uploadAvatar: async (
    fileUri:  string,
    fileName: string,
    mimeType: string,
  ): Promise<ApiResponse<UploadAvatarResponse>> => {
    const { data } = await apiClient.post<ApiResponse<UploadAvatarResponse>>(
      '/upload/avatar',
      buildForm(fileUri, fileName, mimeType),
      MULTIPART_CONFIG,
    );
    return data;
  },
};
