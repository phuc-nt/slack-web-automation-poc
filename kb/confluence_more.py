"""Second batch of the sample Confluence space; imported at the end of confluence_pages.py."""

import content as c
from confluence_pages import HOME, POLICIES, PRODUCTS, SUPPORT, TECH, blog, h, ol, p, page, panel, table, ul

HOWTO = "Hướng dẫn thao tác trên ứng dụng"
REPORTS = "Báo cáo và sự cố"
PARTNERS = "Đại lý và hội viên"
ENGLISH = "Frequently asked questions (English)"
co = c.COMPANY


def num(value):
    return f"{value:,}".replace(",", ".")


for section, intro in ((HOWTO, "Các thao tác khách hay hỏi, mỗi việc một trang."), (REPORTS, "Báo cáo định kỳ và báo cáo sau sự cố. Chỉ dùng nội bộ."),
                       (PARTNERS, f"Chính sách đại lý và chương trình hội viên {c.LOYALTY_NAME}.")):
    page(section, p(intro), labels=["section"])

# --- One page per error code ---
for code, pc, meaning, action, level in c.ERROR_CODES:
    prod = c.product(pc)
    steps = [s.strip().capitalize() for s in action.split(";")]
    page(f"Mã lỗi {code} — {meaning}",
         table(["Mục", "Thông tin"], [("Mã lỗi", code), ("Sản phẩm", prod["name"]), ("Ý nghĩa", meaning), ("Cấp xử lý", level)])
         + h("Hướng dẫn khách") + ol(steps + ["Nếu lỗi còn sau 10 phút, khởi động lại thiết bị một lần."])
         + h("Nếu vẫn không được")
         + p("Chuyển Cấp 2 kèm số sê-ri và ảnh chụp màn hình lỗi." if level == "Cấp 1" else "Tạo phiếu bảo hành BH-2026 và hẹn khách theo thời gian xử lý của chính sách bảo hành.")
         + h("Khôi phục cài đặt gốc") + p(prod["reset"])
         + panel("note", "Chỉ khôi phục cài đặt gốc khi các bước trên không có kết quả: khách sẽ phải ghép lại thiết bị."),
         parent="Bảng mã lỗi", labels=["ma-loi", code.lower(), pc.lower()])

# --- Quick start per product ---
for prod in c.PRODUCTS:
    page(f"{prod['name']} — bắt đầu nhanh",
         p(prod["pitch"]) + h("Trong hộp") + ul(prod["box"]) + h("Cài đặt") + ol(c.QUICK_START[prod["code"]]) + h("Bảo quản") + ul(c.CARE[prod["code"]])
         + panel("tip", f"Bảo hành {prod['warranty']} tháng tính từ ngày giao hàng ghi trên hoá đơn."),
         parent=PRODUCTS, labels=["san-pham", "bat-dau-nhanh", prod["code"].lower()])

keys = []
for prod in c.PRODUCTS:
    keys += [k for k, _ in prod["specs"] if k not in keys]
page("So sánh thông số các sản phẩm", table(["Thông số", *[x["name"] for x in c.PRODUCTS]], [(k, *[dict(x["specs"]).get(k, "—") for x in c.PRODUCTS]) for k in keys]),
     parent=TECH, labels=["thong-so"], attachments=["So-sanh-thong-so.xlsx"])
page("Kịch bản tự động mẫu", table(["Tên", "Khi", "Thì", "Thiết bị cần có"], c.SCENES)
     + p("Kịch bản được tạo trong ứng dụng, mục Tự động > Thêm kịch bản. Mỗi hub lưu tối đa 200 kịch bản."), parent=TECH, labels=["kich-ban", "h2"])

# --- How-to ---
for title, steps, note in c.HOWTO:
    page(title, ol(steps) + panel("info", note), parent=HOWTO, labels=["huong-dan", "ung-dung"])

