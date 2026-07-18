'use strict';

import { getAll } from './api.js';

const header = document.getElementById('header');
const nav = document.getElementById('nav');
const navToggle = document.getElementById('navToggle');
const navClose = document.getElementById('navClose');
const navOverlay = document.getElementById('navOverlay');
const backToTop = document.getElementById('backToTop');
const newsletterForm = document.getElementById('newsletterForm');
const newsletterStatus = document.getElementById('newsletterStatus');
const revealTargets = document.querySelectorAll('[data-reveal]');
const counterTargets = document.querySelectorAll('[data-counter]');
const heroEyebrow = document.querySelector('#accueil .eyebrow');
const heroLead = document.querySelector('.hero__lead');
const heroNote = document.querySelector('.hero__note');
const heroVisualNote = document.querySelector('.code-card--secondary p');
const heroFacts = Array.from(document.querySelectorAll('.hero__facts .fact'));
const brandNames = Array.from(document.querySelectorAll('.brand .brand__text strong'));
const brandTaglines = Array.from(document.querySelectorAll('.brand .brand__text small'));
const headerGhostButton = document.querySelector('.header__actions .btn--ghost');
const projectSectionLink = document.querySelector('#a-propos .section-link');
const publicationsSectionLink = document.querySelector('#publications .section-link');
const projectCards = Array.from(document.querySelectorAll('.project-grid .project-card'));
const expertiseCards = Array.from(document.querySelectorAll('.expertise-grid .expertise-card'));
const techGroups = Array.from(document.querySelectorAll('.tech-lab .tech-group'));
const publicationCards = Array.from(document.querySelectorAll('.blog-grid .blog-card'));
const partnerLabels = Array.from(document.querySelectorAll('.partners__row span'));
const heroSocialLinks = Array.from(document.querySelectorAll('#accueil .socials a'));
const footerSocialLinks = Array.from(document.querySelectorAll('.socials--footer a'));
const ctaTitle = document.querySelector('.cta-banner__copy h2');
const ctaLead = document.querySelector('.cta-banner__copy p:not(.eyebrow)');
const ctaPrimary = document.querySelector('.cta-banner__actions .btn--primary');
const ctaSecondary = document.querySelector('.cta-banner__actions .btn--outline');
const footerBrandCopy = document.querySelector('.footer__brand > p');
const footerCopyright = document.querySelector('.footer__bottom p');
const metaDescription = document.querySelector('meta[name="description"]');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function setText(node, value) {
  if (!node || value === undefined || value === null || value === '') return false;
  node.textContent = String(value);
  return true;
}

function clearChildren(node) {
  if (!node) return;
  node.textContent = '';
}

function createChip(label, title) {
  const chip = document.createElement('span');
  chip.textContent = label;
  if (title) chip.title = title;
  return chip;
}

function renderChips(container, values, titles = []) {
  if (!container) return;
  clearChildren(container);
  values.forEach((value, index) => {
    if (!value) return;
    container.appendChild(createChip(value, titles[index]));
  });
}

function setCounterValue(node, value, suffix = '') {
  if (!node || value === undefined || value === null || value === '') return;
  const raw = String(value);
  node.dataset.counter = raw;
  node.dataset.suffix = suffix;
  node.textContent = `${raw}${suffix}`;
}

function normalizeHref(value) {
  const href = String(value || '').trim();
  if (!href || href === '#') return '';
  return href;
}

function isExternalHref(href) {
  return /^https?:\/\//i.test(href);
}

function setLink(node, href, { label, targetBlank = false, text } = {}) {
  if (!node || !href) return false;
  node.href = href;

  if (targetBlank || isExternalHref(href)) {
    node.target = '_blank';
    node.rel = 'noreferrer noopener';
  } else {
    node.removeAttribute('target');
    node.removeAttribute('rel');
  }

  if (label) {
    node.setAttribute('aria-label', label);
  }

  if (text !== undefined) {
    node.textContent = text;
  }

  return true;
}

function getLocaleDate(value, options) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('fr-FR', options).format(date);
}

function formatYear(value) {
  return getLocaleDate(value, { year: 'numeric' });
}

