import crypto from 'crypto';

export const generateRandomHash = (length: number) => {
  return crypto.randomBytes(Math.ceil(length / 2)).toString('hex');
};
