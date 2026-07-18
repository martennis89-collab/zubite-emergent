# Production deployment: Atlas + Render + Vercel + R2

This guide deploys the application with one public website origin:

```text
Browser -> https://zubite.bg -> Vercel /api rewrite -> Render FastAPI
                                                     |-> MongoDB Atlas
                                                     `-> private Cloudflare R2
```

The browser never receives MongoDB or R2 credentials. R2 remains private and
objects are returned only through the API's authorized `/api/files/{id}` path.

## 1. Prepare and push the repository

Use Node 20, Python 3.11, Docker, and Git. Real `.env` files are ignored; only
the two `.env.example` templates belong in Git.

Run the local checks before committing:

```powershell
docker compose config
docker compose up -d --build
Invoke-RestMethod http://localhost:8010/health
Invoke-RestMethod http://localhost:3000/api/cities
docker compose exec -T backend python -m pytest -q tests/test_storage_r2.py
docker compose exec -T frontend npm run build
git status --short
```

Generate two different secrets and save them in a password manager:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))" # JWT_SECRET
python -c "import secrets; print(secrets.token_urlsafe(48))" # REVALIDATE_SECRET
```

`REVALIDATE_SECRET` must be identical on Render and Vercel. `JWT_SECRET` is
backend-only. Commit only after reviewing `git diff --check` and `git diff`.

## 2. Create MongoDB Atlas

1. Create an Atlas project and a cluster geographically close to Render's
   Frankfurt region. For production, choose a tier and backup policy that meet
   the application's recovery requirements; use free/dev capacity only for
   non-production environments.
2. Under **Database Access**, create a dedicated application user. Grant it
   `readWrite` only on the `zubite` database. Do not reuse an Atlas owner.
3. Add your current public IP under **Network Access** only if you need local
   migration or troubleshooting.
4. Choose **Connect > Drivers > Python** and copy the SRV string. URL-encode
   reserved characters in the database password. The result should resemble:

   ```text
   mongodb+srv://<user>:<encoded-password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
   ```

5. Save this as Render's `MONGO_URL`. The Blueprint supplies `DB_NAME=zubite`.

Do not add `0.0.0.0/0` permanently. Render's outbound CIDRs are added in step
5 after the service exists.

