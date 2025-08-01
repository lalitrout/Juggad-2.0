// firebaseAdmin.js (ESM)
import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

let initialized = false;

function loadCredential() {
  // 1) Prefer GOOGLE_APPLICATION_CREDENTIALS file path (standard)
  const gac = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (gac && fs.existsSync(gac)) {
    const json = JSON.parse(fs.readFileSync(gac, 'utf8'));
    return admin.credential.cert(json);
  }

  // 2) Support FIREBASE_SERVICE_ACCOUNT (base64-encoded JSON in env)
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (b64) {
    const decoded = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
    return admin.credential.cert(decoded);
  }

  // 3) Fallback to local file ./serviceAuth.json (dev-only)
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const localPath = path.join(__dirname, 'serviceAuth.json');
  if (fs.existsSync(localPath)) {
    const json = JSON.parse(fs.readFileSync(localPath, 'utf8'));
    return admin.credential.cert(json);
  }

  throw new Error(
    'No Firebase Admin credentials found. Provide GOOGLE_APPLICATION_CREDENTIALS, FIREBASE_SERVICE_ACCOUNT (base64), or serviceAuth.json.'
  );
}

if (!initialized && !admin.apps.length) {
  admin.initializeApp({
    credential: loadCredential(),
  });
  initialized = true;
}

export default admin;
