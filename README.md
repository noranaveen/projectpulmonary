# projectpulmonary

This repository contains the static website for Project Pulmonary.

## Custom domain

The site is configured for a GitHub Pages custom domain using the `CNAME` file.

To update the domain name:

1. Edit `site-config.json` and set `siteDomain` to your desired domain.
2. Run `python3 update-domain.py` from the repository root.
3. Commit and push the updated files.

## Deployment

The branch `deploy` is intended for GitHub Pages deployment.

To publish the site publicly:

1. Ensure GitHub Pages is enabled on the `deploy` branch.
2. Add the custom domain to your DNS provider and point it to GitHub Pages.
3. Confirm the custom domain in GitHub Pages settings.
