# MoonMax Book — snapshot with the demo (2026-10-13)

Full copy of `dashboard/` taken right before the demo was removed for the Vercel deploy.
It still has the demo ledger (`/demo/`), the multi-site demo receipts (`/demo/#/receipts`)
and the scenario switcher.

Run it:

    cd tw-creator-pay/dashboard-with-demo-2026-10-13
    npm install
    npx vite --port 5174

Then open http://localhost:5174/demo/ — port 5174 so it can run next to the real one.
It starts with an empty `platform.config.json`; your real settings were not copied.
