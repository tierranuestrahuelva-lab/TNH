# TNH — Lo Más Pro · Product Requirements Document

**App**: Internal commercial wine search tool for Tierra Nuestra Huelva (wine distributor, Huelva, Andalucía).  
**Date**: 2026-01-23  
**Version**: 1.0.0 (MVP shipped)

---

## Original Problem Statement
> "LO MAS PRO" — the user uploaded an Excel catalog (1586 products) and requested a professional internal web search for the commercial team. Search with many filters (type, zone, denominations, grapes), quick buttons (tinto/blanco/rosado/espumoso/generoso), price range, AI button, barcode camera scanner. Shopping cart for commercials with dropdown (Fernando/Ernesto/Tienda), client name, observations, send to email (tnh@tierranuestrahuelva.es) and WhatsApp (+34699414559). Dashboard comparative, dark/light toggle, AI that recommends alternatives for wines not in catalog and provides sales arguments.

## User Personas
- **Fernando** (comercial, visita HORECA) — login `fernando`/`fernando2026`
- **Ernesto** (comercial) — login `ernesto`/`ernesto2026`
- **Tienda** (punto de venta físico) — login `tienda`/`tienda2026`

## Core Requirements (static)
- Auth: 3 fixed users with JWT (30-day tokens)
- Search: full-text across name, bodega, denom, zona, variedades, código, abreviatura
- Filters: 6 quick-type pills + 5 advanced selects + price range
- Barcode scanner via camera (html5-qrcode) with exact + fuzzy fallback
- Cart → Email (mailto), WhatsApp (wa.me), PDF (jsPDF), save to DB
- AI Assistant (Claude Sonnet 4.5 via Emergent LLM key) in Spanish
- Dashboard with 4 bento charts + KPIs
- Dark/Light theme toggle
- Order history per commercial
- Custom PRO aesthetic: Bordeaux + Sherry Gold + Cormorant Garamond

## Architecture
- **Backend**: FastAPI (`/app/backend/server.py`) + Motor (MongoDB) + emergentintegrations · port 8001
- **Frontend**: React 19 + Tailwind + Radix/shadcn + Recharts + html5-qrcode + jsPDF · port 3000
- **DB**: MongoDB local — collections: `users`, `products`, `orders`, `ai_messages`
- **Catalog ingestion**: Excel (`/app/data/catalog.xlsx`) auto-loaded on startup (idempotent)

## What's been implemented (2026-01-23)
- [x] Backend: auth (login/me), products (list, detail, filters, stats, barcode), orders (create/list/detail), AI chat with bounded history (12-msg window, no replay loop)
- [x] 1586 products imported with category normalization (tinto/blanco/rosado/espumoso/generoso/licor/otros)
- [x] Frontend: Login (split-screen sommelier), Shell with sidebar nav + topbar, Dashboard (KPIs + 4 charts), Catalog (filters + pills + price + grid), Product modal (4 tariffs), Barcode scanner modal, Cart sheet (commercial/cliente/obs/email/WA/PDF/save), Orders page, AI Chat page
- [x] Theme toggle (dark/light) with full palette customisation (bordeaux/sherry/gold)
- [x] data-testid attributes on every interactive element
- [x] PDF export with branded header, bordeaux/gold palette, itemized table
- [x] Whatsapp/Email generated from client with formatted message (pre-populated)
- [x] **Backend tests: 36/36 pytest passed (testing_agent iteration_1.json)**

## Prioritized Backlog / Next Action Items

### P0 — None (all critical flows work)

### P1 — Polish
- Image upload/display for products (column IMAGEN is populated for 310/1586 products but uses a Windows network path — needs replacement with uploadable images)
- "Presentation mode" toggle in product modal for showing to client on tablet
- Share deep link for a specific product (via WhatsApp share button already exists)
- Add "Mark as out-of-stock" per product (requires stock column or admin UI)

### P2 — Enhancements
- Import/sync new Excel versions via admin upload (UI)
- Multi-language (EN for international clients)
- Stats dashboard per commercial (sales by month, top clients)
- Email integration with SendGrid (transactional) instead of mailto: (currently opens user's mail client)
- Advanced AI: RAG over entire catalog (vector embeddings) instead of 25-product sample
- Visual barcode generator per product (EAN-13) for printing

## Future / Nice-to-haves
- Client database (separate from orders' free-text client field)
- Price list export to PDF/Excel for physical delivery
- Push notifications for new orders

## Notes
- Emergent LLM Key used (AI cost tracked on user's universal key balance)
- Barcode scanner requires HTTPS camera access (works on preview URL natively)
- Cart persists in localStorage per browser → commercial can prep an order offline, send later
