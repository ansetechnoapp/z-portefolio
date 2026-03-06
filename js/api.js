import { PORTFOLIO_CONFIG } from './config.js';

let __cache = new Map();

function key(url){return url}

async function request(path){
  const url = `${PORTFOLIO_CONFIG.API_URL}/${path}`;
  const k = key(url);
  const now = Date.now();
  const hit = __cache.get(k);
  if (hit && now - hit.t < PORTFOLIO_CONFIG.CACHE_DURATION) return hit.d;
  
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (PORTFOLIO_CONFIG.API_TOKEN) {
    headers['Authorization'] = `Bearer ${PORTFOLIO_CONFIG.API_TOKEN}`;
    headers['x-api-key'] = PORTFOLIO_CONFIG.API_TOKEN;
  }
  
  if (PORTFOLIO_CONFIG.PROJECT_ID) headers['X-Project-Id'] = PORTFOLIO_CONFIG.PROJECT_ID;
  
  try {
    const res = await fetch(url, { headers });
    
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        throw new Error('Invalid API Key');
      }
      throw new Error(`API Error: ${res.status}`);
    }

    const json = await res.json();
    __cache.set(k, { t: now, d: json });
    return json;
  } catch (err) {
    console.error(`Fetch error for ${url}:`, err);
    throw err;
  }
}

export async function verifyConnection() {
  try {
    await request('all'); // Try to fetch data to verify access
    return true;
  } catch (e) {
    console.warn('API Connection Verification Failed:', e);
    return false;
  }
}

export async function getAll(){ return request('all'); }
export async function getProjects(){ return request('projects'); }
export async function getSkills(){ return request('skills'); }
export async function getExperiences(){ return request('experiences'); }
export async function getTestimonials(){ return request('testimonials'); }