function formatYearRange(startDate, endDate) {
  const start = formatYear(startDate);
  const end = endDate ? formatYear(endDate) : 'Aujourd’hui';
  if (start && end) return `${start} — ${end}`;
  return start || end || '';
}

function formatCountLabel(count, singular, plural = `${singular}s`) {
  return count === 1 ? `${count} ${singular}` : `${count} ${plural}`;
}

function truncateText(value, limit = 120) {
  const text = String(value || '').trim();
  if (text.length <= limit) return text;
  return `${text.slice(0, Math.max(0, limit - 1)).trimEnd()}…`;
}

function sortProjects(projects) {
  return [...projects].sort((left, right) => {
    const featuredDelta = Number(Boolean(right.featured)) - Number(Boolean(left.featured));
    if (featuredDelta !== 0) return featuredDelta;
    const orderDelta = (left.sortOrder ?? 0) - (right.sortOrder ?? 0);
    if (orderDelta !== 0) return orderDelta;
    return String(left.title || '').localeCompare(String(right.title || ''), 'fr');
  });
}

function sortExperiences(experiences) {
  return [...experiences].sort((left, right) => {
    const currentDelta = Number(Boolean(right.isCurrent)) - Number(Boolean(left.isCurrent));
    if (currentDelta !== 0) return currentDelta;
    const orderDelta = (left.sortOrder ?? 0) - (right.sortOrder ?? 0);
    if (orderDelta !== 0) return orderDelta;
    const startDelta = new Date(right.startDate || 0) - new Date(left.startDate || 0);
    if (!Number.isNaN(startDelta) && startDelta !== 0) return startDelta;
    return String(left.title || '').localeCompare(String(right.title || ''), 'fr');
  });
}

function sortTestimonials(testimonials) {
  return [...testimonials].sort((left, right) => {
    const ratingDelta = (right.rating ?? 0) - (left.rating ?? 0);
    if (ratingDelta !== 0) return ratingDelta;
    const orderDelta = (left.sortOrder ?? 0) - (right.sortOrder ?? 0);
    if (orderDelta !== 0) return orderDelta;
    return String(left.authorName || '').localeCompare(String(right.authorName || ''), 'fr');
  });
}

function groupSkillsByCategory(skills) {
  const buckets = {
    frontend: [],
    backend: [],
    design: [],
    ai: [],
  };

  skills.forEach((skill) => {
    const category = String(skill?.category || '').toLowerCase();
    if (category === 'frontend') {
      buckets.frontend.push(skill);
      return;
    }
    if (category === 'backend') {
      buckets.backend.push(skill);
      return;
    }
    if (category === 'design') {
      buckets.design.push(skill);
      return;
    }
    if (category === 'ai' || category === 'automation') {
      buckets.ai.push(skill);
    }
  });

  Object.values(buckets).forEach((bucket) => {
    bucket.sort((left, right) => (right.level ?? 0) - (left.level ?? 0) || String(left.name || '').localeCompare(String(right.name || ''), 'fr'));
  });

  return buckets;
}

function getSkillNames(skills) {
  return skills.map((skill) => skill?.name).filter(Boolean);
}

function getLocationParts(profile) {
  const sectorData = profile?.sectorData || {};
  const location = String(profile?.location || '').trim();
  const base = String(sectorData.base || location.split(',')[0] || '').trim();
  const country = String(sectorData.country || location.split(',')[1] || '').trim();
  return { base, country };
}

function getWebsiteHost(websiteUrl) {
  const href = normalizeHref(websiteUrl);
  if (!href) return '';
  try {
    return new URL(href).hostname;
  } catch {
    return '';
  }
}

function buildPartnerLabels(profile, projects, skillBuckets) {
  const labels = [];
  const seen = new Set();

  const pushLabel = (value) => {
    const label = String(value || '').trim();
    if (!label || seen.has(label)) return;
    seen.add(label);
    labels.push(label);
  };

  sortProjects(projects).forEach((project) => pushLabel(project.client || project.title));

  pushLabel(profile?.brand?.name);
  pushLabel(getLocationParts(profile).base);
  pushLabel(profile?.sectorData?.focus);
  pushLabel(getWebsiteHost(profile?.websiteUrl));
  pushLabel('Frontend');
  pushLabel('Design');
  pushLabel('API & IA');
  pushLabel(getSkillNames(skillBuckets.frontend).slice(0, 1)[0]);

  return labels.slice(0, partnerLabels.length);
}

