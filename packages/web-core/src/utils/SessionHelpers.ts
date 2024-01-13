
import { API_URL } from '@moaitime-games/shared-common';

export const fetchJson = async <T>(
  input: RequestInfo | URL,
  init?: RequestInit | undefined
): Promise<T> => {
  const response = await fetch(input, init);
  const data = await response.json();

  return data;
};

export const getServerUrl = async () => {
  const response = await fetchJson<{ url: string }>(`${API_URL}/server`);

  return response.url;
};

