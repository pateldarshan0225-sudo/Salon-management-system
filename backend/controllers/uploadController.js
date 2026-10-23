import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { imageExtension, uploadDirectory } from '../utils/uploads.js';
import { send } from '../utils/pagination.js';
export async function uploadImage(req, res) {
  const extension = imageExtension(req.body, req.headers['content-type']);
  await mkdir(uploadDirectory, { recursive:true });
  const name = `${randomUUID()}.${extension}`;
  await writeFile(path.join(uploadDirectory,name), req.body, { flag:'wx' });
  send(res, { image:`/uploads/${name}` }, 'Image uploaded.', 201);
}