function openNav() {
  if (!nav || !navToggle || !navOverlay) return;
  nav.classList.add('is-open');
  navOverlay.hidden = false;
  navToggle.setAttribute('aria-expanded', 'true');
  document.body.style.overflow = 'hidden';
}

function closeNav() {
  if (!nav || !navToggle || !navOverlay) return;
  nav.classList.remove('is-open');
  navOverlay.hidden = true;
  navToggle.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}

function toggleNav() {
  if (!nav) return;
  if (nav.classList.contains('is-open')) {
    closeNav();
  } else {
    openNav();
  }
}

function updateHeaderState() {
  if (!header || !backToTop) return;
  const scrolled = window.scrollY > 14;
  header.classList.toggle('is-scrolled', scrolled);
  backToTop.classList.toggle('is-visible', window.scrollY > 700);
}

function smoothScrollTo(target) {
  if (!target || !header) return;
  const offset = header.offsetHeight + 12;
  const top = Math.max(0, target.getBoundingClientRect().top + window.scrollY - offset);
  window.scrollTo({ top, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
}

function setActiveLink(id) {
  document.querySelectorAll('.nav__link').forEach((link) => {
    const match = link.getAttribute('href') === `#${id}`;
    link.classList.toggle('is-active', match);
  });
}

function animateCounter(node) {
  const raw = node.dataset.counter || '0';
  const suffix = node.dataset.suffix ?? '';
  const target = Number.parseInt(raw, 10) || 0;
  const duration = 1400;

  if (prefersReducedMotion) {
    node.textContent = `${raw}${suffix}`;
    return;
  }

  const start = performance.now();

  function frame(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = Math.round(target * eased);
    node.textContent = `${value}${suffix}`;
    if (progress < 1) {
      requestAnimationFrame(frame);
    } else {
      node.textContent = `${raw}${suffix}`;
    }
  }

  requestAnimationFrame(frame);
}

function initReveals() {
  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    revealTargets.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver((entries, io) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  revealTargets.forEach((el) => observer.observe(el));
}

function initCounters() {
  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    counterTargets.forEach((node) => {
      const value = node.dataset.counter || '0';
      const suffix = node.dataset.suffix ?? '';
      node.textContent = `${value}${suffix}`;
    });
    return;
  }

  const observer = new IntersectionObserver((entries, io) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.55 });

  counterTargets.forEach((node) => observer.observe(node));
}

function initSectionSpy() {
  const anchors = Array.from(document.querySelectorAll('main section[id]'));
  if (!anchors.length || !('IntersectionObserver' in window)) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        setActiveLink(entry.target.id);
      }
    });
  }, { threshold: 0.45, rootMargin: '-20% 0px -50% 0px' });

  anchors.forEach((section) => observer.observe(section));
}

function initNewsletter() {
  if (!newsletterForm || !newsletterStatus) return;

  newsletterForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const email = newsletterForm.elements.email?.value?.trim();
    if (!email) return;
    newsletterStatus.textContent = 'Merci. Votre inscription a bien été enregistrée.';
    newsletterForm.reset();
  });
}

function bindNavigation() {
  if (!navToggle || !navClose || !navOverlay) return;

  navToggle.addEventListener('click', toggleNav);
  navClose.addEventListener('click', closeNav);
  navOverlay.addEventListener('click', closeNav);

  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;
    const href = link.getAttribute('href');
    if (href === '#') {
      event.preventDefault();
      return;
    }
    const target = document.querySelector(href);
    if (!target) return;
    event.preventDefault();
    closeNav();
    smoothScrollTo(target);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeNav();
  });
}

function bindScroll() {
  if (!backToTop) return;
  window.addEventListener('scroll', updateHeaderState, { passive: true });
  backToTop.addEventListener('click', () => smoothScrollTo(document.documentElement));
  updateHeaderState();
}

