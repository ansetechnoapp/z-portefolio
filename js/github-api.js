const GITHUB_API_BASE_URL = 'https://api.github.com';
const GITHUB_CACHE_PREFIX = 'zodback:portfolio:github:v1:';
const GITHUB_CACHE_VERSION = 1;
const GITHUB_USERNAME_PATTERN = /^(?!-)(?!.*--)[A-Za-z0-9-]{1,39}(?<!-)$/;
const RESERVED_GITHUB_PATHS = new Set([
  'about',
  'apps',
  'collections',
  'contact',
  'copilot',
  'customer-stories',
  'enterprise',
  'events',
  'explore',
  'features',
  'issues',
  'login',
  'marketplace',
  'new',
  'notifications',
  'orgs',
  'organizations',
  'pricing',
  'readme',
  'search',
  'security',
  'settings',
  'site',
  'sponsors',
  'topics',
  'trending',
]);

export const GITHUB_FRESH_CACHE_TTL_MS = 15 * 60 * 1000;
export const GITHUB_STALE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
export const GITHUB_REQUEST_TIMEOUT_MS = 10 * 1000;
export const GITHUB_MAX_REPOSITORIES = 30;

export class GitHubApiError extends Error {
  constructor(code, message, options = {}) {
    super(message, options.cause ? { cause: options.cause } : undefined);
    this.name = 'GitHubApiError';
    this.code = code;
    this.status = options.status ?? null;
    this.retryAt = options.retryAt ?? null;
  }
}

function getHeader(headers, name) {
  if (!headers || typeof headers.get !== 'function') return null;
  return headers.get(name);
}

function cacheKey(username) {
  return `${GITHUB_CACHE_PREFIX}${username.toLowerCase()}`;
}

function removeCacheEntry(storage, key) {
  try {
    storage?.removeItem?.(key);
  } catch {
    // A disabled or full browser storage must never block the live request.
  }
}

function requiredString(value, field) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new GitHubApiError('INVALID_RESPONSE', `GitHub field "${field}" is missing`);
  }
  return value.trim();
}

function nullableString(value, field) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') {
    throw new GitHubApiError('INVALID_RESPONSE', `GitHub field "${field}" is invalid`);
  }
  return value.trim() || null;
}

function nonNegativeInteger(value, field) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new GitHubApiError('INVALID_RESPONSE', `GitHub field "${field}" is invalid`);
  }
  return Math.trunc(value);
}

function booleanValue(value, field) {
  if (typeof value !== 'boolean') {
    throw new GitHubApiError('INVALID_RESPONSE', `GitHub field "${field}" is invalid`);
  }
  return value;
}

function nullableDate(value, field) {
  const normalized = nullableString(value, field);
  if (!normalized) return null;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    throw new GitHubApiError('INVALID_RESPONSE', `GitHub field "${field}" is invalid`);
  }
  return date.toISOString();
}

export function normalizeExternalUrl(value, { nullable = false, allowedHosts = null } = {}) {
  const reject = (message) => {
    if (nullable) return null;
    throw new GitHubApiError('INVALID_RESPONSE', message);
  };

  if (value === null || value === undefined || value === '') {
    if (nullable) return null;
    throw new GitHubApiError('INVALID_RESPONSE', 'A required GitHub URL is missing');
  }
  if (typeof value !== 'string') {
    return reject('A GitHub URL is invalid');
  }

  const trimmed = value.trim();
  if (!trimmed && nullable) return null;

  let url;
  try {
    url = new URL(trimmed);
  } catch {
    if (nullable && /^[A-Za-z0-9.-]+(?:\/[^\s]*)?$/.test(trimmed)) {
      try {
        url = new URL(`https://${trimmed}`);
      } catch {
        return null;
      }
    } else {
      return reject('A GitHub URL is invalid');
    }
  }

  if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) {
    return reject('An unsafe GitHub URL was rejected');
  }

  if (allowedHosts) {
    const hostname = url.hostname.toLowerCase();
    const matches = allowedHosts.some((host) => hostname === host || hostname.endsWith(`.${host}`));
    if (!matches) {
      return reject('An unexpected GitHub URL host was rejected');
    }
  }

  return url.href;
}

