import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assert } from './validation.js';
export const uploadDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../uploads');
export const maxImageBytes = 2 * 1024 * 1024;
export function imageExtension(buffer, contentType) {
  assert(Buffer.isBuffer(buffer) && buffer.length > 0, 'Choose an image to upload.');
  assert(buffer.length <= maxImageBytes, 'Image must be 2 MB or smaller.', 413);
  const type = (contentType || '').split(';')[0].toLowerCase();
  if (type === 'image/png' && buffer.length >= 45 && buffer.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')) && buffer.toString('ascii',12,16) === 'IHDR' && buffer.toString('ascii',buffer.length-8,buffer.length-4) === 'IEND') return 'png';
  if (type === 'image/jpeg' && buffer.length >= 4 && buffer[0] === 255 && buffer[1] === 216 && buffer.at(-2) === 255 && buffer.at(-1) === 217) return 'jpg';
  if (type === 'image/webp' && buffer.length >= 20 && buffer.toString('ascii',0,4) === 'RIFF' && buffer.toString('ascii',8,12) === 'WEBP' && buffer.readUInt32LE(4) + 8 === buffer.length) return 'webp';
  assert(false, 'Upload a valid JPG, PNG or WebP image. SVG and other file types are not supported.');
}
