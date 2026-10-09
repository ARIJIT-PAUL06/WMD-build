# Cognito Fix Plan

Status: Plan, not started. Fixes the problems found in the review of the uncommitted Cognito work.
Region: `ap-south-1`. Supersedes the conflicting parts of `docs/COGNITO_IMPLEMENTATION_PLAN.md`.

## Decisions (from you)

| Topic | Decision |
|---|---|
| What needs login | Drafting (`generate-draft`, `polish-draft`) **and** saving petitions |
| Web backend | Web calls the **Lambda** `wmd-backend` (same backend as mobile). Vercel serves only the static site |
| Infrastructure | **CloudFormation template** is the source of truth. Existing Lambda and `AirQualityReadings` table are **imported**, not recreated |
| Mobile | **Add login now** |
| School admin view | **No personal details**: date, authority, subject, server-computed evidence summary, status |
| Who runs AWS commands | **You.** I write code, template and scripts; every AWS command below marked **YOU RUN** is yours |

## Who does what

- **I do:** all code, template, scripts, tests, and local checks (`npm test`, `npm run build`, `cfn-lint`). I never run commands that create or change AWS resources.
- **YOU RUN:** every `aws` / deploy command, setting env vars in Vercel, and real sign-up tests. Paste the outputs back to me (never paste secrets or keys).

---

## Phase 0: Pre-flight (YOU RUN, read-only, ~15 min)

Nothing here changes AWS. Paste the outputs back; the import step depends on them.

```bash
aws sts get-caller-identity
aws lambda get-function-configuration --function-name wmd-backend --region ap-south-1 --query "{Role:Role,Runtime:Runtime,Handler:Handler,Timeout:Timeout,Memory:MemorySize,Arch:Architectures}"
aws lambda get-function-url-config --function-name wmd-backend --region ap-south-1
aws lambda get-policy --function-name wmd-backend --region ap-south-1
aws dynamodb describe-table --table-name AirQualityReadings --region ap-south-1 --query "Table.{Keys:KeySchema,Attrs:AttributeDefinitions,Billing:BillingModeSummary,Status:TableStatus}"
aws dynamodb describe-continuous-backups --table-name AirQualityReadings --region ap-south-1
aws events list-rules --region ap-south-1
aws cognito-idp list-user-pools --max-results 20 --region ap-south-1
aws sesv2 get-account --region ap-south-1
aws sesv2 get-account --region us-east-1
aws sesv2 list-email-identities --region ap-south-1
```

