"""Writes the sample slide decks as deck JSON for the my-presenter pptx tool (`mpg`).

Usage: python3 kb/build_decks.py <deck directory>
Then export each one:  <my-presenter>/bin/mpg export <deck>.json --out <target>.pptx
(kb/build.sh does both.)
"""

import json
import math
import sys
from pathlib import Path

import content as c

OUT = Path(sys.argv[1] if len(sys.argv) > 1 else "artifacts/kb/_decks")
LEFT, WIDTH = 72, 1136


def text(value, x, y, width, size=22, weight=400, fill="$text", family="$body", lines=1, align="left"):
    height = math.ceil(size + (lines - 1) * size * 1.3) + 6
    return {"type": "text", "x": x, "y": y, "width": width, "height": height, "text": str(value),
            "style": {"fontSize": size, "fontFamily": family, "fontWeight": weight, "lineHeight": 1.3, "textAlign": align, "fill": fill}}


def rect(x, y, width, height, fill="$surface", radius=12):
    return {"type": "shape", "x": x, "y": y, "width": width, "height": height, "style": {"shape": "rect", "fill": fill, "borderRadius": radius}}


def slide(name, nodes, notes=""):
    return {"name": name, "background": "$background", "notes": notes, "nodes": nodes}


def head(eyebrow, title):
    return [text(eyebrow.upper(), LEFT, 56, WIDTH, size=16, weight=700, fill="$accent"),
            text(title, LEFT, 106, WIDTH, size=40, weight=700, family="$heading")]


def cover(title, subtitle, footer):
    return slide("Bìa", [rect(LEFT, 250, 96, 8, fill="$accent", radius=4),
                         text(title, LEFT, 280, WIDTH, size=56, weight=700, family="$heading"),
                         text(subtitle, LEFT, 372, WIDTH, size=26, fill="$muted"),
                         text(footer, LEFT, 620, WIDTH, size=18, fill="$muted")], notes=f"{title}. {subtitle}.")


def bullets(eyebrow, title, items, notes=""):
    nodes = head(eyebrow, title)
    for i, item in enumerate(items[:5]):
        y = 210 + i * 90
        nodes += [rect(LEFT, y, 52, 52, fill="$accent", radius=26),
                  text(i + 1, LEFT, y + 11, 52, size=22, weight=700, fill="$background", align="center"),
                  text(item, LEFT + 76, y + 11, WIDTH - 76, size=24)]
    return slide(title, nodes, notes or " ".join(items))


def grid(eyebrow, title, header, rows, widths, notes=""):
    """A table: at most 8 rows, column widths in pixels summing to 1136 or less."""
    nodes = head(eyebrow, title)
    xs = [LEFT + sum(widths[:i]) for i in range(len(widths))]
    nodes.append(rect(LEFT - 12, 196, WIDTH + 24, 44, fill="$surface", radius=8))
    for x, width, label in zip(xs, widths, header):
        nodes.append(text(label, x, 206, width - 16, size=18, weight=700, fill="$accent"))
    for r, row in enumerate(rows[:8]):
        for x, width, value in zip(xs, widths, row):
            nodes.append(text(value, x, 258 + r * 48, width - 16, size=19))
    spoken = ". ".join(", ".join(str(v) for v in row) for row in rows[:8])
    return slide(title, nodes, notes or spoken)


def columns(eyebrow, title, cards, notes=""):
    """Three cards: (heading, [up to four short lines])."""
    nodes = head(eyebrow, title)
    for i, (heading, lines) in enumerate(cards[:3]):
        x = LEFT + i * 387
        nodes += [rect(x, 210, 362, 380), text(heading, x + 24, 236, 314, size=26, weight=700, family="$heading")]
        for j, line in enumerate(lines[:4]):
            nodes.append(text(line, x + 24, 300 + j * 66, 314, size=19, fill="$muted", lines=2))
    return slide(title, nodes, notes or ". ".join(f"{h}: {'; '.join(ls)}" for h, ls in cards))


def deck(file_name, title, theme, pages):
    for i, page in enumerate(pages, 1):
        page["id"] = f"p{i:02d}"
        page["name"] = f"{i:02d} {page['name']}"
    target = OUT / f"{file_name}.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(
        {"name": title, "width": 1280, "height": 720, "theme": theme, "transition": "fade", "pages": pages}, ensure_ascii=False, indent=1), encoding="utf-8")


