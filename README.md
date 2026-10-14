# fitbot-web

Dashboard ส่วนตัวของ Fitbot (ระยะ 1): ตัวเลขสุขภาพสำคัญ กราฟย้อนหลัง 7/30/90 วัน และบทวิเคราะห์จาก AI
อ่านข้อมูลจาก `fitbot serve` ของ [fitbot-api](../fitbot-api) แบบอ่านอย่างเดียว

ระยะ 1 **ยังไม่มีระบบล็อกอิน** จึงรันบนเครื่องตัวเองเท่านั้น (API ยอมฟังเฉพาะ 127.0.0.1)

## รันระหว่างพัฒนา

```bash
# เทอร์มินัล 1: API (ใน fitbot-api)
go run ./cmd/fitbot serve

# เทอร์มินัล 2: หน้าเว็บ (Vite ส่ง /api ต่อไปที่ 127.0.0.1:8787)
npm install
npm run dev        # http://127.0.0.1:5173
```

ทดลองกับข้อมูลจำลอง: ตั้ง `FITBOT_DATABASE_URL` ไปที่ฐานข้อมูล `fitbot_dev` แล้วรัน `fitbot dev seed --user 1`

## ใช้งานแบบไม่ต้องรัน Vite

```bash
npm run build
cd ../fitbot-api && go run ./cmd/fitbot serve --web ../fitbot-web/dist   # http://127.0.0.1:8787
```

## โครงสร้าง

| ไฟล์ | หน้าที่ |
| --- | --- |
| `src/api.ts` | ชนิดข้อมูลตรงกับ `internal/httpapi` และฟังก์ชันเรียก API |
| `src/format.ts` | วันที่ไทย ระยะเวลา ตัวเลข |
| `src/series.ts` | series ของกราฟและสี (ลำดับสีผ่านการตรวจ colorblind แล้ว ห้ามสลับ) |
| `src/components/panels.tsx` | stat tiles, บทวิเคราะห์, ค่าที่ควรเฝ้าระวัง, การนอน, เป้าหมาย WHO, ตาราง |
| `src/components/charts.tsx` | กราฟแท่งและกราฟเส้น (Recharts) |

หลักการ: ตัวเลขทุกตัวคำนวณที่ API ด้วยกฎเดียวกับรายงาน LINE หน้าเว็บไม่คำนวณสถิติเอง
ค่าที่ไม่มีเป็น `null` และแสดงว่า "ไม่มีข้อมูล" ห้ามแสดงเป็น 0