function bindFocusManagement() {
  if (!nav || !navToggle) return;
  const firstFocusable = nav.querySelector('a, button');
  navToggle.addEventListener('click', () => {
    if (nav.classList.contains('is-open') && firstFocusable) {
      firstFocusable.focus({ preventScroll: true });
    }
  });
}

function updateMeta(profile, site) {
  const brandName = profile?.brand?.name || site?.title || 'Portfolio';
  const headline = profile?.headline || site?.config?.brand || 'Portfolio ZodBack';

  if (metaDescription && profile?.bio) {
    metaDescription.setAttribute('content', profile.bio);
  }

  document.title = `${brandName} | ${headline}`;
}

function updateBranding(profile, site) {
  const brandName = profile?.brand?.name || site?.title || 'Portfolio';
  const brandTagline = profile?.brand?.tagline || profile?.headline || site?.config?.brand || 'Portfolio ZodBack';

  brandNames.forEach((node) => setText(node, brandName));
  brandTaglines.forEach((node) => setText(node, brandTagline));
}

function updateHero(profile, site, counts) {
  if (!profile && !site) return;

  const locationParts = getLocationParts(profile);
  const yearsExperience = Number(profile?.sectorData?.yearsExperience || 0);
  const projectCount = Number(counts?.projects || 0);
  const displayName = profile?.fullName || site?.title || 'Portfolio';
  const heroLeadCopy = profile?.bio || profile?.headline || site?.config?.brand || 'Contenu fourni par le module portfolio ZodBack.';

  setText(heroEyebrow, `Bonjour, je suis ${displayName} 👋`);
  setText(heroLead, heroLeadCopy);
  setText(
    heroNote,
    profile?.availableForHire
      ? 'Disponible pour des missions de design, développement et accompagnement produit.'
      : site?.config?.brand || 'Contenu alimenté par le module portfolio ZodBack.',
  );

  const hasMetrics = Boolean(
    Number(counts?.projects || 0) ||
      Number(counts?.skills || 0) ||
      Number(counts?.experiences || 0) ||
      Number(counts?.testimonials || 0),
  );

  if (heroVisualNote && hasMetrics) {
    const experienceSummary = yearsExperience > 0
      ? `${yearsExperience} ans d'expérience`
      : `${counts?.experiences || 0} expériences publiées`;
    const projectSummary = `${projectCount || 0} projets publiés`;
    const skillSummary = `${counts?.skills || 0} compétences actives`;

    setText(
      heroVisualNote,
      `${experienceSummary}, ${projectSummary} et ${skillSummary}.`,
    );
  }

  if (heroFacts[0]) {
    setText(heroFacts[0].querySelector('strong'), locationParts.base || profile?.location || site?.config?.brand || 'Abidjan');
    setText(heroFacts[0].querySelector('span'), locationParts.country || site?.title || 'Côte d’Ivoire');
  }

  if (heroFacts[1] && yearsExperience > 0) {
    setCounterValue(heroFacts[1].querySelector('strong'), yearsExperience, '+');
    setText(heroFacts[1].querySelector('span'), "années d'expérience");
  }

  if (heroFacts[2] && projectCount > 0) {
    setCounterValue(heroFacts[2].querySelector('strong'), projectCount, '+');
    setText(heroFacts[2].querySelector('span'), 'projets livrés');
  }
}

function updateHeaderAction(profile) {
  if (!headerGhostButton) return;
  if (!profile) return;

  if (profile?.resumeUrl) {
    setLink(headerGhostButton, normalizeHref(profile.resumeUrl), {
      text: 'Télécharger mon CV',
      label: `Télécharger le CV de ${profile.fullName || 'Portfolio'}`,
      targetBlank: true,
    });
    return;
  }

  setLink(headerGhostButton, `mailto:${profile?.email || ''}`, {
    text: 'Me contacter',
    label: `Contacter ${profile?.fullName || 'Portfolio'}`,
  });
}