co, w = c.COMPANY, c.WARRANTY
contact = f"Tổng đài {co['hotline']}  ·  {co['email']}  ·  {co['website']}"


def product_overview():
    deck("san-pham/Tong-quan-san-pham-2026", "Tổng quan sản phẩm 2026", "ink", [
        cover("Tổng quan sản phẩm 2026", "Tám sản phẩm nhà thông minh của Mộc Lan Home", "Tài liệu cho đại lý và đội bán hàng"),
        grid("Danh mục", "Tám sản phẩm, một ứng dụng", ["Sản phẩm", "Loại", "Giá niêm yết", "Bảo hành"],
             [(p["name"], p["kind"], c.vnd(p["price"]), f"{p['warranty']} tháng") for p in c.PRODUCTS], [260, 430, 240, 200]),
        columns("Điểm bán hàng", "Ba lý do khách chọn Mộc Lan Home",
                [("Chạy cả khi mất mạng", ["Hub H2 lưu kịch bản tại chỗ", "Pin dự phòng 4 giờ", "Tối đa 120 thiết bị"]),
                 ("Một ứng dụng", ["Camera, khóa, cảm biến chung một nơi", "Mời tối đa 8 thành viên", "Hỗ trợ chuẩn Matter 1.3"]),
                 ("Hậu mãi gần", ["4 trung tâm bảo hành", "Đổi mới trong 30 ngày đầu", "Tổng đài 8:00–21:00 mỗi ngày"])]),
        grid("Gói Cloud", "Bốn gói lưu trữ video", ["Gói", "Giá mỗi tháng", "Lưu lịch sử", "Số camera", "Phản hồi hỗ trợ"],
             [(n, c.vnd(pr) if pr else "Miễn phí", hist, cams, sup) for n, pr, hist, cams, sup in c.PLANS], [200, 240, 240, 200, 250],
             notes=c.PLAN_YEARLY_NOTE),
        bullets("Lộ trình", "Sắp ra mắt", ["Quý 1 năm 2027: ML Cam C7, camera trong nhà độ phân giải 4K",
                                           "Quý 2 năm 2027: ML Curtain R2, động cơ rèm dùng chuẩn Matter",
                                           "Quý 3 năm 2027: Hub H2 hỗ trợ Thread qua bản cập nhật 4.0",
                                           "Mục tiêu 2027: 60 đại lý Cấp 1 và doanh số 180 tỷ đồng"]),
        bullets("Chính sách đại lý", "Chiết khấu theo cấp", ["Đại lý Cấp 1: chiết khấu 22%, cam kết 300 triệu đồng mỗi quý",
                                                            "Đại lý Cấp 2: chiết khấu 15%, cam kết 100 triệu đồng mỗi quý",
                                                            "Thưởng trưng bày: 3 triệu đồng mỗi quý cho kệ đủ 8 sản phẩm",
                                                            "Đổi hàng trưng bày lỗi trong 7 ngày làm việc"]),
        cover("Liên hệ", contact, "Phòng Kinh doanh đại lý: daily@moclanhome.example"),
    ])


