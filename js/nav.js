document.addEventListener('DOMContentLoaded', () => {
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
