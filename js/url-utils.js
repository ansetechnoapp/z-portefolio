const INTERNAL_FRAGMENT_PATTERN = /^#[A-Za-z][A-Za-z0-9_:.-]*$/;
const SAFE_RELATIVE_PATH_PATTERN = /^(?:\.{0,2}\/|\/[^/])[A-Za-z0-9._~!$&'()*+,;=:@%/?#-]*$/;

function hasUnsafeCharacters(value) {
  return /[\u0000-\u001F\u007F]/.test(value);
}

function normalizeMailto(href) {
  if (!/^mailto:/i.test(href) || hasUnsafeCharacters(href)) return '';

  const address = href.slice(href.indexOf(':') + 1).split('?')[0].trim();
  if (!address || /[\s<>"']/.test(address)) return '';

  try {
    const url = new URL(href);
    return url.protocol === 'mailto:' ? href : '';
  } catch {
    return '';
  }
}

export function normalizeHref(value) {
  const href = typeof value === 'string' ? value.trim() : '';
  if (!href || href === '#' || hasUnsafeCharacters(href)) return '';

  if (href.startsWith('#')) {
    return INTERNAL_FRAGMENT_PATTERN.test(href) ? href : '';
  }

  if (/^mailto:/i.test(href)) {
    return normalizeMailto(href);
  }

  if (href.startsWith('//')) return '';
  if (SAFE_RELATIVE_PATH_PATTERN.test(href)) return href;

  try {
    const url = new URL(href);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    if (!url.hostname || url.username || url.password) return '';
    return url.href;
  } catch {
    return '';
  }
}

export function isExternalHref(value) {
  const href = normalizeHref(value);
  if (!href) return false;

  try {
    const url = new URL(href);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
