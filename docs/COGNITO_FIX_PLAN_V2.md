# Cognito Fix Plan v2: Remaining Issues

Status: Plan, not started. Follows `docs/COGNITO_FIX_PLAN.md`; covers only what's still broken after that work.
Out of scope: the "minor" items from the review, and the 8 old UI tests that broke when views became lazy-loaded.

**Who does what**
- **CODE:** changes to files in this repo. Anyone (or Claude) can make them. Nothing in a CODE step touches AWS.
- **YOU RUN:** commands that read or change AWS, Vercel, or the phone build. Paste outputs back; never paste secrets.

**Order:** Step 0 → Phase A (code) → Phase B (pre-flight) → Phase C (deploy) → Phase D (configure apps) → Phase E (verify).
Phases A and B can run at the same time.

---

## Step 0: Restore the live backend (YOU RUN, do this first)

Right now `POST /api/petition/generate-draft` on the live Lambda returns `auth_not_configured` (503). This happens because new code that requires login was deployed before Cognito exists. Redeploy the code from the last commit (`dc00f60`), which has no login requirement.

Run in PowerShell from `E:\WMD-build`:

```powershell
git worktree add ..\wmd-rollback dc00f60
```
```powershell
Copy-Item .env ..\wmd-rollback\.env
```
```powershell
cd ..\wmd-rollback; npm ci
```
```powershell
python scripts/deploy_lambda.py
```
```powershell
cd ..\WMD-build; git worktree remove ..\wmd-rollback --force
```

**Check:** this must return anything **except** `auth_not_configured` (a 400 about missing evidence is the expected result):
```bash
curl -s -X POST "https://vtcmfkzdfyd5sy3ugjfwdhlqsy0lcxaj.lambda-url.ap-south-1.on.aws/api/petition/generate-draft" -H "Content-Type: application/json" -d "{}"
```

**Rule until Phase C finishes:** do **not** run `scripts/deploy_lambda.py` from the main working copy. Fix A3 adds a guard that enforces this.

---

## Phase A: Code fixes

### A1. Agree one save request format (fixes "Save always returns 400")

The **server's flat format is the contract.** Web and mobile change to match it.

**`POST /api/petitions` request body:**

| Field | Required | Notes |
|---|---|---|
| `clientRequestId` | yes | 8–64 chars, `[A-Za-z0-9-]`. Same value on retries of the same save |
| `targetType` | yes | `school` \| `station` \| `grid` |
| `schoolId` | if school | Directory ID, e.g. `dps_rk_puram` |
| `stationName` | if station | Station name as used for evidence |
| `gridId` | if grid | e.g. `GRID_R06_C04` |
| `locality` | no | |
| `authorityName` | yes | `authority.fullName` (fallback `authority.name`) |
| `authorityRole` | no | `authority.designation` |
| `authorityEmail` | no | `authority.email` |
| `authorityNodalAgency` | no | `authority.department` |
| `letterSubject` | yes | ≤ 300 chars |
| `letterText` | yes | ≤ 20,000 chars. The final text in the chosen language |
| `demands` | no | string array, ≤ 20 × 300 chars |
| `language` | no | `en` \| `hi` (default `en`) |
| `tone` | no | string |
| `senderName`, `senderRole`, `senderContact` | no | |
| `status` | no | `DRAFT_SAVED` (default) \| `OPENED_IN_MAIL` \| `SHARED` \| `MARKED_AS_SENT` |

The response is `{ success, petition }`, where `petition.letterText` holds the letter.

**Server: `server/petitionsService.js` → `createPetition`**
1. **Missing fields:** a missing `letterText`, `letterSubject` or `authorityName` returns **400** with the field's name. Delete the fallbacks `'Air Quality Grievance'` and `''`.
2. **Old nested format:** if `petitionData.target` or `petitionData.letterBody` is present, return **400** `"Use the flat format: targetType, schoolId|stationName|gridId, letterText"`. Older clients then fail loudly instead of quietly.
3. **Stored fields:** also store `language` and `tone`.

