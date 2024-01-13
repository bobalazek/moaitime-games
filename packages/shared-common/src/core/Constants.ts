// Web URL
export const WEB_URL =
  typeof window !== 'undefined' && window?.location
    ? `${window.location.protocol}//${window.location.hostname}`
    : `http://localhost:4200`;

// API URL
export const API_URL =
  typeof window !== 'undefined' && window?.location
    ? `${window.location.protocol}//${window.location.hostname}:3000`
    : `http://localhost:3000`;
