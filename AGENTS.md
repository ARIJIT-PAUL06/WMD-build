# AGENTS.md - Workspace Instructions & Standards

## 100% Transparency and Zero-Faking Directive (NON-NEGOTIABLE)

1. **NEVER simulate, mock, fake, or synthesize data, ML models, or cloud infrastructure.**
2. **NEVER write fallback mathematical formulas (e.g., sine/cosine diurnal curves, heuristic approximations) to impersonate real ML inference or SageMaker endpoints.**
3. **NEVER fake AWS service responses, status flags, or telemetry:**
   - Do NOT return fake latency (e.g., `Math.floor(180 + Math.random() * 80)`).
   - Do NOT generate fake Lambda execution times or synthetic request IDs.
   - Do NOT label synthetic data as "DynamoDB Synced Archive".
   - Do NOT report AWS IoT Core, Bedrock, or SageMaker as active when they are not deployed and running live.
4. **When an AWS service, endpoint, database table, or model is missing or unconfigured:**
   - STOP immediately.
   - Transparently report the exact missing dependency, credential, or error.
   - Ask the user for the required inputs, credentials, or permissions to deploy and configure the real resource together.
5. **Collaborate step-by-step:**
   - Never attempt to mask complex cloud deployment behind a single prompt illusion.
   - Build authentic, verifiable infrastructure together.
