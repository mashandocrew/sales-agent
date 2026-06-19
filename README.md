# LinkedIn Agent

Automated LinkedIn outreach pipeline using Supabase, Groq, and n8n.

## Setup

```bash
cp .env.example .env
# Fill in your credentials in .env
npm install
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run seed-config` | Insert initial config into Supabase |
| `npm run import-leads` | Import leads from Google Sheet |
| `npm run generate-messages` | Analyze leads and generate messages with Groq |
| `npm run export-messages` | Export approved messages to data/exports/ |
| `npm run update-pipeline` | Update lead pipeline states |
| `npm run test-pipeline` | Run full system test |

## Structure

```
linkedin-agent/
├── scripts/        # CLI scripts
├── dashboard/      # HTML dashboard
├── n8n-workflows/  # n8n importable workflows
├── sql/            # Database migrations
└── data/exports/   # Generated message exports (gitignored)
```
