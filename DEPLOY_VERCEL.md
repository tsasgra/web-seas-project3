# Deploy Vercel

Web này là static site. Dữ liệu JSONL đã nằm trong `data/`, nên có thể deploy trực tiếp thư mục `demo/web-seas-project3`.

## Cách 1: Deploy bằng Vercel CLI

```bash
cd demo/web-seas-project3
npx vercel login
npx vercel --prod
```

Khi Vercel hỏi cấu hình:

- Framework Preset: `Other`
- Build Command: để trống
- Output Directory: `.`
- Development Command: để trống

## Cách 2: Deploy qua GitHub import

1. Push repo lên GitHub.
2. Vào Vercel, chọn `Add New Project`.
3. Import repo.
4. Trong phần project settings, đặt:
   - Root Directory: `demo/web-seas-project3`
   - Framework Preset: `Other`
   - Build Command: để trống
   - Output Directory: `.`
5. Deploy.

## Chạy thử local

```bash
cd demo/web-seas-project3
python -m http.server 4173 --bind 127.0.0.1
```

Mở `http://127.0.0.1:4173/`.
