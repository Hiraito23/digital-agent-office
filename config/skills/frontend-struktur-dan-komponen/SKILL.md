---
name: frontend-struktur-dan-komponen
description: "Struktur folder frontend oase-tanjung, pola komponen/hook/service, dan checklist kualitas UI."
version: 1.0.0
author: Agentic Digital Office
license: MIT
metadata:
  hermes:
    tags: [frontend, react, nextjs, tailwind, antd, axios]
---

# Struktur dan Pola Frontend

## When to Use

- Membuat fitur, halaman, komponen, hook, atau service baru di frontend.
- Meninjau apakah kode frontend mengikuti konvensi proyek.

## Procedure

**1. Struktur folder wajib**

WAJIB ikuti struktur folder proyek oase-tanjung (monorepo frontend/ + backend/, ESLint + Prettier + Husky di root). Frontend React + Vite:
frontend/src/
  assets/ (fonts, gambar)
  common/ config/, constants/, contexts/, entities/, enum/, interface/, options/,
    mappers/<fitur>.mapper.ts (ubah data API ke bentuk UI),
    router/ (router-pages.ts, router-api.ts, route-permissions.ts)
  components/ atoms/ (Label, Title, StatusBadge), molecules/ (DataTable, DetailField, ActionDropdown),
    organisms/<fitur>/ (mis. CustomerActionButton.tsx), modules/<fitur>/ (CustomerTable.tsx, CustomerForm.tsx, CustomerDetail.tsx),
    custom/ (EmptyState, LoadingState, chart)
  contract/<fitur>/ (<fitur>-request.entities.ts, <fitur>-response.entities.ts, <fitur>.endpoint.ts, <fitur>.routes.ts)
  hooks/<fitur>/use<Fitur>.ts (query dan mutation API)
  layout/ (AppSidebar, HeaderSidebar, MobileNavbar)
  middleware/ (ProtectedRoute, RequirePermission, ProtectedButton)
  pages/<grup>/<fitur>/ (mis. pages/crm/customers/)
  utils/ (queryClient.ts, themeAntd.ts, buildRoute.ts)
frontend/test/<fitur>/<fitur>-<aspek>.spec.ts(x)
Aturan: komponen PascalCase.tsx, file lain kebab-case dengan sufiks peran (.mapper.ts, .endpoint.ts, .entities.ts), hook use<Nama>.ts; endpoint dan tipe hanya di contract/, transformasi data hanya di mappers/, cek izin lewat middleware/. Untuk proyek Next.js pakai pola yang sama, dengan app/ untuk routing menggantikan pages/.

**2. Urutan membuat fitur `<fitur>`**

1. `contract/<fitur>/` : tipe request/response (`*.entities.ts`), `<fitur>.endpoint.ts`, `<fitur>.routes.ts`.
2. `common/mappers/<fitur>.mapper.ts` : ubah data API ke bentuk yang dipakai UI (tanggal, status, label).
3. `hooks/<fitur>/use<Fitur>.ts` : query dan mutation (TanStack Query); invalidasi cache setelah mutation.
4. `components/modules/<fitur>/` : tabel, form, detail; komponen presentasi di molecules/atoms.
5. `pages/<grup>/<fitur>/` : merangkai layout + modules; route dan izin di `common/router/`.
6. Tes di `frontend/test/<fitur>/`.

**3. Pola Axios terpusat** (satu instance, tanpa memanggil axios langsung di komponen)

```ts
export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL, timeout: 15000 });
api.interceptors.request.use((cfg) => { const t = getToken(); if (t) cfg.headers.Authorization = `Bearer ${t}`; return cfg; });
api.interceptors.response.use((r) => r, (e) => { if (e.response?.status === 401) logout(); return Promise.reject(normalizeError(e)); });
```

**4. Pola hook**

```ts
export const useCustomers = (params: CustomerIndexRequest) =>
  useQuery({ queryKey: ['customers', params], queryFn: () => customerService.index(params), select: mapCustomerList });
```

**5. Checklist per layar:** loading (skeleton/spinner), error (pesan + coba lagi), empty (ajakan tindakan), sukses; form: validasi, pesan error per field, tombol nonaktif saat submit, konfirmasi untuk aksi destruktif; tabel: paginasi server-side, sort, filter, reset; responsif; label dan fokus keyboard; teks UI Bahasa Indonesia; tanpa `any`, tanpa `console.log`, tanpa secret.

## Pitfalls

- Memanggil API atau mengubah bentuk data langsung di komponen (harusnya hook dan mapper).
- Menaruh tipe/endpoint di luar contract/.
- Mencampur gaya inline dengan Tailwind/Ant Design; membuat komponen baru padahal sudah ada.
- Lupa invalidasi cache setelah mutation, sehingga daftar tidak ikut berubah.
- Melewatkan state empty dan error.

## Verification

- `npx tsc --noEmit`, lint, dan tes fitur lolos; dev server berjalan tanpa error di console.
- Alur utama dicoba manual: sukses, gagal (matikan API), data kosong, dan izin tidak cukup.
- Nama file dan folder sesuai konvensi di atas.
