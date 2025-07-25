document.addEventListener('DOMContentLoaded', () => {
  const heroContent = document.querySelector('.hero-content');
  const heroVideo = document.querySelector('.hero-video');

  window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const rate = scrolled * 0.5;
    
    // Parallax effect for hero content
    heroContent.style.transform = `translate3d(0, ${scrolled * 0.3}px, 0)`;
    
    // Subtle zoom effect for video
    heroVideo.style.transform = `scale(${1 + scrolled * 0.0005})`;
  });

  // Mouse parallax effect
  document.addEventListener('mousemove', (e) => {
    const mouseX = e.clientX / window.innerWidth - 0.5;
    const mouseY = e.clientY / window.innerHeight - 0.5;
    
    heroContent.style.transform = `translate3d(${mouseX * 20}px, ${mouseY * 20}px, 0)`;
    heroVideo.style.transform = `scale(1.1) translate3d(${mouseX * 10}px, ${mouseY * 10}px, 0)`;
  });
});
