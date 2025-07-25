document.addEventListener('DOMContentLoaded', () => {
    // Initialize Intersection Observer for lazy loading
    const imageObse    /* Create gallery item with lazy loading and loading indicator */
    function createGalleryItem(imagePath) {
        const figure = document.createElement('figure');
        figure.className = 'gallery-item';
        figure.setAttribute('data-speed', (Math.random() * 0.1).toFixed(2));
        
        // Add loading spinner
        const loader = document.createElement('div');
        loader.className = 'loading-spinner';
        figure.appendChild(loader);
        
        // Validate image path
        if (!imagePath || typeof imagePath !== 'string') {
            console.error('Invalid image path:', imagePath);
            return null;
        }

        // Create thumbnail container
        const thumbContainer = document.createElement('div');
        thumbContainer.className = 'thumbnail-container';
        } IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                observer.unobserve(img);
            }
        });
    }, {
        rootMargin: '50px 0px',
        threshold: 0.1
    });

    // Initialize lightbox
    const lightboxElement = document.querySelector('.lightbox');
    
    // Close lightbox on click outside
    lightboxElement.addEventListener('click', (e) => {
        if (e.target === lightboxElement) {
            closeLightbox();
        }
    });

    // Close lightbox on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && lightboxElement.classList.contains('active')) {
            closeLightbox();
        }
    });

    // Function to close lightbox
    function closeLightbox() {
        lightboxElement.classList.remove('active');
        history.replaceState(null, null, ' '); // Remove hash from URL
    }

    // Load images for each category
    // Define all image categories and their paths
    const imageCategories = {
        'art': {
            title: 'Art',
            paths: [
                // Art images
                ...Array.from({length: 31}, (_, i) => `assets/Art/arT ${String(i + 1).padStart(5, '0')}.jpg`)
            ]
        },
        'designs': {
            title: 'Designs',
            paths: [
                // Design images
                ...Array.from({length: 27}, (_, i) => `assets/Art/deSignS ${String(i + 1).padStart(5, '0')}.jpg`)
            ]
        },
        'cd-designs': {
            title: 'CD Designs',
            paths: [
                'assets/Art/cd deSignS big brain waSh inlay.jpg',
                'assets/Art/cd deSignS deliver uS from evil back.jpg',
                'assets/Art/cd deSignS deliver uS from evil cd.jpg',
                'assets/Art/cd deSignS deliver uS from evil under cd.jpg',
                'assets/Art/cd deSignS hypnoTic waveformS cd.jpg',
                'assets/Art/cd deSignS hypnoTic waveformS fronT n back.jpg',
                'assets/Art/cd deSignS rock on cd compilaTion.jpg',
                'assets/Art/cd deSignS rock on cover.jpg',
                'assets/Art/cd deSignS rock on inlay.jpg',
                'assets/Art/cd deSignS rock on ouTlay.jpg',
                'assets/Art/cd deSignS TremourS underground.jpg'
            ]
        },
        'flyers': {
            title: 'Flyers & Covers',
            paths: [
                // Flyers and covers
                ...Array.from({length: 8}, (_, i) => `assets/Art/flyerS and coverS ${String(i + 1).padStart(5, '0')}.jpg`)
            ]
        },
        'logos': {
            title: 'Logos & Branding',
            paths: [
                // Add all logo paths
                'assets/logo/TaiyZun-logo.png',
                'assets/logo/favicon.png'
            ]
        },
        'portraits': {
            title: 'Portraits',
            paths: []  // Will be populated with portrait images
        }
    };

    function getImagesForCategory(category) {
        return imageCategories[category]?.paths || [];
    }

    // Initialize all gallery sections
    Object.keys(imageCategories).forEach(category => {
        const grid = document.querySelector(`[data-category="${category}"]`);
        if (!grid) return;

        const images = getImagesForCategory(category);
        if (images.length === 0) {
            grid.innerHTML = '<p class="no-images">No images available in this category.</p>';
            return;
        }

        images.forEach(imagePath => {
            const item = createGalleryItem(imagePath);
            if (item) {
                grid.appendChild(item);
            }
        });
    });

    // Add parallax mouse effect with performance optimization
    let ticking = false;
    document.addEventListener('mousemove', (e) => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                const items = document.querySelectorAll('.gallery-item');
                items.forEach(item => {
                    const speed = item.getAttribute('data-speed') || 0.05;
                    const x = (window.innerWidth - e.pageX * speed) / 100;
                    const y = (window.innerHeight - e.pageY * speed) / 100;
                    item.style.transform = `translateX(${x}px) translateY(${y}px)`;
                });
                ticking = false;
            });
            ticking = true;
        }
    });

    // Add masonry layout
    const masonryLayout = () => {
        document.querySelectorAll('.gallery-grid').forEach(grid => {
            const items = Array.from(grid.children);
            let columns = Math.floor(grid.clientWidth / 300);
            const columnHeights = Array(columns).fill(0);
            
            items.forEach(item => {
                const shortestColumn = columnHeights.indexOf(Math.min(...columnHeights));
                item.style.gridColumn = shortestColumn + 1;
                columnHeights[shortestColumn] += item.clientHeight + 20;
            });
            
            grid.style.gridTemplateRows = `repeat(${Math.max(...columnHeights)}px, auto)`;
        });
    };

    window.addEventListener('resize', masonryLayout);
    window.addEventListener('load', masonryLayout);

    // Organize images by category
    function categorizeImages(imagePath) {
        if (imagePath.includes('cd deSignS')) return 'cd-designs';
        if (imagePath.includes('flyerS and coverS')) return 'flyers';
        if (imagePath.includes('miSc')) return 'misc';
        if (imagePath.includes('pSy arT')) return 'psy-art';
        if (imagePath.includes('deSignS')) return 'designs';
        if (imagePath.includes('arT')) return 'art';
        return 'misc';
    }

    // Create gallery item with lazy loading and loading indicator
    function createGalleryItem(imagePath) {
        const figure = document.createElement('figure');
        figure.className = 'gallery-item';
        figure.setAttribute('data-speed', (Math.random() * 0.1).toFixed(2));
        
        // Add loading spinner
        const loader = document.createElement('div');
        loader.className = 'loading-spinner';
        figure.appendChild(loader);
        
        const img = document.createElement('img');
        img.loading = 'lazy'; // Enable native lazy loading
        img.decoding = 'async'; // Enable async decoding
        img.dataset.src = imagePath; // Set data-src for Intersection Observer
        
        // Handle image load
        img.onload = () => {
            loader.remove(); // Remove spinner
            img.classList.add('loaded');
            figure.classList.add('loaded');
        };
        
        // Handle image error
        img.onerror = () => {
            loader.remove();
            img.src = 'assets/icons/image-error.png';
            img.classList.add('loaded');
            figure.classList.add('error');
        };

        // Add click handler for lightbox
        figure.addEventListener('click', () => {
            const lightboxImg = lightboxElement.querySelector('img');
            lightboxImg.src = img.src;
            lightboxElement.classList.add('active');
        });

        // Observe image for lazy loading
        imageObserver.observe(img);
        img.src = imagePath;
        img.loading = 'lazy';
        
        // Add loading animation
        img.style.opacity = '0';
        img.onload = () => {
            img.style.transition = 'opacity 0.5s ease';
            img.style.opacity = '1';
        };
        
        const caption = document.createElement('figcaption');
        caption.textContent = imagePath.split('/').pop().replace(/\.[^/.]+$/, '')
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase());
        
        figure.appendChild(img);
        figure.appendChild(caption);
        
        // Add click handler for lightbox
        figure.addEventListener('click', () => {
            const lightbox = document.querySelector('.lightbox');
            const lightboxImg = lightbox.querySelector('img');
            lightboxImg.src = imagePath;
            lightboxImg.alt = caption.textContent;
            lightbox.classList.add('active');
        });
        
        return figure;
    }

    // Populate galleries
    const galleries = {
        'art': document.querySelector('.art-grid'),
        'designs': document.querySelector('.designs-grid'),
        'cd-designs': document.querySelector('.cd-designs-grid'),
        'flyers': document.querySelector('.flyers-grid'),
        'misc': document.querySelector('.misc-grid'),
        'psy-art': document.querySelector('.psy-art-grid')
    };

    // Sort and populate images
    window.imagesList.forEach(imagePath => {
        const category = categorizeImages(imagePath);
        if (galleries[category]) {
            const item = createGalleryItem(imagePath);
            galleries[category].appendChild(item);
        }
    });

    // Enhanced lightbox functionality
    const lightbox = document.querySelector('.lightbox');
    let currentImageIndex = 0;
    let currentCategory = '';
    
    function showImage(index, category) {
        const images = Array.from(galleries[category].querySelectorAll('img'));
        if (index >= 0 && index < images.length) {
            const img = images[index];
            const lightboxImg = lightbox.querySelector('img');
            lightboxImg.src = img.src;
            lightboxImg.alt = img.alt;
            currentImageIndex = index;
            currentCategory = category;
        }
    }
    
    // Add navigation buttons to lightbox
    const prevBtn = document.createElement('button');
    prevBtn.className = 'lightbox-nav prev';
    prevBtn.innerHTML = '❮';
    
    const nextBtn = document.createElement('button');
    nextBtn.className = 'lightbox-nav next';
    nextBtn.innerHTML = '❯';
    
    lightbox.appendChild(prevBtn);
    lightbox.appendChild(nextBtn);
    
    // Navigation handlers
    prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showImage(currentImageIndex - 1, currentCategory);
    });
    
    nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showImage(currentImageIndex + 1, currentCategory);
    });
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (!lightbox.classList.contains('active')) return;
        
        if (e.key === 'ArrowLeft') {
            showImage(currentImageIndex - 1, currentCategory);
        } else if (e.key === 'ArrowRight') {
            showImage(currentImageIndex + 1, currentCategory);
        } else if (e.key === 'Escape') {
            lightbox.classList.remove('active');
        }
    });
    
    // Close lightbox on background click
    lightbox.addEventListener('click', (e) => {
        if (e.target !== e.currentTarget.querySelector('img') && 
            !e.target.classList.contains('lightbox-nav')) {
            lightbox.classList.remove('active');
        }
    });

    // Smooth scrolling for navigation
    document.querySelectorAll('.gallery-nav a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            const target = document.getElementById(targetId);
            
            // Update active state
            document.querySelectorAll('.gallery-nav a').forEach(a => a.classList.remove('active'));
            link.classList.add('active');
            
            // Smooth scroll
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        });
    });

    // Intersection Observer for scroll animations
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1
    });

    // Observe all gallery sections
    document.querySelectorAll('.gallery-section').forEach(section => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(20px)';
        observer.observe(section);
    });

    // Update navigation on scroll
    window.addEventListener('scroll', () => {
        const sections = document.querySelectorAll('.gallery-section');
        let current = '';

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            if (window.pageYOffset >= sectionTop - 60) {
                current = section.getAttribute('id');
            }
        });

        document.querySelectorAll('.gallery-nav a').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href').substring(1) === current) {
                link.classList.add('active');
            }
        });
    });
});
