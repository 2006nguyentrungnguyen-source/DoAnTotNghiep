# Phân tích file kế hoạch `Ke_hoach_do_an_QR_cafe_1.xlsx`

Ngày phân tích: 06/11/2026 (cuối tuần 1). Số liệu lấy trực tiếp từ file, các phép tính được chạy lại bằng script.

## 1. File gồm những gì
15 sheet, vận hành như một hệ thống nhỏ: `Thiết lập` (ngày bắt đầu, giờ/ngày, ngày lễ) → `Task chi tiết` (95 việc, nguồn dữ liệu gốc) → `Gantt`, `Lịch tuần`, `Kế hoạch tuần`, `Dashboard` tự tính từ đó. Phần đặc tả: `Yêu cầu CN` (36 FR), `Yêu cầu PCN` (15 NFR), `Use case` (14), `CSDL` (11 bảng), `API` (38 dòng, 4 sự kiện realtime), `Test case` (30), `Báo cáo` (24 mục, 105 trang), `Rủi ro` (12).

Thiết kế tốt: một nguồn dữ liệu duy nhất, có truy vết FR ↔ Task, có quy tắc cắt giảm, có mốc M1–M5, có Swagger-first để hai người làm song song, có giờ dự trữ viết báo cáo mỗi tuần.