function updateSocialLinks(profile) {
  if (!profile) return;

  const links = profile?.socialLinks || {};
  const known = {
    github: normalizeHref(links.github),
    linkedin: normalizeHref(links.linkedin),
    x: normalizeHref(links.x),
    dribbble: normalizeHref(links.dribbble),
    instagram: normalizeHref(links.instagram),
    behance: normalizeHref(links.behance),
  };

  const allAnchors = [...heroSocialLinks, ...footerSocialLinks];
  allAnchors.forEach((anchor) => {
    const label = String(anchor.getAttribute('aria-label') || '').toLowerCase();
    const href = known[label];
    if (!href) return;
    setLink(anchor, href, { label: anchor.getAttribute('aria-label') || label, targetBlank: true });
  });
}

function updateProjects(projects, profile) {
  if (!projectCards.length || !projects.length) return;

  sortProjects(projects).slice(0, projectCards.length).forEach((project, index) => {
    const card = projectCards[index];
    if (!card) return;

    const badge = card.querySelector('.project-badge');
    const title = card.querySelector('.project-card__body h3');
    const description = card.querySelector('.project-card__body p');
    const tags = card.querySelector('.tag-row');
    const link = card.querySelector('.project-card__body a');
    const preview = card.querySelector('.project-card__preview');

    setText(badge, project?.role || project?.metadata?.tags?.[0] || project?.client || 'Projet');
    setText(title, project?.title || project?.client || `Projet ${index + 1}`);
    setText(description, project?.shortDescription || project?.description || '');

    const tagValues = Array.isArray(project?.metadata?.tags) && project.metadata.tags.length
      ? project.metadata.tags
      : Array.isArray(project?.technologies)
        ? project.technologies
        : [];
    renderChips(tags, tagValues.slice(0, 3));

    if (link) {
      const projectHref = normalizeHref(project?.projectUrl || project?.repositoryUrl);
      const href = projectHref || '#contact';
      const external = Boolean(projectHref) && isExternalHref(projectHref);
      setLink(link, href, {
        text: projectHref ? 'Voir le projet' : 'Parler du projet',
        label: `Voir le projet ${project?.title || index + 1}`,
        targetBlank: external,
      });
    }

    if (preview) {
      const previewLabel = `${project?.title || 'Projet'}${project?.client ? `, ${project.client}` : ''}`;
      preview.setAttribute('aria-label', previewLabel);
    }
  });
}

function updateTechGroups(skills) {
  if (!techGroups.length || !skills.length) return;

  const buckets = groupSkillsByCategory(skills);
  const groupConfig = [
    { label: 'Frontend', count: buckets.frontend, detail: 'Interfaces rapides et maintenables' },
    { label: 'Backend', count: buckets.backend, detail: 'Architecture et intégrations robustes' },
    { label: 'Design', count: buckets.design, detail: 'UI/UX lisible et cohérent' },
    { label: 'Automation & IA', count: buckets.ai, detail: 'Scénarios utiles et gains de temps' },
  ];

  techGroups.forEach((group, index) => {
    const config = groupConfig[index];
    if (!config || !config.count.length) return;

    const label = group.querySelector('.tech-group__label');
    const count = group.querySelector('.tech-group__count');
    const chips = group.querySelector('.tech-group__chips');

    setText(label, config.label);
    setText(count, formatCountLabel(config.count.length, 'outil', 'outils'));
    renderChips(chips, getSkillNames(config.count), config.count.map((skill) => `${skill.level || 0}%`));
    group.setAttribute('aria-label', `${config.label} - ${config.detail}`);
  });
}