# --- Centres and promotions ---
for city, address, hours, branch, services in c.CENTRES:
    ext, parking, counters, locker, extra = c.CENTRE_DETAILS[city]
    page(f"Trung tâm bảo hành {city}",
         table(["Mục", "Thông tin"], [("Địa chỉ", address), ("Giờ làm việc", hours), ("Tổng đài", f"{co['hotline']} {branch}"), ("Dịch vụ", services),
                                      ("Số quầy tiếp nhận", counters), ("Gửi xe", parking), ("Tủ nhận thiết bị", locker), ("Số nội bộ quản lý trung tâm", ext)]) + p(extra),
         parent="Trung tâm bảo hành", labels=["trung-tam"])

for name, start, end, offer, code in c.PROMOTIONS:
    page(f"Khuyến mãi {name} (mã {code})",
         table(["Mục", "Thông tin"], [("Nội dung", offer), ("Từ ngày", start), ("Đến ngày", end), ("Mã giảm giá", code)]) + h("Điều kiện") + ul(c.PROMO_TERMS[code])
         + panel("note", f"Mỗi đơn chỉ dùng một mã. Không cộng dồn với chiết khấu hạng {c.LOYALTY_NAME}."), parent="Khuyến mãi đang và sắp chạy", labels=["khuyen-mai", code.lower()])

# --- Partners and members ---
page(f"Chương trình hội viên {c.LOYALTY_NAME}",
     table(["Hạng", "Chi tiêu trong 12 tháng", "Chiết khấu", "Quyền lợi"], [(t, "Từ " + c.vnd(s) if s else "Đăng ký tài khoản", d, perk) for t, s, d, perk in c.LOYALTY])
     + h("Quy định") + ul(c.LOYALTY_RULES)
     + panel("warning", f"Đừng nhầm với gói Cloud: quyền đổi trả {c.RETURNS['member_days']} ngày thuộc gói Cloud Family và Pro, không thuộc hạng {c.LOYALTY_NAME}."),
     parent=PARTNERS, labels=["hoi-vien"], attachments=["To-roi-Moc-Lan-Club.pdf"])
page("Chính sách đại lý 2026", table(["Cấp", "Chiết khấu", "Doanh số cam kết", "Thời hạn thanh toán", "Ưu tiên"], c.DEALER_TERMS) + h("Quy định") + ul(c.DEALER_RULES),
     parent=PARTNERS, labels=["dai-ly"])
page("Danh sách đại lý", table(["Mã đại lý", "Tên đại lý", "Tỉnh thành", "Cấp"], c.DEALERS), parent=PARTNERS, labels=["dai-ly"])
page("Lịch đào tạo đại lý", table(["Ngày", "Nơi tổ chức", "Nội dung", "Số chỗ"], c.DEALER_TRAINING)
     + p("Đăng ký qua daily@moclanhome.example trước ngày đào tạo ít nhất 10 ngày. Mỗi đại lý cử tối đa 3 người."), parent=PARTNERS, labels=["dai-ly", "dao-tao"])

# --- Policies ---
page("Bảo mật dữ liệu cá nhân", ol(c.PRIVACY), parent=POLICIES, labels=["bao-mat"])
g = c.GREEN_BATTERY
page("Chương trình Pin Xanh", p(f"Thu hồi pin cũ tại cả 4 trung tâm bảo hành từ tháng {g['start']}.") + ul([g["reward"] + ".", g["limit"] + ".", "Không nhận pin phồng; pin phồng phải báo Cấp 2."]),
     parent=POLICIES, labels=["pin-xanh"])
page("Ngừng cấp linh kiện Cam C3 và Hub H1",
     p("Từ ngày 31/12/2026, Mộc Lan Home ngừng cấp linh kiện cho Cam C3 và Hub H1.")
     + ul(["Khách đang dùng được giảm 25% khi đổi sang Cam C5 hoặc Hub H2 đến hết 31/03/2027, mã LENDOI25.", "Thiết bị cũ được thu hồi miễn phí tại 4 trung tâm bảo hành.",
           "Hub H1 vẫn nhận bản vá bảo mật đến hết năm 2027."]), parent=POLICIES, labels=["ngung-ho-tro"])

