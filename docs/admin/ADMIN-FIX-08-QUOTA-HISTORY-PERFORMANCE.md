# Antigravity — vòng 08: Quota, history, hiệu năng

Chỉ chạy sau P0/P1 và Codex giao. Review diff hiện có trước; đã xuất hiện migration 0029 + quantityLimit/perCustomerLimit/soldCount từ tiến trình khác. KHÔNG coi ba cột và UI là quota đã hoạt động. Không overwrite hoặc deploy migration chưa nghiệm thu.

## Quota Flash Sale

- Xác định rõ total quota theo campaign item hay campaign; per-customer phải qua nhiều đơn, không chỉ per-order. Guest identity cần định nghĩa ổn định từ checkout identity đã validate; không dựa localStorage/device ID/client count. Không tự quảng cáo enforcement nếu thiếu identity.
- Reserve/capture/release cùng lifecycle checkout/order/payment/cancel/expire; tăng counter hoặc reservation bằng guarded SQL trong cùng batch tạo đơn, chống oversell và retries. Hai checkout giành suất cuối chỉ một thắng; retry Idempotency-Key không trừ hai lần; price changed/cancel/timeout rollback không rò quota. Đơn snapshot lưu campaign/item linkage để thống kê/release không phụ thuộc campaign đang bị sửa.
- soldCount chỉ server tính, input admin không sửa. Sửa campaign không delete/reinsert làm reset counter/ID hoặc phá order linkage. Giảm quota thấp hơn reserved+sold phải reject. Migrate cũ nullable=unlimited với semantics rõ, không silently áp limit mới vào đơn lịch sử.
- Phải có tests race với D1 thật trong Miniflare, cross-order customer limit, retry, rollback/cancel và archived. Chưa đạt thì UI hiển thị tính năng chưa có enforcement, hoặc không đưa control ra vận hành.

## History, undo/redo

- Builder undo/redo tối thiểu cho section operations/content, bounded history và reset baseline theo document; không lẫn published revision server với local history. Ctrl+Z không phá undo native input/textarea/contenteditable. Delete khối có Undo. Không tự undo server publish/delete page.
- Revision actor lưu từ authenticated server context ngay khi ghi revision, không timestamp heuristic hoặc client supplied actor. Migration cũ chỉ fallback 'admin/không rõ', không bịa người sửa. History paginate theo revision cursor stable, hiển thị changes/preview rõ và restore dirty confirm.
- Campaign history đọc audit theo campaign entity + paging, cảnh báo giá đang chạy và preview giá server canonical. Không lộ PII hoặc audit không thuộc role.

## Hiệu năng

- Gộp media lookup và R2 checks có concurrency bounded; validate đầy đủ trước atomic mutation. Không Promise.all 90 network calls không giới hạn.
- Resolve campaigns bằng JOIN/filter interval, không N+1 trong pricing. Giữ variant isolation và cache invalidation khi price/campaign đổi.
- ProductEditor split tab chỉ khi cần để patch/maintain; không rewrite hàng nghìn dòng khi bug fix nhỏ đủ. Dirty detection memo/reference semantics phải giữ edit trong save và normalized baseline.

ACK/report round-08-report.md: invariant, migration compatibility, tests/exit, browser evidence và phần chưa đạt. Không tự đánh ACCEPTED/deploy.
## Repro counter đã xác nhận

`node .wrangler/admin-review-20261112/campaign-counter-repro.mjs` chạy Miniflare mới/all migrations/service thật: tạo DRAFT với client `soldCount:99`, server lưu99. Assert server-owned counter FAIL. Không tin counter từ input cho item mới; giữ counter/linkage server cho item cũ. Log `campaign-counter-repro.log`.
