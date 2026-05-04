# Frontend Handoff CuanBeres

Dokumentasi ini dibuat untuk frontend engineer yang akan melanjutkan dan merestrukturisasi desain CuanBeres. Fokusnya: memahami apa yang sudah ada, area desain yang bisa diperbaiki, dan bagaimana data bergerak dari chatbot ke database sampai muncul di frontend.

## Urutan Baca

1. [Current State](./01-current-state.md)  
   Ringkasan stack, fitur yang sudah dikerjakan, dan catatan inkonsistensi naming.

2. [Design Improvement Notes](./02-design-improvement-notes.md)  
   Catatan redesign untuk landing page, onboarding, register, login, verify, dan dashboard.

3. [System Flows](./03-system-flows.md)  
   Alur end-to-end chatbot -> Supabase -> frontend.

4. [Frontend Contracts](./04-frontend-contracts.md)  
   Endpoint, payload, response, dan shape data yang perlu dipakai frontend.

5. [Redesign Checklist](./05-redesign-checklist.md)  
   Checklist praktis sebelum dan sesudah redesign.

## Konteks Penting

Runtime bot saat ini adalah WhatsApp melalui webhook Fonnte. Namun beberapa field, file, dan copy internal masih memakai nama `telegram_*` karena warisan pivot sebelumnya. Untuk redesign frontend, tampilkan ke user sebagai WhatsApp/CuanBeres, tetapi jangan mengganti kontrak teknis tanpa koordinasi backend karena field tersebut masih dipakai oleh API dan database.