# --- Internal operations ---
z = c.ZALO
page("Kênh hỗ trợ Zalo OA", table(["Mục", "Thông tin"], [("Bắt đầu", z["start"]), ("Giờ trực", z["hours"]), ("Thời gian trả lời", z["reply"]), ("Phạm vi", z["scope"])])
     + panel("warning", "Không gửi mã OTP, mật khẩu hay đường dẫn thanh toán qua Zalo. Mỗi hội thoại vẫn phải có phiếu CS-2026."), parent=SUPPORT, labels=["noi-bo", "zalo"])
page("Mẫu trả lời nhanh", table(["Mã mẫu", "Tình huống", "Nội dung"], c.MACROS) + p("Phần trong ngoặc vuông phải được thay bằng thông tin thật trước khi gửi."),
     parent=SUPPORT, labels=["noi-bo", "mau-tra-loi"])
page("Ngân hàng câu hỏi đào tạo", table(["Câu hỏi", "Đáp án"], c.QUIZ) + p("Bài thi gồm 40 câu trong 45 phút, đạt từ 32 câu đúng. Thi lại sau 3 ngày, tối đa 2 lần."),
     parent=SUPPORT, labels=["noi-bo", "dao-tao"], attachments=["Ngan-hang-cau-hoi-dao-tao.xlsx"])
page("Quy định an toàn thông tin", ol(c.INFOSEC_RULES), parent=SUPPORT, labels=["noi-bo", "an-toan-thong-tin"])
page("Thử việc, đánh giá và làm việc từ xa",
     ul(["Thử việc 2 tháng, hưởng 85% lương.", "Mỗi tuần chấm 5 cuộc gọi ngẫu nhiên, điểm đạt là 85 trên 100.", "Thưởng quý cho nhóm đạt mức hài lòng từ 94%: 1.500.000 đ mỗi người.",
         "Nhân viên qua thử việc được làm từ xa tối đa 2 ngày mỗi tuần với kênh chat và email; kênh thoại chỉ làm tại văn phòng.", "Nghỉ ốm báo trưởng nhóm trước giờ vào ca 2 giờ."]),
     parent=SUPPORT, labels=["noi-bo", "nhan-su"])
page("Trưởng ca và số nội bộ", table(["Ca", "Trưởng ca", "Số nội bộ"], [("Sáng", "Thu An", 5001), ("Chiều", "Quốc Huy", 5005), ("Chat tối", "Gia Bảo", 5009)])
     + ul(["Kỹ thuật viên trực Lock L9: số nội bộ 8009, trực 24/7.", "Nhóm An toàn thông tin: số nội bộ 7007.", "Ngày 11/11 tăng cường 4 người ca chiều."]),
     parent=SUPPORT, labels=["noi-bo", "ca-truc"], attachments=["Lich-truc-thang-11-2026.xlsx"])

MEETINGS = [
    ("38", "18/09/2026", ["Tổng đài không tạo phiếu khi E103 tự hết sau cập nhật 3.4.0 (sự cố SC-2026-017).", "Thêm câu hỏi về vùng riêng tư Cam O7 vào ngân hàng câu hỏi."],
     [("Cập nhật trang mã lỗi E103", "Nhóm Tri thức", "22/09/2026")]),
    ("39", "25/09/2026", ["Thống nhất mẫu trả lời CL-04 cho câu hỏi mất video khi hạ gói.", "Trung tâm TP.HCM thử dịch vụ sửa lấy ngay trong 90 phút."],
     [("Đào tạo mẫu CL-04 cho ca chat", "Trưởng ca chat tối", "02/10/2026")]),
    ("40", "02/10/2026", ["Chốt ngày mở kênh Zalo OA là 01/11/2026.", "Chương trình Pin Xanh bắt đầu tại cả 4 trung tâm."], [("In tờ rơi Pin Xanh", "Nhóm Truyền thông", "09/10/2026")]),
    ("42", "16/10/2026", ["Tăng cường 4 người ca chiều ngày 11/11.", "Kịch bản E201 mới có hiệu lực từ 19/10/2026.", "Bảo trì Cloud 01:00–03:30 ngày 18/10/2026: dùng mẫu SC-01 nếu khách hỏi."],
     [("Lập lịch trực 11/11", "Trưởng ca chiều", "30/10/2026"), ("Kiểm tra tồn kho Mesh M3 cho 11.11", "Kho vận", "05/11/2026")]),
]
for week, date, decisions, todo in MEETINGS:
    page(f"Biên bản họp CSKH tuần {week} năm 2026", p(f"Ngày họp: {date}. Chủ trì: trưởng bộ phận CSKH.") + h("Quyết định") + ul(decisions)
         + h("Việc cần làm") + table(["Việc", "Người phụ trách", "Hạn"], todo), parent=SUPPORT, labels=["noi-bo", "bien-ban"])

