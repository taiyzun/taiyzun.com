/* Enhanced Gallery System - Bulletproof Implementation */
class UniversalGallery {
  constructor() {
    this.images = [];
    this.currentIndex = 0;
    this.isOpen = false;
    this.isTransitioning = false;
  this.pendingIndex = null; // allow queuing a navigation while loading
    
    this.init();
  }
  
  init() {
    // Wait for DOM to be fully loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }
  }
  
  setup() {
    console.log('[Gallery] Setting up gallery...');
    
    // Detect gallery type and setup accordingly
    this.setupGalleryImages();
    this.createLightbox();
    this.bindEvents();
    this.setupIntersectionObserver();
    
    console.log('[Gallery] Gallery setup complete with', this.images.length, 'images');
  }
  
  setupGalleryImages() {
    const galleryItems = document.querySelectorAll('.gallery-item');
    
    galleryItems.forEach((item, index) => {
      const img = item.querySelector('img');
      const titleEl = item.querySelector('.gallery-info h3');
      const descEl = item.querySelector('.gallery-info p');
      
      if (img) {
        this.images.push({
          src: img.src,
          alt: img.alt || `Image ${index + 1}`,
          title: titleEl ? titleEl.textContent : `Image ${index + 1}`,
          description: descEl ? descEl.textContent : ''
        });
        
        // Add click handler
        item.addEventListener('click', (e) => {
          e.preventDefault();
          this.openLightbox(index);
        });
        
        // Add visual feedback
        item.style.cursor = 'pointer';
      }
    });
  }
  
