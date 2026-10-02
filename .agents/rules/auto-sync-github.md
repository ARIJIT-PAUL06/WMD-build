# Automatic GitHub Synchronization Rule

Always follow this rule for this workspace:
- Whenever changes or additions are made to the codebase and verified, automatically commit and push them to the GitHub repository:
  1. Verify `.env` and sensitive credentials remain unstaged and ignored.
  2. Stage modified files (`git add .`).
  3. Create a concise, meaningful semantic commit (`git commit -m "..."`).
  4. Push directly to the remote branch (`git push origin main`).
- Never leave committed changes unpushed unless explicitly requested by the user.