def support_onboarding():
    k = c.KPI
    deck("noi-bo/Dao-tao-tong-dai-vien-moi", "Đào tạo tổng đài viên mới", "paper", [
        cover("Đào tạo tổng đài viên mới", "Tuần đầu tiên tại bộ phận Chăm sóc khách hàng", "Tài liệu nội bộ, bản tháng 10 năm 2026"),
        bullets("Kênh hỗ trợ", "Khách liên hệ qua đâu", [f"Tổng đài {co['hotline']}: {co['hotline_hours']}", f"Email {co['email']}: trả lời trong {co['email_reply']}",
                                                         f"Chat: {co['chat_hours']}", "Trung tâm bảo hành tại 4 thành phố"]),
        grid("Chỉ số", "Năm con số cần nhớ", ["Chỉ số", "Cam kết"],
             [("Mức hài lòng (CSAT)", k["csat_target"]), ("Giải quyết ngay cuộc gọi đầu", k["first_call_resolution"]), ("Nhấc máy", k["answer_within"]),
              ("Giữ máy tối đa", k["max_hold"]), ("Gọi lại", k["callback"])], [520, 600]),
        grid("Chuyển cấp", "Ba cấp hỗ trợ", ["Cấp", "Ai", "Phạm vi", "Phản hồi"], [(a, b, d[:44], e) for a, b, d, e in c.SUPPORT_LEVELS], [120, 300, 500, 200]),
        bullets("Tuần đầu", "Lịch học 5 ngày", ["Ngày 1: nhận tài khoản, học sản phẩm với bộ thiết bị mẫu", "Ngày 2 và 3: nghe 20 cuộc gọi mẫu cùng người kèm",
                                                "Ngày 4: trả lời chat có giám sát", "Ngày 5: kiểm tra 40 câu, đạt từ 32 câu mới nhận cuộc gọi thật"]),
        columns("Quy tắc", "Ba quy tắc vàng", [("Chào đúng mẫu", ["Xưng tên trong 5 giây đầu", "Hỏi số sê-ri trước khi chẩn đoán"]),
                                               ("Hứa đúng chính sách", ["Không hứa thời hạn ngoài quy định", "Chưa chắc thì hẹn gọi lại trong 2 giờ"]),
                                               ("Ghi phiếu ngay", ["Trong 3 phút sau liên hệ", "Mỗi liên hệ một phiếu CS-2026"])]),
        bullets("An toàn", "Chuyển Cấp 2 ngay khi", ["Thiết bị nóng bất thường, có mùi khét hoặc pin phồng", "Khóa L9 không mở được và có người kẹt bên trong",
                                                     "Khách báo người lạ truy cập camera của mình", "Người gọi không qua được 2 trong 3 câu xác minh"]),
    ])


def cloud_plans():
    deck("chinh-sach/So-sanh-goi-Cloud", "So sánh gói Cloud", "slate", [
        cover("So sánh gói Cloud", "Free, Plus, Family và Pro", "Áp dụng từ 01/01/2026"),
        grid("Bảng giá", "Bốn gói, trả theo tháng hoặc năm", ["Gói", "Giá mỗi tháng", "Lưu lịch sử", "Số camera", "Phản hồi hỗ trợ"],
             [(n, c.vnd(pr) if pr else "Miễn phí", hist, cams, sup) for n, pr, hist, cams, sup in c.PLANS], [200, 240, 240, 200, 250]),
        bullets("Trả theo năm", "Trả năm lợi hơn", [c.PLAN_YEARLY_NOTE, "Gói năm hoàn tiền theo số tháng trọn còn lại, trừ 2 tháng tặng",
                                                   "Gói tháng không hoàn tiền khi huỷ giữa kỳ", "Nâng gói có hiệu lực ngay, tính tiền theo ngày còn lại"]),
        columns("Chọn gói", "Gói nào cho ai", [("Plus", ["Căn hộ 1–2 camera", "Xem lại 7 ngày"]), ("Family", ["Nhà nhiều tầng", "Đổi trả 30 ngày cho hội viên"]),
                                               ("Pro", ["Cửa hàng, văn phòng nhỏ", "Mượn thiết bị khi bảo hành L9 và M3"])]),
        bullets("Giới hạn", "Điều khoản cần nói rõ với khách", ["Dung lượng dùng hợp lý: 60 GB mỗi camera mỗi tháng", "Hạ gói: video quá hạn của gói mới bị xoá sau 72 giờ",
                                                             "Mỗi nhà mời tối đa 8 thành viên", "Nhân viên hỗ trợ không xem được video của khách"]),
    ])