**Web: `src/components/Petition/PetitionModal.jsx`**
1. Add one helper above `handleSaveToMyPetitions` and use it in **both** `handleSaveToMyPetitions` and `handleMarkAsSent`:
   ```js
   const buildSavePayload = (status) => {
     const isSchool = selectedSchoolId && selectedSchoolId !== 'custom';
     if (!isSchool && !stationName) {
       throw new Error('Choose a school or a monitoring station before saving.');
     }
     return {
       clientRequestId: saveRequestId,
       targetType: isSchool ? 'school' : 'station',
       ...(isSchool ? { schoolId: selectedSchoolId } : { stationName }),
       locality,
       authorityName: currentAuthority.fullName || currentAuthority.name,
       authorityRole: currentAuthority.designation || '',
       authorityEmail: currentAuthority.email || '',
       authorityNodalAgency: currentAuthority.department || '',
       letterSubject,
       letterText: activeLetterText,
       demands: selectedDemands,
       language,
       tone,
       senderName,
       senderRole,
       senderContact: [senderEmail, senderPhone].filter(Boolean).join(' | '),
       status
     };
   };
   ```
2. Add `const [saveRequestId, setSaveRequestId] = useState(() => crypto.randomUUID());`. Call `setSaveRequestId(crypto.randomUUID())` in two places: after a draft is (re)generated, and after a save succeeds.
3. Add `const [saveError, setSaveError] = useState(null);`. On a failed save, set it to `errData.error || 'Could not save. Please try again.'` (and on a thrown error, `err.message`). Clear it when a save starts. Pass it to `PetitionLetterPreviewPane` and show it in red under the "Save to My petitions" button. Delete the `console.warn`-only handling.
4. The PATCH response is `{ petition }`, so read `data.petition.status`, not `data.status`.

**Mobile: `mobile/src/services/petitionService.js` → `saveDocket`**
1. Build the request with the flat format above:
   - `targetType` comes from the caller.
   - Use `schoolId: docketData.schoolId` for schools, `stationName: docketData.stationName` for stations.
   - `authorityName: authority.fullName || authority.name`, `authorityEmail: authority.email`.
   - `letterText: docketData.activeDraftText`, `letterSubject: docketData.subject`.
   - `clientRequestId: docketData.clientRequestId`.
2. **Required fields:** before sending, if `targetType`, the target ID, the authority, `subject` or `activeDraftText` is missing, `throw new Error('<field> is missing')`. **Delete every fallback:** `'dps_rohini'`, `'R.K. Puram CAAQMS'`, `'cpcb'`, `'Central Pollution Control Board'`, `'cpcb@nic.in'`, `'Community Zone'` and `'Delhi NCR'`. This is fix #6 from the review.
3. **Signed out:** if there's no token, `throw new Error('Please sign in to save petitions.')`.
4. **Failed request:** if the request isn't `ok`, throw the server's `error` message. **Don't** fall back to saving a local-only copy. Only cache a docket locally after the server returns it, and use `petition.petitionId` as its `id`.
5. **Reading the list back** (the mapping around line 369): read `p.letterText` (not `p.letterBody`), `targetType: p.targetType` and `targetName: p.targetName`.

**Mobile: `mobile/src/components/PetitionModal.js` → the `saveDocket({...})` call (around line 412)**
- **New fields:** add `schoolId: targetType === 'school' ? selectedSchool?.id : undefined`, `stationName: targetType === 'school' ? undefined : selectedStation?.name`, and `clientRequestId`.
- **The request ID:** create it with `Crypto.randomUUID()` (import from `expo-crypto`) when a draft is generated, keep it in state, and reset it after a save succeeds.
- **Errors:** wrap the call in try/catch and show `err.message` with `Alert.alert('Could not save', err.message)`.

