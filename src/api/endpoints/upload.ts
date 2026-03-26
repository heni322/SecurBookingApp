import axios from 'axios';
import { API_BASE_URL } from '@constants/config';
import { tokenStorage } from '@services/tokenStorage';
import type { ApiResponse } from '@models/index';

export interface UploadDocumentResponse {
  url: string;
}

export const uploadApi = {
  uploadDocument: async (
    fileUri:  string,
    fileName: string,
    mimeType: string,
  ): Promise<ApiResponse<UploadDocumentResponse>> => {
    const token = tokenStorage.getAccessToken();

    const form = new FormData();
    form.append('file', {
      uri:  fileUri,
      name: fileName,
      type: mimeType,
    } as unknown as Blob);

    const { data } = await axios.post<ApiResponse<UploadDocumentResponse>>(
      `${API_BASE_URL}/upload/document`,
      form,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        timeout: 60_000,
      },
    );

    return data;
  },
};
