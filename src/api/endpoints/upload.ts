import axios from 'axios';
import { API_BASE_URL } from '@constants/config';
import { tokenStorage } from '@services/tokenStorage';
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

const authHeaders = () => {
  const token = tokenStorage.getAccessToken();
  return {
    'Content-Type': 'multipart/form-data',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const uploadApi = {
  /** Upload un document agent (PDF, image) — URL signée 24 h */
  uploadDocument: async (
    fileUri:  string,
    fileName: string,
    mimeType: string,
  ): Promise<ApiResponse<UploadDocumentResponse>> => {
    const { data } = await axios.post<ApiResponse<UploadDocumentResponse>>(
      `${API_BASE_URL}/upload/document`,
      buildForm(fileUri, fileName, mimeType),
      { headers: authHeaders(), timeout: 60_000 },
    );
    return data;
  },

  /** Upload la photo de profil client — URL publique permanente, BDD mise à jour côté serveur */
  uploadAvatar: async (
    fileUri:  string,
    fileName: string,
    mimeType: string,
  ): Promise<ApiResponse<UploadAvatarResponse>> => {
    const { data } = await axios.post<ApiResponse<UploadAvatarResponse>>(
      `${API_BASE_URL}/upload/avatar`,
      buildForm(fileUri, fileName, mimeType),
      { headers: authHeaders(), timeout: 60_000 },
    );
    return data;
  },
};