**Tests (CODE): new `tests/petitionSaveContract.test.js`**
- The web helper's output (copy it into a small pure function in `src/components/Petition/petitionHelpers.js` so it can be tested) passes `createPetition` validation with a mocked doc client, for a school and for a station.
- A body with `target` or `letterBody` → 400.
- Missing `letterText`, `letterSubject` or `authorityName` → 400.
- Mobile `saveDocket` with no token throws, and with a 400 response throws the server message.
- A source check: `mobile/src/services/petitionService.js` must not contain `dps_rohini`, `R.K. Puram CAAQMS` or `cpcb@nic.in`.

### A2. Make `school_id` changeable by admins (fixes "school admin can never be assigned")

**`aws/template.yaml`**, in the `CognitoUserPool` → `Schema` entry for `school_id`, set `Mutable: true`.
Apps still can't write it: neither `WriteAttributes` list includes `custom:school_id`, which keeps it admin-only.
**This must be done before Phase C.** Cognito can't change it after the pool exists.

**Test (CODE):** in `tests/cognitoFixPlanPhase1.test.js`, read the template and assert that the `school_id` block contains `Mutable: true` and that neither `WriteAttributes` list contains `custom:school_id`.

### A3. Ship the data files with the Lambda (fixes "stack deploy strips data files")

1. **New `scripts/build_lambda.mjs`:**
   - **Clean:** delete `lambda-dist/` (`fs.rmSync(..., { recursive: true, force: true })`), then recreate it.
   - **Bundle:** run esbuild through its JS API (`import { build } from 'esbuild'`) with `entryPoints: ['server/lambda.js']`, `bundle: true`, `platform: 'node'`, `target: 'node22'`, `format: 'esm'`, `outfile: 'lambda-dist/index.mjs'`, `external: ['@aws-sdk/*']`, and `banner: { js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);" }`.
   - **Copy these files, keeping their paths:**
     - `ml/data/spatial_grids.json`
     - `src/data/schoolsDirectory.json`
     - `src/data/authoritiesConfig.json`
     - `ml/model/sagemaker_forecast_metadata.json`
     - `ml/model/xgboost_forecast_model.json`
     - `ml/data/grid_14day_buffer.json` (only if it exists)
   - **Fail loudly:** exit with an error naming any required file that's missing.
2. **`package.json`:** `"build:lambda": "node scripts/build_lambda.mjs"`.
3. **`scripts/deploy_lambda.py`:**
   - Replace the esbuild call and the hand-written zip list with `subprocess.run('node scripts/build_lambda.mjs', shell=True, check=True, cwd=project_root)`, then zip **everything under `lambda-dist/`** recursively, with paths relative to `lambda-dist/`.
   - **Add the guard** before uploading:
     ```python
     cfg = lam.get_function_configuration(FunctionName='wmd-backend')
     env = (cfg.get('Environment') or {}).get('Variables') or {}
     if not env.get('COGNITO_USER_POOL_ID'):
         raise SystemExit('ABORT: wmd-backend has no COGNITO_USER_POOL_ID. This code requires login and would make drafting return 503. Deploy the CloudFormation stack first (docs/COGNITO_FIX_PLAN_V2.md, Phase C).')
     ```
4. **`scripts/deploy_stack.mjs`:** at the start of `--review`, run `node scripts/build_lambda.mjs` (stop on failure) so the stack always packages a complete, fresh bundle.
5. **`.gitignore`:** add `aws/packaged*.yaml`.

**Test (CODE): new `tests/lambdaBundle.test.js`.** It runs `node scripts/build_lambda.mjs`, then asserts that `lambda-dist/index.mjs` and the five required data files exist, and that `index.mjs` starts with the `createRequire` banner.

### A4. Remove invented Cognito IDs and make mobile login honest (fixes "fake IDs")

