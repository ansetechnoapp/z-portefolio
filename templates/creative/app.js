/**
 * Creative Portfolio Template - App Script
 * Handles API integration and dynamic content rendering
 */

// DOM Elements
const loadingScreen = document.getElementById('loading-screen');
const navbar = document.getElementById('navbar');
const navToggle = document.getElementById('nav-toggle');
const navMenu = document.querySelector('.nav-menu');
const cursorFollower = document.querySelector('.cursor-follower');

// Initialize Portfolio
document.addEventListener('DOMContentLoaded', async () => {
    initNavigation();
    initCursorFollower();
    initScrollAnimations();
    initRevealAnimations();

    try {
        await loadPortfolioData();
    } catch (error) {
        console.error('Error loading portfolio:', error);
        showFallbackContent();
    }

    // Hide loading screen
    setTimeout(() => {
        loadingScreen.classList.add('hidden');
    }, 1000);
});

// Navigation
function initNavigation() {
    // Navbar scroll effect
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // Mobile menu toggle
    navToggle.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        navToggle.classList.toggle('active');
    });

    // Close menu on link click
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('active');
            navToggle.classList.remove('active');
        });
    });
}

// Cursor Follower
function initCursorFollower() {
    if (window.matchMedia('(pointer: fine)').matches) {
        document.addEventListener('mousemove', (e) => {
            cursorFollower.style.left = e.clientX + 'px';
            cursorFollower.style.top = e.clientY + 'px';
        });
    } else {
        cursorFollower.style.display = 'none';
    }
}

// Scroll Animations
function initScrollAnimations() {
    const animatedElements = document.querySelectorAll('[data-animate]');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animated');
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    animatedElements.forEach(el => observer.observe(el));
}

// Reveal Animations
function initRevealAnimations() {
    const revealElements = document.querySelectorAll('.reveal');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.classList.add('active');
                }, index * 100);
            }
        });
    }, {
        threshold: 0.1
    });

    revealElements.forEach(el => observer.observe(el));
}

