<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/a3c82e7b-af68-41bd-8d25-02d8c066e489

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm ci`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## SQLite server and public-release preparation

The Orange Pi deployment uses `better-sqlite3` with a persistent Docker data volume.
See [personal/family account design](docs/personal-family-technical-design.ar.md)
and [security changes and deployment requirements](docs/security-foundation-deployment.ar.md).
Personal ledgers remain private. Shared family ledgers now support membership roles, account-bound invitations, transactions, recurring bills, activity history, ownership transfer, and JSON export/merge import. See [family features and rollout](docs/family-ledgers-deployment.ar.md) for the implemented scope and remaining public-release work.

Run `npm run lint` and `npm test` before deployment. Tests use isolated temporary databases.
Existing session tokens are revoked once on upgrade; users must sign in again.
Never commit or copy the running database into a Docker image.
