# Hướng dẫn quản lý nội dung WOTU website

Tài liệu này dành cho người **không cần biết code** — chỉ vào trang admin, điền form, lưu là xong. Site sẽ tự rebuild và live trong 1-2 phút.

## Website giờ có 2 phần

| URL | Phần | Edit qua đâu |
|---|---|---|
| https://www.wotu.vn/ | **Shop** — bán nội thất combo + sản phẩm | Chưa CMS-ify, dev edit code directly |
| https://www.wotu.vn/studio/ | **Studio** — kiến trúc + nội thất + xây dựng | CMS này → 5 mục bên dưới |

Tài liệu này hướng dẫn edit phần **Studio** qua CMS. Phần Shop (combo / sản phẩm / reviews) hiện vẫn hardcode trong code — liên hệ team dev nếu cần đổi content.

## Vào trang quản lý

URL admin: **https://www.wotu.vn/admin/**

1. Mở URL trên trong trình duyệt (Chrome/Safari/Edge đều OK).
2. Click nút **"Login with GitHub"** → đăng nhập tài khoản GitHub được cấp quyền.
3. Lần đầu, GitHub sẽ hỏi authorize cho ứng dụng — click **Authorize**.
4. Vào dashboard, thấy 5 mục:
   - **Dự án Studio** (case study)
   - **Nhật ký Studio** (bài viết)
   - **Thông tin chung WOTU** (hotline, email, địa chỉ, social — ÁP DỤNG CHO CẢ shop + studio)
   - **Trang chủ Studio** (copy 9 section trang chủ studio)
   - **Footer & Menu Studio** (footer + nav menu)

## Các tác vụ thường gặp

### A. Thêm một dự án case study mới

1. Click **Dự án** (sidebar bên trái) → click nút **"New Dự án"** ở góc phải.
2. Điền form:
   - **Tên dự án**: VD `Nhà phố Q.Bình Tân`
   - **Mã số**: 3 chữ số (VD `015`) — không trùng với dự án cũ
   - **Địa điểm**: VD `TP.HCM · 2026`
   - **Hạng mục**: chọn từ dropdown (Nhà ở / Căn hộ / F&B / Cải tạo / …)
   - **Năm hoàn thành**: chọn năm
   - **Tông màu placeholder**: chọn `warm` nếu chưa có ảnh — nó là màu nền tạm
   - **Tỉ lệ ảnh card**: mặc định `4/5` (đẹp nhất)
   - **Thứ tự hiển thị**: số nhỏ hơn lên trên (vd dự án mới nhất `0`, cũ hơn `1, 2, 3…`)
   - **Tóm tắt**: 1 dòng mô tả ngắn (sẽ xuất hiện ở danh sách)
   - **Ảnh bìa (card)**: click upload → chọn ảnh từ máy → ảnh tự lưu vào `public/uploads/projects/`
   - **Ảnh hero trang chi tiết**: ảnh ngang 16:9 — dùng cho banner đầu trang chi tiết
   - **Mô tả ảnh (alt)**: cho SEO, vd `Mặt tiền nhà phố ốp đá ong tự nhiên`
   - **Nội dung dự án**: editor markdown — viết câu chuyện, vật liệu, ánh sáng, etc.
3. Click **Save** ở góc trên phải → click **Publish**.
4. Đợi 1-2 phút. Mở https://www.wotu.vn/studio/projects → thấy dự án mới hiện ra.

### B. Thêm một bài Nhật ký (blog)

1. Click **Nhật ký** → **"New Nhật ký"**.
2. Điền: tiêu đề, ngày xuất bản, tóm tắt, ảnh bìa, nội dung markdown.
3. Save → Publish → đợi 1-2 phút → kiểm tra https://www.wotu.vn/studio/blog.

### C. Sửa copy trang chủ (Hero, Triết lý, Dịch vụ, Quy trình, About, Quote, Form)

1. Click **Trang chủ** → **Nội dung trang chủ**.
2. Tìm section cần sửa (Hero / Triết lý / Dịch vụ / …):
   - **Hero**: tiêu đề lớn "Một khoảng lặng…", nút CTA, intro ngay đầu trang.
   - **Triết lý**: tiêu đề + 2 đoạn văn.
   - **Dịch vụ**: 3 dịch vụ (Thiết kế / Xây dựng / Thi công). Mỗi dịch vụ có tên, phụ đề italic, mô tả, list tags.
   - **Quy trình**: 5 bước (Lắng nghe → Định hình → Bản vẽ → Thi công → Trao chìa khoá). Sửa tên/mô tả từng bước.
   - **Studio (about)**: tiêu đề + đoạn văn + 4 số liệu (042 dự án, 07 tỉnh, 12 năm, 100% bảo hành).
   - **Lời khách**: trích dẫn + tác giả + năm.
   - **Form liên hệ**: tiêu đề lớn, các ô input, thông báo gửi thành công.
3. Sửa xong → Save → Publish.

