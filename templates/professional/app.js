/**
 * Professional Portfolio Template - App Script
 * Clean, corporate-focused content rendering
 */

// DOM Elements
const loadingScreen = document.getElementById('loading-screen');
const navbar = document.getElementById('navbar');
const navToggle = document.getElementById('nav-toggle');
const navMenu = document.querySelector('.nav-menu');
const contactForm = document.getElementById('contact-form');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    initNavigation();
    initContactForm();
    initScrollAnimations();

    try {
        await loadPortfolioData();
    } catch (error) {
        console.error('Error loading portfolio:', error);
        showFallbackContent();
    }

    // Hide loading screen
    setTimeout(() => {
        loadingScreen.classList.add('hidden');
    }, 800);

    // Update year
    document.getElementById('current-year').textContent = new Date().getFullYear();
});

// Navigation
function initNavigation() {
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    navToggle.addEventListener('click', () => {
        navMenu.classList.toggle('active');
    });

    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('active');
        });
    });
}

// Contact Form
function initContactForm() {
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(contactForm);
            const data = Object.fromEntries(formData);

            // Create mailto link
            const subject = encodeURIComponent(data.subject || 'Portfolio Contact');
            const body = encodeURIComponent(`Name: ${data.name}\nEmail: ${data.email}\n\n${data.message}`);
            const email = PORTFOLIO_CONFIG?.OWNER?.email || 'hello@example.com';

            window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
        });
    }
}

// Scroll Animations
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
            }
        });
    }, observerOptions);

    document.querySelectorAll('.section').forEach(section => {
        observer.observe(section);
    });
}

// Load Portfolio Data
async function loadPortfolioData() {
    if (typeof PORTFOLIO_CONFIG === 'undefined') {
        throw new Error('Configuration not found');
    }

    if (!PORTFOLIO_CONFIG.API_TOKEN || PORTFOLIO_CONFIG.API_TOKEN === 'YOUR_API_TOKEN_HERE') {
        console.log('Using demo data');
        showDemoData();
        return;
    }

    try {
        const api = new PortfolioAPI(PORTFOLIO_CONFIG);
        const data = await api.getAllPortfolioData();

        renderExperiences(data.experiences || []);
        renderSkills(data.skills || []);
        renderProjects(data.projects || []);
        renderTestimonials(data.testimonials || []);
        updateOwnerInfo();

    } catch (error) {
        console.error('API Error:', error);
        showDemoData();
    }
}

// Update Owner Info
function updateOwnerInfo() {
    const owner = PORTFOLIO_CONFIG.OWNER;

    document.getElementById('nav-name').textContent = owner.name;
    document.getElementById('hero-name').textContent = owner.name;
    document.getElementById('hero-role').textContent = owner.role;
    document.getElementById('hero-description').textContent = owner.bio;
    document.getElementById('about-description').textContent = owner.bio;
    document.getElementById('footer-name').textContent = owner.name;

    // Contact info
    const emailEl = document.getElementById('contact-email');
    const phoneEl = document.getElementById('contact-phone');
    const locationEl = document.getElementById('contact-location');

    if (emailEl) {
        emailEl.href = `mailto:${owner.email}`;
        emailEl.querySelector('.contact-value').textContent = owner.email;
    }

    if (phoneEl) {
        phoneEl.href = `tel:${owner.phone}`;
        phoneEl.querySelector('.contact-value').textContent = owner.phone;
    }

    if (locationEl) {
        locationEl.querySelector('.contact-value').textContent = owner.location;
    }
}

// Render Experiences
function renderExperiences(experiences) {
    const container = document.getElementById('experience-container');

    if (!experiences || experiences.length === 0) {
        container.innerHTML = '<p class="experience-placeholder">No experience to display</p>';
        return;
    }

    container.innerHTML = experiences.map(exp => `
        <div class="experience-item">
            <div class="experience-date">${formatDateRange(exp.startDate, exp.endDate)}</div>
            <div class="experience-content">
                <h3 class="experience-title">${exp.title}</h3>
                <p class="experience-company">${exp.company}${exp.location ? ` · ${exp.location}` : ''}</p>
                <p class="experience-description">${exp.description || ''}</p>
            </div>
        </div>
    `).join('');
}

// Render Skills
function renderSkills(skills) {
    const container = document.getElementById('skills-container');

    if (!skills || skills.length === 0) {
        container.innerHTML = '<p class="skills-placeholder">No skills to display</p>';
        return;
    }

    container.innerHTML = skills.map(skill => `
        <div class="skill-card">
            <div class="skill-header">
                <div class="skill-icon">${getSkillIcon(skill.category)}</div>
                <div class="skill-info">
                    <h3 class="skill-name">${skill.name}</h3>
                    <span class="skill-category">${skill.category || 'General'}</span>
                </div>
            </div>
            <div class="skill-progress">
                <div class="skill-progress-bar" style="width: ${skill.proficiency || 80}%"></div>
            </div>
        </div>
    `).join('');
}

