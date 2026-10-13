# 🔎 FoundiT — Lost & Found Management System

A full-stack web application that helps people report lost belongings, discover found items, verify ownership, communicate securely, and coordinate the return of recovered items.

FoundiT is being developed with a phased approach, using a React frontend, Node.js and Express backend, MySQL database, JWT authentication, Cloudinary image storage, and Brevo email services.

> **Current development status:** Phases 1–7 have been implemented for the existing workflows. The dedicated recovery-submission workflow initiated by clicking **“I've Found This Item” on a Lost Item Details page** is still pending. See [Project Roadmap](#-project-roadmap) for details.

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Technology Stack](#-technology-stack)
- [System Architecture](#-system-architecture)
- [Project Roadmap](#-project-roadmap)
- [Application Workflows](#-application-workflows)
- [Prerequisites](#-prerequisites)
- [Installation and Setup](#-installation-and-setup)
- [Environment Configuration](#-environment-configuration)
- [Database Management](#-database-management)
- [Database Migrations and Backups](#-database-migrations-and-backups)
- [Running the Application](#-running-the-application)
- [Git and GitHub Collaboration](#-git-and-github-collaboration)
- [Branching Strategy](#-branching-strategy)
- [Pull Requests and Code Reviews](#-pull-requests-and-code-reviews)
- [Safe Development Workflow](#-safe-development-workflow)
- [Testing and Troubleshooting](#-testing-and-troubleshooting)
- [Security Practices](#-security-practices)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Overview

FoundiT provides a centralized platform for reporting lost belongings and helping people recover them through a structured verification process.

The application is designed around three main participants:

- **Lost-item reporter / claimant:** Reports a missing item, searches listings, provides ownership proof, and communicates with the finder.
- **Finder:** Reports found belongings, responds to relevant claims, and coordinates with the claimant.
- **Administrator:** Reviews ownership evidence, moderates disputes, and makes final approval or rejection decisions.

A regular user may report both lost and found items. Lost-item reporting and found-item reporting are different activities, not separate permanent account roles.

### Project goals

- Replace scattered lost-and-found notices with searchable listings.
- Support photo-based item identification.
- Provide secure ownership verification.
- Enable authorized communication between relevant users.
- Maintain a transparent administrative review process.
- Provide a foundation for future item handover, maps, courier integration, and payments.

---

## ✨ Key Features

### Authentication and accounts

- User registration and login.
- Password hashing using bcrypt.
- JWT-based authentication.
- Email OTP verification through Brevo.
- Phone verification infrastructure, subject to the current SMS provider configuration.
- Protected pages and role-based authorization.
- Forgot-password functionality, if enabled in the current implementation.

### Lost and found item reporting

- Create and manage lost-item reports.
- Create and manage found-item reports.
- Add item descriptions, categories, brand, model, colour, location, date, and identifying details.
- Upload and display item photographs.
- View item details and report status.
- Manage personal reports through the dashboard.

### Search and matching

- Search and filter item listings.
- Identify potential matches between lost and found reports.
- Use item attributes such as category, title, brand, colour, location, and date to calculate matching relevance.
- Display suggested matches without automatically treating them as proof of ownership.

### Ownership verification

- Submit a claim for a found item.
- Provide an ownership explanation and supporting details.
- Upload supporting evidence through the configured evidence-upload workflow.
- Allow the finder to review a claim and respond.
- Allow administrators to approve or reject claims.
- Record decision reasons and administrative review history where implemented.

### Communication and notifications — Phase 7

- In-app conversations for authorized claim participants.
- Persistent message history.
- Conversation read status and unread indicators, where implemented.
- In-app notifications and unread counts.
- Email notifications through the existing Brevo integration for configured events.
- Responsive conversation interface.

### Administration

- Administrative claim-review interface.
- Comparison of the original found-item report and claimant-provided information.
- Review of supporting evidence.
- Public decision reasons and internal administrator notes.
- Administrative approval and rejection controls.

> Feature availability should be verified against the current codebase. A feature mentioned in this README must not be assumed to be enabled merely because its phase is listed.

---

## 🧰 Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React |
| Development server | Vite |
| Routing | React Router |
| HTTP client | Axios |
| Backend | Node.js |
| API framework | Express.js |
| Database | MySQL |
| Local database environment | Docker |
| Authentication | JWT |
| Password security | bcrypt |
| Email delivery | Brevo API |
| Image storage | Cloudinary |
| Version control | Git |
| Repository hosting | GitHub |

The exact package versions and supporting libraries are defined by the project's `package.json` and lock files.

---

## 🏗️ System Architecture

```text
                 ┌──────────────────────────┐
                 │        React UI          │
                 │   Vite + React Router    │
                 └────────────┬─────────────┘
                              │
                         Axios / HTTP
                              │
                 ┌────────────▼─────────────┐
                 │    Node.js + Express     │
                 │                          │
                 │ Authentication & JWT     │
                 │ Item and Search APIs     │
                 │ Claims and Review        │
                 │ Messaging & Notifications│
                 └──────┬──────────┬────────┘
                        │          │
              ┌─────────▼───┐  ┌───▼────────────┐
              │    MySQL    │  │  Cloudinary    │
              │ Application │  │ Item Images    │
              │ Data        │  │ Evidence*      │
              └─────────────┘  └───────────────┘
                        │
                 ┌──────▼─────────┐
                 │   Brevo API    │
                 │ Email / OTP    │
                 └────────────────┘
```

`*` Evidence storage must follow the project's access-control requirements. Private ownership evidence must not be made publicly accessible simply by placing it in a particular Cloudinary folder.

The React frontend communicates with the Express API. The backend validates requests, enforces authorization, performs database operations, and coordinates external services.

The frontend must never contain database credentials, Brevo API keys, Cloudinary API secrets, or other server-only secrets.

---

## 🗺️ Project Roadmap

| Phase | Description | Status |
|---|---|---|
| Phase 1 | Project setup, application structure, MySQL and Docker | Completed |
| Phase 2 | Registration, login, OTP verification and authentication | Completed |
| Phase 3 | Lost/found reporting, dashboards and item details | Completed |
| Phase 4 | Cloudinary item-image uploads | Completed |
| Phase 5 | Search, filtering and potential item matching | Completed |
| Phase 6 | Ownership claims, evidence review and admin decisions | Completed |
| Phase 7 | In-app messaging, notifications and email communication | Implemented for existing workflows |
| Phase 7 extension | Complete recovery-submission workflow from the Lost Items page | Pending |
| Phase 8 | Item handover, maps, courier and payments | Planned |
| Phase 9 | Further administration and moderation improvements | Planned |
| Phase 10 | Security hardening, testing and performance polish | Planned |
| Phase 11 | Production deployment and operational monitoring | Planned |

### Important Phase 7 clarification

The existing communication system is implemented. However, the **“I've Found This Item”** button on a lost-item detail page still displays the outdated message:

`Communication features coming in Phase 7!`

The intended recovery workflow has not yet been integrated.

The pending implementation should let a person who found an item submit a recovery report linked to the original lost-item report, including photos, location, date/time, description, identifying details, and an appropriate declaration.

The workflow should then support communication between the original reporter and the finder, administrative verification, approval or rejection with a decision reason, and appropriate email notifications.

This extension must reuse the existing authentication, messaging, notifications, Cloudinary, and Brevo services wherever appropriate. It must not break the existing found-item claim process.

---

## 🔄 Application Workflows

### 1. Existing found-item ownership claim

```text
Found Item Listed
       │
       ▼
Potential Owner Submits Claim
       │
       ▼
Ownership Details + Evidence
       │
       ▼
Finder Reviews and Responds
       │
       ▼
Administrator Reviews Evidence
       │
       ├── Approve
       │
       └── Reject
       │
       ▼
Decision Notifications
       │
       ▼
Handover / Return Coordination
```

Approval authorizes the next appropriate process; it must not automatically mark the item as returned unless the return has actually been confirmed.

### 2. Planned recovery workflow from a lost-item page

```text
Lost Item Listed
       │
       ▼
User Clicks "I've Found This Item"
       │
       ▼
Found-Item Recovery Submission
       │
       ▼
Photos + Location + Description
       │
       ▼
Submission Linked to Original Lost Report
       │
       ▼
Communication Between Both Participants
       │
       ▼
Administrator Reviews Both Reports
       │
       ├── Approve
       │
       └── Reject
       │
       ▼
Appropriate Email Notifications
       │
       ▼
Handover / Return Coordination
```

This second workflow is a planned extension, not a currently completed feature. Its exact database model and status transitions must be designed after inspecting the existing schema and API contracts.

---

## 💻 Prerequisites

Install the following before running the project:

- Node.js and npm.
- Git.
- Docker Desktop with Docker Compose support.
- A MySQL-compatible database environment.
- A GitHub account.
- A Cloudinary account for image uploads.
- A Brevo account and valid sender configuration for email delivery.

Check the installed tools:

```bash
node --version
npm --version
git --version
docker --version
docker compose version
```

Use the Node.js version supported by the project's dependencies and deployment platform.

---

## 🚀 Installation and Setup

### 1. Clone the repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd lostandfound
```

Replace `YOUR_GITHUB_REPOSITORY_URL` with the actual repository URL.

### 2. Install frontend and backend dependencies

The current project uses separate frontend and backend directories. Inspect the repository if the folder names differ.

```bash
cd frontend
npm ci
cd ..
```

```bash
cd backend
npm ci
cd ..
```

Use `npm install` if a lock file does not exist yet, then commit the generated lock file after verifying the dependency changes.

### 3. Configure environment variables

Create local environment files based on the project's `.env.example` files, if present. See [Environment Configuration](#-environment-configuration).

Never commit real secrets.

### 4. Start the MySQL database

If the project has a Docker Compose file, use the service name and configuration defined in that file:

```bash
docker compose up -d
docker ps
```

If an existing standalone container named `lost_and_found_db` is used instead:

```bash
docker start lost_and_found_db
docker ps
```

Use the method appropriate to your actual setup. Do not create a second database container unnecessarily.

### 5. Apply database migrations

Read the project documentation and inspect the migration scripts before running them.

Apply pending migrations in order. Do not rerun initialisation scripts blindly against a database containing real application data.

### 6. Start the backend

```bash
cd backend
npm run dev
```

The development backend is expected to run at:

`http://localhost:5000`

Confirm the actual port from the backend environment configuration.

### 7. Start the frontend

In a second terminal:

```bash
cd frontend
npm run dev
```

The development frontend is expected to run at:

`http://localhost:5173`

Keep the frontend, backend, and database running together when testing real API interactions.

---

## 🔐 Environment Configuration

Use local `.env` files for secrets and machine-specific configuration. The following are examples of variable names; the exact names must match the project's configuration code.

### Backend environment

```env
PORT=5000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=3307
DB_NAME=lost_and_found
DB_USER=lost_found_user
DB_PASSWORD=YOUR_LOCAL_DATABASE_PASSWORD

JWT_SECRET=YOUR_LONG_RANDOM_SECRET

BREVO_API_KEY=YOUR_BREVO_API_KEY
EMAIL_FROM=YOUR_VERIFIED_SENDER_EMAIL
EMAIL_FROM_NAME=FoundiT

CLOUDINARY_CLOUD_NAME=YOUR_CLOUD_NAME
CLOUDINARY_API_KEY=YOUR_CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET=YOUR_CLOUDINARY_API_SECRET
```

The `DB_PORT=3307` example assumes the Docker container exposes host port 3307. If your actual port mapping differs, use the configured host port.

### Frontend environment

For Vite, client-exposed environment variables normally use the `VITE_` prefix.

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

Only public configuration belongs in the frontend environment. Never place private API secrets or database passwords in variables exposed to the browser.

### Security rules

- Never commit `.env`, `.env.local`, or production secret files.
- Keep `.env.example` files populated with placeholders only.
- Do not put API keys in screenshots, logs, issues, pull requests, or README files.
- Rotate any credential that has accidentally been exposed.
- Configure production environment variables through the deployment platform's secret manager.

---

## 🗄️ Database Management

FoundiT uses MySQL for persistent application data. Docker can provide a consistent local database environment.

### Database details

The current development setup uses:

| Setting | Value |
|---|---|
| Database | `lost_and_found` |
| Docker container | `lost_and_found_db` |
| Database user | `lost_found_user` |
| Host port | `3307`, if configured by the existing Docker setup |

These values are documentation examples for the current development environment. Always check the actual Docker and `.env` configuration before running commands.

### Check the database container

```bash
docker ps
docker ps -a
```

Start an existing stopped container:

```bash
docker start lost_and_found_db
```

### Connect to MySQL

```bash
docker exec -it lost_and_found_db mysql -u lost_found_user -p
```

Enter the database password when prompted.

Inside MySQL:

```sql
USE lost_and_found;

SHOW TABLES;

SELECT DATABASE();
```

To inspect the current schema:

```sql
DESCRIBE users;
DESCRIBE lost_items;
DESCRIBE found_items;
```

Table names and columns may vary depending on the latest migrations. Inspect `SHOW TABLES;` before querying other tables.

### Important database rules

1. Do not delete or recreate the database to fix an application bug.
2. Do not remove the Docker volume to reset the application.
3. Do not edit production data manually unless there is an approved operational reason.
4. Use migrations for schema changes.
5. Use parameterized SQL queries in the backend.
6. Test schema changes against a development database first.
7. Never put SQL dumps containing personal information in a public Git repository.

### Development, staging and production

Use separate databases for each environment:

- **Development:** Local experimentation and feature development.
- **Staging:** Integration testing against a production-like configuration.
- **Production:** Real user data, with restricted access and reliable backups.

Never point local development code at the production database by accident.

---

## 🧱 Database Migrations and Backups

A migration is a version-controlled script that changes the database schema in a controlled, repeatable way.

Examples include adding a table, adding a column, creating an index, or changing a constraint.

### Recommended migration process

1. Back up the development database.
2. Create a new migration file with a unique, descriptive name.
3. Make the smallest required schema change.
4. Test it against a development database containing representative data.
5. Verify foreign keys, indexes, existing rows and application queries.
6. Commit the migration with the related application code.
7. Review the migration in a pull request.
8. Apply it to staging before production.
9. Back up production before a risky migration.
10. Apply the production migration through a controlled deployment process.

Do not rewrite an already-applied migration to change a shared database's history. Add a new migration instead.

### Create a local SQL backup

Create a backup directory outside the Git repository:

```powershell
New-Item -ItemType Directory -Force "$HOME\Downloads\foundit-backups"
```

Create a timestamped backup:

```powershell
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

docker exec lost_and_found_db mysqldump -u lost_found_user -p --single-transaction --routines --triggers lost_and_found > "$HOME\Downloads\foundit-backups\lost_and_found_$timestamp.sql"
```

Enter the password when prompted. Check the command's output, the exit status and the resulting file before relying on the backup.

Keep older backups. A new backup should not overwrite the previous known-good backup.

For production, use a documented backup schedule, appropriate encryption and access controls, retention policies, and periodic restore tests.

### Restore a backup — destructive operation

Restoring a dump can overwrite or conflict with existing data. Never run a restore against a database containing data you need to preserve without first taking another backup and confirming the target.

For an explicitly prepared empty development database:

```powershell
Get-Content "PATH_TO_BACKUP.sql" | docker exec -i lost_and_found_db mysql -u lost_found_user -p lost_and_found
```

The command above is a general example; depending on the MySQL client and password-prompt behaviour in your environment, you may need to run the import from inside the container or use another safe method.

**Never use a restore command as a routine way to deploy code.**

---

## 🌿 Git and GitHub Collaboration

Git tracks code history. GitHub hosts the repository and provides pull requests, reviews, discussions and automated checks.

The repository owner manages permissions and decides who can merge code into protected branches.

### Core rules

- Never develop a feature directly on `main`.
- Never push unreviewed work directly into a protected `main` branch.
- Each contributor should use a separate feature or bug-fix branch.
- Commit small, meaningful changes.
- Open a pull request to merge changes into `main`.
- Review the actual diff before approving.
- Run tests before merging.
- Keep secrets, local dependencies, database dumps and user uploads out of Git.
- Do not use force-push on shared branches unless there is a deliberate, coordinated reason.

### Recommended branching strategy

```text
main
 │
 ├── feature/lost-item-recovery
 │
 ├── feature/notifications
 │
 ├── fix/chat-input-layout
 │
 └── docs/update-readme
```

`main` should contain reviewed, integrated code.

Each feature branch should focus on one task. Avoid mixing a database redesign, unrelated UI changes and a new authentication system into one pull request.

### First-time setup for a contributor

After repository access is granted:

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd lostandfound

git switch main
git pull --ff-only origin main

git switch -c feature/your-feature-name
```

If the repository uses a different default branch or project structure, adjust accordingly.

### Before starting new work

Update your local `main`:

```bash
git switch main
git pull --ff-only origin main
```

Create a new branch:

```bash
git switch -c feature/short-description
```

Do not create a branch from a stale version of `main`.

### Save work locally

Check which files changed:

```bash
git status
git diff
```

Stage only the intended files:

```bash
git add path/to/file1 path/to/file2
```

Or stage all changes after carefully inspecting them:

```bash
git add .
git status
```

Commit:

```bash
git commit -m "feat: add lost item recovery submission"
```

Use clear commit prefixes where useful:

- `feat:` — new feature
- `fix:` — bug fix
- `docs:` — documentation
- `test:` — tests
- `refactor:` — code restructuring without intended behaviour change
- `chore:` — maintenance

Push the branch:

```bash
git push -u origin feature/short-description
```

Replace the branch name with the actual name you created.

---

## 🔀 Pull Requests and Code Reviews

A pull request (PR) proposes merging one branch into another. It allows the owner or reviewer to inspect, discuss, test and approve changes before integration.

### Standard pull-request workflow

```text
Developer creates feature branch
              │
              ▼
      Implements the feature
              │
              ▼
      Tests and commits changes
              │
              ▼
      Pushes branch to GitHub
              │
              ▼
      Opens a pull request into main
              │
              ▼
       Reviewer inspects the diff
              │
              ▼
       Automated checks and tests
              │
              ▼
       Changes requested or approved
              │
              ▼
       Owner/reviewer merges the PR
              │
              ▼
         Updated main branch
              │
              ▼
       Staging/deployment process
```

### Who reviews the code?

For a small project, the repository owner can review pull requests from contributors.

For a team:

- **Author:** Implements the change, writes tests, explains the design and fixes review comments.
- **Reviewer:** Checks correctness, security, maintainability, tests and unintended side effects.
- **Repository owner or maintainer:** Manages permissions, branch protection and merge decisions.
- **Deployment owner or automation:** Releases the reviewed code according to the deployment workflow.

Contributors should not approve their own pull requests as a substitute for independent review.

### How to create a pull request

1. Push your feature branch to GitHub.
2. Open the repository.
3. Select **Compare & pull request**, or open the Pull Requests tab and create a new PR.
4. Set the base branch to `main` and the compare branch to your feature branch.
5. Add a clear title and description.
6. Explain the changes, why they are required, and how they were tested.
7. Link any relevant issue.
8. Wait for checks and reviews.
9. Address requested changes and push updates to the same branch.
10. Merge only after the required checks and approvals pass.

### Pull-request template

Use this structure in your PR description:

```markdown
## Summary
What does this change do?

## Why
Why is the change needed?

## Implementation
- Backend changes:
- Frontend changes:
- Database/migration changes:
- External service changes:

## Testing
- [ ] Relevant tests passed
- [ ] Existing workflows tested
- [ ] Authorization checked
- [ ] Database migration tested, if applicable
- [ ] Responsive UI checked, if applicable

## Security and data safety
- [ ] No secrets committed
- [ ] No unnecessary personal data exposed
- [ ] Existing data preserved
- [ ] Backward compatibility considered

## Screenshots
Add screenshots for UI changes.

## Risks / rollback
Describe any migration, compatibility or deployment concerns.
```

### Code-review checklist

Before approving a pull request, check:

- Does the code meet the requested requirements?
- Does it introduce duplicate business logic?
- Are database operations parameterized?
- Are authentication and authorization enforced by the backend?
- Can a user access another user's private claim or messages?
- Are errors handled without exposing secrets?
- Are API contracts and existing frontend behaviour preserved?
- Are migrations reversible or is a recovery plan documented?
- Are tests meaningful and passing?
- Are UI loading, empty, error and success states handled correctly?
- Are images and private evidence access-controlled?
- Are secrets and local files excluded?
- Is the change small enough to review confidently?

### Protect `main` with GitHub branch rules

In the repository's Settings, find the branch protection or ruleset settings and protect `main`.

Recommended rules:

- Require a pull request before merging.
- Require at least one approval when working with another reviewer.
- Require status checks to pass if CI is configured.
- Require conversations to be resolved before merging.
- Block force pushes and branch deletion.
- Restrict direct pushes where appropriate.

GitHub plan and repository visibility can affect which rules are available. If you are currently the only contributor, set up the rules now and add reviewers when collaborators join.

### Important: multiple contributors working simultaneously

Each person should use a separate branch. Two people should not independently commit unrelated changes to the same feature branch unless they intentionally coordinate that work.

If a branch becomes outdated, update it with the latest `main` using a controlled merge or rebase. Coordinate before rebasing a branch that other people are already using.

Resolve merge conflicts deliberately, rerun tests and review the resulting diff before merging.

---

## 🛡️ Safe Development Workflow

Use this checklist for every feature.

### Before coding

- [ ] Confirm the existing application works.
- [ ] Update local `main`.
- [ ] Create a feature branch.
- [ ] Back up the database if the feature may change data or schema.
- [ ] Inspect existing components, services, API contracts and migrations.
- [ ] Define the smallest safe implementation.

### During development

- [ ] Implement one logical change at a time.
- [ ] Reuse existing components and services.
- [ ] Validate input on the server.
- [ ] Enforce authorization on every protected API.
- [ ] Use migrations for schema changes.
- [ ] Keep environment secrets out of source control.
- [ ] Test against a development database.
- [ ] Avoid unrelated refactors.

### Before pushing

- [ ] Run relevant tests and builds.
- [ ] Inspect `git diff`.
- [ ] Inspect `git status`.
- [ ] Confirm there are no secrets or database dumps staged.
- [ ] Commit with a descriptive message.
- [ ] Push only the intended feature branch.

### Before merging

- [ ] Review the PR diff.
- [ ] Confirm CI checks pass.
- [ ] Verify database migrations.
- [ ] Confirm existing authentication, claims and messaging still work.
- [ ] Resolve review comments.
- [ ] Obtain the required approval.
- [ ] Merge using the repository's agreed policy.

### After merging

- [ ] Pull the updated `main`.
- [ ] Verify the merged application locally or in staging.
- [ ] Deploy through the approved process.
- [ ] Check logs and application health.
- [ ] Keep a known-good commit and database backup for recovery.

---

## 🧪 Testing and Troubleshooting

Test the frontend and backend together against the actual development API and MySQL database.

### Basic verification checklist

- [ ] Registration, login and verification.
- [ ] Protected routes and logout.
- [ ] Lost-item reporting and editing.
- [ ] Found-item reporting and editing.
- [ ] Cloudinary image upload and deletion.
- [ ] Search and potential matching.
- [ ] Ownership claim submission and evidence.
- [ ] Finder review and admin decision.
- [ ] Messaging permissions and persistence.
- [ ] Notifications and unread counts.
- [ ] Email delivery for configured events.
- [ ] Responsive layouts.
- [ ] Existing functionality after database migrations.

### Common issues

**MySQL connection refused**

Check that Docker is running, the database container is started, the host port matches `.env`, and the credentials are correct.

**Port already in use**

Inspect the process or container using the port. Do not terminate unrelated services or create duplicate database containers without understanding the conflict.

**Email not delivered**

Check the backend logs, Brevo API response, verified sender configuration, API key validity, provider restrictions and delivery status. Do not expose the API key in logs.

**Cloudinary upload failure**

Check server-side credentials, allowed file types, file size, upload configuration, access permissions and network connectivity.

**Frontend cannot reach backend**

Verify the Vite API base URL, backend port, CORS configuration, route paths and backend health endpoint.

**Git merge conflict**

Inspect the conflicting files, understand both changes, resolve the conflict, run tests and inspect the final diff. Do not blindly choose one side for database migrations or authentication code.

---

## 🔒 Security Practices

FoundiT handles user accounts, item photographs, ownership evidence and private communications. Security is a core requirement.

- Hash passwords using bcrypt.
- Use strong JWT secrets and appropriate token expiration.
- Validate all user-controlled inputs.
- Use parameterized database queries.
- Check record ownership and participant permissions on the backend.
- Restrict administrative APIs to authorized administrators.
- Prevent users from approving their own claims or changing administrative decisions.
- Keep private ownership evidence protected.
- Rate-limit sensitive endpoints and messaging where appropriate.
- Use HTTPS in production.
- Do not log passwords, OTPs, API keys, tokens or private evidence.
- Avoid revealing whether an email address is registered in password-reset responses.
- Use separate secrets and databases for development and production.
- Keep dependencies updated and review security advisories.
- Back up the database and periodically test recovery.
- Never store real credentials in source code or GitHub issues.

---

## 🚀 Deployment

The intended production architecture may use:

- A frontend hosting service compatible with Vite.
- A Node.js hosting service for Express.
- A managed MySQL database.
- Cloudinary for image storage.
- Brevo for email delivery.

The exact services and configuration should be selected and verified before deployment.

### Recommended deployment flow

```text
Feature branch
      │
      ▼
Pull request + review
      │
      ▼
Merge into main
      │
      ▼
CI build and automated tests
      │
      ▼
Staging deployment
      │
      ▼
Database migration + smoke tests
      │
      ▼
Production deployment
      │
      ▼
Health checks and monitoring
```

A GitHub push does not automatically deploy the application unless a deployment integration or CI/CD workflow has been configured.

### Production checklist

- [ ] Production environment variables configured securely.
- [ ] Separate production database provisioned.
- [ ] Database backups and restore process tested.
- [ ] Migrations reviewed and applied safely.
- [ ] Frontend API URL points to the production backend.
- [ ] CORS allows only the intended origins.
- [ ] HTTPS configured.
- [ ] Cloudinary and Brevo credentials configured on the server.
- [ ] Admin accounts and permissions reviewed.
- [ ] Error logging and monitoring configured.
- [ ] Deployment and rollback procedures documented.

---

## 🤝 Contributing

Contributions should follow the project's branching, testing and pull-request process.

1. Create an issue or discuss the proposed change.
2. Fork the repository if you do not have direct contributor access.
3. Create a descriptive feature branch.
4. Implement the change and add relevant tests.
5. Update documentation when needed.
6. Push the branch and open a pull request.
7. Respond to review feedback.
8. Merge only after required checks and approvals.

Do not commit secrets, production data, private evidence or local environment files.

---

## 📄 License

A license has not been specified here. Add a `LICENSE` file and update this section when the repository owner chooses the project's license.

---

## 👨‍💻 Project Status

FoundiT is an actively developed full-stack project.

**Current milestone:** Existing Phases 1–7 have been implemented, including the existing claim and communication workflows. The dedicated Lost Items recovery-submission workflow remains to be integrated and tested.

The next development milestone is to connect the **“I've Found This Item”** action to a secure, full-stack recovery process while preserving the existing found-item ownership-verification workflow.

---

**FoundiT — Helping lost belongings find their way home.**