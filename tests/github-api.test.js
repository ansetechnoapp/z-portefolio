import { describe, expect, test } from 'bun:test';

import {
  createGitHubClient,
  extractGitHubUsername,
  GITHUB_FRESH_CACHE_TTL_MS,
  normalizeGitHubProfile,
  normalizeGitHubRepository,
  readGitHubCache,
  selectGitHubRepositories,
  writeGitHubCache,
} from '../js/github-api.js';
import { mountGitHubSection, renderGitHubState } from '../js/github-section.js';
import { normalizeHref } from '../js/url-utils.js';

const NOW = Date.parse('2026-08-20T10:00:00.000Z');

class MemoryStorage {
  constructor() {
    this.values = new Map();
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }

  removeItem(key) {
    this.values.delete(key);
  }
}

function profilePayload(overrides = {}) {
  return {
    login: 'octocat',
    name: 'The Octocat',
    bio: 'Open source builder',
    company: '@github',
    location: 'Internet',
    blog: 'https://github.blog',
    html_url: 'https://github.com/octocat',
    avatar_url: 'https://avatars.githubusercontent.com/u/583231?v=4',
    public_repos: 8,
    followers: 12000,
    following: 9,
    created_at: '2011-01-25T18:44:36Z',
    ...overrides,
  };
}

function repositoryPayload(id, overrides = {}) {
  return {
    id,
    name: `repository-${id}`,
    full_name: `octocat/repository-${id}`,
    html_url: `https://github.com/octocat/repository-${id}`,
    homepage: '',
    description: `Repository ${id}`,
    language: 'JavaScript',
    topics: ['portfolio', 'open-source'],
    stargazers_count: id,
    forks_count: 1,
    fork: false,
    archived: false,
    disabled: false,
    pushed_at: `2026-08-${String(Math.min(19, id)).padStart(2, '0')}T10:00:00Z`,
    updated_at: '2026-08-19T10:00:00Z',
    license: { spdx_id: 'MIT' },
    ...overrides,
  };
}

function normalizedOverview() {
  return {
    profile: normalizeGitHubProfile(profilePayload()),
    repositories: [normalizeGitHubRepository(repositoryPayload(1))],
  };
}