1. **`mobile/app.json`:** delete `cognitoDomain` and `cognitoClientId` from `extra`. Keep `cognitoRedirectUri`. Phase D fills the real values in.
2. **`mobile/src/services/authService.js` → `getAuthConfig()`:**
   - Delete the hard-coded fallbacks `'wmd-auth-594650681179…'` and `'2q6997h1l5g3r1r9g3skh20u6n'`.
   - Accept a domain given with or without `https://`, and strip it.
   - If the domain or client ID is missing, return `{ configured: false }`.
   - `signIn()` then throws `new Error('Login is not configured in this build (missing cognitoDomain / cognitoClientId in app.json).')`.
3. **Profile tab (`mobile/App.js`):** if `getAuthConfig().configured` is false, show that message instead of the Sign in button.
4. **Test (CODE):** in `tests/cognitoFixPlanPhase4Mobile.test.js`, assert that neither `mobile/app.json` nor `mobile/src/services/authService.js` contains `594650681179` or `2q6997h1l5g3r1r9g3skh20u6n`.

### A5. Duplicate saves (fixes the broken repeat-request check)

The current check queries with `Limit: 1` plus a filter. DynamoDB applies the limit before the filter, so only one item is ever checked.

1. **`aws/template.yaml`: `PetitionsDynamoDBTable`.** Add a local secondary index so lists stay newest-first, because petition IDs will no longer be time-ordered. It **must be added before Phase C**; local indexes can't be added later.
   ```yaml
   LocalSecondaryIndexes:
     - IndexName: userSub-createdAt-index
       KeySchema:
         - AttributeName: userSub
           KeyType: HASH
         - AttributeName: createdAt
           KeyType: RANGE
       Projection:
         ProjectionType: ALL
   ```
2. **`server/petitionsService.js` → `createPetition`:**
   - **Request ID:** `clientRequestId` is required, and must match `/^[A-Za-z0-9-]{8,64}$/`; otherwise 400.
   - **Petition ID from the request ID:** `petitionId = 'pet_' + crypto.createHash('sha256').update(`${userSub}:${clientRequestId}`).digest('hex').slice(0, 32)`. Remove `petitionData.petitionId` (clients may no longer choose IDs).
   - **No double write:** delete the Query-based check. Write with `ConditionExpression: 'attribute_not_exists(petitionId)'`. On `ConditionalCheckFailedException`, `GetCommand` the existing item and return it with `isDuplicate: true`, which the route turns into a 200.
3. **`listPetitionsByUser`:** query `IndexName: 'userSub-createdAt-index'` with `ScanIndexForward: false`.
4. **`deleteAllPetitionsForUser`:** loop on `LastEvaluatedKey` so more than 1 MB of items are all deleted.
5. **Tests (CODE),** with a mocked doc client:
   - the same `clientRequestId` twice → one `Put` succeeds, the second returns the same `petitionId` with `isDuplicate`;
   - a missing or malformed `clientRequestId` → 400;
   - the list query uses the local index.

### A6. Mobile silent defaults
Covered by A1 (mobile, steps 2 to 4).

### A7. Monitor modal: hide dispatch buttons in production

1. **`server/routes/monitorRoutes.js` → `GET /api/monitor/status`:** respond with `{ success: true, ...status, httpDispatchEnabled: process.env.NODE_ENV !== 'production' }`.
2. **`src/components/Dashboard/AutonomousMonitorModal.jsx`:**
   - Store `httpDispatchEnabled` from the status response; it defaults to `false` until loaded.
   - When false, render **none** of the buttons that call `/api/monitor/run-cycle`, `/clear-debounces`, `/predictive-advisories`, `/block-emergency` or `/chronic-petitions`. That covers the buttons in this file and the ones in the tabs it passes `handleRunFullCycle` and `handleClearDebounces` to: pass `httpDispatchEnabled` as a prop to those tabs and gate their buttons too.
   - In their place show: "Monitoring runs automatically every 30 minutes (Amazon EventBridge). Manual dispatch is disabled in production."
3. **Test (CODE):** server-render the modal with a mocked status of `httpDispatchEnabled: false` and assert none of the five endpoint names appear in clickable buttons.

