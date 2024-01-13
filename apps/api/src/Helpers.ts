import crypto from 'crypto';

export const generateRandomHash = (length: number) => {
  return crypto.randomBytes(length).toString('hex');
};
