// Gallery image loader
document.addEventListener('DOMContentLoaded', function() {
  const galleryItems = document.querySelectorAll('.gallery-item img');
  
  galleryItems.forEach(img => {
    // Only build a responsive srcset when explicitly opted in via data attribute.
    if (img.dataset.responsive === 'true') {
      const originalSrc = img.src;
      const extension = originalSrc.split('.').pop();
      const basePath = originalSrc.substring(0, originalSrc.lastIndexOf('.'));
      
      img.srcset = `
        ${basePath}-sm.${extension} 300w,
        ${basePath}-md.${extension} 600w,
        ${basePath}-lg.${extension} 900w,
        ${originalSrc} 1200w
      `;
      img.sizes = "(max-width: 480px) 300px, (max-width: 768px) 600px, (max-width: 1200px) 900px, 1200px";
    }
    
    img.loading = "lazy";
    img.decoding = "async";
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
