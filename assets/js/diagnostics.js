/* Lightweight diagnostics script to surface issues quickly on the site */
(function(){
  function log(msg, data){ try{ console.log('[site-diagnostics]', msg, data||''); }catch(e){} }
  function warn(msg, data){ try{ console.warn('[site-diagnostics]', msg, data||''); }catch(e){} }

  document.addEventListener('DOMContentLoaded', function(){
    // Check background video
    var video = document.querySelector('.background-video');
    if(!video){ warn('No .background-video element found'); return; }
    log('Background video present', {src: video.querySelector('source') && video.querySelector('source').src});

    // Check header/menu
    var header = document.querySelector('header');
    var nav = document.querySelector('header nav');
    var btn = document.querySelector('.mobile-menu-btn');
    log('Header/nav/button', {header: !!header, nav: !!nav, btn: !!btn});

    if(btn){
      btn.addEventListener('click', function(){
        setTimeout(function(){
          var open = header && header.classList.contains('menu-open');
          log('Menu toggled, header.menu-open=', open);
          var navStyle = nav && getComputedStyle(nav);
          log('Nav computed display', navStyle && navStyle.display);
        }, 50);
      });
    }

    // Check gallery functionality
    var galleryGrid = document.querySelector('.gallery-grid');
    var galleryItems = document.querySelectorAll('.gallery-item');
    var lightbox = document.querySelector('#lightbox');
    log('Gallery elements', {
      grid: !!galleryGrid, 
      items: galleryItems.length, 
      lightbox: !!lightbox
    });

    if(galleryItems.length > 0){
      // Test first gallery item click
      var firstItem = galleryItems[0];
      if(firstItem){
        firstItem.addEventListener('click', function(){
          setTimeout(function(){
            var lightboxActive = lightbox && lightbox.classList.contains('active');
            log('Gallery item clicked, lightbox active=', lightboxActive);
          }, 100);
        });
      }
    }

    // External icons/images
    document.querySelectorAll('img').forEach(function(img){
      if(!img.complete){
        img.addEventListener('error', function(){ warn('Image failed to load', img.src); });
      }
    });
  });
})();