def warranty_process():
    deck("chinh-sach/Quy-trinh-bao-hanh", "Quy trình bảo hành", "carbon", [
        cover("Quy trình bảo hành", "Từ lúc khách báo lỗi đến lúc nhận lại thiết bị", "Dành cho tổng đài và trung tâm bảo hành"),
        bullets("Các bước", "Năm bước xử lý", ["Tổng đài chẩn đoán theo mã lỗi và tạo phiếu BH-2026", "Khách mang đến trung tâm hoặc gửi bưu điện, miễn phí chiều gửi",
                                               "Trung tâm kiểm tra tem MLH-SEAL và số sê-ri trong 1 ngày làm việc", "Sửa hoặc đổi thiết bị, cập nhật trạng thái trong ứng dụng",
                                               "Trả thiết bị, bảo hành phần đã sửa thêm 90 ngày"]),
        grid("Thời hạn", "Bảo hành theo sản phẩm", ["Sản phẩm", "Thời hạn"], [(p["name"], f"{p['warranty']} tháng") for p in c.PRODUCTS], [560, 560]),
        bullets("Cam kết", "Thời gian xử lý", ["Tại trung tâm: 7 ngày làm việc", "Gửi qua bưu điện: 12 ngày làm việc", "Đổi mới trong 30 ngày đầu nếu lỗi phần cứng",
                                               "Khách gói Pro được mượn thiết bị cho Lock L9 và Mesh M3"]),
        bullets("Từ chối", "Năm trường hợp không bảo hành", [x[:86] for x in w["exclusions"]]),
        grid("Chi phí", "Phí ngoài bảo hành", ["Hạng mục", "Phí"],
             [("Kiểm tra thiết bị hết bảo hành", c.vnd(w["out_of_warranty_check"])), ("Thay pin Lock L9", c.vnd(w["battery_swap_l9"])),
              ("Bảo hành mở rộng 12 tháng", "8% giá sản phẩm"), ("Gửi trả sau sửa chữa", "Miễn phí")], [640, 480]),
        grid("Địa điểm", "Bốn trung tâm bảo hành", ["Thành phố", "Địa chỉ", "Giờ làm việc"], [(a, b, d) for a, b, d, *_ in c.CENTRES], [200, 520, 400]),
    ])


def loyalty_deck():
    deck("chinh-sach/Hoi-vien-Moc-Lan-Club", f"Hội viên {c.LOYALTY_NAME}", "paper", [
        cover(f"Hội viên {c.LOYALTY_NAME}", "Bốn hạng, tính theo chi tiêu 12 tháng", "Áp dụng từ 01/07/2026"),
        grid("Hạng", "Bốn hạng hội viên", ["Hạng", "Chi tiêu 12 tháng", "Chiết khấu"],
             [(t, "Từ " + c.vnd(sp) if sp else "Đăng ký tài khoản", d) for t, sp, d, _ in c.LOYALTY], [360, 420, 340]),
        columns("Quyền lợi", "Mỗi hạng thêm một quyền lợi", [("Bạc", ["Miễn phí giao hàng", "Chiết khấu 3%"]), ("Vàng", ["Một lần lắp đặt miễn phí mỗi năm", "Ưu tiên khi gọi tổng đài"]),
                                                            ("Kim cương", ["Tặng bảo hành mở rộng 12 tháng", "Kỹ thuật viên đến nhà trong 24 giờ"])]),
        bullets("Điểm thưởng", "Tích và đổi điểm", ["Tích 1 điểm cho mỗi 10.000 đ đã mua", "Mỗi điểm đổi được 100 đ, tối đa 30% giá trị đơn",
                                                   "Điểm hết hạn sau 12 tháng", "Sinh nhật: tặng 200 điểm, dùng trong 30 ngày"]),
        bullets("Lưu ý", "Điều tổng đài cần nói rõ", ["Chiết khấu hạng không cộng dồn với mã khuyến mãi", "Phí lắp đặt và gói Cloud không được tính điểm",
                                                     "Hạng được xét lại vào ngày 1 tháng 1 hằng năm", "Đổi trả 30 ngày thuộc gói Cloud, không thuộc hạng hội viên"]),
    ])