function updateExpertiseCards(profile, skills) {
  if (!expertiseCards.length) return;

  const buckets = groupSkillsByCategory(skills);
  const counts = {
    frontend: buckets.frontend.length,
    backend: buckets.backend.length,
    design: buckets.design.length,
    ai: buckets.ai.length,
  };

  const copy = [
    {
      icon: '✦',
      title: 'Développement Web & Mobile',
      description: `${counts.frontend || 0} compétence${counts.frontend === 1 ? '' : 's'} frontend pour des interfaces rapides et maintenables.`,
    },
    {
      icon: '◌',
      title: 'API & Backend Moderne',
      description: `${counts.backend || 0} compétence${counts.backend === 1 ? '' : 's'} backend pour des intégrations fiables et sécurisées.`,
    },
    {
      icon: '⌁',
      title: 'UI/UX Design',
      description: `${counts.design || 0} compétence${counts.design === 1 ? '' : 's'} design pour une expérience claire et cohérente.`,
    },
    {
      icon: '◉',
      title: 'Audit & Conseil',
      description: `${profile?.availableForHire ? 'Disponible' : 'En mission'} pour analyser les parcours, prioriser les actions et simplifier la prise de décision.`,
    },
    {
      icon: '✺',
      title: 'Automation & IA',
      description: `${counts.ai || 0} compétence${counts.ai === 1 ? '' : 's'} orientée automatisation et scénarios utiles au métier.`,
    },
  ];

  expertiseCards.forEach((card, index) => {
    const item = copy[index];
    if (!item) return;

    setText(card.querySelector('.expertise-card__icon'), item.icon);
    setText(card.querySelector('h3'), item.title);
    setText(card.querySelector('p'), item.description);

    const link = card.querySelector('a');
    if (link) {
      setLink(link, '#contact', {
        text: 'En savoir plus',
        label: `${item.title} - contacter ${profile?.fullName || site?.title || 'Portfolio'}`,
      });
    }
  });
}

function updatePublications(experiences, testimonials) {
  if (!publicationCards.length) return;

  const items = [];
  const professionalExperiences = sortExperiences(experiences).filter((entry) => String(entry?.entryType || '').toLowerCase() === 'professional');
  const sortedTestimonials = sortTestimonials(testimonials);

  professionalExperiences.slice(0, 2).forEach((experience) => {
    items.push({
      kind: 'experience',
      meta: `${formatYearRange(experience.startDate, experience.endDate)} • ${experience.company || 'Expérience'}`,
      title: experience.title || experience.company || 'Expérience',
      description: experience.description || '',
    });
  });

  sortedTestimonials.slice(0, 2).forEach((testimonial) => {
    items.push({
      kind: 'testimonial',
      meta: `${testimonial.rating || 5}★ • ${testimonial.authorTitle || testimonial.authorCompany || 'Témoignage'}`,
      title: `${testimonial.authorName || 'Témoignage'}${testimonial.authorCompany ? ` · ${testimonial.authorCompany}` : ''}`,
      description: truncateText(testimonial.content, 120),
    });
  });

  if (!items.length) return;

  publicationCards.forEach((card, index) => {
    const item = items[index];
    if (!item) return;

    const meta = card.querySelector('.blog-card__meta');
    const title = card.querySelector('h3');
    const description = card.querySelector('.blog-card__body p:last-of-type');

    setText(meta, item.meta);
    setText(title, item.title);
    setText(description, item.description);
    card.dataset.kind = item.kind;
  });
}

function updatePartners(profile, projects, skills) {
  if (!partnerLabels.length) return;

  const buckets = groupSkillsByCategory(skills);
  const labels = buildPartnerLabels(profile, projects, buckets);

  if (!labels.length) return;

  partnerLabels.forEach((node, index) => {
    const value = labels[index] || labels[index % labels.length];
    setText(node, value);
  });
}

function updateStats(profile, counts) {
  const yearsExperience = Number(profile?.sectorData?.yearsExperience || 0);
  const projectCount = Number(counts?.projects || 0);
  const clientCount = Number(counts?.clients || 0);
  const skillCount = Number(counts?.skills || 0);
  const testimonialCount = Number(counts?.testimonials || 0);

  const stats = Array.from(document.querySelectorAll('.stats-row__item'));
  if (!stats.length) return;

  if (stats[0] && yearsExperience > 0) {
    setCounterValue(stats[0].querySelector('[data-counter]'), yearsExperience, '+');
    setText(stats[0].querySelector('span'), 'Années d’expérience');
  }

  if (stats[1] && projectCount > 0) {
    setCounterValue(stats[1].querySelector('[data-counter]'), projectCount, '+');
    setText(stats[1].querySelector('span'), 'Projets réalisés');
  }

  if (stats[2] && clientCount > 0) {
    setCounterValue(stats[2].querySelector('[data-counter]'), clientCount, '+');
    setText(stats[2].querySelector('span'), 'Clients accompagnés');
  }

  if (stats[3] && skillCount > 0) {
    setCounterValue(stats[3].querySelector('[data-counter]'), skillCount, '+');
    setText(stats[3].querySelector('span'), 'Technologies maîtrisées');
  }

  if (stats[4] && testimonialCount > 0) {
    setCounterValue(stats[4].querySelector('[data-counter]'), 100, '%');
    setText(stats[4].querySelector('span'), 'Satisfaction client');
  }
}