export function extractGitHubUsername(value) {
  if (typeof value !== 'string') return null;
  const candidate = value.trim();
  if (!candidate) return null;

  let url;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }

  const hostname = url.hostname.toLowerCase();
  if (url.protocol !== 'https:' || !['github.com', 'www.github.com'].includes(hostname)) return null;
  if (url.username || url.password || url.port) return null;

  const segments = url.pathname.split('/').filter(Boolean);
  if (segments.length !== 1) return null;

  let username;
  try {
    username = decodeURIComponent(segments[0]);
  } catch {
    return null;
  }

  if (!GITHUB_USERNAME_PATTERN.test(username)) return null;
  if (RESERVED_GITHUB_PATHS.has(username.toLowerCase())) return null;
  return username;
}

export function normalizeGitHubProfile(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new GitHubApiError('INVALID_RESPONSE', 'GitHub profile response is invalid');
  }

  const login = requiredString(value.login, 'login');
  if (!GITHUB_USERNAME_PATTERN.test(login)) {
    throw new GitHubApiError('INVALID_RESPONSE', 'GitHub profile login is invalid');
  }

  return {
    login,
    name: nullableString(value.name, 'name'),
    bio: nullableString(value.bio, 'bio'),
    company: nullableString(value.company, 'company'),
    location: nullableString(value.location, 'location'),
    blogUrl: normalizeExternalUrl(value.blog, { nullable: true }),
    htmlUrl: normalizeExternalUrl(value.html_url, { allowedHosts: ['github.com'] }),
    avatarUrl: normalizeExternalUrl(value.avatar_url, {
      nullable: true,
      allowedHosts: ['githubusercontent.com'],
    }),
    publicRepositories: nonNegativeInteger(value.public_repos, 'public_repos'),
    followers: nonNegativeInteger(value.followers, 'followers'),
    following: nonNegativeInteger(value.following, 'following'),
    createdAt: nullableDate(value.created_at, 'created_at'),
  };
}

export function normalizeGitHubRepository(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new GitHubApiError('INVALID_RESPONSE', 'GitHub repository response is invalid');
  }

  const topics = value.topics === undefined || value.topics === null
    ? []
    : Array.isArray(value.topics)
      ? value.topics.filter((topic) => typeof topic === 'string' && topic.trim()).map((topic) => topic.trim())
      : null;
  if (!topics) {
    throw new GitHubApiError('INVALID_RESPONSE', 'GitHub field "topics" is invalid');
  }

  return {
    id: nonNegativeInteger(value.id, 'id'),
    name: requiredString(value.name, 'name'),
    fullName: requiredString(value.full_name, 'full_name'),
    htmlUrl: normalizeExternalUrl(value.html_url, { allowedHosts: ['github.com'] }),
    homepageUrl: normalizeExternalUrl(value.homepage, { nullable: true }),
    description: nullableString(value.description, 'description'),
    language: nullableString(value.language, 'language'),
    topics,
    stars: nonNegativeInteger(value.stargazers_count, 'stargazers_count'),
    forks: nonNegativeInteger(value.forks_count, 'forks_count'),
    isFork: booleanValue(value.fork, 'fork'),
    isArchived: booleanValue(value.archived, 'archived'),
    isDisabled: booleanValue(value.disabled, 'disabled'),
    pushedAt: nullableDate(value.pushed_at, 'pushed_at'),
    updatedAt: nullableDate(value.updated_at, 'updated_at'),
    license: nullableString(value.license?.spdx_id, 'license.spdx_id'),
  };
}

export function selectGitHubRepositories(repositories, maximum = GITHUB_MAX_REPOSITORIES) {
  if (!Array.isArray(repositories)) {
    throw new GitHubApiError('INVALID_RESPONSE', 'GitHub repositories response is invalid');
  }

  return repositories
    .filter((repository) => !repository.isFork && !repository.isArchived && !repository.isDisabled)
    .sort((left, right) => {
      const activityDelta = new Date(right.pushedAt || right.updatedAt || 0) - new Date(left.pushedAt || left.updatedAt || 0);
      if (!Number.isNaN(activityDelta) && activityDelta !== 0) return activityDelta;
      return left.name.localeCompare(right.name, 'fr', { sensitivity: 'base' });
    })
    .slice(0, Math.max(0, Math.min(GITHUB_MAX_REPOSITORIES, Number(maximum) || 0)));
}

