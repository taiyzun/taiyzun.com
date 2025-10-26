// Gallery image loader
document.addEventListener('DOMContentLoaded', function() {
  const galleryItems = document.querySelectorAll('.gallery-item img');
  
  galleryItems.forEach(img => {
      const originalSrc = img.src;
    
    // Set loading and decoding attributes for better performance
    img.loading = "lazy";
    img.decoding = "async";
    
    // Add error handling
    img.onerror = function() {
      console.error(`Failed to load image: ${originalSrc}`);
      img.style.display = 'none';
    };
    
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
