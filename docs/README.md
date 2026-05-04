# Dokumentasi Produk CuanBeres

Tanggal review: 2026-05-04

Dokumentasi ini memisahkan kondisi aktual dan target produk. `currentstate.md` menjelaskan yang sudah ada di repo. `PRD.md` menjelaskan kebutuhan produk, acceptance criteria, dan backlog produk.

## Peta Dokumen

| Area | Current State | PRD |
| --- | --- | --- |
| Chatbot WhatsApp | [docs/chatbot/currentstate.md](./chatbot/currentstate.md) | [docs/chatbot/PRD.md](./chatbot/PRD.md) |
| Web Dashboard | [docs/web-dashboard/currentstate.md](./web-dashboard/currentstate.md) | [docs/web-dashboard/PRD.md](./web-dashboard/PRD.md) |
| Data dan Auth | [docs/data-auth/currentstate.md](./data-auth/currentstate.md) | [docs/data-auth/PRD.md](./data-auth/PRD.md) |

## Source Of Truth Teknis

- Bot runtime: `src/index.js`
- Bot logic: `src/handlers/messageHandler.js`
- Parser AI: `src/services/aiParser.js`
- NL query: `src/services/nl2sqlService.js`
- Auth link: `src/services/authLinkService.js`
- Database service: `src/services/dbService.js`
- Shared contracts: `shared/contracts/`
- Web app: `web/app/`
- Dashboard components: `web/components/dashboard/`
- Schema awal Supabase: `supabase_schema.sql`

## Catatan Naming

Runtime user-facing saat ini memakai WhatsApp via Fonnte. Beberapa kontrak internal masih bernama `telegram_user_id`, `telegram_chat_id`, dan `telegram_username`. Dalam dokumen produk, istilah user-facing tetap "WhatsApp"; nama field internal ditulis apa adanya saat membahas kontrak teknis.

## Dokumen Lama

- `docs/frontend-handoff/` tetap berguna untuk handoff UI dan flow.
- `docs/telegram-pivot/` berisi catatan pivot lama dan sebagian tidak cocok dengan runtime WhatsApp saat ini. Pakai dokumen baru ini sebagai rujukan produk utama.

## Aturan Update

- Update `currentstate.md` setiap ada perubahan implementasi.
- Update `PRD.md` sebelum menambah fitur besar atau mengubah acceptance criteria.
- Jika kontrak API/database berubah, update area terkait dan sebutkan file sumber.
