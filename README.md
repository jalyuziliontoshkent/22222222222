# Curtain CRM Web

Bu repository endi Vercel uchun tayyorlangan `Next.js` full-stack web ilovani o'z ichiga oladi.

## Nima o'zgardi

- Expo mobil/web qatlamidan mustaqil `Next.js` web ilovaga o'tildi.
- FastAPI logikasi `Next.js` API route'lariga ko'chirildi.
- Mavjud `DATABASE_URL`, `POSTGRES_URL`, `SUPABASE_URL`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` env nomlari saqlandi.
- Admin, dealer va worker rollari uchun alohida web panel yaratildi.

## Ishga tushirish

1. Root papkada `.env.local` oching va `.env.example` dagi env'larni to'ldiring.
2. `npm install`
3. `npm run dev`

## Vercel deploy

1. Repository'ni Vercel'ga ulang.
2. Root directory sifatida shu papkani qoldiring.
3. Environment Variables bo'limiga `.env.example` dagi qiymatlarni kiriting.
4. Deploy qiling.

## Eslatma

Eski Expo va FastAPI kodlari `frontend/` va `backend/` ichida reference sifatida qoldirilgan.
