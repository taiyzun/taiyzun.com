Lighthouse CI workflow

What I added
- A GitHub Actions workflow `.github/workflows/lighthouse.yml` that runs on `push` and once weekly.
- It runs Lighthouse (mobile preset) against `https://taiyzun.com/odyssey.html` and stores the JSON output in `reports/`.
- The workflow uploads `reports/` as an artifact named `lighthouse-report` so you can download the JSON from the GitHub Actions run page.

How to use
1. Push this branch to GitHub (or merge to `main`).
2. Check the Actions tab in your repo after the run finishes.
3. Download the `lighthouse-report` artifact and share the `lighthouse-odyssey.json` with me — I will parse it and produce prioritized fixes with patches.

Notes
- The workflow uses `npx -y lighthouse` so no additional GitHub secret is required.
- If you'd rather run Lighthouse against a staging URL, update the URL in the workflow.