def quarter_review():
    deck("bao-cao/Tong-ket-CSKH-Q3-2026", "Tổng kết CSKH quý 3 năm 2026", "ink", [
        cover("Tổng kết CSKH quý 3 năm 2026", "48.210 liên hệ, mức hài lòng 93,1%", "Tài liệu nội bộ"),
        grid("Theo tháng", "Ba tháng tăng đều", ["Tháng", "Liên hệ", "Điện thoại", "Chat", "Email", "CSAT"],
             [(m, f"{t:,}".replace(",", "."), f"{ph:,}".replace(",", "."), f"{ch:,}".replace(",", "."), f"{em:,}".replace(",", "."), cs) for m, t, ph, ch, em, cs, _, _ in c.MONTHLY],
             [200, 190, 200, 180, 180, 170]),
        grid("Sự cố", "Ba sự cố trong quý", ["Mã", "Ngày", "Sự cố"], [(code, date, title) for code, date, title, *_ in c.INCIDENTS], [220, 220, 680]),
        bullets("Bài học", "Ba việc đã sửa", ["Thêm cảnh báo khi hàng đợi thông báo vượt 10.000 tin", "Cảnh báo dung lượng lưu trữ từ mức 80%",
                                             "Tổng đài không tạo phiếu khi E103 tự hết sau cập nhật"]),
        bullets("Quý 4", "Kế hoạch quý 4", ["Mở kênh Zalo OA từ 01/11/2026, trực 8:00–21:00", "Tuyển thêm 6 tổng đài viên ca tối trước Tết",
                                           "Bảo hành qua bưu điện: từ 12 xuống 10 ngày làm việc", "Trợ lý ảo tự xử lý 30% hội thoại về mã lỗi"]),
    ])


def dealer_deck():
    deck("dich-vu/Chinh-sach-dai-ly-2026", "Chính sách đại lý 2026", "slate", [
        cover("Chính sách đại lý 2026", "Chiết khấu, cam kết và hỗ trợ", "Phòng Kinh doanh đại lý"),
        grid("Điều khoản", "Hai cấp đại lý", ["Cấp", "Chiết khấu", "Cam kết mỗi quý", "Thanh toán"], [(a, b, d.replace(" mỗi quý", ""), e) for a, b, d, e, _ in c.DEALER_TERMS],
             [220, 260, 360, 280]),
        bullets("Quy định", "Bốn quy định chính", ["Thưởng trưng bày 3 triệu đồng mỗi quý cho kệ đủ 8 sản phẩm", "Không bán thấp hơn 95% giá niêm yết",
                                                  "Hàng trưng bày lỗi được đổi trong 7 ngày làm việc", "Không đạt cam kết hai quý liên tiếp thì bị xét hạ cấp"]),
        grid("Đào tạo", "Lịch đào tạo đại lý", ["Ngày", "Nơi tổ chức", "Nội dung"], [(a, b, d) for a, b, d, _ in c.DEALER_TRAINING], [200, 200, 720]),
        grid("Mạng lưới", "Mười đại lý hiện có", ["Mã", "Tên đại lý", "Tỉnh thành", "Cấp"], c.DEALERS[:8], [160, 460, 300, 200], notes="Xem đủ 10 đại lý trong bảng tính."),
    ])


def security_deck():
    deck("noi-bo/An-toan-thong-tin-cho-tong-dai", "An toàn thông tin cho tổng đài", "carbon", [
        cover("An toàn thông tin cho tổng đài", "Bảy quy định bắt buộc", "Tài liệu nội bộ, đọc trong tuần đầu"),
        bullets("Máy và mật khẩu", "Giữ máy và tài khoản", ["Khoá màn hình khi rời bàn; máy tự khoá sau 5 phút", "Mật khẩu ít nhất 14 ký tự, đổi mỗi 180 ngày",
                                                          "Bắt buộc xác thực hai lớp", "Không chép dữ liệu khách hàng ra USB hay email cá nhân"]),
        bullets("Xác minh", "Xác minh khách: 2 trong 3 câu", ["Số điện thoại đăng ký", "4 số cuối sê-ri thiết bị", "Ngày mua gần nhất",
                                                             "Không đủ 2 câu: từ chối theo mẫu AN-01"]),
        bullets("Sự cố", "Khi nghi có sự cố an ninh", ["Báo nhóm An toàn thông tin trong 30 phút, số nội bộ 7007", "Không tự điều tra, không xoá dấu vết",
                                                     "Ghi chú AN-NINH trên phiếu hỗ trợ"]),
        bullets("Lưu trữ", "Dữ liệu được giữ bao lâu", ["Ghi âm cuộc gọi: 180 ngày", "Nhật ký thiết bị: 90 ngày", "Hoá đơn: 10 năm", "Tài khoản bị xoá theo yêu cầu: trong 30 ngày"]),
    ])


if __name__ == "__main__":
    for build in (product_overview, support_onboarding, cloud_plans, warranty_process, loyalty_deck, quarter_review, dealer_deck, security_deck):
        build()
    print(f"{len(list(OUT.rglob('*.json')))} deck sources in {OUT}")
