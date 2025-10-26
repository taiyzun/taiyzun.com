/* Enhanced Gallery System - Bulletproof Implementation */
class UniversalGallery {
  constructor() {
    this.images = [];
    this.currentIndex = 0;
    this.isOpen = false;
    this.isTransitioning = false;
    this.pendingIndex = null;
    this.init();
  }
  
  init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }
  }
  
  setup() {
    console.log('[Gallery] Setting up gallery...');
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
        
        item.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('[Gallery] Gallery item clicked', index);
          this.openLightbox(index);
        });
        
        item.style.cursor = 'pointer';
      }
    });
  }
  
  createLightbox() {
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
            <h3 id="universal-lightbox-title"></h3>
            <p id="universal-lightbox-description"></p>
            <div class="lightbox-counter">
              <span id="universal-current-index">1</span> / <span id="universal-total-images">1</span>
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
    
    const closeBtn = lightbox.querySelector('.lightbox-close');
    const prevBtn = lightbox.querySelector('.lightbox-prev');
    const nextBtn = lightbox.querySelector('.lightbox-next');
    const backdrop = lightbox.querySelector('.lightbox-backdrop');
    
    closeBtn.addEventListener('click', () => this.closeLightbox());
    
    prevBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!this.isTransitioning) {
        this.prevImage();
      }
    });
    
    nextBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!this.isTransitioning) {
        this.nextImage();
      }
    });
    
    backdrop.addEventListener('click', () => this.closeLightbox());
    
    document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;
    
    lightbox.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchStartTime = Date.now();
    }, { passive: true });
    
    lightbox.addEventListener('touchend', (e) => {
      if (!this.isOpen) return;
      
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const touchEndTime = Date.now();
      
      const diffX = touchStartX - touchEndX;
      const diffY = Math.abs(touchStartY - touchEndY);
      const timeDiff = touchEndTime - touchStartTime;
      
      if (Math.abs(diffX) > 30 && diffY < 100 && timeDiff < 300) {
        if (diffX > 0 && !this.isTransitioning) {
          this.nextImage();
        } else if (diffX < 0 && !this.isTransitioning) {
          this.prevImage();
        }
      }
    }, { passive: true });
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
    
    lightbox.style.display = 'flex';
    requestAnimationFrame(() => {
      lightbox.classList.add('active');
    });
    
    document.body.style.overflow = 'hidden';
    
    loader.classList.add('active');
    lightboxImage.style.opacity = '0';
    
    this.loadImage(this.images[this.currentIndex].src)
      .then(() => {
        lightboxImage.src = this.images[this.currentIndex].src;
        lightboxImage.alt = this.images[this.currentIndex].alt;
        this.updateLightboxInfo();
        
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
    lightbox.classList.remove('active');
    
    setTimeout(() => {
      lightbox.style.display = 'none';
      document.body.style.overflow = 'auto';
      this.isTransitioning = false;
    }, 300);
  }
  
  nextImage() {
    if (this.isTransitioning) return;
    const nextIndex = (this.currentIndex + 1) % this.images.length;
    this.navigateToImage(nextIndex);
  }
  
  prevImage() {
    if (this.isTransitioning) return;
    const prevIndex = this.currentIndex === 0 ? this.images.length - 1 : this.currentIndex - 1;
    this.navigateToImage(prevIndex);
  }
  
  navigateToImage(newIndex) {
    if (newIndex === this.currentIndex || !this.images[newIndex]) return;
    
    if (this.isTransitioning) {
      this.pendingIndex = newIndex;
      return;
    }
    
    this.isTransitioning = true;
    
    const lightboxImage = document.getElementById('universal-lightbox-image');
    const loader = document.querySelector('.lightbox-loader');
    
    lightboxImage.style.opacity = '0';
    loader.classList.add('active');
    
    this.loadImage(this.images[newIndex].src)
      .then(() => {
        this.currentIndex = newIndex;
        lightboxImage.src = this.images[newIndex].src;
        lightboxImage.alt = this.images[newIndex].alt;
        this.updateLightboxInfo();
        
        requestAnimationFrame(() => {
          loader.classList.remove('active');
          lightboxImage.style.opacity = '1';
          this.isTransitioning = false;
          
          if (this.pendingIndex !== null && this.pendingIndex !== this.currentIndex) {
            const nextIndex = this.pendingIndex;
            this.pendingIndex = null;
            setTimeout(() => this.navigateToImage(nextIndex), 50);
          }
        });
      })
      .catch((error) => {
        console.error('[Gallery] Failed to load image:', error);
        loader.classList.remove('active');
        this.isTransitioning = false;
      });
  }
  
  updateLightboxInfo() {
    const titleEl = document.getElementById('universal-lightbox-title');
    const descEl = document.getElementById('universal-lightbox-description');
    const currentEl = document.getElementById('universal-current-index');
    const totalEl = document.getElementById('universal-total-images');
    
    if (!titleEl || !descEl || !currentEl || !totalEl) return;
    
    const imageData = this.images[this.currentIndex];
    
    titleEl.textContent = imageData.title;
    descEl.textContent = imageData.description;
    currentEl.textContent = this.currentIndex + 1;
    totalEl.textContent = this.images.length;
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
        if (!this.isTransitioning) {
          this.nextImage();
        }
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (!this.isTransitioning) {
          this.prevImage();
        }
        break;
      case 'Home':
        e.preventDefault();
        if (!this.isTransitioning) {
          this.navigateToImage(0);
        }
        break;
      case 'End':
        e.preventDefault();
        if (!this.isTransitioning) {
          this.navigateToImage(this.images.length - 1);
        }
        break;
    }
  }
}

// Initialize with a delay to ensure DOM is fully loaded
setTimeout(() => {
  const items = document.querySelectorAll('.gallery-item');
  if (items.length > 0) {
    console.log('[Gallery] Found ' + items.length + ' gallery items. Initializing Universal Gallery.');
    window.galleryInstance = new UniversalGallery();
    console.log('[Gallery] Universal Gallery instance created:', window.galleryInstance);
  } else {
    console.log('[Gallery] No gallery items found.');
  }
}, 100);