function jsonResponse(body, { status = 200, headers = {} } = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

function successfulFetch() {
  return async (url) => url.includes('/repos?')
    ? jsonResponse([repositoryPayload(1), repositoryPayload(2)])
    : jsonResponse(profilePayload());
}

describe('GitHub source and URL validation', () => {
  test('extracts a username only from supported HTTPS profile URLs', () => {
    expect(extractGitHubUsername('https://github.com/octocat')).toBe('octocat');
    expect(extractGitHubUsername('https://www.github.com/Octo-Cat/?tab=repositories')).toBe('Octo-Cat');
    expect(extractGitHubUsername('@octocat')).toBeNull();
    expect(extractGitHubUsername('octocat')).toBeNull();
  });

  test('rejects hostile, reserved, credentialed, and nested GitHub URLs', () => {
    const hostileValues = [
      'javascript:alert(1)',
      'https://evil.example/github.com/octocat',
      'https://github.com@evil.example/octocat',
      'https://github.com/octocat/repositories',
      'https://github.com/octocat%2Fevil',
      'http://github.com/octocat',
      'https://github.com:444/octocat',
      'https://github.com/settings',
    ];
    hostileValues.forEach((value) => expect(extractGitHubUsername(value)).toBeNull());
  });

  test('keeps safe internal and email links while refusing unsafe external schemes', () => {
    expect(normalizeHref('#github')).toBe('#github');
    expect(normalizeHref('mailto:hello@example.com?subject=Portfolio')).toBe('mailto:hello@example.com?subject=Portfolio');
    expect(normalizeHref('https://github.com/octocat')).toBe('https://github.com/octocat');
    expect(normalizeHref('javascript:alert(1)')).toBe('');
    expect(normalizeHref('data:text/html,<script>alert(1)</script>')).toBe('');
    expect(normalizeHref('https://octocat@evil.example')).toBe('');
    expect(normalizeHref('//evil.example/path')).toBe('');
  });
});

describe('GitHub runtime normalization', () => {
  test('normalizes nullable profile and repository fields without unsafe URLs', () => {
    const profile = normalizeGitHubProfile(profilePayload({
      name: null,
      bio: '',
      company: null,
      location: undefined,
      blog: 'javascript:alert(1)',
      avatar_url: null,
      created_at: null,
    }));
    const repository = normalizeGitHubRepository(repositoryPayload(4, {
      homepage: 'data:text/html,unsafe',
      description: null,
      language: '',
      pushed_at: null,
      license: null,
    }));

    expect(profile).toMatchObject({
      name: null,
      bio: null,
      company: null,
      location: null,
      blogUrl: null,
      avatarUrl: null,
      createdAt: null,
    });
    expect(repository).toMatchObject({
      homepageUrl: null,
      description: null,
      language: null,
      pushedAt: null,
      license: null,
    });
  });

  test('filters forks, archives, and disabled repositories then orders by push date', () => {
    const repositories = [
      normalizeGitHubRepository(repositoryPayload(1, { name: 'older', stargazers_count: 10, pushed_at: '2026-08-01T00:00:00Z' })),
      normalizeGitHubRepository(repositoryPayload(2, { name: 'newer', stargazers_count: 10, pushed_at: '2026-08-18T00:00:00Z' })),
      normalizeGitHubRepository(repositoryPayload(3, { name: 'popular', stargazers_count: 20 })),
      normalizeGitHubRepository(repositoryPayload(4, { fork: true, stargazers_count: 100 })),
      normalizeGitHubRepository(repositoryPayload(5, { archived: true, stargazers_count: 100 })),
      normalizeGitHubRepository(repositoryPayload(6, { disabled: true, stargazers_count: 100 })),
    ];

    expect(selectGitHubRepositories(repositories).map((repository) => repository.name)).toEqual([
      'newer',
      'popular',
      'older',
    ]);
  });
});

describe('GitHub cache and request coordination', () => {
  test('distinguishes fresh and stale cache entries and removes corrupted values', () => {
    const storage = new MemoryStorage();
    const overview = normalizedOverview();

    expect(writeGitHubCache(storage, 'octocat', overview, NOW - 1000)).toBe(true);
    expect(readGitHubCache(storage, 'octocat', NOW)).toMatchObject({ status: 'fresh' });

    expect(writeGitHubCache(storage, 'octocat', overview, NOW - GITHUB_FRESH_CACHE_TTL_MS - 1)).toBe(true);
    expect(readGitHubCache(storage, 'octocat', NOW)).toMatchObject({ status: 'stale' });

    const [key] = storage.values.keys();
    storage.setItem(key, '{not-json');
    expect(readGitHubCache(storage, 'octocat', NOW)).toEqual({ status: 'corrupt', data: null, storedAt: null });
    expect(storage.getItem(key)).toBeNull();
  });

  test('returns stale data for a retriable failure within 24 hours', async () => {
    const storage = new MemoryStorage();
    writeGitHubCache(storage, 'octocat', normalizedOverview(), NOW - GITHUB_FRESH_CACHE_TTL_MS - 10);
    const client = createGitHubClient({
      fetchImpl: async () => { throw new TypeError('offline'); },
      storage,
      now: () => NOW,
    });

    const result = await client.load('https://github.com/octocat');
    expect(result.metadata).toMatchObject({ source: 'cache', stale: true });
    expect(result.metadata.warning).toMatchObject({ code: 'NETWORK' });
  });

  test('deduplicates simultaneous requests for the same username in memory', async () => {
    let calls = 0;
    const client = createGitHubClient({
      fetchImpl: async (url) => {
        calls += 1;
        await Promise.resolve();
        return successfulFetch()(url);
      },
      storage: new MemoryStorage(),
      now: () => NOW,
    });

    await Promise.all([
      client.load('https://www.github.com/octocat'),
      client.load('https://github.com/octocat'),
    ]);
    expect(calls).toBe(2);
  });

  test('requests profile then owner repositories with the exact API contract', async () => {
    const calls = [];
    let profileParsed = false;
    const client = createGitHubClient({
      fetchImpl: async (url, options) => {
        calls.push({ url, version: options.headers['X-GitHub-Api-Version'] });
        if (calls.length === 1) {
          return {
            ok: true,
            status: 200,
            headers: new Headers(),
            json: async () => {
              profileParsed = true;
              return profilePayload();
            },
          };
        }
        expect(profileParsed).toBe(true);
        return jsonResponse([repositoryPayload(1)]);
      },
      storage: new MemoryStorage(),
      now: () => NOW,
    });

    await client.load('https://github.com/octocat');
    expect(calls).toEqual([
      {
        url: 'https://api.github.com/users/octocat',
        version: '2026-03-10',
      },
      {
        url: 'https://api.github.com/users/octocat/repos?type=owner&sort=pushed&direction=desc&per_page=30&page=1',
        version: '2026-03-10',
      },
    ]);
  });
});

describe('GitHub HTTP errors', () => {
  test('classifies a missing profile', async () => {
    let calls = 0;
    const client = createGitHubClient({
      fetchImpl: async () => {
        calls += 1;
        return jsonResponse({}, { status: 404 });
      },
      storage: new MemoryStorage(),
    });
    await expect(client.load('https://github.com/octocat')).rejects.toMatchObject({ code: 'NOT_FOUND', status: 404 });
    expect(calls).toBe(1);
  });

  test('never masks a 404 with stale cache data', async () => {
    const storage = new MemoryStorage();
    writeGitHubCache(storage, 'octocat', normalizedOverview(), NOW - GITHUB_FRESH_CACHE_TTL_MS - 10);
    const client = createGitHubClient({
      fetchImpl: async () => jsonResponse({}, { status: 404 }),
      storage,
      now: () => NOW,
    });
    await expect(client.load('https://github.com/octocat')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  test('classifies GitHub primary rate limiting', async () => {
    const client = createGitHubClient({
      fetchImpl: async () => jsonResponse({}, {
        status: 403,
        headers: {
          'x-ratelimit-remaining': '0',
          'x-ratelimit-reset': String(Math.floor(NOW / 1000) + 60),
        },
      }),
      storage: new MemoryStorage(),
      now: () => NOW,
    });
    await expect(client.load('https://github.com/octocat')).rejects.toMatchObject({ code: 'RATE_LIMIT', status: 403 });
  });

  test('recognizes a retry-after header on HTTP 403 as rate limiting', async () => {
    const client = createGitHubClient({
      fetchImpl: async () => jsonResponse({}, {
        status: 403,
        headers: { 'retry-after': '45' },
      }),
      storage: new MemoryStorage(),
      now: () => NOW,
    });
    await expect(client.load('https://github.com/octocat')).rejects.toMatchObject({
      code: 'RATE_LIMIT',
      status: 403,
      retryAt: new Date(NOW + 45000).toISOString(),
    });
  });

  test('classifies HTTP 429 and preserves retry timing', async () => {
    const client = createGitHubClient({
      fetchImpl: async () => jsonResponse({}, {
        status: 429,
        headers: { 'retry-after': '30' },
      }),
      storage: new MemoryStorage(),
      now: () => NOW,
    });
    await expect(client.load('https://github.com/octocat')).rejects.toMatchObject({
      code: 'RATE_LIMIT',
      status: 429,
      retryAt: new Date(NOW + 30000).toISOString(),
    });
  });

  test('aborts a GitHub request after the configured timeout', async () => {
    const client = createGitHubClient({
      fetchImpl: async (_url, options) => new Promise((_resolve, reject) => {
        options.signal.addEventListener('abort', () => {
          const error = new Error('aborted');
          error.name = 'AbortError';
          reject(error);
        }, { once: true });
      }),
      storage: new MemoryStorage(),
      timeoutMs: 5,
    });
    await expect(client.load('https://github.com/octocat')).rejects.toMatchObject({ code: 'TIMEOUT' });
  });
});

class FakeNode {
  constructor(tagName, ownerDocument) {
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = ownerDocument;
    this.children = [];
    this.attributes = new Map();
    this.className = '';
    this.ownText = '';
  }

  get childNodes() {
    return this.children;
  }

  set textContent(value) {
    this.ownText = String(value ?? '');
    this.children = [];
  }

  get textContent() {
    return `${this.ownText}${this.children.map((child) => child.textContent).join('')}`;
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  addEventListener() {}
}

class FakeDocument {
  constructor() {
    this.createdTags = [];
  }

  createElement(tagName) {
    this.createdTags.push(tagName.toLowerCase());
    return new FakeNode(tagName, this);
  }
}

function collectNodes(root, predicate, results = []) {
  if (predicate(root)) results.push(root);
  root.children.forEach((child) => collectNodes(child, predicate, results));
  return results;
}

describe('conditional GitHub visibility', () => {
  test('keeps the navigation and section hidden and performs no request for an invalid source', () => {
    const documentRef = new FakeDocument();
    const container = new FakeNode('div', documentRef);
    const navigationLink = new FakeNode('a', documentRef);
    const section = new FakeNode('section', documentRef);
    navigationLink.hidden = true;
    section.hidden = true;
    let calls = 0;

    const invalidController = mountGitHubSection('octocat', {
      container,
      navigationLink,
      section,
      documentRef,
      fetchOverview: async () => {
        calls += 1;
        return normalizedOverview();
      },
    });
    expect(invalidController).toBeNull();
    expect(calls).toBe(0);
    expect(navigationLink.hidden).toBe(true);
    expect(section.hidden).toBe(true);

    const validController = mountGitHubSection('https://github.com/octocat', {
      container,
      navigationLink,
      section,
      documentRef,
      fetchOverview: async () => {
        calls += 1;
        return { ...normalizedOverview(), metadata: { stale: false } };
      },
    });
    expect(validController).not.toBeNull();
    expect(calls).toBe(1);
    expect(navigationLink.hidden).toBe(false);
    expect(section.hidden).toBe(false);
  });

  test('declares the GitHub link and section hidden in the initial HTML and places them after projects', async () => {
    const source = await Bun.file(new URL('../index.html', import.meta.url)).text();
    expect(source).toContain('id="githubNavLink" href="#github" hidden');
    expect(source).toContain('id="github" aria-labelledby="github-title" hidden');
    expect(source.indexOf('id="githubNavLink"')).toBeGreaterThan(source.indexOf('href="#realisations">Projets'));
    expect(source.indexOf('id="githubNavLink"')).toBeLessThan(source.indexOf('href="#expertises">Services'));
    expect(source.indexOf('id="github" aria-labelledby')).toBeGreaterThan(source.indexOf('id="a-propos"'));
    expect(source.indexOf('id="github" aria-labelledby')).toBeLessThan(source.indexOf('id="expertises"'));
  });
});

describe('safe GitHub rendering', () => {
  test('uses generic rate-limit copy when retryAt is absent', () => {
    const documentRef = new FakeDocument();
    const container = new FakeNode('div', documentRef);
    renderGitHubState(container, {
      status: 'rate-limit',
      retryAt: null,
    }, { documentRef, onRetry: () => {} });

    expect(container.textContent).toContain('Réessayez dans quelques minutes.');
    expect(container.textContent).not.toContain('00:00');
  });

  test('keeps the validated profile link in the 404 state', () => {
    const documentRef = new FakeDocument();
    const container = new FakeNode('div', documentRef);
    renderGitHubState(container, {
      status: 'not-found',
      profileUrl: 'https://github.com/octocat',
    }, { documentRef, onRetry: () => {} });

    const [profileLink] = collectNodes(container, (node) => node.className === 'github-state__profile-link');
    expect(profileLink.attributes.get('href')).toBe('https://github.com/octocat');
  });

  test('reenables rate-limit retry without triggering a request automatically', async () => {
    const documentRef = new FakeDocument();
    const container = new FakeNode('div', documentRef);
    let retryCalls = 0;
    renderGitHubState(container, {
      status: 'rate-limit',
      retryAt: new Date(Date.now() + 15).toISOString(),
    }, {
      documentRef,
      onRetry: () => { retryCalls += 1; },
    });

    const [retry] = collectNodes(container, (node) => node.className.includes('github-state__retry'));
    expect(retry.disabled).toBe(true);
    expect(retryCalls).toBe(0);
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(retry.disabled).toBe(false);
    expect(retryCalls).toBe(0);
  });

  test('renders remote strings as text without interpreting injected HTML', async () => {
    const documentRef = new FakeDocument();
    const container = new FakeNode('div', documentRef);
    const maliciousName = '<img src=x onerror=alert(1)>';
    const maliciousBio = '<script>globalThis.compromised=true</script>';
    const maliciousTopic = '<svg onload=alert(1)>';
    const profile = normalizeGitHubProfile(profilePayload({
      name: maliciousName,
      bio: maliciousBio,
    }));
    const repository = normalizeGitHubRepository(repositoryPayload(1, {
      name: maliciousName,
      full_name: `octocat/${maliciousName}`,
      description: maliciousBio,
      topics: [maliciousTopic, 'second', 'third', 'fourth'],
    }));

    expect(renderGitHubState(container, {
      status: 'success',
      overview: { profile, repositories: [repository], metadata: { stale: false } },
      visibleCount: 6,
    }, { documentRef })).toBe(true);

    expect(container.textContent).toContain(maliciousName);
    expect(container.textContent).toContain(maliciousBio);
    expect(container.textContent).toContain(maliciousTopic);
    expect(documentRef.createdTags).not.toContain('script');
    expect(documentRef.createdTags).not.toContain('svg');
    expect(documentRef.createdTags).toContain('dl');
    expect(documentRef.createdTags).toContain('dt');
    expect(documentRef.createdTags).toContain('dd');

    const [avatar] = collectNodes(container, (node) => node.tagName === 'IMG');
    expect(avatar.attributes.get('alt')).toBe('');
    const [topics] = collectNodes(container, (node) => node.className === 'github-repository__topics');
    expect(topics.children).toHaveLength(3);
    const times = collectNodes(container, (node) => node.tagName === 'TIME');
    expect(times).toHaveLength(2);
    times.forEach((time) => expect(time.attributes.get('datetime')).toBeTruthy());

    const viewSource = await Bun.file(new URL('../js/github-section.js', import.meta.url)).text();
    expect(viewSource).not.toContain('innerHTML');
  });
});
