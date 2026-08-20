import { describe, expect, test } from 'bun:test';

import { normalizePortfolioResponse } from '../js/api.js';
import { renderManualComposition, validateManualComposition } from '../js/composition-renderer.js';

class FakeElement {
  constructor(tagName, ownerDocument) {
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = ownerDocument;
    this.children = [];
    this.attributes = new Map();
    this.className = '';
    this.textContent = '';
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  replaceChildren(...children) {
    this.children = children;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }
}

class FakeDocument {
  createElement(tagName) {
    return new FakeElement(tagName, this);
  }
}

function node(id, component, props = {}, children = []) {
  return { id, component, componentVersion: 1, props, children, slots: {} };
}

function composition(overrides = {}) {
  return {
    schemaVersion: 'zodback.experience.v1',
    title: 'Manual Portfolio',
    document: {
      schema: 'zodback.experience.v1',
      kind: 'web-site',
      subtype: 'portfolio',
      routes: [{ path: '/', rootNodeId: 'root', visibility: 'PUBLIC' }],
      nodes: [
        node('root', 'core.container', { direction: 'row', gap: '6', padding: '8', align: 'center', className: 'evil-fixed' }, ['text', 'button', 'image']),
        node('text', 'core.text', { text: '<img src=x onerror=alert(1)>', variant: 'heading', align: 'right' }),
        node('button', 'core.button', { label: 'Unsafe action', href: 'javascript:alert(1)', variant: 'outline' }),
        node('image', 'core.image', { storageKey: 'shared-media/image.png', alt: 'Preview' }),
      ],
      theme: { tokens: {}, breakpoints: {} },
      bindings: [],
      actions: [],
      ...overrides,
    },
  };
}

function flatten(element) {
  return [element, ...element.children.flatMap(flatten)];
}

describe('manual Composition public renderer', () => {
  test('normalizes the discriminated showcase contract without legacy fallback', () => {
    const payload = {
      success: true,
      data: {
        renderMode: 'manual',
        site: { id: 1, title: 'Manual Portfolio' },
        composition: composition(),
      },
      metadata: { slug: 'manual-portfolio' },
    };

    expect(normalizePortfolioResponse(payload)).toMatchObject({
      renderMode: 'manual',
      site: { id: 1 },
      composition: { schemaVersion: 'zodback.experience.v1' },
      metadata: { slug: 'manual-portfolio' },
    });
  });

  test('creates only allowlisted DOM nodes and classes while keeping content inert', () => {
    const documentRef = new FakeDocument();
    const root = documentRef.createElement('main');

    expect(renderManualComposition(root, composition(), documentRef)).toBe(true);
    const rendered = flatten(root);
    const container = rendered.find((element) => element.getAttribute('data-composition-node') === 'root');
    const text = rendered.find((element) => element.getAttribute('data-composition-node') === 'text');
    const button = rendered.find((element) => element.getAttribute('data-composition-node') === 'button');
    const image = rendered.find((element) => element.getAttribute('data-composition-node') === 'image');

    expect(container.className).toContain('composition-container--row');
    expect(container.className).toContain('composition-gap--6');
    expect(container.className).not.toContain('evil-fixed');
    expect(text.textContent).toBe('<img src=x onerror=alert(1)>');
    expect(button.getAttribute('href')).toBeNull();
    expect(button.className).toContain('composition-button--outline');
    expect(image.textContent).toBe('Référence Storage : shared-media/image.png');
  });

  test('fails closed for non-core components, missing children, and cycles', () => {
    expect(validateManualComposition(composition({
      nodes: [node('root', 'portfolio.legacy-template')],
    }))).toBeNull();
    expect(validateManualComposition(composition({
      nodes: [node('root', 'core.container', {}, ['missing'])],
    }))).toBeNull();
    expect(validateManualComposition(composition({
      nodes: [node('root', 'core.container', {}, ['child']), node('child', 'core.container', {}, ['root'])],
    }))).toBeNull();
    expect(validateManualComposition(composition({
      routes: [{ path: '/', rootNodeId: 'root', visibility: 'PRIVATE' }],
    }))).toBeNull();
  });
});
