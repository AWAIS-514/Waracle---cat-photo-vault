import axios from 'axios';

import { CAT_API_BASE_URL, CAT_API_KEY, CAT_SUB_ID } from './config';
import { CatImage, Favourite, Vote } from './types';

type CatUploadFile = {
  uri: string;
  type: string;
  name: string;
};

type UploadCatImageResponse = { id: string; url: string };
type CreateActionResponse = { id: number; message: string };
type RequestError = Error & {
  response?: {
    status: number;
    data: unknown;
  };
};

const apiClient = axios.create({
  baseURL: CAT_API_BASE_URL,
  headers: {
    'x-api-key': CAT_API_KEY,
  },
});

function logApiCall(method: string, endpoint: string) {
  console.log(`[API] ${method.toUpperCase()} ${endpoint}`);
}

apiClient.interceptors.request.use(request => {
  logApiCall(request.method ?? 'GET', request.url ?? '/');
  return request;
});

const defaultListParams = { limit: 100, sub_id: CAT_SUB_ID };

function createActionPayload(imageId: string, voteValue?: 0 | 1) {
  return {
    image_id: imageId,
    sub_id: CAT_SUB_ID,
    ...(voteValue !== undefined ? { value: voteValue } : {}),
  };
}

function parseResponseBody(rawBody: string): unknown {
  if (!rawBody) {
    return {};
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    // Some API errors are plain text instead of JSON.
    return { message: rawBody };
  }
}

function getErrorMessage(body: unknown, fallback: string) {
  if (body && typeof body === 'object' && 'message' in body) {
    const message = (body as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }
  return fallback;
}

export async function uploadCatImage(file: CatUploadFile) {
  const form = new FormData();
  // Keep fetch for uploads; axios can be flaky with RN Android multipart requests.
  form.append(
    'file',
    {
      uri: file.uri,
      type: file.type,
      name: file.name,
    } as any,
  );
  form.append('sub_id', CAT_SUB_ID);

  logApiCall('POST', '/images/upload');

  const res = await fetch(`${CAT_API_BASE_URL}/images/upload`, {
    method: 'POST',
    headers: {
      'x-api-key': CAT_API_KEY,
    },
    body: form,
  });

  const responseBody = parseResponseBody(await res.text());

  if (!res.ok) {
    const error: RequestError = new Error(
      getErrorMessage(responseBody, 'Upload failed'),
    );
    error.response = {
      status: res.status,
      data: responseBody,
    };
    throw error;
  }

  return responseBody as UploadCatImageResponse;
}

export async function getImageById(id: string) {
  const res = await apiClient.get(`/images/${id}`);
  return res.data as CatImage;
}

export async function getFavourites() {
  const res = await apiClient.get('/favourites', {
    params: defaultListParams,
  });
  return res.data as Favourite[];
}

export async function favouriteCat(imageId: string) {
  const res = await apiClient.post('/favourites', createActionPayload(imageId));
  return res.data as CreateActionResponse;
}

export async function unfavouriteCat(favouriteId: number) {
  await apiClient.delete(`/favourites/${favouriteId}`);
}

export async function getVotes() {
  const res = await apiClient.get('/votes', {
    params: defaultListParams,
  });
  return res.data as Vote[];
}

export async function voteCat(imageId: string, voteValue: 0 | 1) {
  const res = await apiClient.post('/votes', createActionPayload(imageId, voteValue));
  return res.data as CreateActionResponse;
}
