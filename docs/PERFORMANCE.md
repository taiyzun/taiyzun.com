# Performance

Last Lighthouse baseline: 2026-06-24.

## taiyzun.com

- Performance: 82
- Accessibility: 100
- Best practices: 82
- SEO: 100
- Main current risks: render-blocking resources, LCP around 3.8 s, main-thread work, minor image sizing.

## taj-mahal-movie.com

- Performance: 65
- Accessibility: 100
- Best practices: 100
- SEO: 100
- Main current risks: LCP around 6.5 s, render-blocking font/CSS chain, hero image delivery.

## Next safe improvements

- Inline or defer critical CSS only after screenshot comparison.
- Keep hero image quality but tune preload/source selection.
- Avoid adding new third-party scripts without a measured need.
- Re-run Lighthouse after every performance commit.
