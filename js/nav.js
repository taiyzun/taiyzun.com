document.addEventListener('DOMContentLoaded', () => {
    // Create and insert hamburger menu
    const hamburger = document.createElement('div');
    hamburger.className = 'hamburger-menu';
    for (let i = 0; i < 3; i++) {
        const dot = document.createElement('div');
        dot.className = 'dot';
        hamburger.appendChild(dot);
    }
    document.body.appendChild(hamburger);

    // Create and insert navigation menu
    const nav = document.createElement('nav');
    nav.className = 'nav-menu';
    nav.innerHTML = `
        <ul>
            <li><a href="index.html" ${window.location.pathname.endsWith('index.html') ? 'class="active"' : ''}>Home</a></li>
            <li><a href="about.html" ${window.location.pathname.endsWith('about.html') ? 'class="active"' : ''}>About</a></li>
            <li><a href="work.html" ${window.location.pathname.endsWith('work.html') ? 'class="active"' : ''}>Work</a></li>
            <li><a href="gallery.html" ${window.location.pathname.endsWith('gallery.html') ? 'class="active"' : ''}>Gallery</a></li>
            <li><a href="contact.html" ${window.location.pathname.endsWith('contact.html') ? 'class="active"' : ''}>Contact</a></li>
        </ul>
    `;
    document.body.appendChild(nav);

    // Toggle menu on hamburger click
    hamburger.addEventListener('click', () => {
        nav.classList.toggle('active');
        if (nav.classList.contains('active')) {
            nav.style.boxShadow = '0 0 20px rgba(255,215,0,0.1)';
        } else {
            nav.style.boxShadow = 'none';
        }
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!nav.contains(e.target) && !hamburger.contains(e.target)) {
            nav.classList.remove('active');
            nav.style.boxShadow = 'none';
        }
    });

    // Update active state based on current page
    const currentPath = window.location.pathname;
    const links = nav.querySelectorAll('a');
    links.forEach(link => {
        if (link.getAttribute('href') === currentPath.split('/').pop()) {
            link.classList.add('active');
        }
    });
  const menuToggle = document.querySelector('.menu-toggle');
  const siteNav = document.querySelector('.site-nav');
  const navOverlay = document.querySelector('.nav-overlay');
  const navLinks = document.querySelectorAll('.nav-menu a');

  // Toggle menu
  menuToggle.addEventListener('click', () => {
    siteNav.classList.toggle('active');
    document.body.style.overflow = siteNav.classList.contains('active') ? 'hidden' : '';
  });

  // Close menu when clicking overlay
  navOverlay.addEventListener('click', () => {
    siteNav.classList.remove('active');
    document.body.style.overflow = '';
  });

  // Close menu when clicking a link
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      siteNav.classList.remove('active');
      document.body.style.overflow = '';
    });
  });

  // Close menu when pressing Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && siteNav.classList.contains('active')) {
      siteNav.classList.remove('active');
      document.body.style.overflow = '';
    }
  });
});