// Render Projects
function renderProjects(projects) {
    const container = document.getElementById('projects-container');

    if (!projects || projects.length === 0) {
        container.innerHTML = '<p class="project-placeholder">No projects to display</p>';
        return;
    }

    container.innerHTML = projects.map(project => `
        <div class="project-card">
            <div class="project-image">
                <img src="${project.thumbnailUrl || 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop'}" 
                     alt="${project.title}" loading="lazy">
            </div>
            <div class="project-content">
                <div class="project-tags">
                    ${(project.technologies || []).slice(0, 3).map(tech =>
        `<span class="project-tag">${tech}</span>`
    ).join('')}
                </div>
                <h3 class="project-title">${project.title}</h3>
                <p class="project-description">${truncateText(project.description, 120)}</p>
                ${project.liveUrl ? `<a href="${project.liveUrl}" class="project-link" target="_blank">View Project →</a>` : ''}
            </div>
        </div>
    `).join('');
}

// Render Testimonials
function renderTestimonials(testimonials) {
    const container = document.getElementById('testimonials-container');

    if (!testimonials || testimonials.length === 0) {
        container.innerHTML = '<p class="testimonial-placeholder">No testimonials yet</p>';
        return;
    }

    container.innerHTML = testimonials.map(testimonial => `
        <div class="testimonial-card">
            <p class="testimonial-content">${testimonial.content}</p>
            <div class="testimonial-author">
                <img class="testimonial-avatar" 
                     src="${testimonial.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(testimonial.authorName)}&background=1a365d&color=fff`}" 
                     alt="${testimonial.authorName}">
                <div>
                    <h4 class="testimonial-name">${testimonial.authorName}</h4>
                    <p class="testimonial-role">${testimonial.authorRole || ''} ${testimonial.authorCompany ? `at ${testimonial.authorCompany}` : ''}</p>
                </div>
            </div>
        </div>
    `).join('');
}

// Demo Data
function showDemoData() {
    const demoExperiences = [
        {
            title: 'Chief Technology Officer',
            company: 'Enterprise Solutions Inc.',
            location: 'San Francisco, CA',
            startDate: '2020-01-01',
            endDate: null,
            description: 'Leading technical strategy and overseeing development of enterprise-grade solutions serving Fortune 500 clients.'
        },
        {
            title: 'Senior Software Architect',
            company: 'Global Tech Corp',
            location: 'New York, NY',
            startDate: '2016-06-01',
            endDate: '2019-12-31',
            description: 'Designed and implemented scalable microservices architecture handling millions of transactions daily.'
        },
        {
            title: 'Lead Developer',
            company: 'Innovation Labs',
            location: 'Boston, MA',
            startDate: '2013-03-01',
            endDate: '2016-05-31',
            description: 'Led a team of 8 developers in building cutting-edge web applications for financial services sector.'
        }
    ];

    const demoSkills = [
        { name: 'System Architecture', category: 'Architecture', proficiency: 95 },
        { name: 'Cloud Infrastructure', category: 'DevOps', proficiency: 92 },
        { name: 'Node.js / TypeScript', category: 'Backend', proficiency: 90 },
        { name: 'React / Next.js', category: 'Frontend', proficiency: 88 },
        { name: 'PostgreSQL / MongoDB', category: 'Database', proficiency: 85 },
        { name: 'AWS / GCP', category: 'Cloud', proficiency: 90 }
    ];

    const demoProjects = [
        {
            title: 'Enterprise Resource Planning System',
            description: 'Complete ERP solution for manufacturing industry with real-time analytics and supply chain management.',
            technologies: ['Node.js', 'React', 'PostgreSQL'],
            thumbnailUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop',
            liveUrl: '#'
        },
        {
            title: 'Financial Trading Platform',
            description: 'High-frequency trading platform processing millions of transactions with sub-millisecond latency.',
            technologies: ['Rust', 'Kafka', 'TimescaleDB'],
            thumbnailUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&h=400&fit=crop',
            liveUrl: '#'
        },
        {
            title: 'Healthcare Management System',
            description: 'HIPAA-compliant healthcare platform serving 200+ hospitals with patient management and telemedicine.',
            technologies: ['Python', 'Django', 'AWS'],
            thumbnailUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&h=400&fit=crop',
            liveUrl: '#'
        }
    ];

    const demoTestimonials = [
        {
            content: 'An exceptional professional who delivers enterprise-grade solutions with precision. Their technical expertise and strategic thinking have been invaluable to our digital transformation.',
            authorName: 'Robert Martinez',
            authorRole: 'CEO',
            authorCompany: 'Fortune 500 Company'
        },
        {
            content: 'Working with them was a game-changer for our organization. Their ability to translate complex business requirements into elegant technical solutions is remarkable.',
            authorName: 'Jennifer Williams',
            authorRole: 'VP of Technology',
            authorCompany: 'Global Finance Corp'
        }
    ];

    renderExperiences(demoExperiences);
    renderSkills(demoSkills);
    renderProjects(demoProjects);
    renderTestimonials(demoTestimonials);
    updateOwnerInfo();
}

function showFallbackContent() {
    showDemoData();
}

// Helpers
function getSkillIcon(category) {
    const icons = {
        'Architecture': '🏗️',
        'Backend': '⚙️',
        'Frontend': '🎨',
        'Database': '🗄️',
        'DevOps': '🚀',
        'Cloud': '☁️',
        'Security': '🔒',
        'default': '💼'
    };
    return icons[category] || icons.default;
}

function formatDateRange(startDate, endDate) {
    const start = new Date(startDate);
    const startStr = start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    if (!endDate) {
        return `${startStr} - Present`;
    }

    const end = new Date(endDate);
    const endStr = end.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    return `${startStr} - ${endStr}`;
}

function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
}
