document.addEventListener('DOMContentLoaded', () => {
    // Define gallery sections and their image paths
    const galleryConfig = {
        art: {
            title: 'Art',
            path: 'assets/Art/',
            images: [
                ...Array.from({ length: 31 }, (_, i) => `arT ${String(i + 1).padStart(5, '0')}.jpg`),
                'miSc SecreT keyS.jpg', 'miSc Shiva Shanker Tone.jpg', 'miSc Shiva Shanker.jpg',
                'miSc Smoke.jpg', 'miSc Sp ce.jpg', 'miSc T ShirT deSign.jpg', 'miSc Taj.jpg',
                'miSc Tikka.jpg', 'miSc chaSe To0.jpg', 'miSc chaSe.jpg', 'miSc dj jeTo coming Soon.jpg',
                'miSc everyThing.jpg', 'miSc freSh.jpg', 'miSc keep walking.jpg', 'miSc mango public.jpg',
                'miSc pink.jpg', 'miSc reborn.jpg'
            ]
        },
        designs: {
            title: 'Designs',
            path: 'assets/Art/',
            images: [
                ...Array.from({ length: 27 }, (_, i) => `deSignS ${String(i + 1).padStart(5, '0')}.jpg`)
            ]
        },
        cdDesigns: {
            title: 'CD Designs',
            path: 'assets/Art/',
            images: [
                'cd deSignS big brain waSh inlay.jpg',
                'cd deSignS deliver uS from evil back.jpg',
                'cd deSignS deliver uS from evil cd.jpg',
                'cd deSignS deliver uS from evil under cd.jpg',
                'cd deSignS hypnoTic waveformS cd.jpg',
                'cd deSignS hypnoTic waveformS fronT n back.jpg',
                'cd deSignS rock on cd compilaTion.jpg',
                'cd deSignS rock on cover.jpg',
                'cd deSignS rock on inlay.jpg',
                'cd deSignS rock on ouTlay.jpg',
                'cd deSignS TremourS underground.jpg'
            ]
        },
        flyers: {
            title: 'Flyers & Covers',
            path: 'assets/Art/',
            images: [
                ...Array.from({ length: 57 }, (_, i) => `flyerS and coverS ${String(i + 1).padStart(5, '0')}.jpg`)
            ]
        },
        psychedelicArt: {
            title: 'Psychedelic Art',
            path: 'assets/Art/',
            images: [
                'pSy arT 23rd march raZZ.jpg', 'pSy arT 8.jpg', 'pSy arT The gaTeway.jpg',
                'pSy arT Trance Tea.jpg', 'pSy arT Trip To goa 2.jpg', 'pSy arT Trip To goa.jpg',
                'pSy arT Twice Twice Thrice.jpg', 'pSy arT Twice Twice.jpg', 
                'pSy arT XeroX n illuminaTion prinT.jpg', 'pSy arT analog puSSy.jpg',
                'pSy arT b0rn ulTimaTum.jpg', 'pSy arT barred.jpg', 'pSy arT brain SpAcE.jpg',
                'pSy arT buTTer To0.jpg', 'pSy arT buTTer.jpg', 'pSy arT calling ganeSh.jpg',
                'pSy arT chriSTmaSS.jpg', 'pSy arT deedS.jpg', 'pSy arT dynamic mESuremEnTS ii.jpg',
                'pSy arT dynamic mESuremEnTS.jpg', 'pSy arT euphoria.jpg', 'pSy arT freeZa ocean.jpg',
                'pSy arT fridayS.jpg', 'pSy arT grand Sp ce.jpg', 'pSy arT harveSTer of.jpg',
                'pSy arT highko.jpg', 'pSy arT hmmm.jpg', 'pSy arT hmmmap.jpg', 'pSy arT idjc flyer.jpg',
                'pSy arT jam.jpg', 'pSy arT kdd map.jpg', 'pSy arT mEnog milkShake.jpg',
                'pSy arT moTherhood.jpg', 'pSy arT n um b 0ne.jpg', 'pSy arT nemo.jpg',
                'pSy arT pSycho karan.jpg', 'pSy arT parTymap.jpg', 'pSy arT penTaZZ.jpg',
                'pSy arT penTed.jpg', 'pSy arT q goSpel.jpg', 'pSy arT vT.jpg',
                'pSy arT whoSane aSad pune7Th april map.jpg', 'pSy arT wide Screen.jpg'
            ]
        },
        portraits: {
            title: 'Portraits',
            path: 'assets/Portraits/',
            images: [
                ...Array.from({ length: 7 }, (_, i) => `Taiyzun Shahpurwala ${String(i + 1).padStart(5, '0')}.jpeg`)
            ]
        },
        logos: {
            title: 'Logos & Branding',
            path: 'assets/logos-branding/',
            images: [
                ...Array.from({ length: 145 }, (_, i) => 
                    i + 1 === 6 || i + 1 === 75 || i + 1 === 131 
                        ? `logo deSignS ${String(i + 1).padStart(5, '0')}.jpeg`
                        : `logo deSignS ${String(i + 1).padStart(5, '0')}.jpg`
                )
            ]
        },
        workPortfolio: {
            title: 'Commercial Work',
            path: 'assets/work-portfolio/',
            images: [
                'commErcial elSe 10.jpg', 'commErcial elSe 2.jpg', 'commErcial elSe 3.jpg',
                'commErcial elSe 4.jpg', 'commErcial elSe 5.jpg', 'commErcial elSe 6.jpg',
                'commErcial elSe 7.jpg', 'commErcial elSe 8.jpg', 'commErcial elSe 9.jpg',
                'commErcial elSe.jpg', 'commErcial evergreen yoga flyer.jpg', 'commErcial ippai.jpg',
                'commErcial la SenZa Smile wiTh gorilla.jpg', 'commErcial la SenZa SplaTTer fly.jpg',
                'commErcial la SenZa SqueeZe Teh bunny.jpg', 'commErcial la SenZa XmaS TreaT.jpg',
                'commErcial la SenZa baby & mE.jpg', 'commErcial la SenZa buZZ bomb.jpg',
                'commErcial la SenZa chubby penguin.jpg', 'commErcial la SenZa do noT puSh.jpg',
                'commErcial la SenZa dreamcloud.jpg', 'commErcial la SenZa f0ur elemEnTS.jpg',
                'commErcial la SenZa faST TurTle.jpg', 'commErcial la SenZa flying lOvE.jpg',
                'commErcial la SenZa flying mooS.jpg', 'commErcial la SenZa four SeaSonS.jpg',
                'commErcial la SenZa ginger bread boy.jpg', 'commErcial la SenZa human Touch.jpg',
                'commErcial la SenZa monkey Shine.jpg', 'commErcial la SenZa waTer life.jpg',
                'commErcial la SenZa whaky duck.jpg', 'commErcial la SenZa yin yang.jpg'
            ]
        }
    };
    // Initialize Intersection Observer for lazy loading
    const imageObse    /* Create gallery item with lazy loading and loading indicator */
    function createGalleryItem(imagePath) {
        const figure = document.createElement('figure');
        figure.className = 'gallery-item';
        figure.setAttribute('data-speed', (Math.random() * 0.1).toFixed(2));
        
        // Create loading spinner
        const spinner = document.createElement('div');
        spinner.className = 'loading-spinner';
        figure.appendChild(spinner);
        
        // Create image element
        const img = document.createElement('img');
        img.style.opacity = '0';
        img.style.transition = 'opacity 0.3s ease';
        
        // Set up image loading
        img.onload = () => {
            spinner.remove();
            img.style.opacity = '1';
        };
        
        img.onerror = () => {
            spinner.remove();
            img.src = 'assets/error-placeholder.jpg';
            img.alt = 'Image failed to load';
            img.style.opacity = '1';
        };
        
        // Set image source to trigger loading
        img.src = imagePath;
        img.alt = 'Gallery Image';
        figure.appendChild(img);
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

    // Handle filter changes
    if (filter) {
        filter.addEventListener('change', (e) => {
            const category = e.target.value;
            currentCategory = category;
            
            // Show loading state
            gallery.innerHTML = '';
            const loadingSpinner = document.createElement('div');
            loadingSpinner.className = 'loading-spinner';
            gallery.appendChild(loadingSpinner);
            
            // Short delay to ensure spinner is visible
            setTimeout(() => {
                displayImages(category);
            }, 100);
        });
    }

    function displayImages(category) {
        gallery.innerHTML = '';
        
        let imagesToDisplay = [];
        if (category === 'all') {
            // Combine all images from all categories
            Object.values(galleryConfig).forEach(section => {
                imagesToDisplay = [...imagesToDisplay, 
                    ...section.images.map(img => section.path + img)
                ];
            });
        } else {
            const section = galleryConfig[category];
            if (section) {
                imagesToDisplay = section.images.map(img => section.path + img);
            }
        }

        if (imagesToDisplay.length === 0) {
            const errorMsg = document.createElement('div');
            errorMsg.className = 'gallery-error';
            errorMsg.textContent = 'No images found for this category';
            gallery.appendChild(errorMsg);
            return;
        }

        // Create and append gallery items
        imagesToDisplay.forEach(imagePath => {
            const item = createGalleryItem(imagePath);
            if (item) {
                gallery.appendChild(item);
            }
        });
    }
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
