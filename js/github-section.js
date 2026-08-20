import {
  extractGitHubUsername,
  fetchGitHubOverview,
  GitHubApiError,
} from './github-api.js';
import { normalizeHref } from './url-utils.js';

const REPOSITORY_BATCH_SIZE = 6;

function clearNode(node) {
  node.textContent = '';
}

function createElement(documentRef, tagName, className, text) {
  const node = documentRef.createElement(tagName);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}

function appendTextElement(documentRef, parent, tagName, className, text) {
  if (text === undefined || text === null || text === '') return null;
  const node = createElement(documentRef, tagName, className, text);
  parent.appendChild(node);
  return node;
}

function createExternalLink(documentRef, href, className, text, label) {
  const safeHref = normalizeHref(href);
  if (!safeHref || !/^https:\/\//i.test(safeHref)) return null;

  const link = createElement(documentRef, 'a', className, text);
  link.setAttribute('href', safeHref);
  link.setAttribute('target', '_blank');
  link.setAttribute('rel', 'noreferrer noopener');
  if (label) link.setAttribute('aria-label', label);
  return link;
}

function formatCount(value) {
  return new Intl.NumberFormat('fr-FR', { notation: value >= 10000 ? 'compact' : 'standard' }).format(value);
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('fr-FR', { month: 'short', year: 'numeric' }).format(date);
}

function formatRetryAt(value) {
  if (typeof value !== 'string' || !value.trim()) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function createTime(documentRef, datetime, text, className = null) {
  const time = createElement(documentRef, 'time', className, text);
  time.setAttribute('datetime', datetime);
  return time;
}

function statusCopy(state) {
  switch (state.status) {
    case 'loading':
      return {
        eyebrow: 'Synchronisation GitHub',
        title: 'Lecture du profil et des dépôts…',
        description: 'Les informations publiques sont récupérées automatiquement depuis GitHub.',
      };
    case 'empty':
      return {
        eyebrow: 'Profil GitHub',
        title: state.invalid ? 'Lien GitHub non reconnu' : 'Profil GitHub non configuré',
        description: state.invalid
          ? 'Le lien public renseigné dans ZodBack ne correspond pas à un profil github.com valide.'
          : 'Ajoutez un lien GitHub au profil ZodBack pour activer automatiquement cet espace.',
      };
    case 'not-found':
      return {
        eyebrow: 'Profil introuvable',
        title: 'GitHub ne trouve pas ce compte',
        description: 'Le compte a peut-être été renommé ou rendu indisponible. Vérifiez le lien enregistré dans ZodBack.',
      };
    case 'rate-limit': {
      const retryTime = formatRetryAt(state.retryAt);
      return {
        eyebrow: 'Limite GitHub atteinte',
        title: 'Les informations sont temporairement indisponibles',
        description: retryTime
          ? `GitHub autorisera de nouvelles requêtes vers ${retryTime}. Vous pouvez réessayer ensuite.`
          : 'GitHub limite temporairement les consultations publiques. Réessayez dans quelques minutes.',
      };
    }
    case 'timeout':
      return {
        eyebrow: 'Délai dépassé',
        title: 'GitHub met trop de temps à répondre',
        description: 'La requête a été interrompue après 10 secondes afin de préserver la rapidité du portfolio.',
      };
    default:
      return {
        eyebrow: 'Connexion interrompue',
        title: 'Impossible de joindre GitHub',
        description: 'Le reste du portfolio reste disponible. Vérifiez votre connexion puis relancez la synchronisation.',
      };
  }
}

function renderStatus(documentRef, container, state, onRetry) {
  const copy = statusCopy(state);
  const card = createElement(documentRef, 'div', `github-state github-state--${state.status}`);
  card.setAttribute('role', state.status === 'loading' ? 'status' : 'alert');

  const symbol = createElement(documentRef, 'span', 'github-state__symbol', state.status === 'loading' ? '⌁' : 'GH');
  symbol.setAttribute('aria-hidden', 'true');
  card.appendChild(symbol);

  const content = createElement(documentRef, 'div', 'github-state__content');
  appendTextElement(documentRef, content, 'p', 'eyebrow', copy.eyebrow);
  appendTextElement(documentRef, content, 'h3', null, copy.title);
  appendTextElement(documentRef, content, 'p', 'github-state__description', copy.description);

  if (state.status === 'not-found' && state.profileUrl) {
    const profileLink = createExternalLink(
      documentRef,
      state.profileUrl,
      'github-state__profile-link',
      'Ouvrir le profil GitHub configuré',
      'Ouvrir le profil GitHub configuré dans un nouvel onglet',
    );
    if (profileLink) content.appendChild(profileLink);
  }

  if (state.status !== 'loading' && state.status !== 'empty' && typeof onRetry === 'function') {
    const retry = createElement(documentRef, 'button', 'btn btn--outline github-state__retry', 'Réessayer');
    retry.setAttribute('type', 'button');
    retry.addEventListener('click', onRetry);

    const retryAt = state.status === 'rate-limit' ? new Date(state.retryAt).getTime() : 0;
    const retryDelay = retryAt - Date.now();
    if (Number.isFinite(retryDelay) && retryDelay > 0) {
      retry.disabled = true;
      retry.setAttribute('aria-disabled', 'true');
      setTimeout(() => {
        retry.disabled = false;
        retry.removeAttribute('aria-disabled');
      }, Math.min(retryDelay, 2147483647));
    }
    content.appendChild(retry);
  }

  card.appendChild(content);
  container.appendChild(card);
}

function appendProfileDetail(documentRef, container, label, value, datetime = null) {
  if (!value) return;
  const group = createElement(documentRef, 'div', 'github-profile__detail');
  appendTextElement(documentRef, group, 'dt', 'github-profile__detail-label', label);
  const description = createElement(documentRef, 'dd');
  if (datetime) {
    description.appendChild(createTime(documentRef, datetime, value));
  } else {
    description.textContent = value;
  }
  group.appendChild(description);
  container.appendChild(group);
}

function appendProfileMetric(documentRef, container, value, label) {
  const group = createElement(documentRef, 'div', 'github-profile__metric');
  appendTextElement(documentRef, group, 'dt', null, label);
  appendTextElement(documentRef, group, 'dd', null, formatCount(value));
  container.appendChild(group);
}

function renderProfile(documentRef, profile) {
  const card = createElement(documentRef, 'article', 'github-profile');

  const identity = createElement(documentRef, 'div', 'github-profile__identity');
  if (profile.avatarUrl) {
    const avatar = createElement(documentRef, 'img', 'github-profile__avatar');
    avatar.setAttribute('src', profile.avatarUrl);
    avatar.setAttribute('alt', '');
    avatar.setAttribute('width', '112');
    avatar.setAttribute('height', '112');
    avatar.setAttribute('loading', 'lazy');
    avatar.setAttribute('referrerpolicy', 'no-referrer');
    identity.appendChild(avatar);
  } else {
    const fallback = createElement(documentRef, 'span', 'github-profile__avatar github-profile__avatar--fallback', 'GH');
    fallback.setAttribute('aria-hidden', 'true');
    identity.appendChild(fallback);
  }

  const names = createElement(documentRef, 'div', 'github-profile__names');
  appendTextElement(documentRef, names, 'p', 'github-profile__handle', `@${profile.login}`);
  appendTextElement(documentRef, names, 'h3', null, profile.name || profile.login);
  identity.appendChild(names);
  card.appendChild(identity);

  appendTextElement(
    documentRef,
    card,
    'p',
    'github-profile__bio',
    profile.bio || 'Profil développeur public synchronisé depuis GitHub.',
  );

  const details = createElement(documentRef, 'dl', 'github-profile__details');
  appendProfileDetail(documentRef, details, 'Organisation', profile.company);
  appendProfileDetail(documentRef, details, 'Localisation', profile.location);
  if (profile.createdAt) {
    appendProfileDetail(documentRef, details, 'Sur GitHub depuis', formatDate(profile.createdAt), profile.createdAt);
  }
  if (details.childNodes.length) card.appendChild(details);

  const metrics = createElement(documentRef, 'dl', 'github-profile__metrics');
  metrics.setAttribute('aria-label', 'Statistiques GitHub');
  appendProfileMetric(documentRef, metrics, profile.publicRepositories, 'dépôts publics');
  appendProfileMetric(documentRef, metrics, profile.followers, 'abonnés');
  appendProfileMetric(documentRef, metrics, profile.following, 'abonnements');
  card.appendChild(metrics);

  const actions = createElement(documentRef, 'div', 'github-profile__actions');
  const profileLink = createExternalLink(
    documentRef,
    profile.htmlUrl,
    'btn btn--primary',
    'Voir le profil GitHub',
    `Ouvrir le profil GitHub de ${profile.login} dans un nouvel onglet`,
  );
  if (profileLink) actions.appendChild(profileLink);

  const blogLink = createExternalLink(
    documentRef,
    profile.blogUrl,
    'btn btn--outline',
    'Site personnel',
    `Ouvrir le site personnel de ${profile.login} dans un nouvel onglet`,
  );
  if (blogLink) actions.appendChild(blogLink);
  if (actions.childNodes.length) card.appendChild(actions);

  return card;
}

function appendRepositoryStat(documentRef, container, symbol, value, label) {
  const item = createElement(documentRef, 'span', 'github-repository__stat');
  item.setAttribute('aria-label', `${formatCount(value)} ${label}`);
  appendTextElement(documentRef, item, 'span', null, symbol);
  appendTextElement(documentRef, item, 'span', null, formatCount(value));
  container.appendChild(item);
}

function renderRepository(documentRef, repository) {
  const listItem = createElement(documentRef, 'li', 'github-repository');
  const article = createElement(documentRef, 'article', 'github-repository__card');

  const heading = createElement(documentRef, 'h3', 'github-repository__title');
  const repositoryLink = createExternalLink(
    documentRef,
    repository.htmlUrl,
    null,
    repository.name,
    `Ouvrir le dépôt GitHub ${repository.fullName} dans un nouvel onglet`,
  );
  if (repositoryLink) heading.appendChild(repositoryLink);
  article.appendChild(heading);

  appendTextElement(
    documentRef,
    article,
    'p',
    'github-repository__description',
    repository.description || 'Aucune description publique pour ce dépôt.',
  );

  if (repository.topics.length) {
    const topics = createElement(documentRef, 'ul', 'github-repository__topics');
    topics.setAttribute('aria-label', `Thèmes du dépôt ${repository.name}`);
    repository.topics.slice(0, 3).forEach((topic) => {
      topics.appendChild(createElement(documentRef, 'li', null, topic));
    });
    article.appendChild(topics);
  }

  const footer = createElement(documentRef, 'div', 'github-repository__footer');
  if (repository.language) appendTextElement(documentRef, footer, 'span', 'github-repository__language', repository.language);
  appendRepositoryStat(documentRef, footer, '★', repository.stars, 'étoiles');
  appendRepositoryStat(documentRef, footer, '⑂', repository.forks, 'forks');
  if (repository.pushedAt || repository.updatedAt) {
    const updatedAt = repository.pushedAt || repository.updatedAt;
    footer.appendChild(createTime(
      documentRef,
      updatedAt,
      `Mis à jour ${formatDate(updatedAt)}`,
      'github-repository__updated',
    ));
  }
  article.appendChild(footer);
  listItem.appendChild(article);
  return listItem;
}

function renderSuccess(documentRef, container, state, onLoadMore) {
  if (state.overview.metadata?.stale) {
    const warning = createElement(documentRef, 'p', 'github-cache-warning');
    warning.setAttribute('role', 'status');
    warning.textContent = 'GitHub ne répond pas actuellement. Les dernières informations enregistrées restent affichées.';
    container.appendChild(warning);
  }

  const layout = createElement(documentRef, 'div', 'github-layout');
  layout.appendChild(renderProfile(documentRef, state.overview.profile));

  const repositoriesPanel = createElement(documentRef, 'div', 'github-repositories');
  const repositoriesHeader = createElement(documentRef, 'div', 'github-repositories__head');
  const titleGroup = createElement(documentRef, 'div');
  appendTextElement(documentRef, titleGroup, 'p', 'eyebrow', 'Dépôts publics sélectionnés');
  appendTextElement(documentRef, titleGroup, 'h3', null, 'Projets open source');
  repositoriesHeader.appendChild(titleGroup);
  appendTextElement(
    documentRef,
    repositoriesHeader,
    'span',
    'github-repositories__count',
    `${state.overview.repositories.length} dépôt${state.overview.repositories.length === 1 ? '' : 's'}`,
  );
  repositoriesPanel.appendChild(repositoriesHeader);

  if (!state.overview.repositories.length) {
    const empty = createElement(documentRef, 'div', 'github-repositories__empty');
    appendTextElement(documentRef, empty, 'p', null, 'Aucun dépôt public actif à présenter pour le moment.');
    repositoriesPanel.appendChild(empty);
  } else {
    const list = createElement(documentRef, 'ul', 'github-repositories__grid');
    list.setAttribute('aria-label', 'Dépôts GitHub publics');
    state.overview.repositories.slice(0, state.visibleCount).forEach((repository) => {
      list.appendChild(renderRepository(documentRef, repository));
    });
    repositoriesPanel.appendChild(list);

    const remaining = state.overview.repositories.length - state.visibleCount;
    if (remaining > 0 && typeof onLoadMore === 'function') {
      const actions = createElement(documentRef, 'div', 'github-repositories__actions');
      const nextCount = Math.min(REPOSITORY_BATCH_SIZE, remaining);
      const button = createElement(
        documentRef,
        'button',
        'btn btn--outline',
        `Afficher ${nextCount} dépôt${nextCount === 1 ? '' : 's'} de plus`,
      );
      button.setAttribute('type', 'button');
      button.setAttribute('aria-controls', 'githubContent');
      button.addEventListener('click', onLoadMore);
      actions.appendChild(button);
      repositoriesPanel.appendChild(actions);
    }
  }

  layout.appendChild(repositoriesPanel);
  container.appendChild(layout);
}

export function renderGitHubState(container, state, {
  documentRef = container?.ownerDocument,
  onRetry,
  onLoadMore,
} = {}) {
  if (!container || !documentRef) return false;
  clearNode(container);
  container.setAttribute('aria-busy', state.status === 'loading' ? 'true' : 'false');

  if (state.status === 'success') {
    renderSuccess(documentRef, container, state, onLoadMore);
  } else {
    renderStatus(documentRef, container, state, onRetry);
  }
  return true;
}

function errorState(error, profileUrl) {
  if (error instanceof GitHubApiError) {
    if (error.code === 'INVALID_SOURCE') return { status: 'empty', invalid: true };
    if (error.code === 'NOT_FOUND') return { status: 'not-found', profileUrl };
    if (error.code === 'RATE_LIMIT') return { status: 'rate-limit', retryAt: error.retryAt };
    if (error.code === 'TIMEOUT') return { status: 'timeout' };
  }
  return { status: 'network' };
}

export function createGitHubSectionController({
  container,
  documentRef = container?.ownerDocument,
  fetchOverview = fetchGitHubOverview,
} = {}) {
  if (!container || !documentRef) return null;

  let source = '';
  let overview = null;
  let visibleCount = REPOSITORY_BATCH_SIZE;
  let requestVersion = 0;

  const renderOverview = () => renderGitHubState(container, {
    status: 'success',
    overview,
    visibleCount,
  }, {
    documentRef,
    onLoadMore: () => {
      visibleCount = Math.min(visibleCount + REPOSITORY_BATCH_SIZE, overview.repositories.length);
      renderOverview();
    },
  });

  const load = async (nextSource = source, { forceRefresh = false } = {}) => {
    source = typeof nextSource === 'string' ? nextSource.trim() : '';
    const version = ++requestVersion;
    visibleCount = REPOSITORY_BATCH_SIZE;

    if (!source) {
      renderGitHubState(container, { status: 'empty', invalid: false }, { documentRef });
      return null;
    }

    renderGitHubState(container, { status: 'loading' }, { documentRef });
    try {
      const result = await fetchOverview(source, { forceRefresh });
      if (version !== requestVersion) return null;
      overview = result;
      renderOverview();
      return result;
    } catch (error) {
      if (version !== requestVersion) return null;
      renderGitHubState(container, errorState(error, source), {
        documentRef,
        onRetry: () => load(source, { forceRefresh: true }),
      });
      return null;
    }
  };

  return { load };
}

export function mountGitHubSection(source, options = {}) {
  const documentRef = options.documentRef || globalThis.document;
  const container = options.container || documentRef?.getElementById('githubContent');
  const navigationLink = options.navigationLink || documentRef?.getElementById('githubNavLink');
  const section = options.section || documentRef?.getElementById('github');
  const username = extractGitHubUsername(source);

  if (navigationLink) navigationLink.hidden = true;
  if (section) section.hidden = true;
  if (!username || !container || !navigationLink || !section) return null;

  const profileUrl = `https://github.com/${username}`;
  navigationLink.hidden = false;
  section.hidden = false;
  const controller = createGitHubSectionController({
    container,
    documentRef,
    fetchOverview: options.fetchOverview,
  });
  if (!controller) return null;
  void controller.load(profileUrl);
  return controller;
}
