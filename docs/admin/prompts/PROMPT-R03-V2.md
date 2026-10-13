# Prompt Antigravity — cập nhật phạm vi V2 và tiếp tục R03

Bạn đang triển khai CitiLap CMS Admin và phần kết nối StoreFront. Chủ dự án vừa cập nhật yêu cầu; hãy dùng `docs/admin/ADMIN-CMS-MASTER-PLAN-V2.md` làm phạm vi hiện hành và tiếp tục R03 đang làm. Không khởi động lại dự án hoặc chạy toàn bộ roadmap cùng lúc.

## 1. Đọc và bảo toàn công việc hiện có

Đọc AGENTS.md, guide Next.js cài trong dự án, DESIGN.md, master plan V2, writer/data matrices R00, báo cáo R01/R02 và diff R03 hiện tại.

Kiểm tra HEAD/branch/status. Working tree đã có ProductEditor, API admin products, preview và các writer đang sửa; chưa được coi các phần đó đã hoàn thành chỉ vì tồn tại file. Không ghi đè, reset, stash, clean hoặc sửa worktree khác.

Antigravity được giao cả Admin và StoreFront cần thiết cho chức năng. Ownership lịch sử Codex/Admin không ngăn việc này, nhưng phải bảo toàn thay đổi của tác vụ/agent khác. Giữ process 3001, .dev.vars, DB dev và dữ liệu thật.

Lập bảng delta trước khi triển khai:
Yêu cầu V2 | Code hiện có | Đã kiểm chứng ở đâu | Phần thiếu R03 | Phase sau.

Cập nhật roadmap/backlog theo V2, không chỉnh mất bằng chứng lịch sử. Chỉ làm R03 trong lượt này.

## 2. Phạm vi R03 mới

Bắt buộc trong R03:
- Một catalog list và một editor chuẩn.
- Server pagination/filter/search/sort đầy đủ, không giới hạn 100 ẩn.
- Hợp nhất writer, legacy adoption an toàn.
- Laptop: ảnh/biến thể/spec/mô tả/SEO/condition/nhãn.
- Availability còn hàng/hết hàng/liên hệ, bảo toàn dữ liệu PREORDER cũ.
- Lịch sử và nút khôi phục tạo nháp mới.
- Thương hiệu: logo/mô tả/SEO, quản lý thật và trang thương hiệu cơ bản đọc cùng nguồn.
- Public integration cần cho catalog/brand/preview và regression checkout.

Chưa làm builder, Hot Sale, coupon, tin tức, Order workflow mới hoặc cổng thanh toán. Chưa xây sync inventory khi chưa có nguồn. Chuẩn bị contract nhất quán cho các phase sau nhưng không tạo hệ thống giả.

## 3. Routes, menu và danh sách

Ưu tiên `/admin/products`, `/admin/products/new`, `/admin/products/[id]`; route Studio cũ chuyển tới đúng editor/bản ghi. Cập nhật dashboard/menu/deep links, không để hai editor ghi song song.

Sidebar dùng “Sản phẩm”; Laptop/Phụ kiện là bộ lọc/góc nhìn dữ liệu thật. Không gọi “kho”, không dùng badge Studio như một nghiệp vụ riêng.

Danh sách có filter publication, loại, category, brand; search tên/model/SKU; sort, pagination và count dùng cùng điều kiện. URL giữ filter/page khi quay lại. Query bind tham số, sort allowlist, tie-breaker ổn định, không lặp rows do JOIN variant. Giá hiển thị định nghĩa rõ là public/draft hoặc khoảng giá, không đánh lừa người sửa.

Fixture >100 sản phẩm, kiểm tra bản ghi trang cuối và tìm theo SKU biến thể. Không coi tải 100 mục rồi lọc client là hoàn thành.

## 4. Tách ba trục trạng thái

