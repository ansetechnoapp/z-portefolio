import { PORTFOLIO_CONFIG } from './config.js';

const cache = new Map();

function normalizeBaseUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function joinUrl(base, path) {
  const normalizedBase = normalizeBaseUrl(base);
  const normalizedPath = String(path || '').replace(/^\/+/, '');
  return `${normalizedBase}/${normalizedPath}`;
}

function getCacheDuration() {
  return Number(PORTFOLIO_CONFIG.CACHE_DURATION) || 300000;
}

function getCandidateBases() {
  return [
    PORTFOLIO_CONFIG.API_URL,
    PORTFOLIO_CONFIG.API_FALLBACK_BASE_URL,
    PORTFOLIO_CONFIG.LOCAL_API_BASE_URL,
    'http://127.0.0.1:3013/api/portfolio',
  ]
    .map(normalizeBaseUrl)
    .filter(Boolean);
}

function getRequestHeaders() {
  return {
    Accept: 'application/json',
  };
}

function getCacheKey(url) {
  return url;
}

async function request(path) {
  const headers = getRequestHeaders();
  const now = Date.now();
  let lastError = null;

  for (const base of getCandidateBases()) {
    const url = joinUrl(base, path);
    const key = getCacheKey(url);
    const hit = cache.get(key);

    if (hit && now - hit.timestamp < getCacheDuration()) {
      return hit.data;
    }

    try {
      const response = await fetch(url, { headers });

      if (!response.ok) {
        const bodyPreview = await response.text().catch(() => '');
        const preview = bodyPreview ? `: ${bodyPreview.slice(0, 160).replace(/\s+/g, ' ')}` : '';
        throw new Error(`HTTP ${response.status} for ${url}${preview}`);
      }

      const json = await response.json();
      cache.set(key, { timestamp: now, data: json });
      return json;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw lastError || new Error(`Unable to fetch portfolio data for ${path}`);
}

function unwrapData(payload) {
  if (!payload || typeof payload !== 'object') {
    return {};
  }

  if ('data' in payload && payload.data && typeof payload.data === 'object') {
    return payload.data;
  }

  return payload;
}

function toArray(value) {
  return Array.isArray(value) ? value.slice() : [];
}

function countUnique(values) {
  return new Set(values.filter(Boolean)).size;
}

function buildCounts(projects, skills, experiences, testimonials) {
  return {
    projects: projects.length,
    skills: skills.length,
    experiences: experiences.length,
    testimonials: testimonials.length,
    clients: countUnique(projects.map((project) => project?.client)),
  };
}

function normalizePortfolioResponse(payload) {
  const data = unwrapData(payload);
  const projects = toArray(data.projects);
  const skills = toArray(data.skills);
  const experiences = toArray(data.experiences);
  const testimonials = toArray(data.testimonials);
  const metadata = {
    ...((payload && typeof payload === 'object' && payload.metadata) || {}),
    ...((data && typeof data === 'object' && data.metadata) || {}),
    counts: buildCounts(projects, skills, experiences, testimonials),
  };

  return {
    profile: data.profile || null,
    site: data.site || null,
    projects,
    skills,
    experiences,
    testimonials,
    metadata,
    raw: payload,
  };
}

function getShowcaseSlug() {
  return String(PORTFOLIO_CONFIG.SHOWCASE_SLUG || 'kowin-city').trim() || 'kowin-city';
}

async function requestPortfolioData() {
  return request(`showcase/site/${encodeURIComponent(getShowcaseSlug())}`);
}

export async function verifyConnection() {
  try {
    await requestPortfolioData();
    return true;
  } catch (error) {
    console.warn('API Connection Verification Failed:', error);
    return false;
  }
}

export async function getAll() {
  return normalizePortfolioResponse(await requestPortfolioData());
}

export async function getProjects() {
  const data = await getAll();
  return data.projects;
}

export async function getSkills() {
  const data = await getAll();
  return data.skills;
}

export async function getExperiences() {
  const data = await getAll();
  return data.experiences;
}

export async function getTestimonials() {
  const data = await getAll();
  return data.testimonials;
}

export async function getShowcaseSite() {
  return request(`showcase/site/${encodeURIComponent(getShowcaseSlug())}`);
}
