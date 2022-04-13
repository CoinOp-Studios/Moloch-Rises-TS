import process from 'process';

import hashes from './hashes.json';

export function getPublicUrl(path: string): string {
  const searchHash = hashes as Record<string, string>;
  const hash = searchHash[path];
  const publicUrl = process.env.PUBLIC_URL ?? '/molochrises';
  if (!hash) {
    console.warn('No hash found for path:', path);
    return `${publicUrl}${path}`;
  }
  const qs = (path.indexOf('?') === -1) ? '?' : '&';
  const url = `${publicUrl}${path}${qs}_=${hash}`;
  console.log('Public URL:', url);
  return url;
}