### A8. Node 22 runtime
- **Templates:** in `aws/template.yaml` (both functions) and `aws/template-import.yaml`, set `Runtime: nodejs22.x`.
- **Build target:** esbuild uses `target: 'node22'` (already in A3).
- **Test (CODE):** the template test asserts there's no `nodejs20.x` in either template.

### A9. Run everything (CODE)
```bash
npm test
```
```bash
npm run build
```
```bash
npm run build:lambda
```
Expected: every test passes except the 8 old lazy-loading UI tests and `petitionIntegrationE2E` test 5 (it calls the live API, which only works after Phase C). Both builds succeed.

---

## Phase B: Pre-flight (YOU RUN, read-only)

Run these and paste the outputs. Nothing here changes AWS.

```bash
aws sts get-caller-identity
```
```bash
aws lambda get-function-configuration --function-name wmd-backend --region ap-south-1 --query "{Role:Role,Runtime:Runtime,Handler:Handler,Timeout:Timeout,Memory:MemorySize,Arch:Architectures}"
```
```bash
aws lambda get-function-url-config --function-name wmd-backend --region ap-south-1
```
```bash
aws dynamodb describe-table --table-name AirQualityReadings --region ap-south-1 --query "Table.{Keys:KeySchema,Attrs:AttributeDefinitions,Status:TableStatus}"
```
```bash
aws events list-rule-names-by-target --target-arn arn:aws:lambda:ap-south-1:<ACCOUNT_ID>:function:wmd-backend --region ap-south-1
```
```bash
aws iam get-role --role-name wmd-backend-role-ap-south-1 --query Role.Arn
```
```bash
aws iam get-role --role-name wmd-cognito-post-confirm-role-ap-south-1 --query Role.Arn
```
```bash
aws dynamodb describe-table --table-name Petitions --region ap-south-1 --query Table.TableStatus
```
```bash
aws cognito-idp list-user-pools --max-results 20 --region ap-south-1
```
```bash
aws s3 ls s3://wmd-cfn-artifacts-<ACCOUNT_ID>-ap-south-1
```

**What each result means:**