What I'm checking:
- The Lambda's real runtime, handler, role and architecture, so the template matches what's deployed.
- That the table's `timestamp` key really is a string (`S`).
- Whether an EventBridge rule already exists (import it, or delete it later, so the monitor doesn't run twice).
- That no user pool exists yet (`.env` has no Cognito IDs, so I expect none).
- **SES sandbox status.** In sandbox mode, sign-up codes only reach verified addresses, so judges couldn't sign up. **If it's sandboxed, request production access in the SES console today** (approval can take about a day). Until then the template can fall back to Cognito's built-in email, which has a low daily limit.

---

## Phase 1: Backend code fixes (I do)

### 1.1 Post-confirmation trigger moves to its own small function
Fixes the circular dependency and the password-reset bug.
- New `aws/functions/postConfirmation/index.mjs`: on `PostConfirmation_ConfirmSignUp`, add the user to `citizen`. On **any** other `PostConfirmation_*` event, return the event unchanged. It reads the pool ID from the event, so it needs no environment variables.
- Remove the Cognito branch from `server/lambda.js`. Unknown non-HTTP events get a clear logged error instead of crashing serverless-express.

### 1.2 `server/authMiddleware.js`
- **Citizen routes need a human user token**, so the token's `client_id` must be the web or mobile client. This blocks the IoT machine token from drafting or saving. Group membership is not required for citizens, so a user isn't locked out if the group step ever fails; groups are used only for `school_admin`.
- **The school admin's school is looked up on the server** with `AdminGetUser(username)` and cached for 5 minutes, because access tokens never contain `custom:school_id`.
- Accept `Bearer` in any letter case.
- Only allow the test hook (`setTestVerifier`) when `NODE_ENV === 'test'`.
- New helpers: `requireUser()`, `requireSchoolAdmin()`, `requireScope('ingest/write')`.

### 1.3 Petitions API (`server/petitionsService.js`, `server/routes/petitionRoutes.js`)
- **Honest statuses only**, the same ones the mobile docket uses: `DRAFT_SAVED`, `OPENED_IN_MAIL`, `SHARED`, `MARKED_AS_SENT`. Never `FILED`.
- **No silent defaults.** `targetType` is required:
  - School: `schoolId` must exist in the directory, and the server takes the name and locality from the directory, not from the client.
  - Station or grid: the station name or grid ID must be known.
  - Missing or unknown values get a **400**.
- **Evidence is computed by the server** at save time, using `aggregateSchoolEvidence` for that target. Client-sent evidence numbers are ignored.
- **Size limits:** subject ≤ 300 characters, letter ≤ 20,000, up to 20 demands of ≤ 300 characters each. Anything larger gets a **413**.
- **Retries don't duplicate:** the client sends a `clientRequestId`, and the server rejects a repeat with the same ID and returns the existing petition.
- **New routes:**
  - `PATCH /api/petitions/:id/status`: owner only.
  - `DELETE /api/petitions/:id` and `DELETE /api/petitions`: owner only, the right to erasure.
- **Lists are paged:** `limit` plus `nextToken`, newest first.
- **Errors are generic:** clients get a plain message, and the details go to the logs. Logs record the user's `sub`, never email.
- **Rate limits are per user** (keyed on `sub`) on the routes that need login.

### 1.4 School admin view without personal details (enforced in the database)
- The `schoolId-createdAt-index` index only copies the safe fields: `petitionId`, `createdAt`, `authorityName`, `letterSubject`, `status` and `evidenceSummary`. The letter text, user ID and contact details are **not in the index**, so `/api/petition/school` can't leak them.
- Station petitions don't set `schoolId`, so they never appear in the index (no more `'unassigned'` bucket).

### 1.5 Small cleanups
- Move `disallowHttpDispatchInProd` into `server/middleware/authAndRateLimit.js` (it's currently copied into two files).
- `scripts/deploy_lambda.py` becomes **code-only**: it publishes a new Lambda version (for rollback) and stops overwriting environment variables, which now come only from the template.
- `scripts/deploy_cognito_infra.js` is **deleted**; it competes with the template.
- `scripts/cognito_promote_school_admin.js` is kept, with a fix so it uses the same credentials loading as the other scripts.

### 1.6 Tests (I do, run locally)
- Middleware tests:
  - Correct the test that put `custom:school_id` in an access token, so it matches what Cognito really sends.
  - Add: rejecting an ingest token on a user route, `Bearer` in any letter case, and the server-side school lookup (mocked).
- Petition route tests: 400 on missing or unknown targets, the honest statuses, repeat requests, only the owner can update or delete, the admin view has no personal details, and size limits.
- Lambda handler tests: an HTTP event, an EventBridge event, and an unknown event.

---

## Phase 2: Infrastructure (I write, YOU RUN)

### 2.1 What I change in `aws/template.yaml`
- Plain CloudFormation, **without the SAM transform**. SAM generates extra resources for a function URL (Lambda permissions) that can't be imported and would clash with the existing ones.
- **Resources:**
  - `AirQualityReadings`, imported, `DeletionPolicy: Retain`.
  - `wmd-backend`, imported, `DeletionPolicy: Retain`.
  - The existing Function URL and its permission stay **outside** the stack, unchanged, so the URL your apps use doesn't change.
  - A new `Petitions` table: PITR on, Retain, and the index with only the safe fields (1.4).
  - A new `wmd-cognito-post-confirm` function with its own small role. It may only add users to groups in this account's pools, written as a wildcard ARN so there's no circular reference.
  - The user pool:
    - email sign-in, password policy, deletion protection;
    - `school_id` that apps can't write;
    - email through SES when the `UseSesEmail` parameter is `true`, otherwise Cognito's built-in email.
  - Groups `citizen` and `school_admin`.
  - Resource server `ingest/write`.
  - The classic Hosted UI domain `wmd-auth-<accountId>`, needed for mobile login.
  - **App clients:**
    - Web: SRP and refresh only; the password-in-plaintext flow is removed.
    - Mobile: Auth Code + PKCE, callback `vayuvitals://auth/callback`, plus the dev-build callback from a parameter.
    - Ingest: client credentials, with a secret.
  - Token lifetimes: access and ID tokens 1 hour, refresh token 30 days.
  - **A new least-privilege role for `wmd-backend`:**
    - DynamoDB access on the two tables only;
    - `bedrock:InvokeModel` (restoring what was dropped);
    - `sagemaker:InvokeEndpoint` on the one endpoint;
    - `ses:SendEmail`;
    - `cognito-idp:AdminGetUser` on this pool.
  - The EventBridge rule `rate(30 minutes)`, imported if Phase 0 finds one.
- **Lambda environment comes only from the template.** Secrets (`GEMINI_API_KEY`, `ADMIN_API_KEY`) are `NoEcho` parameters.
- **New `scripts/deploy_stack.mjs`.** It reads secrets from `.env` and passes them to the AWS CLI, so they never appear on your command line or in shell history.
- **I run `cfn-lint`** on the template locally before handing it over.

### 2.2 Deploy runbook (YOU RUN, in order)

**Step A: Artifact bucket (one time)**
```bash
aws s3 mb s3://wmd-cfn-artifacts-<ACCOUNT_ID>-ap-south-1 --region ap-south-1
```

**Step B: Build and package**
```bash
npm run build:lambda
```
```bash
aws cloudformation package --template-file aws/template-import.yaml --s3-bucket wmd-cfn-artifacts-<ACCOUNT_ID>-ap-south-1 --output-template-file aws/packaged-import.yaml --region ap-south-1
```

**Step C: Import the existing resources.** `template-import.yaml` contains only the resources being imported. This is a CloudFormation rule for imports.
```bash
aws cloudformation create-change-set --stack-name wmd-stack --change-set-name import-existing --change-set-type IMPORT --resources-to-import file://aws/resources-to-import.json --template-body file://aws/packaged-import.yaml --capabilities CAPABILITY_NAMED_IAM --region ap-south-1
```
```bash
aws cloudformation describe-change-set --stack-name wmd-stack --change-set-name import-existing --region ap-south-1
```
Paste the describe output to me. **Only if it shows "Import" actions and nothing else:**
```bash
aws cloudformation execute-change-set --stack-name wmd-stack --change-set-name import-existing --region ap-south-1
```

**Step D: Add everything else** (Cognito, Petitions, new roles, the post-confirm function). The script creates a change set and **stops so you can review it**:
```bash
node scripts/deploy_stack.mjs --review
```
Paste the change list. If it only adds or modifies what's expected (in particular, nothing in the list is a **Remove** or **Replace** of the table or the Lambda):
```bash
node scripts/deploy_stack.mjs --execute
```
It prints the stack outputs: pool ID, client IDs and the Hosted UI domain. Those aren't secrets; paste them to me.

**Step E: Fetch the ingest client secret into `.env`.** The command prints nothing:
```bash
node scripts/fetch_ingest_secret.mjs
```

**Step F: Deploy the new backend code**
```bash
python scripts/deploy_lambda.py
```

**Step G: Vercel settings.** In the Vercel dashboard, set these for the project, then redeploy:
- `VITE_API_BASE_URL`: the Lambda Function URL, without a trailing slash.
- `VITE_COGNITO_USER_POOL_ID` and `VITE_COGNITO_WEB_CLIENT_ID`: from the Step D outputs.

---

## Phase 3: Web (I do)

1. **One API helper.** `apiFetch` adds `VITE_API_BASE_URL` (empty locally, so the Vite proxy still works) and the login token. All 14 `fetch('/api/...')` calls across 5 files switch to it. A guard test fails if a plain `/api` fetch comes back.
2. **Fix the auth context:**
   - Remove the `isCitizen: ... || true` bug.
   - Read the school from the ID token, for display only.
   - Handle "account not confirmed yet" at sign-in by showing the code screen.
   - When a request comes back 401, open the sign-in modal.
3. **Petition modal:**
   - "Generate draft" and "Polish" show a sign-in prompt instead of failing.
   - Add a **Save to My petitions** button.
   - Opening mail, sharing, and "Mark as sent" each update the status.
4. **New "My petitions" panel:** list, status, open, delete one, delete all.
5. **New "School petitions" panel**, shown only to `school_admin` users, with no personal details.
6. **Privacy notice wording:** "When you save, your letter, including your name and contact, is stored on our server in Mumbai (ap-south-1), visible only to you, and you can delete it. Your school only sees the date, authority, subject and air-quality summary."
7. **Monitor modal becomes read-only:** status and previews only, with the dispatch buttons removed.
8. **Map AI advisory:** when signed out, show "Sign in for AI advice" instead of calling the API and getting a 401.
9. **Keep `api/index.js` and the Vercel rewrite until Phase 5 passes**, as the rollback path. Delete them afterwards.

---

## Phase 4: Mobile login (I do)

**Requirement: a development build, not Expo Go.** Hosted UI login sends you back to the app through a redirect link. Expo Go's redirect link changes with your network address, so it can't be registered reliably in Cognito. You'll need a development build (`npx expo run:android` with the Android SDK, or an EAS development build).
*Fallback if a dev build isn't possible:* in-app email/password sign-in with a pure-JavaScript Cognito library. It works in Expo Go but needs extra work and testing. Tell me if you want this route instead.

1. Install the login packages (I add them to `package.json`; you'll run `npx expo install` once):
   `expo-auth-session expo-crypto expo-web-browser expo-secure-store`
2. New `mobile/src/services/authService.js`:
   - Hosted UI login with Auth Code + PKCE.
   - Tokens are kept in `expo-secure-store` and refreshed automatically before they expire.
   - Logout goes through the Cognito logout page.
3. `mobile/src/services/petitionService.js`:
   - Every call sends the token.
   - When a call returns 401, the app shows a sign-in prompt.
   - Saving goes to `/api/petitions`.
   - The docket list is loaded from the server, and the copy on the phone is only a read-only cache.
4. UI:
   - The Profile tab shows signed in/out, a "My petitions" list from the server, and delete actions.
   - The petition modal's final step requires sign-in.
   - The privacy wording matches the web.
5. `app.json` already has `"scheme": "vayuvitals"`. The Hosted UI domain and mobile client ID go in `extra`. They aren't secrets.

---

## Phase 5: Verification (YOU RUN, report results)

Run each check and tick it off. I'll give you the exact commands with your IDs filled in after Step D.

**Web (on the Vercel site):**
- [ ] Sign up with a real email → the code arrives → confirm → sign in.
- [ ] `aws cognito-idp admin-list-groups-for-user` shows `citizen`.
- [ ] Forgot password → a code arrives → the reset succeeds **with no error shown**.
- [ ] Signed out: Generate draft shows a sign-in prompt, and the network tab shows no 500s.
- [ ] Signed in: draft → polish → save → it appears in My petitions with status `DRAFT_SAVED`.
- [ ] Open mail → status changes to `OPENED_IN_MAIL`. Delete → it's gone in DynamoDB too.
- [ ] Run `node scripts/cognito_promote_school_admin.js <email> <schoolId>`, sign out and back in, open School petitions → **no name, phone or letter text** appears.

**API checks with `curl`:**
- [ ] No token → `/api/petition/generate-draft` returns 401.
- [ ] An ingest machine token → `/api/sensor-ingest` returns 200, and the same token on `/api/petitions` returns **403**.
- [ ] A citizen token on `/api/sensor-ingest` returns 403.
- [ ] `POST /api/monitor/run-cycle` returns 403 in production.

**Scheduled job:**
- [ ] After 30 minutes, `aws logs tail /aws/lambda/wmd-backend --since 1h` shows exactly **one** monitor run per 30 minutes, not two.

**Mobile (development build):**
- [ ] Sign in → draft → save → the petition appears in My petitions on **web** too (same account).
- [ ] Airplane mode → a clear error, nothing made up.
- [ ] Restart the app → still signed in.
- [ ] Sign out → the token is cleared.

---

## Rollback

- **Backend code:** `deploy_lambda.py` publishes a version before every update. To go back, run `aws lambda update-function-code` with the previous version's package. I'll put the exact command in the script's output.
- **Web:** set `VITE_API_BASE_URL` to empty in Vercel and redeploy. The site then goes back to using Vercel's `/api`, which is kept until Phase 5 passes.
- **Stack:** the tables and the Lambda are `Retain`, so even deleting the stack never deletes data or the live function.

## Order and parallel work

1. Phase 0 (you) and Phase 1 (me) run **at the same time**.
2. Phase 2 template (me) → Phase 2 runbook (you).
3. Phases 3 and 4 (me) are written while you run Phase 2.
4. Phase 5 (you). Then I delete the old Vercel `/api` and the `deploy_cognito_infra.js` leftovers.

## Risks and open items

| Risk | What we do |
|---|---|
| SES sandbox blocks sign-up codes | Request production access in Phase 0. Until then, `UseSesEmail=false` (Cognito's built-in email, low daily limit) |
| A `@gmail.com` sender may land in spam | Works for the demo. A domain you own is better later |
| The import change set shows unexpected changes | Don't execute it. Paste it to me and I'll adjust the template |
| Someone else is editing the same files right now | Agree who owns which files before I start, or I'll overwrite their changes |
| Mobile login needs a development build | Confirm you can build one (Android SDK or EAS); otherwise choose the Expo Go fallback |
