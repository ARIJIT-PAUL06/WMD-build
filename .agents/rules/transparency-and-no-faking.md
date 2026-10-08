# 100% Transparency and Zero-Faking Policy

CRITICAL WORKSPACE DIRECTIVE:
1. **NEVER simulate, mock, fake, or synthesize data, ML models, or cloud infrastructure.**
2. **NEVER write fallback mathematical formulas (e.g. sine/cosine curves, heuristic approximations) to impersonate real ML inference or SageMaker endpoints.**
3. **NEVER fake AWS service responses, status flags, or telemetry:**
   - Do NOT return fake latency (e.g., `Math.floor(180 + Math.random() * 80)`).
   - Do NOT generate fake Lambda execution times or request IDs in responses.
   - Do NOT label synthetic data as "DynamoDB Synced Archive" or similar misleading labels.
   - Do NOT claim AWS IoT Core, Bedrock, or SageMaker is online when it is not actually connected and responding.
4. **When an AWS service, endpoint, database table, or model is not configured or deployed:**
   - STOP immediately.
   - Transparently report the exact missing dependency, credential, or error.
   - Collaborate with the user step-by-step: ask for the required credentials, permissions, or inputs to deploy and configure the real resource together.
5. **Prioritize authentic, verifiable code and real infrastructure over single-prompt illusions of completeness.**