export function normalizeGitHubOverview(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new GitHubApiError('INVALID_RESPONSE', 'Cached GitHub data is invalid');
  }

  const profile = normalizeGitHubProfile({
    login: value.profile?.login,
    name: value.profile?.name,
    bio: value.profile?.bio,
    company: value.profile?.company,
    location: value.profile?.location,
    blog: value.profile?.blogUrl,
    html_url: value.profile?.htmlUrl,
    avatar_url: value.profile?.avatarUrl,
    public_repos: value.profile?.publicRepositories,
    followers: value.profile?.followers,
    following: value.profile?.following,
    created_at: value.profile?.createdAt,
  });

  if (!Array.isArray(value.repositories)) {
    throw new GitHubApiError('INVALID_RESPONSE', 'Cached GitHub repositories are invalid');
  }

  const repositories = value.repositories.map((repository) => normalizeGitHubRepository({
    id: repository?.id,
    name: repository?.name,
    full_name: repository?.fullName,
    html_url: repository?.htmlUrl,
    homepage: repository?.homepageUrl,
    description: repository?.description,
    language: repository?.language,
    topics: repository?.topics,
    stargazers_count: repository?.stars,
    forks_count: repository?.forks,
    fork: repository?.isFork,
    archived: repository?.isArchived,
    disabled: repository?.isDisabled,
    pushed_at: repository?.pushedAt,
    updated_at: repository?.updatedAt,
    license: repository?.license ? { spdx_id: repository.license } : null,
  }));

  return { profile, repositories: selectGitHubRepositories(repositories) };
}

export function readGitHubCache(storage, username, now = Date.now()) {
  if (!storage || !username) return { status: 'miss', data: null, storedAt: null };
  const key = cacheKey(username);
  let raw;

  try {
    raw = storage.getItem(key);
  } catch {
    return { status: 'miss', data: null, storedAt: null };
  }
  if (!raw) return { status: 'miss', data: null, storedAt: null };

  try {
    const parsed = JSON.parse(raw);
    if (parsed?.version !== GITHUB_CACHE_VERSION || !Number.isFinite(parsed?.storedAt)) {
      throw new Error('Invalid cache metadata');
    }

    const age = now - parsed.storedAt;
    if (age < 0) throw new Error('Cache timestamp is in the future');
    if (age > GITHUB_STALE_CACHE_TTL_MS) {
      removeCacheEntry(storage, key);
      return { status: 'expired', data: null, storedAt: parsed.storedAt };
    }

    const data = normalizeGitHubOverview(parsed.data);
    return {
      status: age <= GITHUB_FRESH_CACHE_TTL_MS ? 'fresh' : 'stale',
      data,
      storedAt: parsed.storedAt,
    };
  } catch {
    removeCacheEntry(storage, key);
    return { status: 'corrupt', data: null, storedAt: null };
  }
}

export function writeGitHubCache(storage, username, data, storedAt = Date.now()) {
  if (!storage || !username) return false;
  try {
    const normalized = normalizeGitHubOverview(data);
    storage.setItem(cacheKey(username), JSON.stringify({
      version: GITHUB_CACHE_VERSION,
      storedAt,
      data: normalized,
    }));
    return true;
  } catch {
    return false;
  }
}