Official references: [Atlas driver connections](https://www.mongodb.com/docs/atlas/driver-connection/),
[Atlas IP access lists](https://www.mongodb.com/docs/atlas/security/ip-access-list/).

## 3. Create private Cloudflare R2 storage

1. In Cloudflare, open **Storage & databases > R2 > Overview** and create the
   bucket `zubite-production`.
2. Keep public access and custom domains disabled. Browser CORS is unnecessary
   because only FastAPI talks to R2.
3. Open **Manage in API Tokens** and create a token with **Object Read & Write**
   scoped only to `zubite-production`.
4. Copy the Access Key ID and Secret Access Key immediately; the secret is not
   shown again.
5. Record the S3 endpoint. Standard buckets use:

   ```text
   https://<ACCOUNT_ID>.r2.cloudflarestorage.com
   ```

   An EU-jurisdiction bucket uses the endpoint Cloudflare shows, currently:

   ```text
   https://<ACCOUNT_ID>.eu.r2.cloudflarestorage.com
   ```

The four Render values are `R2_ENDPOINT`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, and
`R2_SECRET_ACCESS_KEY`.

Official reference: [R2 S3 credentials and endpoints](https://developers.cloudflare.com/r2/get-started/s3/).

## 4. Commit and push

From the repository root, review all existing product changes as well as the
deployment files. Nothing in this guide authorizes committing unrelated work
without review.

```powershell
git diff --check
git status --short
git add <the-files-you-reviewed>
git commit -m "chore: add production deployment setup"
git push -u origin HEAD
```

The GitHub Actions workflow builds the frontend and runs the backend storage
smoke tests on pull requests and on pushes to `main` or `master`.

## 5. Deploy FastAPI on Render

1. In Render, select **New > Blueprint** and connect this Git repository.
2. Render discovers the root `render.yaml` and creates `zubite-api` in
   Frankfurt using `backend/Dockerfile`.
3. Enter every secret marked `sync: false`:

   | Render variable | Value |
   | --- | --- |
   | `MONGO_URL` | Atlas SRV connection string |
   | `JWT_SECRET` | First generated secret |
   | `REVALIDATE_SECRET` | Second generated secret |
   | `R2_ENDPOINT` | Cloudflare S3 endpoint, no bucket suffix |
   | `R2_BUCKET` | `zubite-production` |
   | `R2_ACCESS_KEY_ID` | R2 token access key |
   | `R2_SECRET_ACCESS_KEY` | R2 token secret |
   | `RESEND_API_KEY` | Production Resend key |

4. The first deployment can fail to reach Atlas until networking is allowed.
   Once the Render service exists, open **Connect > Outbound**, copy every CIDR
   shown, and add each range to Atlas **Network Access** with a Render label.
5. In Render, choose **Manual Deploy > Deploy latest commit**. A successful
   readiness response at `https://<service>.onrender.com/health` is:

   ```json
   {"status":"ok","database":"connected"}
   ```

6. In a Render Shell, create the first admin only if it was not migrated:

   ```text
   python scripts/create_admin.py --username admin@zubite.bg
   ```

   The script reads the password interactively and will not overwrite an
   existing account. Use `--reset-password` only for an intentional rotation.

Render uses one Uvicorn worker because the application owns in-process reminder
and cleanup loops. Do not increase the worker or instance count until those
loops are moved to a dedicated worker with distributed locking.

Official references: [Render Blueprints](https://render.com/docs/blueprint-spec),
[Render outbound IP ranges](https://render.com/docs/outbound-ip-addresses).

## 6. Deploy Next.js on Vercel

1. Import the same Git repository into Vercel.
2. Set **Root Directory** to `frontend` and keep the detected **Next.js**
   framework preset. `frontend/vercel.json` pins `npm ci` and `npm run build`.
3. Add these environment variables:

   | Vercel variable | Production value | Preview value |
   | --- | --- | --- |
   | `BACKEND_INTERNAL_URL` | `https://<service>.onrender.com` | same backend |
   | `REVALIDATE_SECRET` | same value as Render | same value as Render |
   | `NEXT_PUBLIC_SITE_URL` | `https://zubite.bg` | `https://zubite.bg` |

4. Do **not** define `NEXT_PUBLIC_API_URL` or `REACT_APP_BACKEND_URL` on Vercel.
   Empty/unset is intentional: it makes browser calls use same-origin `/api`
   and lets the Next.js rewrite proxy them to Render.
5. Deploy and verify both the home page and
   `https://<project>.vercel.app/api/cities`. Public GETs work on preview URLs. For
   authenticated state-changing preview testing, add the exact stable Vercel
   project origin to Render's `CORS_ORIGINS`; never use a wildcard with cookies.

Official references: [Vercel monorepo root directories](https://vercel.com/docs/monorepos),
[Next.js external rewrites](https://nextjs.org/docs/app/api-reference/config/next-config-js/rewrites).

## 7. Attach the production domain

1. Add `zubite.bg` and `www.zubite.bg` to the Vercel project.
2. Apply the exact DNS records Vercel displays at the DNS provider. Remove
   conflicting old A, AAAA, or CNAME records only after recording them for
   rollback.
3. Choose the canonical redirect direction in Vercel; the application already
   treats `https://zubite.bg` as canonical.
4. Confirm the Render variables remain:
   `FRONTEND_URL=https://zubite.bg`, `PRODUCTION_URL=https://zubite.bg`, and
   `CORS_ORIGINS=https://zubite.bg,https://www.zubite.bg`.
5. Wait for TLS issuance, then run the deployment smoke script.

## 8. Verify the complete deployment

```powershell
python scripts/verify_deployment.py `
  --frontend https://zubite.bg `
  --backend https://<service>.onrender.com
```

Then verify R2 from a Render Shell. The check creates one tiny object, reads it,
and deletes it in `finally`:

```text
python scripts/verify_r2.py
```

Complete one manual workflow without using real patient data:

1. Submit a test quiz/lead.
2. Log into `/admin` and confirm it appears.
3. Upload one test image and load it back through `/api/files/{id}`.
4. Trigger an email to a controlled address.
5. Check Render logs, Atlas metrics, R2 metrics, and Vercel function logs for
   errors. Delete the test records and object through normal application flows.

## 9. Existing data migration (only when needed)

The repository already includes dry-run-first migration tools:

```powershell
$env:SOURCE_MONGO_URL = '<old source URL>'
python backend/scripts/migrate_emergent_mongo.py --help
python backend/scripts/migrate_emergent_files.py --help
```

Run a dry run, back up the target, review counts, then rerun with the explicit
`--apply` flag. Do not run demo seed scripts against production. If migration
copies `admin_users`, skip the first-admin creation step.

## 10. Operations and rollback

- Enable Atlas backups, alerts, and least-privilege project access appropriate
  to the selected production tier.
- Alert on Render health failures and 5xx responses; watch Atlas connection
  usage because the API pool is capped at 50 connections per instance.
- Rotate Atlas, R2, Resend, JWT, and revalidation secrets in their provider
  dashboards, never in Git. JWT rotation signs out active sessions.
- Render rollback: select the last healthy deploy in the service's deploy
  history. Vercel rollback: promote the prior healthy deployment.
- Database schema changes here are additive startup indexes/backfills. Back up
  Atlas before any future destructive migration; application rollback does not
  automatically undo data changes.
