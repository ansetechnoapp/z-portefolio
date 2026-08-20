import { DOCS_CONFIG } from './docs-config.js';

const cache = new Map();

function docsUrl(path) {
  return `${DOCS_CONFIG.API_URL}/${path}`;
}

function hasValidToken() {
  return Boolean(DOCS_CONFIG.API_TOKEN && DOCS_CONFIG.API_TOKEN !== '<DOCS_API_TOKEN>');
}

async function request(path) {
  const url = docsUrl(path);
  const now = Date.now();
  const hit = cache.get(url);
  if (hit && now - hit.t < DOCS_CONFIG.CACHE_DURATION) return hit.d;

  const headers = { 'Content-Type': 'application/json' };
  if (hasValidToken()) {
    headers['Authorization'] = `Bearer ${DOCS_CONFIG.API_TOKEN}`;
    headers['x-api-key'] = DOCS_CONFIG.API_TOKEN;
  }
  if (DOCS_CONFIG.PROJECT_ID) {
    headers['X-Project-Id'] = DOCS_CONFIG.PROJECT_ID;
  }

  const res = await fetch(url, { headers });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Docs API Error: ${res.status}${body ? ` — ${body}` : ''}`);
  }
  const json = await res.json();
  cache.set(url, { t: now, d: json });
  return json;
}

export function verifyDocsConnection() {
  return hasValidToken();
}

export async function getSpacePages(spaceSlug) {
  return request(`spaces/${encodeURIComponent(spaceSlug)}/pages`);
}

export async function getPageBySlug(slug) {
  return request(`pages/${encodeURIComponent(slug)}`);
}