- Publication: nháp, đang hiển thị, lưu trữ. Không suy ra còn hàng từ ACTIVE.
- Condition: mới/Like New/các giá trị legacy còn dùng.
- Availability: còn/hết/liên hệ; CTA và order guard cùng contract.
- Nhãn marketing: hàng mới về/bán chạy, nhập tay theo yêu cầu. Không giả tự tính doanh số.

Đối chiếu enum hiện có trước khi đổi. PREORDER không được tự chuyển thành AVAILABLE hoặc xóa khỏi dữ liệu; ghi adapter/mapping và khả năng còn dùng. Nếu không đủ căn cứ chốt mapping mới, giữ semantics cũ có nhãn rõ.

Manual availability là chức năng thật của R03. Chỉ ghi thiết kế extension SYNC vào tài liệu nếu chưa có source; không tạo nút sync không làm gì. Không thêm stock quantity, serial hoặc ERP.

## 5. Một nguồn ghi và chuyển legacy

Rà writer: CRUD, bulk, import, images, variants, restore, publish/unpublish, scheduler, scripts. Mỗi writer chuyển vào service authoring chuẩn, hoặc adapter cùng service. Chỉ trả lỗi ngừng hỗ trợ khi đã chuyển consumer; không khóa API trước khiến UI cũ hỏng.

GET editor không ghi DB. Lần lưu nháp đầu của legacy ACTIVE phải giữ nội dung public cũ. Không tạo Studio draft khiến guard hiểu rằng sản phẩm đã bị ẩn. Thiết kế adoption atomic, giữ public snapshot hoặc đường tương thích có semantics rõ; không publish thay đổi chưa duyệt, không bỏ qua validation để tạo snapshot sai.

Giữ ID/SKU/Brand/Category/media/specs và OrderItem snapshot; bảo toàn trường cũ editor chưa hỗ trợ. Test round-trip các trường đó. Writer cũ không được cập nhật Product public vượt draft/publication.

Restore phiên bản legacy hoặc Studio đều đi qua service chuẩn: validate → tạo revision nháp mới → preview → publish có chủ ý. Không ghi đè public/erase history.

Nếu migration cần thiết, dry-run trên DB test, đếm trước/sau, check FK và báo bản ghi không phân loại được. Không migrate remote hoặc DB dev đang sử dụng.

## 6. Editor Laptop và lịch sử

Dùng UI R02; bố cục theo nhóm Thông tin / Thông số / Cấu hình & giá / Media / Nội dung / SEO. Toolbar lưu nháp, preview, publish/cập nhật, ẩn/lưu trữ theo hành vi thật. Các lỗi mạng/401/403/validation/409 giữ bản sửa.

Mapping specs hiển thị và filter typed phải dùng cùng nguồn. Không bắt nhập CPU/RAM/SSD hai lần; giá trị không parse được phải báo và giữ dữ liệu gốc. Không ép laptop fields vào phụ kiện cũ.

Biến thể giữ ID/SKU, giá/bảo hành/availability, ảnh theo cấu hình, SKU uniqueness. Không xóa tham chiếu đơn cũ. Media dùng picker hiện có, giữ usage từng revision, ALT và thứ tự.

Mô tả có editor dễ dùng; kiểm tra công cụ đã có trước khi thêm dependency. Nếu đổi HTML representation phải test round-trip, server sanitize, không làm mất bảng/ảnh/nội dung cũ hợp lệ.

Lịch sử có danh sách thời điểm/hành động/người nếu xác định được, xem phiên bản và nút “Khôi phục thành bản nháp”. expectedRevision bắt buộc. Restore giữ bản public đang chạy cho đến publish. Không giả actor nếu auth hiện tại chưa có danh tính riêng.

## 7. Thương hiệu

Kiểm kê Brand hiện có và trường Product.brand/brandId. Chọn Brand là nguồn chuẩn; chuyển dữ liệu bằng mapping rõ, không fuzzy-merge tên tự động và không tạo trùng brand khi lưu sản phẩm.