**Mẹo HTML:** trong các ô tiêu đề có thể dùng:
- `<em>chữ nghiêng</em>` → chữ nghiêng màu nâu nhạt (vd "khoảng" trong "Một **khoảng** lặng")
- `<em class="accent">chữ nghiêng accent</em>` → chữ nghiêng màu cam đất (dùng tiết kiệm, chỉ ở 1-2 chỗ điểm nhấn)
- `<br/>` → xuống dòng

### D. Sửa địa chỉ / hotline / email / mạng xã hội

1. Click **Thông tin chung WOTU** → **Hotline · email · địa chỉ · social**.
2. Sửa:
   - Tagline studio, mô tả SEO, slogan tiếng Anh
   - Địa chỉ: đường + thành phố + URL Google Maps
   - Hotline + email
   - 2 link Facebook (chính + xưởng) + Google Maps URL
3. Save → Publish. Các thay đổi này sẽ xuất hiện ở **mọi nơi** trên site (Nav, footer shop + studio, contact section, JSON-LD SEO).

### E. Sửa menu (top nav) hoặc footer

1. Click **Footer & Menu** → **Footer & Menu trên cùng**.
2. Có 4 phần:
   - **Tagline footer**: dòng giới thiệu studio dưới logo footer.
   - **Copyright + Signature**: 2 dòng cuối footer.
   - **3 cột footer**: mỗi cột có tiêu đề + list link. Có thể thêm/bớt link tự do.
   - **Menu trên cùng**: 6 link menu top nav. Mỗi link có nhãn + (anchor *hoặc* route — không dùng cả 2):
     - Anchor là cuộn xuống section trên trang chủ (vd `services` → `#services`).
     - Route là chuyển sang trang khác (vd `/blog` → trang Nhật ký).

### F. Đổi ảnh dự án cũ

1. Click **Dự án** → click vào dự án cần sửa.
2. Cuộn xuống ô ảnh → click ảnh cũ → chọn **Replace** hoặc upload ảnh mới.
3. Save → Publish.

## Quy trình rollback (huỷ bỏ thay đổi vừa publish)

Nếu lỡ publish nhầm, không có nút "undo" trong CMS. Cách rollback:

1. Vào **GitHub repo** (URL sẽ được cấp khi setup) → tab **Commits**.
2. Tìm commit lỗi (commit message thường là tên entry vừa edit).
3. Click vào commit → click nút **"Revert"** → Confirm.
4. Đợi 1-2 phút, site về trạng thái trước commit lỗi.

## Giới hạn cần biết

| Item | Rule |
|---|---|
| Ảnh upload | < 5 MB / file để giữ repo gọn. Lý tưởng 1-2 MB. JPG hoặc WebP. Có thể nén qua [tinypng.com](https://tinypng.com) trước khi upload. |
| Số lượng ảnh trong 1 dự án | Hiện tại schema chỉ có 2 ảnh (cover + detail hero). Nếu cần gallery nhiều ảnh, báo dev mở rộng schema. |
| Markdown body | Dùng được headings (`## Tiêu đề`), bold (`**chữ đậm**`), italic (`*chữ nghiêng*`), list (`- item`), link (`[text](url)`). Không dùng được embed iframe / video tự ý vì có CSP. |
| Multi-user | Hiện chỉ user GitHub có quyền push lên repo mới edit được. Muốn thêm người, vào GitHub repo → Settings → Collaborators → Add. |
| Preview trước publish | CMS hiện tại save = publish luôn. Nếu cần "draft → review" workflow, báo dev bật `publish_mode: editorial_workflow`. |

## Khi gặp lỗi

| Triệu chứng | Cách xử lý |
|---|---|
| Login GitHub thất bại | Thử trình duyệt khác (clear cookie GitHub) hoặc xác nhận đã được add vào repo collaborator. |
| Save xong nhưng site không update sau 5 phút | Vào dashboard deploy platform (Cloudflare Pages / Netlify / Vercel) xem build log có lỗi gì. Nếu build fail → revert commit cuối qua GitHub. |
| Ảnh upload nhưng không hiện trên site | Chờ build xong (1-2 phút). Nếu vẫn không hiện, check tên file (không có dấu / khoảng trắng — Sveltia tự xử lý nhưng ảnh tên cũ thì cần đổi tên). |
| Lỡ xoá nhầm dự án / bài blog | Vào GitHub commits → revert commit "Delete entry" → entry quay lại. |
| Form contact / cart không gửi email | Form đã wire Web3Forms (250 submit/m free) → email `hello@wotu.vn`. Check access key trong `site.yml`. Nếu quá quota tháng, đổi sang plan paid hoặc đổi access key mới. |

## Backup

Tất cả nội dung site lưu trong git repo trên GitHub → đó là backup tự động. GitHub có lịch sử commit không giới hạn. Nếu muốn backup ngoài (Google Drive), bật GitHub Action backup hằng tuần — báo dev set up.
