# EduZone — Learn. Practice. Grow.

A free, responsive study-portal landing page for students across India.

## Phase 1
- Responsive homepage and mobile navigation
- English, Malayalam and Hindi language selector
- School, college and competitive-exam entry points
- Initial curated links to official/open learning resources
- No account, database, upload or AI API required yet

## Run locally
Open `index.html` in a browser. No build step is required.

## Deploy
This is a static site. Connect the repository to Vercel with:
- Framework preset: Other
- Root directory: ./
- Build command: leave empty
- Output directory: leave empty (or use the project root default)

## Resource and copyright policy
EduZone links to official resources by default. Do not copy or host third-party textbooks, papers, videos or notes unless the individual resource's license or written permission clearly allows redistribution. Check attribution, non-commercial, share-alike and no-derivatives conditions before reuse.

## Phase 2
- Search resources by title and keywords
- Filter by learning level and subject
- Responsive resource cards and empty-search feedback
- Resource entries maintained in a simple JavaScript catalogue
- Official links open separately; reuse permissions are respected

## Next phases
1. Searchable resource catalogue and subject/class filters
2. Admin-managed resource submissions and review
3. Optional student accounts and dashboard
4. Quizzes and progress tracking
5. Carefully scoped AI study assistant

Built as a separate project from KPM Traders.

## Phase 3 — Secure administrator and shared resource catalogue
- Neon Managed Auth passwordless magic-link sign-in; public sign-ups are disabled
- Same-origin authentication proxy to keep browser sessions on the EduZone site origin
- Admin-only create, edit and delete operations, with server-side JWT verification and an explicit administrator-role/email check
- Shared resource catalogue stored in the separate EduZone Neon database; public visitors can read it
- Database credentials remain in Vercel server-side environment variables
- The initial catalogue is seeded with official resource links; redistribution permissions must still be checked before hosting copies

## Deployment configuration
- Vercel environment variables: `DATABASE_URL` (sensitive), `NEON_AUTH_BASE_URL`, and `NEON_AUTH_JWKS_URL`
- Vercel Node.js functions live in `api/`; dependencies are listed in `package.json`
- Do not commit database URLs, passwords, or private keys
- The administrator account is provisioned separately in Neon Auth; public registration is disabled

## Verification status
The production deployment must be tested end-to-end with a real email delivery, magic-link callback, session restoration and an authenticated resource change before the admin workflow is considered fully verified.
