# Active Sites

Last verified: 2026-06-24.

## Active production sites

- `taiyzun.com`
  - Canonical host: `https://taiyzun.com/`
  - Cloudflare Pages project: `taiyzun-com`
  - GitHub repository: `taiyzun/taiyzun.com`
  - R2 bucket: `taiyzun-gallery`
  - Asset host: `https://assets.taiyzun.com`

- `taj-mahal-movie.com`
  - Canonical host: `https://www.taj-mahal-movie.com/`
  - Redirect host: `https://taj-mahal-movie.com/`
  - Cloudflare Pages project: `taj-mahal-movie-com`
  - GitHub repository: `taiyzun/taj-mahal-movie.com`
  - R2 bucket: `taj-mahal-movie-media`
  - Asset host: `https://assets.taj-mahal-movie.com`

## Old or inactive surfaces

- `shahpurwala.net`: old placeholder surface; Cloudflare zone removed on 2026-06-24. Public DNS did not resolve during audit.
- `ep0ch.org`: old external Vercel/Hostinger surface, outside the active Cloudflare site stack.
- `tajmahalmovies.com`: old pending Cloudflare surface; Cloudflare zone removed on 2026-06-24. Public DNS still used GoDaddy nameservers during audit.
- `tajmahalmovie.com`: live external Taj-related site, outside the current `taj-mahal-movie.com` repo.

Do not route new deployment work through Netlify unless that path is explicitly reactivated.