Admin brand: tên, slug, logo từ Media, mô tả, SEO, ẩn/hiện. Chặn xóa dữ liệu còn tham chiếu hoặc dùng lưu trữ phù hợp. Draft/public phải có semantics rõ: nếu dùng lưu trực tiếp, ghi rõ hành vi và bảo vệ revision.

StoreFront brand route sử dụng URL hiện có nếu có; nếu cần route mới, chốt trong tài liệu. Trang brand hiển thị logo/mô tả và catalog public, phân trang/filter cơ bản; metadata cùng nguồn. Không tạo dataset/config thương hiệu thứ hai.

## 8. Preview, public consumers và contract các phase sau

Preview ưu tiên renderer PDP thật, có session/token giới hạn, noindex/no-store; không biến draft thành public để xem trước. Không gọi modal liệt kê field là preview giao diện thật.

Kiểm chứng card/category/search/PDP/brand/variant/cart/order guard cho phần đã sửa. Legacy ACTIVE hoạt động; CMS ẩn không fallback; draft edits không thay public. Public URL ID và slug phải lookup đúng loại, có test collision A.slug = B.id.

R04 sẽ hoàn thiện filter/compare/related; R05 policy pages; R07B Hot Sale; R07C shipping/payment checkout. R03 giữ contract extensible nhưng không tự triển khai các phase đó.

Khởi tạo `docs/admin/CONTENT-SOURCE-REGISTRY.md`: vị trí StoreFront → nguồn CMS → DTO/service → consumer → cache → trạng thái và phase. Chỉ điền đã xác minh, không cho tất cả thành “done”. Field chưa kết nối không được báo đã đồng bộ.

## 9. Gate kiểm thử

D1/R2 test riêng; không seed vào DB đang dùng. Fixture: 125 sản phẩm, legacy ACTIVE/inactive, CMS draft/published/hidden, published đang sửa nháp, laptop nhiều variant, phụ kiện, brand legacy, SKU collision, media revision cũ, đơn snapshot.

Service/API tests:
- Auth/CSRF/validation/409.
- Search/page/filter/count/stable sort.
- Legacy adoption lưu nháp không đổi public.
- Publish projection/spec filter/variant đúng.
- Restore thành nháp; public và order snapshot không đổi.
- Media usage không mất.
- Bulk/import/restore không publish ngầm.
- Brand mapping không nhân bản hoặc mất liên kết.
- Hidden không public/orderable.

Browser thật, tận dụng Chrome/Edge đã dùng ở R02; app/harness cô lập không đụng port 3001:
- List → lọc → bản ghi ngoài 100 → edit → back giữ query.
- Tạo laptop/legacy adoption → draft/reload/preview/publish.
- History → restore → preview → publish.
- Brand logo/mô tả → trang brand thật.
- Chọn variant/ảnh → PDP/cart đúng.
- Conflict/mất mạng giữ form.
- 1440/768/390, zoom, keyboard, drawer/breadcrumb.

Phân biệt Next app thật và component mock. Chạy CMS contracts, Product Studio, publication/order guard và regression liên quan; lint/typecheck/Cloudflare build. Không gọi subset test là toàn codebase.

## 10. Bàn giao và điểm dừng

Tạo/cập nhật `R03-UNIFIED-CATALOG.md`, writer matrix, V2 backlog và content registry. Báo scope đã có/thiếu theo mã CAT-01..05, kết quả PASS x/y từng tầng, file/migration, browser screenshots, data preservation và rollback. Sửa DESIGN.md đúng phạm vi Admin, không redesign StoreFront ngoài yêu cầu.

Chỉ đóng R03 khi đủ catalog/editor/adoption/history/brand và gate tương ứng. Nếu chia R03A/R03B, ghi rõ phần còn lại; không tự chuyển sang R04.

Không tự commit, merge, deploy hoặc áp remote migration. Hoàn thành công việc R03 có thể kiểm chứng rồi dừng, gửi báo cáo tiếng Việt và đề xuất prompt R04.
