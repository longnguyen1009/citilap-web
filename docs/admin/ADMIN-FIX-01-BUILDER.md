# Antigravity — vòng 01: Builder

Bạn là thợ sửa; Codex nghiệm thu. Thực hiện ngay, không chỉ lập kế hoạch. Đọc AGENTS.md, docs/admin/ADMIN-REVIEW-20261112.md và Next.js docs liên quan. Không deploy/push/remote writes/reset/stash/clean. Giữ nguyên hai file UI untracked có sẵn. Không sửa storefront.

Phạm vi: SiteBuilderEditor.tsx, builder/page.tsx, preview route/service nếu cần, mediaRequest helper nếu cần để expose status. Chưa làm autosave, undo/redo hoặc đổi giao diện lớn.

Lỗi đã xác nhận cần sửa:
1. loadPageData deps [pageId, selectedSectionId] gây fetch lại và mất nháp khi chọn khối. Chỉ load theo pageId; functional selected-section setter giữ ID còn hợp lệ sau reload, fallback ID đầu/null. Bảo vệ response cũ khi đổi pageId/unmount. Chọn khối không fetch lại.
2. Restore đang confirm chung; nếu dirty ghi rõ sẽ mất thay đổi chưa lưu, cancel giữ nguyên. Chặn save/restore đua nhau.
3. Dùng currentJson memo một lần; bỏ beforeunload trùng vì useDraftAutosave đã xử lý.
4. Ctrl/Cmd+S prevent browser save, gọi save draft hiện tại; không gọi khi loading/saving/lock, không stale closure.
5. 409 nhận diện HTTP status thay so chuỗi. mediaRequest expose status mà không phá consumer khác. Banner có Giữ bản đang sửa (không ghi đè server), Tải bản mới (confirm nếu dirty). Không force overwrite hay tự cập nhật revision rồi gửi lại nháp cũ.
6. Preview API lỗi phải hiện lỗi trong modal, không render raw sections/fallback. JSON malformed/schema validation trả 400 với danh sách lỗi; giữ auth/CSRF và 500 cho lỗi thực sự nội bộ. Đọc media-http trước sửa.
7. builder/page.tsx clamp totalPages tối thiểu 1. Delete confirm nêu tên, URL, trạng thái và hậu quả với published page.

Thêm regression check runnable cho logic mất dữ liệu/validation theo harness hiện có; browser desktop nếu runtime sẵn. Chạy typecheck và ESLint phạm vi sửa, test liên quan. Không gán PASS cho browser chưa chạy. Ghi ACK trước sửa và report `.wrangler/admin-review-20261112/round-01-report.md` (file sửa, lệnh/exit, kết quả/giới hạn), kết thúc `ROUND 01 NEEDS_REVIEW`. Sau đó dừng để Codex review.
