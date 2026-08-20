const ALLOWED_COMPONENTS = new Set([
  'core.container',
  'core.text',
  'core.image',
  'core.button',
  'core.hero',
  'core.navigation',
  'core.footer',
]);

const DIRECTION_CLASS = { row: 'composition-container--row', column: 'composition-container--column' };
const GAP_CLASS = { 0: 'composition-gap--0', 2: 'composition-gap--2', 4: 'composition-gap--4', 6: 'composition-gap--6', 8: 'composition-gap--8' };
const PADDING_CLASS = { 0: 'composition-padding--0', 2: 'composition-padding--2', 4: 'composition-padding--4', 6: 'composition-padding--6', 8: 'composition-padding--8' };
const ALIGN_CLASS = { left: 'composition-align--left', center: 'composition-align--center', right: 'composition-align--right' };
const TEXT_VARIANT_CLASS = { body: 'composition-text--body', lead: 'composition-text--lead', heading: 'composition-text--heading' };
const HERO_TONE_CLASS = { light: 'composition-hero--light', dark: 'composition-hero--dark', muted: 'composition-hero--muted' };
const BUTTON_VARIANT_CLASS = { primary: 'composition-button--primary', secondary: 'composition-button--secondary', outline: 'composition-button--outline' };

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function text(value, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function pickClass(value, allowed, fallback) {
  return allowed[text(value)] || allowed[fallback] || '';
}

function internalHref(value) {
  const href = text(value).trim();
  if (!href.startsWith('/') || href.startsWith('//') || /[\u0000-\u001f\u007f]/.test(href)) return '';
  return href;
}

function addClasses(node, ...classes) {
  const safeClasses = classes.flatMap((value) => String(value || '').split(/\s+/)).filter(Boolean);
  node.className = safeClasses.join(' ');
}

function hasCycle(rootId, nodes) {
  const visiting = new Set();
  const visited = new Set();
  const visit = (nodeId) => {
    if (visiting.has(nodeId)) return true;
    if (visited.has(nodeId)) return false;
    visiting.add(nodeId);
    const node = nodes.get(nodeId);
    if (!node || node.children.some(visit)) return true;
    visiting.delete(nodeId);
    visited.add(nodeId);
    return false;
  };
  return visit(rootId);
}

export function validateManualComposition(composition) {
  if (!isRecord(composition) || !isRecord(composition.document)) return null;
  const document = composition.document;
  if (document.schema !== 'zodback.experience.v1' || document.kind !== 'web-site') return null;
  if (!Array.isArray(document.routes) || document.routes.length === 0) return null;
  if (!Array.isArray(document.nodes) || document.nodes.length === 0 || document.nodes.length > 100) return null;

  const nodes = new Map();
  for (const node of document.nodes) {
    if (!isRecord(node) || typeof node.id !== 'string' || !node.id || nodes.has(node.id)) return null;
    if (!ALLOWED_COMPONENTS.has(node.component) || node.componentVersion !== 1) return null;
    if (!isRecord(node.props) || !Array.isArray(node.children) || !isRecord(node.slots)) return null;
    if (!node.children.every((childId) => typeof childId === 'string')) return null;
    nodes.set(node.id, node);
  }

  const route = document.routes.find(
    (candidate) => isRecord(candidate) && candidate.path === '/' && candidate.visibility === 'PUBLIC',
  );
  if (!route || typeof route.rootNodeId !== 'string' || !nodes.has(route.rootNodeId)) return null;
  for (const node of nodes.values()) {
    if (node.children.some((childId) => !nodes.has(childId))) return null;
  }
  if (hasCycle(route.rootNodeId, nodes)) return null;
  return { document, nodes, rootNodeId: route.rootNodeId };
}

function createLink(documentRef, label, href, className) {
  const anchor = documentRef.createElement('a');
  anchor.textContent = label;
  addClasses(anchor, className);
  const safeHref = internalHref(href);
  if (safeHref) anchor.setAttribute('href', safeHref);
  return anchor;
}

function renderNode(node, nodes, documentRef, visited) {
  if (visited.has(node.id)) return null;
  const nextVisited = new Set(visited).add(node.id);
  const props = node.props;
  let element;

  switch (node.component) {
    case 'core.container':
      element = documentRef.createElement('div');
      addClasses(
        element,
        'composition-node composition-container',
        pickClass(props.direction, DIRECTION_CLASS, 'column'),
        pickClass(props.gap, GAP_CLASS, '0'),
        pickClass(props.padding, PADDING_CLASS, '0'),
        pickClass(props.align, ALIGN_CLASS, 'left'),
      );
      node.children.forEach((childId) => {
        const child = renderNode(nodes.get(childId), nodes, documentRef, nextVisited);
        if (child) element.appendChild(child);
      });
      break;
    case 'core.text':
      element = documentRef.createElement('p');
      element.textContent = text(props.text);
      addClasses(element, 'composition-node composition-text', pickClass(props.variant, TEXT_VARIANT_CLASS, 'body'), pickClass(props.align, ALIGN_CLASS, 'left'));
      break;
    case 'core.image': {
      element = documentRef.createElement('figure');
      const storageKey = text(props.storageKey);
      element.textContent = storageKey ? `Référence Storage : ${storageKey}` : text(props.alt, 'Image sans référence Storage');
      addClasses(element, 'composition-node composition-image-placeholder');
      break;
    }
    case 'core.button':
      element = createLink(documentRef, text(props.label, 'Action'), props.href, `composition-node composition-button ${pickClass(props.variant, BUTTON_VARIANT_CLASS, 'primary')}`);
      break;
    case 'core.hero': {
      element = documentRef.createElement('section');
      addClasses(element, 'composition-node composition-hero', pickClass(props.backgroundTone, HERO_TONE_CLASS, 'light'));
      const heading = documentRef.createElement('h1');
      heading.textContent = text(props.headline, 'Portfolio');
      element.appendChild(heading);
      const subheadline = text(props.subheadline);
      if (subheadline) {
        const paragraph = documentRef.createElement('p');
        paragraph.textContent = subheadline;
        element.appendChild(paragraph);
      }
      const ctaLabel = text(props.ctaLabel);
      if (ctaLabel) element.appendChild(createLink(documentRef, ctaLabel, props.ctaHref, 'composition-button composition-button--primary'));
      break;
    }
    case 'core.navigation': {
      element = documentRef.createElement('nav');
      element.setAttribute('aria-label', 'Navigation du site');
      addClasses(element, 'composition-node composition-navigation', pickClass(props.align, ALIGN_CLASS, 'left'));
      const items = Array.isArray(props.items) ? props.items : [];
      items.forEach((item) => {
        if (!isRecord(item)) return;
        element.appendChild(createLink(documentRef, text(item.label, 'Lien'), item.href, 'composition-navigation__link'));
      });
      break;
    }
    case 'core.footer':
      element = documentRef.createElement('footer');
      element.textContent = text(props.content);
      addClasses(element, 'composition-node composition-footer', pickClass(props.align, ALIGN_CLASS, 'left'));
      break;
    default:
      return null;
  }

  element.setAttribute('data-composition-node', node.id);
  return element;
}

export function renderManualComposition(root, composition, documentRef = root?.ownerDocument || globalThis.document) {
  const validated = validateManualComposition(composition);
  if (!root || !documentRef || !validated) return false;
  const shell = documentRef.createElement('div');
  addClasses(shell, 'manual-composition');
  shell.setAttribute('data-composition-schema', validated.document.schema);
  const renderedRoot = renderNode(validated.nodes.get(validated.rootNodeId), validated.nodes, documentRef, new Set());
  if (!renderedRoot) return false;
  shell.appendChild(renderedRoot);
  root.replaceChildren(shell);
  return true;
}
