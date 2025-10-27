// Gallery image loader
document.addEventListener('DOMContentLoaded', function() {
  const galleryItems = document.querySelectorAll('.gallery-item img');

  galleryItems.forEach(img => {
    const originalSrc = img.currentSrc || img.src;

    img.loading = 'lazy';
    img.decoding = 'async';

    img.onerror = function() {
      console.error(`[ImageLoader] Failed to load image: ${originalSrc}`);
      img.classList.add('image-load-error');
    };
  });
});

// Add intersection observer for lazy loading
const imageObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target;
      if (img.dataset.src) {
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
      }
      observer.unobserve(img);
    }
  });
}, {
  rootMargin: '50px 0px',
  threshold: 0.1
});

document.querySelectorAll('img[data-src]').forEach(img => {
  imageObserver.observe(img);
});
