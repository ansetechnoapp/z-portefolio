import { getAll, verifyConnection } from './api.js';

function el(tag, cls){ const e=document.createElement(tag); if(cls) e.className=cls; return e }

async function main(){
  console.log('Initializing Portfolio...');
  
  // Verify API Connection
  const isConnected = await verifyConnection();
  if (!isConnected) {
    console.error('Failed to verify API key or connect to backend.');
    const root = document.getElementById('projects-container');
    if (root) {
      root.innerHTML = '<div class="error">Failed to connect to API. Please check your API Key.</div>';
    }
    return;
  }

  try{
    const res = await getAll();
    const data = res.data || {};
    const title = document.getElementById('portfolio-title');
    const subtitle = document.getElementById('portfolio-subtitle');
    const profile = data.profile || null;
    if (profile && title) {
      title.textContent = profile.fullName || 'Portfolio';
    }
    if (profile && subtitle) {
      subtitle.textContent = profile.headline || 'Projects • Skills • Experiences • Testimonials';
    }
    renderProjects(data.projects || []);
    renderSkills(data.skills || []);
    renderExperiences(data.experiences || []);
    renderTestimonials(data.testimonials || []);
  }catch(e){
    console.error('Failed to load portfolio', e);
  }
}

function renderProjects(projects){
  const root = document.getElementById('projects-container');
  root.innerHTML = '';
  if (!projects || projects.length === 0) {
    root.innerHTML = '<div class="muted">No portfolio projects published yet.</div>';
    return;
  }
  projects.forEach(p => {
    const card = el('div','card');
    const h3 = el('h3'); h3.textContent = p.title || 'Untitled';
    const desc = el('p'); desc.textContent = p.description || '';
    card.appendChild(h3); card.appendChild(desc);
    if(Array.isArray(p.tags)){
      const tags = el('div','tags');
      p.tags.forEach(t => { const b=el('span','badge'); b.textContent = t; tags.appendChild(b) });
      card.appendChild(tags);
    }
    if(p.url){ const link = el('a','button'); link.href=p.url; link.textContent='View Project'; card.appendChild(link); }
    root.appendChild(card);
  });
}

function renderSkills(skills){
  const root = document.getElementById('skills-container');
  root.innerHTML = '';
  if (!skills || skills.length === 0) {
    root.innerHTML = '<div class="muted">No skills published yet.</div>';
    return;
  }
  skills.forEach(s => { const b=el('span','badge'); b.textContent = s.name || s; root.appendChild(b) });
}

function renderExperiences(items){
  const root = document.getElementById('experiences-container');
  root.innerHTML = '';
  if (!items || items.length === 0) {
    root.innerHTML = '<div class="muted">No experiences published yet.</div>';
    return;
  }
  items.forEach(exp => {
    const item = el('div','item');
    const h3 = el('h3'); h3.textContent = exp.role || exp.title || 'Experience';
    const p = el('p'); p.textContent = exp.company ? `${exp.company} • ${exp.period || ''}` : (exp.period || '');
    item.appendChild(h3); item.appendChild(p); root.appendChild(item);
  });
}

function renderTestimonials(items){
  const root = document.getElementById('testimonials-container');
  root.innerHTML = '';
  if (!items || items.length === 0) {
    root.innerHTML = '<div class="muted">No testimonials published yet.</div>';
    return;
  }
  items.forEach(ts => {
    const item = el('div','item');
    const h3 = el('h3'); h3.textContent = ts.author || 'Anonymous';
    const p = el('p'); p.textContent = ts.content || '';
    item.appendChild(h3); item.appendChild(p); root.appendChild(item);
  });
}

main();
