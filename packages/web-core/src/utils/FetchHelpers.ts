export const fetchJson = async <T>(
  input: RequestInfo | URL,
  init?: RequestInit | undefined
): Promise<T> => {
  const response = await fetch(input, init);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error);
  }

  return data;
};