function parseRetryAt(response, now) {
  const resetSeconds = Number(getHeader(response.headers, 'x-ratelimit-reset'));
  if (Number.isFinite(resetSeconds) && resetSeconds > 0) {
    return new Date(resetSeconds * 1000).toISOString();
  }

  const retryAfter = getHeader(response.headers, 'retry-after');
  if (!retryAfter) return null;
  const delaySeconds = Number(retryAfter);
  if (Number.isFinite(delaySeconds) && delaySeconds >= 0) {
    return new Date(now() + delaySeconds * 1000).toISOString();
  }
  const date = new Date(retryAfter);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function responseError(response, now) {
  if (response.status === 404) {
    return new GitHubApiError('NOT_FOUND', 'GitHub profile was not found', { status: 404 });
  }

  const remaining = getHeader(response.headers, 'x-ratelimit-remaining');
  if (response.status === 429 || (response.status === 403 && (remaining === '0' || getHeader(response.headers, 'retry-after')))) {
    return new GitHubApiError('RATE_LIMIT', 'GitHub request limit was reached', {
      status: response.status,
      retryAt: parseRetryAt(response, now),
    });
  }

  return new GitHubApiError('HTTP_ERROR', `GitHub returned HTTP ${response.status}`, {
    status: response.status,
  });
}

async function requestJson(url, { fetchImpl, timeoutMs, now }) {
  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetchImpl(url, {
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2026-03-10',
      },
      signal: controller.signal,
    });

    if (!response || typeof response.ok !== 'boolean') {
      throw new GitHubApiError('INVALID_RESPONSE', 'GitHub response is invalid');
    }
    if (!response.ok) throw responseError(response, now);

    try {
      return await response.json();
    } catch (error) {
      throw new GitHubApiError('INVALID_RESPONSE', 'GitHub returned invalid JSON', { cause: error });
    }
  } catch (error) {
    if (error instanceof GitHubApiError) throw error;
    if (timedOut || error?.name === 'AbortError') {
      throw new GitHubApiError('TIMEOUT', 'GitHub request timed out', { cause: error });
    }
    throw new GitHubApiError('NETWORK', 'GitHub could not be reached', { cause: error });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchOverview(username, dependencies) {
  const encodedUsername = encodeURIComponent(username);
  const profilePayload = await requestJson(`${GITHUB_API_BASE_URL}/users/${encodedUsername}`, dependencies);
  const profile = normalizeGitHubProfile(profilePayload);
  const repositoriesPayload = await requestJson(
    `${GITHUB_API_BASE_URL}/users/${encodedUsername}/repos?type=owner&sort=pushed&direction=desc&per_page=30&page=1`,
    dependencies,
  );
  if (!Array.isArray(repositoriesPayload)) {
    throw new GitHubApiError('INVALID_RESPONSE', 'GitHub repositories response is invalid');
  }
  const repositories = selectGitHubRepositories(repositoriesPayload.map(normalizeGitHubRepository));
  return { profile, repositories };
}

function canUseStaleCache(error) {
  if (!(error instanceof GitHubApiError)) return false;
  if (['NETWORK', 'TIMEOUT', 'RATE_LIMIT'].includes(error.code)) return true;
  return error.code === 'HTTP_ERROR' && (
    (typeof error.status === 'number' && error.status >= 500) ||
    error.status === 408 ||
    error.status === 425
  );
}

export function createGitHubClient({
  fetchImpl = globalThis.fetch,
  storage = globalThis.localStorage,
  now = () => Date.now(),
  timeoutMs = GITHUB_REQUEST_TIMEOUT_MS,
} = {}) {
  if (typeof fetchImpl !== 'function') {
    throw new GitHubApiError('CONFIGURATION', 'Fetch is not available');
  }

  const inFlight = new Map();

  return {
    async load(source, { forceRefresh = false } = {}) {
      const username = extractGitHubUsername(source);
      if (!username) {
        throw new GitHubApiError('INVALID_SOURCE', 'The configured GitHub profile URL is invalid');
      }

      const key = username.toLowerCase();
      const cached = readGitHubCache(storage, username, now());
      if (!forceRefresh && cached.status === 'fresh') {
        return {
          ...cached.data,
          metadata: { username, source: 'cache', stale: false, storedAt: cached.storedAt, warning: null },
        };
      }

      if (inFlight.has(key)) return inFlight.get(key);

      const staleCandidate = ['fresh', 'stale'].includes(cached.status) ? cached : null;
      const pending = (async () => {
        try {
          const data = await fetchOverview(username, { fetchImpl, timeoutMs, now });
          const storedAt = now();
          writeGitHubCache(storage, username, data, storedAt);
          return {
            ...data,
            metadata: { username, source: 'network', stale: false, storedAt, warning: null },
          };
        } catch (error) {
          const normalizedError = error instanceof GitHubApiError
            ? error
            : new GitHubApiError('NETWORK', 'GitHub could not be reached', { cause: error });
          if (staleCandidate && canUseStaleCache(normalizedError)) {
            return {
              ...staleCandidate.data,
              metadata: {
                username,
                source: 'cache',
                stale: true,
                storedAt: staleCandidate.storedAt,
                warning: normalizedError,
              },
            };
          }
          throw normalizedError;
        } finally {
          inFlight.delete(key);
        }
      })();

      inFlight.set(key, pending);
      return pending;
    },
  };
}

const defaultClient = createGitHubClient();

export function fetchGitHubOverview(source, options) {
  return defaultClient.load(source, options);
}