  createLightbox() {
    // Remove existing lightbox if any
    const existing = document.getElementById('universal-lightbox');
    if (existing) existing.remove();
    
    const lightboxHTML = `
      <div id="universal-lightbox" class="lightbox" style="display: none;">
        <div class="lightbox-backdrop"></div>
        <div class="lightbox-container">
          <button class="lightbox-close" aria-label="Close gallery">&times;</button>
          <button class="lightbox-prev" aria-label="Previous image">&#10094;</button>
          <button class="lightbox-next" aria-label="Next image">&#10095;</button>
          
          <div class="lightbox-content">
            <img id="universal-lightbox-image" src="" alt="">
            <div class="lightbox-loader">
              <div class="loader-spinner"></div>
            </div>
          </div>
          
          <div class="lightbox-info">
            <h3 id="universal-lightbox-title">Title</h3>
            <p id="universal-lightbox-description">Description</p>
            <div class="lightbox-counter">
              <span id="universal-current-index">1</span> / <span id="universal-total-images">${this.images.length}</span>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', lightboxHTML);
  }
  
  bindEvents() {
    const lightbox = document.getElementById('universal-lightbox');
    if (!lightbox) return;
    
    // Close button
    lightbox.querySelector('.lightbox-close').addEventListener('click', () => this.closeLightbox());
    
    // Navigation buttons
    lightbox.querySelector('.lightbox-prev').addEventListener('click', (e) => {
      e.stopPropagation();
      console.log('[Gallery] Previous button clicked');
      this.prevImage();
    });
    
    lightbox.querySelector('.lightbox-next').addEventListener('click', (e) => {
      e.stopPropagation();
      console.log('[Gallery] Next button clicked');
      this.nextImage();
    });
    
    // Backdrop click to close
    lightbox.querySelector('.lightbox-backdrop').addEventListener('click', () => this.closeLightbox());
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    
    // Touch support
    let touchStartX = 0;
    lightbox.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
    }, { passive: true });
    
    lightbox.addEventListener('touchend', (e) => {
      if (!this.isOpen) return;
      const touchEndX = e.changedTouches[0].clientX;
      const diff = touchStartX - touchEndX;
      if (Math.abs(diff) > 50) {
        if (diff > 0) {
          this.nextImage();
        } else {
          this.prevImage();
        }
      }
    }, { passive: true });

    console.log('[Gallery] Bound lightbox events.');
  }
  
  setupIntersectionObserver() {
    const options = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }
      });
    }, options);
    
    document.querySelectorAll('.gallery-item').forEach((item, index) => {
      item.style.animationDelay = `${(index + 1) * 0.1}s`;
      observer.observe(item);
    });
  }
  
  openLightbox(index) {
    if (this.isOpen || this.isTransitioning) return;
    
    console.log('[Gallery] Opening lightbox at index:', index);
    
    this.currentIndex = index;
    this.isOpen = true;
    this.isTransitioning = true;
    
    const lightbox = document.getElementById('universal-lightbox');
    const lightboxImage = lightbox.querySelector('#universal-lightbox-image');
    const loader = lightbox.querySelector('.lightbox-loader');
    
    // Show lightbox
    lightbox.style.display = 'flex';
    setTimeout(() => {
      lightbox.classList.add('active');
    }, 10);
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    
    // Show loader
    loader.classList.add('active');
    lightboxImage.style.opacity = '0';
    
    // Load image
    this.loadImage(this.images[this.currentIndex].src)
      .then(() => {
        lightboxImage.src = this.images[this.currentIndex].src;
        lightboxImage.alt = this.images[this.currentIndex].alt;
        this.updateLightboxInfo();
        
        // Hide loader and show image
        loader.classList.remove('active');
        lightboxImage.style.opacity = '1';
        this.isTransitioning = false;
      })
      .catch((error) => {
        console.error('[Gallery] Failed to load image:', error);
        loader.classList.remove('active');
        this.isTransitioning = false;
      });
  }
  
  closeLightbox() {
    if (!this.isOpen || this.isTransitioning) return;
    
    console.log('[Gallery] Closing lightbox');
    
    this.isTransitioning = true;
    this.isOpen = false;
    
    const lightbox = document.getElementById('universal-lightbox');
    
    // Hide lightbox
    lightbox.classList.remove('active');
    
    setTimeout(() => {
      lightbox.style.display = 'none';
      document.body.style.overflow = 'auto';
      this.isTransitioning = false;
    }, 400);
  }
  
  nextImage() {
    if (this.isTransitioning) return;
    console.log('[Gallery] Next image called, current index:', this.currentIndex);
    const nextIndex = (this.currentIndex + 1) % this.images.length;
    this.navigateToImage(nextIndex);
  }
  
  prevImage() {
    if (this.isTransitioning) return;
    console.log('[Gallery] Previous image called, current index:', this.currentIndex);
    const prevIndex = this.currentIndex === 0 ? this.images.length - 1 : this.currentIndex - 1;
    this.navigateToImage(prevIndex);
  }
  
  navigateToImage(newIndex) {
    if (newIndex === this.currentIndex) return;

    // If we're mid-transition/loading, queue the navigation
    if (this.isTransitioning) {
      this.pendingIndex = newIndex;
      console.log('[Gallery] Navigation queued to index', newIndex, 'while transitioning');
      return;
    }

    console.log('[Gallery] Navigating from index', this.currentIndex, 'to index', newIndex);

    this.isTransitioning = true;
    
    const lightboxImage = document.getElementById('universal-lightbox-image');
    const loader = document.querySelector('.lightbox-loader');
    
    // Fade out current image
    lightboxImage.style.opacity = '0';
    loader.classList.add('active');
    
    setTimeout(() => {
      this.currentIndex = newIndex;
      
      this.loadImage(this.images[this.currentIndex].src)
        .then(() => {
          lightboxImage.src = this.images[this.currentIndex].src;
          lightboxImage.alt = this.images[this.currentIndex].alt;
          this.updateLightboxInfo();
          
          loader.classList.remove('active');
          lightboxImage.style.opacity = '1';
          this.isTransitioning = false;
          // If a navigation was queued while loading, perform it now
          if (this.pendingIndex !== null && this.pendingIndex !== this.currentIndex) {
            const p = this.pendingIndex;
            this.pendingIndex = null;
            // Small timeout to allow DOM update
            setTimeout(() => this.navigateToImage(p), 50);
          }
        })
        .catch((error) => {
          console.error('[Gallery] Failed to load image:', error);
          loader.classList.remove('active');
          lightboxImage.style.opacity = '1';
          this.isTransitioning = false;
          if (this.pendingIndex !== null && this.pendingIndex !== this.currentIndex) {
            const p = this.pendingIndex;
            this.pendingIndex = null;
            setTimeout(() => this.navigateToImage(p), 50);
          }
        });
    }, 200);
  }
  
  updateLightboxInfo() {
    const titleEl = document.getElementById('universal-lightbox-title');
    const descEl = document.getElementById('universal-lightbox-description');
    const currentEl = document.getElementById('universal-current-index');
    const totalEl = document.getElementById('universal-total-images');
    
    const imageData = this.images[this.currentIndex];
    
    if (titleEl) titleEl.textContent = imageData.title;
    if (descEl) descEl.textContent = imageData.description;
    if (currentEl) currentEl.textContent = this.currentIndex + 1;
    if (totalEl) totalEl.textContent = this.images.length;
    if (totalEl) totalEl.textContent = this.images.length;
  }
  
  loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(src);
      img.onerror = reject;
      img.src = src;
    });
  }
  
  handleKeyboard(e) {
    if (!this.isOpen) return;
    
    switch(e.key) {
      case 'Escape':
        this.closeLightbox();
        break;
      case 'ArrowRight':
      case ' ':
        e.preventDefault();
        this.nextImage();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        this.prevImage();
        break;
      case 'Home':
        e.preventDefault();
        this.navigateToImage(0);
        break;
      case 'End':
        e.preventDefault();
        this.navigateToImage(this.images.length - 1);
        break;
    }
  }
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  // Only initialize if gallery items exist
  if (document.querySelectorAll('.gallery-item').length > 0) {
    console.log('[Gallery] Initializing Universal Gallery');
    window.galleryInstance = new UniversalGallery();
  }
});