## 2. Con số chính
| Chỉ số | Giá trị |
|---|---|
| Tổng việc / tổng giờ | 95 việc / 463 giờ (A 228h, B 235h, việc chung A+B tính cho cả hai) |
| Công suất 2 người | 255h mỗi người (6h/ngày × 5 ngày, trừ giờ báo cáo) → tải A 89%, B 92% |
| Tuần quá tải | Không tuần nào >100%, nhưng A chạm 100% ở tuần 3, B chạm 100% ở tuần 4 |
| Phân bổ ưu tiên | Must 76 việc / 397h (86%), Should 16 việc / 53h, Could 3 việc / 13h |
| Yêu cầu | Must 21, Should 11, Could 4 (4 mục Could/Won't không làm) |

## 3. Vấn đề phát hiện (xếp theo mức độ)

**Cao**
1. **Lệch công nghệ CSDL.** Sheet `CSDL`, `Thiết lập`, `Task` (T10, T11) viết cho PostgreSQL (SERIAL, FK, CHECK, JSONB), nhưng repo thực tế dùng MongoDB Atlas + Mongoose. Phải chọn một và sửa tài liệu còn lại, vì báo cáo chương 1.3 và 3.2 (ERD, từ điển dữ liệu) phụ thuộc vào điều này. Đã triển khai theo MongoDB (xem README).
2. **Vùng đệm cắt giảm quá mỏng.** Chỉ 13h (3 việc Could) thực sự cắt được không đau; phần còn lại 86% là Must. Quy tắc cắt giảm có liệt kê thêm CI/CD, sao lưu, gộp đơn, kéo thả nhưng cộng lại cũng chỉ ~25h trên tổng 463h. Nếu M3 (tuần 6) trễ, không còn chỗ co. Nên hạ vài việc Must xuống Should (ví dụ T27 tích hợp lỗi/loading chi tiết, T78 vi chỉnh UX, T70–T71) để có ~40h đệm.
3. **Token bàn tĩnh = lỗ hổng nghiệp vụ.** QR dán cố định, ai chụp ảnh QR là có thể đặt món từ xa bất cứ lúc nào. Kế hoạch chỉ có rate limit (FR-34) và nhân viên xác nhận. Nên bổ sung tối thiểu: đơn đầu tiên của bàn phải được nhân viên xác nhận (đã có trạng thái PENDING → CONFIRMED), hoặc "phiên bàn" (session) do nhân viên mở/đóng. Ghi thành một dòng trong rủi ro RR-04.

**Trung bình**
4. **Tham chiếu FR sai lệch (đánh số lại FR mà không cập nhật).** Test case: TC-03 (→FR-33), TC-10 (→FR-35), TC-11 (→FR-34), TC-23 (→FR-24), TC-24 (→FR-25), TC-25 (→FR-26), TC-26 (→FR-29), TC-27 (→FR-30), TC-28 (→FR-31). Use case: UC-02 (FR-36 → 34/35), UC-07 (→FR-17), UC-08 (→FR-18), UC-09 (→FR-20, hiện trỏ FR-21 là mục không làm), UC-10 (→FR-23,24), UC-11 (→FR-25,26), UC-12 (→FR-22,27), UC-14 (→FR-13,22). Hậu quả: bảng truy vết trong báo cáo sẽ sai, giảng viên dễ bắt lỗi.
5. **Phụ thuộc không có khoảng đệm.** 24 cặp việc phụ thuộc bắt đầu cùng ngày bước trước kết thúc (ví dụ T05→T06, T48→T56). 4 cặp vi phạm thứ tự: T63 (14/12) cần T59 (kết thúc 15/12); T86 và T87 (30/12) cần T82 deploy (kết thúc 31/12); T90 (04/01) cần T89 (kết thúc 05/01). Chỉ một ngày trễ là dây chuyền dồn lại.
6. **Tuần 9 quá dày.** Test toàn bộ + bảo mật + Docker/CI/CD + deploy + đo hiệu năng + khảo sát + chạy thử tại quán, lại có ngày nghỉ 01/01, chỉ còn 20h mỗi người. Giao 30 test case thủ công chỉ 2h (T84) là thấp; thực tế 5–8h kể cả sửa lỗi.
7. **Việc không gắn với FR nào:** 41/95. Phần lớn hợp lý (khảo sát, thiết kế, deploy), nhưng T48 (Socket.IO), T52 (kiểm thử realtime), T57 (mốc M3), T27, T32, T45, T47 nên gắn với FR-14/FR-07 để truy vết đầy đủ.
8. **Realtime chỉ bắt đầu tuần 6 trong khi là rủi ro cao nhất (RR-02, điểm 15).** Nên làm một bản thử Socket.IO nhỏ (gửi đơn → quầy nhận) trong tuần 4 hoặc 5, khi A còn dư 11% và 7% công suất.

**Thấp / vận hành**
9. **Trạng thái trong file đã lạc hậu.** Hôm nay 06/11, mọi việc vẫn "Chưa bắt đầu 0%"; theo công thức Dashboard sẽ hiện **4 việc trễ hạn** (T01–T04) dù repo backend và Docker đã có. Cần cập nhật trạng thái trước khi gặp GVHD.
10. **Giả định 6 giờ hiệu quả/ngày** (30h/tuần) khá lạc quan cho sinh viên vừa học vừa làm. Nếu thực tế 4h/ngày, công suất còn ~170h và kế hoạch thiếu khoảng 30%. Nên đo lại sau tuần 2.
11. Hai việc đo đạc đang xếp Should nhưng NFR yêu cầu bắt buộc: T86 (đo độ trễ realtime = NFR-01) và T42 (unit test đơn hàng = NFR-15). Nên nâng lên Must.
12. Thiếu bảng `staff_calls` và `payments` trong code (mới có ở bản thiết kế); sẽ làm tuần 7.

## 4. Đề xuất hành động (theo thứ tự)
1. Chốt MongoDB và sửa sheet `CSDL` (bỏ SERIAL/FK, vẽ ERD theo collection).
2. Sửa tham chiếu FR ở `Test case` và `Use case` (mục 4 ở trên).
3. Cập nhật trạng thái tuần 1; đổi ngày bắt đầu hoặc dời T01–T04 nếu chưa khảo sát quán.
4. Hạ ưu tiên một số việc để có đệm ≥ 40h; dời T86/T87 sau T82, hoặc tách "deploy bản thử" lên 29/12.
5. Thêm việc "thử Socket.IO" vào tuần 4–5.
6. **Bảo mật:** file `.env` trong gói đã nộp chứa tài khoản MongoDB Atlas. Đổi mật khẩu user `DoAn` trên Atlas, và không gửi `.env` qua chat/mail/git nữa.