// Load Portfolio Data
async function loadPortfolioData() {
    if (typeof PORTFOLIO_CONFIG === 'undefined') {
        throw new Error('Configuration not found');
    }

    if (!PORTFOLIO_CONFIG.API_TOKEN || PORTFOLIO_CONFIG.API_TOKEN === 'YOUR_API_TOKEN_HERE') {
        console.log('Using demo data - no API token configured');
        showDemoData();
        return;
    }

    try {
        const api = new PortfolioAPI(PORTFOLIO_CONFIG);
        const data = await api.getAllPortfolioData();

        renderSkills(data.skills || []);
        renderExperiences(data.experiences || []);
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

    document.getElementById('nav-name').textContent = owner.name.split(' ')[0];
    document.getElementById('hero-name').textContent = owner.name;
    document.getElementById('hero-role').textContent = owner.role;
    document.getElementById('hero-description').textContent = owner.bio;
    document.getElementById('about-description').textContent = owner.bio;
    document.getElementById('footer-name').textContent = owner.name;

    // Update contact info
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

// Render Skills
function renderSkills(skills) {
    const container = document.getElementById('skills-container');

    if (!skills || skills.length === 0) {
        container.innerHTML = '<p class="skill-placeholder">No skills to display</p>';
        return;
    }

    container.innerHTML = skills.map((skill, index) => `
        <div class="skill-card" style="animation-delay: ${index * 0.1}s">
            <div class="skill-icon">${getSkillIcon(skill.category)}</div>
            <h3 class="skill-name">${skill.name}</h3>
            <span class="skill-category">${skill.category || 'General'}</span>
            <div class="skill-level">
                <div class="skill-level-bar" style="width: ${skill.proficiency || 80}%"></div>
            </div>
        </div>
    `).join('');
}

// Render Experiences
function renderExperiences(experiences) {
    const container = document.getElementById('experience-container');

    if (!experiences || experiences.length === 0) {
        container.innerHTML = '<p class="timeline-placeholder">No experience to display</p>';
        return;
    }

    container.innerHTML = experiences.map(exp => `
        <div class="experience-item">
            <div class="experience-marker"></div>
            <div class="experience-content">
                <span class="experience-date">${formatDateRange(exp.startDate, exp.endDate)}</span>
                <h3 class="experience-title">${exp.title}</h3>
                <p class="experience-company">${exp.company}</p>
                <p class="experience-description">${exp.description || ''}</p>
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
                <img src="${project.thumbnailUrl || 'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=600&h=400&fit=crop'}" 
                     alt="${project.title}" loading="lazy">
                <div class="project-overlay">
                    ${project.liveUrl ? `<a href="${project.liveUrl}" class="project-link" target="_blank">View Project</a>` : ''}
                </div>
            </div>
            <div class="project-info">
                <div class="project-tags">
                    ${(project.technologies || []).slice(0, 3).map(tech =>
        `<span class="project-tag">${tech}</span>`
    ).join('')}
                </div>
                <h3 class="project-title">${project.title}</h3>
                <p class="project-description">${truncateText(project.description, 120)}</p>
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
                     src="${testimonial.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(testimonial.authorName)}&background=random`}" 
                     alt="${testimonial.authorName}">
                <div class="testimonial-info">
                    <h4 class="testimonial-name">${testimonial.authorName}</h4>
                    <p class="testimonial-role">${testimonial.authorRole || ''} ${testimonial.authorCompany ? `at ${testimonial.authorCompany}` : ''}</p>
                </div>
            </div>
        </div>
    `).join('');
}

// Demo Data
function showDemoData() {
    const demoSkills = [
        { name: 'JavaScript', category: 'Frontend', proficiency: 95 },
        { name: 'React', category: 'Frontend', proficiency: 90 },
        { name: 'Node.js', category: 'Backend', proficiency: 85 },
        { name: 'TypeScript', category: 'Language', proficiency: 88 },
        { name: 'Python', category: 'Backend', proficiency: 80 },
        { name: 'UI/UX Design', category: 'Design', proficiency: 75 }
    ];

    const demoExperiences = [
        {
            title: 'Senior Full-Stack Developer',
            company: 'Tech Innovators Inc.',
            startDate: '2022-01-01',
            endDate: null,
            description: 'Leading development of cutting-edge web applications using modern technologies.'
        },
        {
            title: 'Frontend Developer',
            company: 'Creative Agency',
            startDate: '2020-03-01',
            endDate: '2021-12-31',
            description: 'Created stunning user interfaces and implemented responsive designs.'
        },
        {
            title: 'Junior Developer',
            company: 'StartUp Hub',
            startDate: '2018-06-01',
            endDate: '2020-02-28',
            description: 'Developed web applications and learned best practices from senior developers.'
        }
    ];

    const demoProjects = [
        {
            title: 'E-Commerce Platform',
            description: 'A modern e-commerce solution with real-time inventory, payment processing, and analytics dashboard.',
            technologies: ['React', 'Node.js', 'MongoDB'],
            thumbnailUrl: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=400&fit=crop',
            liveUrl: '#'
        },
        {
            title: 'AI Chat Assistant',
            description: 'An intelligent chatbot powered by machine learning for customer support automation.',
            technologies: ['Python', 'TensorFlow', 'React'],
            thumbnailUrl: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&h=400&fit=crop',
            liveUrl: '#'
        },
        {
            title: 'Fitness Tracker App',
            description: 'Mobile-first fitness tracking application with workout plans and progress analytics.',
            technologies: ['React Native', 'Firebase', 'Redux'],
            thumbnailUrl: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=600&h=400&fit=crop',
            liveUrl: '#'
        }
    ];

    const demoTestimonials = [
        {
            content: 'Working with this developer was an absolute pleasure. They delivered beyond expectations and maintained excellent communication throughout the project.',
            authorName: 'Sarah Johnson',
            authorRole: 'CEO',
            authorCompany: 'TechStart Inc.'
        },
        {
            content: 'Incredible attention to detail and a true passion for clean code. Our project was completed on time and exceeded all quality standards.',
            authorName: 'Michael Chen',
            authorRole: 'Product Manager',
            authorCompany: 'Innovation Labs'
        }
    ];

    renderSkills(demoSkills);
    renderExperiences(demoExperiences);
    renderProjects(demoProjects);
    renderTestimonials(demoTestimonials);
    updateOwnerInfo();
}

// Fallback Content
function showFallbackContent() {
    showDemoData();
}

// Helper Functions
function getSkillIcon(category) {
    const icons = {
        'Frontend': '🎨',
        'Backend': '⚙️',
        'Database': '🗄️',
        'Design': '✨',
        'DevOps': '🚀',
        'Language': '💻',
        'Mobile': '📱',
        'default': '⭐'
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