# --- Reports and incidents ---
for month, total, phone, chat, email, csat, fcr, top in c.MONTHLY:
    page(f"Báo cáo CSKH tháng {month}",
         p(f"Tổng đài nhận {num(total)} liên hệ. Lý do nhiều nhất: {top}.")
         + table(["Kênh", "Số liên hệ"], [("Điện thoại", num(phone)), ("Chat", num(chat)), ("Email", num(email))])
         + table(["Chỉ số", "Mục tiêu", "Kết quả"], [("Mức hài lòng (CSAT)", c.KPI["csat_target"], csat), ("Giải quyết ngay lần đầu", c.KPI["first_call_resolution"], fcr)]),
         parent=REPORTS, labels=["bao-cao"], attachments=[f"Bao-cao-CSKH-{month[3:]}-{month[:2]}.pdf"])
for code, date, title, duration, impact, cause, fix, comp in c.INCIDENTS:
    page(f"Sự cố {code} — {title}",
         table(["Mục", "Nội dung"], [("Ngày", date), ("Thời gian ảnh hưởng", duration), ("Phạm vi ảnh hưởng", impact), ("Nguyên nhân gốc", cause), ("Cách khắc phục", fix), ("Bồi thường", comp)])
         + panel("info", "Khi sự cố đang diễn ra, dùng mẫu trả lời SC-01 và không suy đoán nguyên nhân với khách."), parent=REPORTS, labels=["su-co"])
page("Tồn kho ngày 01/10/2026", table(["Mã", "Sản phẩm", *[w for w, _ in c.WAREHOUSES], "Tổng"], [(code, c.product(code)["name"], *map(num, qty), num(sum(qty))) for code, qty in c.STOCK.items()])
     + table(["Kho", "Địa chỉ"], c.WAREHOUSES) + p("Báo sắp hết khi một kho còn dưới 100 chiếc. Chuyển hàng giữa Kho Bắc và Kho Nam mất 2 ngày."),
     parent=REPORTS, labels=["ton-kho"], attachments=["Ton-kho-theo-kho.xlsx"])

# --- English ---
page("Warranty summary (English)",
     table(["Product", "Warranty"], [(x["name"], f"{x['warranty']} months") for x in c.PRODUCTS])
     + ul(["Repairs take 7 working days at a service centre, or 12 working days by post.", "A faulty device is replaced with a new one in the first 30 days.",
           "The warranty is void if the MLH-SEAL sticker is torn.", "An extended warranty of 12 more months costs 8% of the product price and must be bought within 30 days of purchase."]),
     parent=ENGLISH, labels=["english", "warranty"])
page("Cloud plans (English)",
     table(["Plan", "Monthly price (VND)", "Cameras"], [(n, num(pr) if pr else "Free", cams) for n, pr, _, cams, _ in c.PLANS])
     + ul(["Video history: 24 hours on Free, 7 days on Plus, 30 days on Family, 60 days on Pro.", "Yearly billing charges ten months, so two months are free.",
           "After a downgrade, video older than the new plan allows is deleted after 72 hours."]), parent=ENGLISH, labels=["english", "cloud"])