| Check | Expected | If not |
|---|---|---|
| Lambda `Arch` | `x86_64` | If `arm64`, add `Architectures: [arm64]` to `WmdBackendFunction` in both templates |
| Table key `timestamp` | type `S` | If `N`, change both templates to `N` before import |
| Rules targeting `wmd-backend` | none, or one rule | If a rule exists, write down its name; see Phase C, step C4 |
| The two `iam get-role` commands | `NoSuchEntity` | If a role exists, rename `RoleName` in the template (e.g. add `-v2`), because the stack can't create a role that already exists |
| `Petitions` table | `ResourceNotFoundException` | If it exists (from the old `deploy_cognito_infra.js` script) and is empty, delete it with `aws dynamodb delete-table --table-name Petitions --region ap-south-1`. If it has data, stop and tell me |
| User pools | no `wmd-user-pool` | If one exists from the old script, tell me before going further (it has the immutable `school_id` and can't be reused) |
| `s3 ls` artifact bucket | `NoSuchBucket` | Created in step C1 |

---

## Phase C: Deploy (YOU RUN, in order)

Only start after Phase A is merged and `npm test` passes as described in A9.

**C1. Artifact bucket (one time)**
```bash
aws s3 mb s3://wmd-cfn-artifacts-<ACCOUNT_ID>-ap-south-1 --region ap-south-1
```

**C2. Build and package the import template**
```bash
npm run build:lambda
```
```bash
aws cloudformation package --template-file aws/template-import.yaml --s3-bucket wmd-cfn-artifacts-<ACCOUNT_ID>-ap-south-1 --output-template-file aws/packaged-import.yaml --region ap-south-1
```

**C3. Import the existing table and Lambda.** `<ROLE_ARN>` is the `Role` from the Phase B Lambda output.
```bash
aws cloudformation create-change-set --stack-name wmd-stack --change-set-name import-existing --change-set-type IMPORT --resources-to-import file://aws/resources-to-import.json --template-body file://aws/packaged-import.yaml --parameters ParameterKey=ExistingLambdaRoleArn,ParameterValue=<ROLE_ARN> --capabilities CAPABILITY_NAMED_IAM --region ap-south-1
```
```bash
aws cloudformation wait change-set-create-complete --stack-name wmd-stack --change-set-name import-existing --region ap-south-1
```
```bash
aws cloudformation describe-change-set --stack-name wmd-stack --change-set-name import-existing --region ap-south-1 --query "Changes[].ResourceChange.{Action:Action,Id:LogicalResourceId}"
```
**Continue only if** the output lists exactly two rows, both `Import`: `AirQualityDynamoDBTable` and `WmdBackendFunction`.
```bash
aws cloudformation execute-change-set --stack-name wmd-stack --change-set-name import-existing --region ap-south-1
```
```bash
aws cloudformation wait stack-import-complete --stack-name wmd-stack --region ap-south-1
```

**C4. Old EventBridge rule (only if Phase B found one).** Do this immediately before C5 so the monitor is paused for only a few minutes. `<TARGET_ID>` comes from the first command.
```bash
aws events list-targets-by-rule --rule <OLD_RULE_NAME> --region ap-south-1 --query "Targets[].Id"
```
```bash
aws events remove-targets --rule <OLD_RULE_NAME> --ids <TARGET_ID> --region ap-south-1
```
```bash
aws events delete-rule --name <OLD_RULE_NAME> --region ap-south-1
```

**C5. Create everything else** (Cognito, Petitions, roles, post-confirm function, new rule, and the new backend code with its environment). Make sure `.env` does **not** set `USE_SES_EMAIL=true`, so sign-up emails use Cognito's built-in sender (enough for a demo, low daily limit).
```bash
node scripts/deploy_stack.mjs --review
```
**Continue only if** the change list has **no** `Remove` rows, and the `Replacement` column is not `True` for `AirQualityDynamoDBTable` or `WmdBackendFunction`. If it is, stop and paste the output to me.
```bash
node scripts/deploy_stack.mjs --execute
```
Copy the printed outputs: `UserPoolId`, `UserPoolDomain`, `WebClientId`, `MobileClientId`, `IngestClientId`, `PetitionsTableName`. They aren't secrets.

**C6. Put the outputs in `.env`** (edit the file by hand):
```
COGNITO_USER_POOL_ID=<UserPoolId>
COGNITO_WEB_CLIENT_ID=<WebClientId>
COGNITO_MOBILE_CLIENT_ID=<MobileClientId>
COGNITO_INGEST_CLIENT_ID=<IngestClientId>
PETITIONS_TABLE_NAME=Petitions
VITE_COGNITO_USER_POOL_ID=<UserPoolId>
VITE_COGNITO_WEB_CLIENT_ID=<WebClientId>
```
Then fetch the ingest secret into `.env`. It prints nothing; exit code 0 means success:
```bash
node scripts/fetch_ingest_secret.mjs
```

**C7. Smoke-test the live API.** This must now return **401** `unauthorized`, not 503:
```bash
curl -s -X POST "https://vtcmfkzdfyd5sy3ugjfwdhlqsy0lcxaj.lambda-url.ap-south-1.on.aws/api/petition/generate-draft" -H "Content-Type: application/json" -d "{}"
```
**If something is wrong:** the backend code can be rolled back with Step 0. The tables and Lambda are `Retain`, so no data is lost.

---

## Phase D: Point the apps at the real login (YOU RUN)

**D1. Vercel (web).** In the Vercel dashboard → Project → Settings → Environment Variables (Production), set these, then redeploy:
- `VITE_API_BASE_URL` = `https://vtcmfkzdfyd5sy3ugjfwdhlqsy0lcxaj.lambda-url.ap-south-1.on.aws`
- `VITE_COGNITO_USER_POOL_ID` = `<UserPoolId>`
- `VITE_COGNITO_WEB_CLIENT_ID` = `<WebClientId>`

Confirm that the production domain is exactly `https://wmd-build.vercel.app`; it's the only Vercel origin the Lambda allows (CORS). If it's different, tell me and I'll change `FRONTEND_URL` in the template.

**D2. Mobile config.** In `mobile/app.json` → `expo.extra`, add (the domain without `https://`):
```json
"cognitoDomain": "<UserPoolDomain without https://>",
"cognitoClientId": "<MobileClientId>"
```

**D3. Install the mobile login packages** (this also pins the right versions for your Expo SDK):
```bash
cd mobile && npx expo install expo-auth-session expo-crypto expo-secure-store expo-web-browser
```

**D4. Build a development build.** Login redirects to `vayuvitals://`, which doesn't work in Expo Go. Requires the Android SDK and a connected phone or emulator:
```bash
cd mobile && npx expo run:android
```

---

## Phase E: Verify (YOU RUN, tick each)

**Web (https://wmd-build.vercel.app):**
- [ ] Sign up with a real email → the code arrives → confirm → sign in.
- [ ] `aws cognito-idp admin-list-groups-for-user --user-pool-id <UserPoolId> --username <email> --region ap-south-1` shows `citizen`.
- [ ] Forgot password → a code arrives → the reset finishes **without an error message**.
- [ ] Signed out: "Generate draft" opens the sign-in modal.
- [ ] Signed in: draft → save → "Saved to My petitions". Click save again with the same draft → no second entry in My petitions.
- [ ] Mark as sent → the status shows `MARKED_AS_SENT`. Delete it → it's gone after refreshing.
- [ ] The Monitor modal shows the "runs automatically" note and no dispatch buttons.

**School admin:**
- [ ] Promote the account:
  ```bash
  node scripts/cognito_promote_school_admin.js <email> dps_rk_puram
  ```
- [ ] With a second account, save a petition about `dps_rk_puram`.
- [ ] With the admin account, sign out and in, then open School petitions: the petition shows date, authority, subject and summary only, with **no name, phone or letter text**.

**API:**
- [ ] Get an ingest token. Running this sends the secret on your local command line only; don't paste it anywhere:
  ```bash
  curl -s -u <IngestClientId>:<secret from .env> -d "grant_type=client_credentials&scope=ingest/write" https://<UserPoolDomain without https://>/oauth2/token
  ```
- [ ] With that token, `POST /api/petitions` → **403**.

**Scheduled job:**
- [ ] After 30 minutes, `aws logs tail /aws/lambda/wmd-backend --since 1h --region ap-south-1` shows **one** monitoring run per 30 minutes, not two.

**Mobile (development build):**
- [ ] Sign in → draft → save → the same petition appears in My petitions on the **web**.
- [ ] Airplane mode → save shows "Could not save" with a reason, and nothing appears as saved.
- [ ] Restart the app → still signed in. Sign out → signed out.

**Tests:**
- [ ] `npm test`: now only the 8 old lazy-loading UI tests fail. `petitionIntegrationE2E` needs a token for drafting; update it to skip the drafting test unless an `E2E_ACCESS_TOKEN` env var is set.

---

## Issue → fix map

| Review issue | Fixed by |
|---|---|
| Live backend returns 503 | Step 0, and the guard in A3 |
| Save returns 400 (web and mobile); mobile reads empty letters; web hides errors | A1 |
| `school_id` immutable | A2 |
| Stack deploy strips data files | A3 |
| Invented Cognito IDs; mobile packages not installed | A4, D2, D3 |
| Duplicate-save check broken | A5 |
| Mobile silent defaults | A1 (mobile) |
| Monitor dispatch buttons return 403 in production | A7 |
| Node 20 runtime | A8 |
| Possible double scheduled job | Phase B, C4 |
| SES for Cognito email | Keep `USE_SES_EMAIL` unset (C5) |