function updateCallToAction(profile) {
  if (!ctaTitle || !ctaLead || !ctaPrimary || !ctaSecondary) return;
  if (!profile) return;

  if (profile?.availableForHire) {
    setText(ctaTitle, 'Donnons vie à vos projets visionnaires');
    setText(ctaLead, 'Disponible pour des collaborations design, produit et développement, avec une exécution rapide et soignée.');
  } else {
    setText(ctaTitle, 'Restons en contact');
    setText(ctaLead, 'Je suis actuellement concentré sur quelques missions, mais j’aime toujours échanger autour de nouveaux projets.');
  }

  setLink(ctaPrimary, `mailto:${profile?.email || ''}?subject=${encodeURIComponent(`Projet avec ${profile?.fullName || 'Portfolio'}`)}`, {
    text: 'Me contacter',
    label: `Contacter ${profile?.fullName || 'Portfolio'}`,
  });

  setLink(ctaSecondary, '#realisations', {
    text: 'Voir les projets',
    label: 'Aller vers les projets',
  });
}

function updateFooter(profile, site) {
  if (footerBrandCopy && profile?.bio) {
    setText(footerBrandCopy, profile.bio);
  }

  if (footerCopyright) {
    const year = new Date().getFullYear();
    setText(footerCopyright, `© ${year} ${profile?.fullName || site?.title || 'Portfolio'}. Tous droits réservés.`);
  }

  if (publicationsSectionLink) {
    setLink(publicationsSectionLink, '#contact', {
      text: 'Parler d’un projet',
      label: `Contacter ${profile?.fullName || site?.title || 'Portfolio'}`,
    });
  }

  if (projectSectionLink) {
    setLink(projectSectionLink, '#realisations', {
      text: 'Voir tous les projets',
      label: 'Aller vers les projets',
    });
  }

  if (site?.config?.source) {
    document.body.dataset.portfolioSource = site.config.source;
  }
}

function applyPortfolioData(portfolio) {
  if (!portfolio || typeof portfolio !== 'object') return;

  const profile = portfolio.profile || null;
  const site = portfolio.site || null;
  const projects = Array.isArray(portfolio.projects) ? portfolio.projects : [];
  const skills = Array.isArray(portfolio.skills) ? portfolio.skills : [];
  const experiences = Array.isArray(portfolio.experiences) ? portfolio.experiences : [];
  const testimonials = Array.isArray(portfolio.testimonials) ? portfolio.testimonials : [];
  const counts = portfolio.metadata?.counts || {
    projects: projects.length,
    skills: skills.length,
    experiences: experiences.length,
    testimonials: testimonials.length,
    clients: 0,
  };

  if (!profile && !projects.length && !skills.length && !experiences.length && !testimonials.length) {
    return;
  }

  updateMeta(profile, site);
  updateBranding(profile, site);
  updateHero(profile, site, counts);
  updateHeaderAction(profile);
  updateSocialLinks(profile);
  updateProjects(projects, profile);
  updateExpertiseCards(profile, skills);
  updateTechGroups(skills);
  updatePublications(experiences, testimonials);
  updatePartners(profile, projects, skills);
  updateStats(profile, counts);
  updateCallToAction(profile);
  updateFooter(profile, site);
}

async function loadPortfolioData() {
  try {
    return await getAll();
  } catch (error) {
    console.warn('Impossible de charger les données du portfolio:', error);
    return null;
  }
}

async function bootstrap() {
  initReveals();
  initSectionSpy();
  initNewsletter();
  bindNavigation();
  bindScroll();
  bindFocusManagement();

  const portfolio = await loadPortfolioData();
  if (portfolio) {
    applyPortfolioData(portfolio);
  }

  initCounters();
}

bootstrap();