page("Shipping and payment (English)",
     ul([f"Free delivery on orders of {num(c.SHIPPING['free_from'])} VND or more; otherwise {num(c.SHIPPING['fee'])} VND.", "Delivery takes 1–2 days in the inner districts of Hanoi, Da Nang and Ho Chi Minh City, and 3–5 days elsewhere.",
         "Four-hour express delivery costs 45,000 VND in Hanoi and Ho Chi Minh City when ordered before 16:00.", "We accept cash on delivery under 10,000,000 VND, bank transfer, cards and e-wallets.",
         "Interest-free instalments over 6 or 12 months for orders from 3,000,000 VND."]), parent=ENGLISH, labels=["english", "shipping"])
page(f"{c.LOYALTY_NAME} membership (English)",
     table(["Tier", "Spend over 12 months (VND)", "Discount"], [(t, num(s), d) for t, s, d in zip(("Member", "Silver", "Gold", "Diamond"), [x[1] for x in c.LOYALTY], [x[2] for x in c.LOYALTY])])
     + ul(["One point per 10,000 VND spent; a point is worth 100 VND.", "Points expire after 12 months.", "Tier discounts cannot be combined with promotion codes."]),
     parent=ENGLISH, labels=["english", "membership"])

# --- Blog posts ---
blog("Mở kênh hỗ trợ Zalo OA từ 01/11/2026", p(f"Từ {z['start']}, khách nhắn Zalo OA của Mộc Lan Home trong khung {z['hours']}; mục tiêu trả lời trong {z['reply']}.")
     + p(f"Phạm vi: {z['scope']}."), labels=["zalo", "thong-bao"])
blog("Ứng dụng 5.2.0: chế độ Vắng nhà", p("Bản 5.2.0 phát hành ngày 05/10/2026 thêm chế độ Vắng nhà và chia sẻ nhà cho tối đa 8 thành viên.")
     + p("Khách hỏi cách bật: xem trang Bật chế độ Vắng nhà trong mục Hướng dẫn thao tác."), labels=["ung-dung"])
blog("Firmware 1.9.3 cho Lock L9: mã số dùng một lần", p("Bản 1.9.3 phát hành ngày 01/10/2026. Mã dùng một lần hết hạn sau 6 giờ nếu chưa dùng; khóa cảnh báo pin sớm hơn, khi còn 20%.")
     + p("Khóa chỉ tự cập nhật khi pin trên 30%."), labels=["firmware", "l9"])
blog("Xin lỗi về sự cố xem lại video ngày 23/08/2026", p("Từ 19:40 đến 23:00 ngày 23/08/2026, khách dùng gói trả phí không xem lại được video trên Cloud. Ghi hình không bị mất.")
     + p("Mọi gói trả phí được tặng 7 ngày sử dụng, tự cộng vào kỳ hiện tại. Mã sự cố nội bộ: SC-2026-014."), labels=["su-co", "cloud"])
blog("Sẵn sàng cho Ngày đôi 11.11", p("Chương trình chỉ chạy trong ngày 11/11/2026 với 500 bộ Mesh M3 giảm 20%, mã SALE1111, tặng 3 tháng gói Plus.")
     + p("Ca chiều được tăng cường 4 người. Kho Nam đang có 450 bộ Mesh M3, Kho Bắc 310 bộ, Kho Trung 120 bộ."), labels=["khuyen-mai"])
blog(f"Ra mắt {c.LOYALTY_NAME}", p(f"Chương trình hội viên {c.LOYALTY_NAME} áp dụng từ 01/07/2026 với bốn hạng: Thành viên, Bạc, Vàng và Kim cương.")
     + p("Tổng đài lưu ý: chiết khấu hạng không cộng dồn với mã khuyến mãi; hệ thống tự chọn mức có lợi hơn cho khách."), labels=["hoi-vien"])
blog("Đào tạo đại lý tháng 3 năm 2027: giới thiệu Cam C7", p("Hai buổi: 11/03/2027 tại Đà Nẵng (35 chỗ) và 18/03/2027 tại TP.HCM (40 chỗ).")
     + p("Đăng ký qua daily@moclanhome.example trước ít nhất 10 ngày."), labels=["dai-ly", "dao-tao"])
