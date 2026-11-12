# Antigravity — vòng 04: Kho và kiểm định

Chỉ chạy khi Codex giao. Sửa admin inventory page/API + domain functions liên quan; giữ storefront. Không deploy/remote writes. Đọc state machine inventory.service.ts, order/reservation lifecycle, migrations/triggers và audit helper.

Lỗi source xác nhận:
- UPDATE_SERIAL_STATUS chỉ whitelist đích rồi UPDATE trực tiếp, bỏ qua validateSerialStateTransition; SOLD có thể thành AVAILABLE. Không kiểm tra tồn tại/meta.changes, không CAS, không audit/ledger. Không gọi generic validator là đủ: RESERVED/ALLOCATED/SOLD do order/reservation sở hữu, không cho thao tác tay giải phóng hoặc bán serial đang gắn đơn/reservation. UI hiển thị các chuyển trạng thái vận hành hợp lệ đúng backend.
- CREATE_SERIAL cho condition/status/warranty tùy ý, variant sai owner không báo mà fallback NULL; chọn variant đầu không lọc ACTIVE. Thiếu validate product/warehouse active, enum, integer/range tại boundary. Không tạo nhận định kiểm định/public claim mặc định như đã kiểm tra 12 bước hoặc pin 97% khi chưa đo. Giữ field trống/null hoặc unpublished cho tới kiểm định thật.
- GET serial LIMIT 100, balances LIMIT 100 không metadata/phân trang; warehouse filter chỉ tác động serial, balances giới hạn trước filter client gây thiếu kết quả. Product picker LIMIT 200 cũng không tìm tiếp. Thêm paging/filter server tối thiểu và hiện tổng/kết quả bị giới hạn.
- loadInventory không abort/request generation, response query cũ có thể ghi đè filter mới; dependency newSerial.productId làm refetch toàn bộ khi chọn sản phẩm nhập kho.

Ưu tiên guard trạng thái và boundary validation trước paging. Audit + mutation atomic, CAS theo revision/updatedAt phù hợp schema; no-op/404 không báo success. Test Miniflare D1: SOLD→AVAILABLE bị chặn, serial có reservation/active order không bị giải phóng, hợp lệ QC_HOLD→AVAILABLE, wrong variant owner, non-existing ID, concurrent status attempts một thắng, auth/CSRF giữ nguyên. Không sửa dữ liệu thật. ACK/report round-04-report.md, typecheck/lint/test; chờ Codex nghiệm thu.

Repro chạy thật handler với loginAdmin + cookie, isolated Miniflare: `node .wrangler/admin-review-20261112/repro-current-price.mjs inventory`. Hiện HTTP200, before=SOLD, after=AVAILABLE, assert FAIL; log repro-inventory.log. Không có DB thật bị sửa. Tái dùng fixture logic này trong regression test chính thức thay assertions source text.
