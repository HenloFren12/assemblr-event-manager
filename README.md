# Assemblr

AI event-ops room for volunteer-run community events. See the strategy document for the full spec.

## Run
```bash
npm install
cp .env.example .env.local   # add your Gemini key
npm test && npm run typecheck && npm run build
npm run dev                  # UI only; /api needs `vercel dev` or a proxy to your deployed app
```
