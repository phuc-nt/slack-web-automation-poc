"""The sample Confluence space: pages and blog posts in Confluence storage format (XHTML).

PAGES and BLOGS are lists of dicts: title, body, parent (title of the parent page or None),
labels, attachments (file names from the attachment directory).
"""

import html

import content as c

HOME = "Trung tâm kiến thức Mộc Lan Home"
PRODUCTS = "Sản phẩm"
POLICIES = "Chính sách"
SUPPORT = "Vận hành tổng đài"
TECH = "Kỹ thuật"


def esc(text):
    return html.escape(str(text))


def p(text):
    return f"<p>{esc(text)}</p>"


def h(text, level=2):
    return f"<h{level}>{esc(text)}</h{level}>"


def ul(items):
    return "<ul>" + "".join(f"<li>{esc(i)}</li>" for i in items) + "</ul>"


def ol(items):
    return "<ol>" + "".join(f"<li>{esc(i)}</li>" for i in items) + "</ol>"


def table(header, rows):
    head = "".join(f"<th>{esc(v)}</th>" for v in header)
    body = "".join("<tr>" + "".join(f"<td>{esc(v)}</td>" for v in row) + "</tr>" for row in rows)
    return f"<table><tbody><tr>{head}</tr>{body}</tbody></table>"


def panel(kind, text):
    """kind: info | note | warning | tip"""
    return (f'<ac:structured-macro ac:name="{kind}"><ac:rich-text-body><p>{esc(text)}</p>'
            "</ac:rich-text-body></ac:structured-macro>")


PAGES = []
BLOGS = []


def page(title, body, parent=HOME, labels=(), attachments=()):
    PAGES.append({"title": title, "body": body, "parent": parent, "labels": list(labels), "attachments": list(attachments)})


def blog(title, body, labels=()):
    BLOGS.append({"title": title, "body": body, "labels": list(labels)})


co = c.COMPANY

page(HOME, p(f"Không gian này là nguồn tham khảo chính của đội Chăm sóc khách hàng {co['name']}.")
     + h("Kênh liên hệ")
     + table(["Kênh", "Chi tiết"], [("Tổng đài", f"{co['hotline']} — {co['hotline_hours']}"),
                                     ("Email", f"{co['email']} — trả lời trong {co['email_reply']}"),
                                     ("Chat", co["chat_hours"]), ("Website", co["website"]), ("Ứng dụng", co["app"])])
     + h("Cách dùng không gian này")
     + ul(["Mục Sản phẩm: mỗi sản phẩm một trang câu hỏi thường gặp.", "Mục Chính sách: bảo hành, đổi trả, giao hàng, gói Cloud.",
           "Mục Kỹ thuật: mã lỗi, đèn báo, firmware.", "Mục Vận hành tổng đài: quy trình nội bộ, không chia sẻ cho khách."])
     + panel("info", "Trang được rà soát vào thứ Sáu đầu tiên của mỗi tháng. Người phụ trách nội dung: nhóm Tri thức, kênh #cskh-tri-thuc."),
     parent=None, labels=["home"])

for section, intro in ((PRODUCTS, "Câu hỏi thường gặp theo từng sản phẩm."), (POLICIES, "Chính sách áp dụng cho khách hàng."),
                       (TECH, "Tài liệu kỹ thuật cho Cấp 1 và Cấp 2."), (SUPPORT, "Quy trình nội bộ của tổng đài.")):
    page(section, p(intro), labels=["section"])

# --- One FAQ page per product ---
EXTRA_FAQ = {
    "H2": [("Hub H2 có cần Internet không?", "Không bắt buộc. Kịch bản đã lưu vẫn chạy khi mất Internet; chỉ điều khiển từ xa và thông báo đẩy là tạm dừng."),
           ("Một nhà dùng được mấy hub?", "Tối đa 3 Hub H2 trong một nhà; các hub chia sẻ kịch bản qua tính năng Nhà nhiều hub từ firmware 3.4.0.")],
    "C5": [("Cam C5 lưu video ở đâu?", "Thẻ nhớ microSD tối đa 256 GB hoặc gói Cloud. Không có thẻ và không có gói thì chỉ xem trực tiếp."),
           ("Có xoay được không?", "Có, xoay ngang 355° và dọc 90°, điều khiển trong ứng dụng.")],
    "O7": [("Cam O7 chịu mưa được không?", "Được, sản phẩm đạt chuẩn chống nước ghi trong bảng thông số. Không ngâm nước và không xịt vòi áp lực trực tiếp."),
           ("Lắp cao bao nhiêu là hợp lý?", "Từ 2,5 đến 3 m, nghiêng xuống khoảng 15°, để nhận diện khuôn mặt ở khoảng cách 4–6 m.")],
    "L9": [("Hết pin thì mở cửa thế nào?", "Cắm sạc dự phòng vào cổng USB-C mặt ngoài để cấp nguồn tạm, hoặc dùng chìa cơ đi kèm."),
           ("Nhập sai mã nhiều lần thì sao?", "Sai 5 lần liên tiếp, khóa tạm ngừng nhận mã trong 3 phút và gửi thông báo về ứng dụng của chủ nhà.")],
    "M3": [("Một bộ Mesh M3 phủ được bao nhiêu?", "Bộ 3 thiết bị phủ nhà đến khoảng 420 m² hoặc 3 tầng, tuỳ vật liệu tường."),
           ("Có dùng chung với router nhà mạng không?", "Có. Cắm thiết bị chính vào cổng LAN của modem nhà mạng và tắt Wi-Fi của modem để tránh nhiễu.")],
    "P1": [("Plug P1 chịu tải bao nhiêu?", "Xem dòng tải tối đa trong bảng thông số; không dùng cho bình nóng lạnh trực tiếp và bếp từ."),
           ("Có đo điện năng không?", "Có, ứng dụng hiển thị điện năng theo giờ, ngày và tháng; dữ liệu lưu 12 tháng.")],
    "S4": [("Sensor S4 gắn ở đâu?", "Cửa ra vào, cửa sổ hoặc ngăn kéo. Hai nửa cảm biến cách nhau không quá 15 mm khi cửa đóng."),
           ("Pin dùng được bao lâu?", "Khoảng 24 tháng với pin CR2450; ứng dụng báo trước khi pin còn dưới 10%.")],
    "D6": [("Bell D6 có cần đi dây không?", "Không. Sản phẩm dùng pin sạc 6.500 mAh, mỗi lần sạc dùng khoảng 4 tháng."),
           ("Chuông trong nhà kêu thế nào?", "Qua loa chuông đi kèm cắm ổ điện, hoặc qua điện thoại và loa thông minh đã liên kết.")],
}
for prod in c.PRODUCTS:
    errors = [(code, meaning, action, level) for code, pc, meaning, action, level in c.ERROR_CODES if pc == prod["code"]]
    faq = "".join(h(q, 3) + p(a) for q, a in EXTRA_FAQ[prod["code"]])
    page(f"{prod['name']} — câu hỏi thường gặp",
         p(f"{prod['kind']}. {prod['pitch']}")
         + table(["Mục", "Thông tin"], [("Giá niêm yết", c.vnd(prod["price"])), ("Bảo hành", f"{prod['warranty']} tháng"), ("Mã sản phẩm", prod["code"])])
         + h("Câu hỏi thường gặp") + faq
         + h("Làm sao khôi phục cài đặt gốc?", 3) + p(prod["reset"])
         + h("Thông số") + table(["Thông số", "Giá trị"], prod["specs"])
         + h("Mã lỗi") + table(["Mã", "Ý nghĩa", "Cách xử lý", "Cấp xử lý"], errors),
         parent=PRODUCTS, labels=["san-pham", prod["code"].lower()])

page("Phụ kiện và giá", table(["Mã", "Tên", "Giá", "Bảo hành (tháng)"], [(a, b, c.vnd(pr), w) for a, b, pr, w in c.ACCESSORIES])
     + panel("note", "Phụ kiện không áp dụng đổi trả sau khi đã bóc vỉ, trừ lỗi kỹ thuật."), parent=PRODUCTS, labels=["phu-kien", "gia"])

# --- Policies ---
w, r, s = c.WARRANTY, c.RETURNS, c.SHIPPING
page("Bảo hành — tóm tắt cho tổng đài viên",
     table(["Sản phẩm", "Thời hạn bảo hành"], [(x["name"], f"{x['warranty']} tháng") for x in c.PRODUCTS])
     + h("Thời gian xử lý") + p(w["process_days"]) + h("Đổi mới") + p(w["one_for_one"]) + h("Thiết bị cho mượn") + p(w["loaner"])
     + h("Không bảo hành khi") + ul(w["exclusions"]) + h("Bảo hành mở rộng") + p(w["extended"])
     + h("Phí ngoài bảo hành")
     + ul([f"Thay pin Lock L9: {c.vnd(w['battery_swap_l9'])}", f"Phí kiểm tra thiết bị hết bảo hành: {c.vnd(w['out_of_warranty_check'])} (miễn nếu khách đồng ý sửa)"])
     + panel("tip", "Luôn hỏi số sê-ri trước. Số sê-ri bắt đầu bằng MLH, gồm 12 ký tự, in dưới đáy thiết bị và trong ứng dụng ở mục Thiết bị > Thông tin."),
     parent=POLICIES, labels=["bao-hanh"])

page("Đổi trả và hoàn tiền",
     p(f"Thời hạn đổi trả: {r['days']} ngày kể từ ngày nhận hàng. Hội viên gói Family và Pro: {r['member_days']} ngày.")
     + p(f"Hoàn tiền: {r['refund']}.") + h("Điều kiện") + ul(r["conditions"]) + h("Không áp dụng") + ul(r["exclusions"]) + h("Phí") + p(r["fee"])
     + h("Các bước cho khách") + ol(["Mở ứng dụng, vào Đơn hàng > Yêu cầu đổi trả, hoặc gọi tổng đài.", "Nhận mã đổi trả dạng DT-2026-xxxxxx qua SMS.",
                                      "Đóng gói và giao cho đơn vị vận chuyển trong 3 ngày kể từ khi có mã.", "Kho kiểm tra trong 2 ngày làm việc rồi hoàn tiền hoặc gửi hàng mới."]),
     parent=POLICIES, labels=["doi-tra"])

page("Giao hàng và thanh toán",
     p(f"Miễn phí giao hàng cho đơn từ {c.vnd(s['free_from'])}. Đơn nhỏ hơn: {c.vnd(s['fee'])}.")
     + table(["Khu vực", "Thời gian"], s["times"]) + p(s["express"]) + p("Đơn vị vận chuyển: " + ", ".join(s["carriers"]) + ".")
     + h("Phương thức thanh toán") + ul(c.PAYMENTS)
     + panel("warning", "Mộc Lan Home không bao giờ yêu cầu khách đọc mã OTP hoặc chuyển khoản vào tài khoản cá nhân. Tài khoản nhận tiền luôn đứng tên công ty."),
     parent=POLICIES, labels=["giao-hang", "thanh-toan"])

page("Gói Cloud — so sánh",
     table(["Gói", "Giá mỗi tháng", "Lưu lịch sử video", "Số camera", "Thời gian phản hồi hỗ trợ"],
           [(n, c.vnd(pr) if pr else "Miễn phí", hist, cams, sup) for n, pr, hist, cams, sup in c.PLANS])
     + p(c.PLAN_YEARLY_NOTE)
     + h("Câu hỏi thường gặp")
     + h("Hạ gói thì video cũ có mất không?", 3) + p("Video vượt quá thời hạn lưu của gói mới bị xoá sau 72 giờ kể từ lúc hạ gói. Hãy nhắc khách tải về trước.")
     + h("Huỷ gói giữa kỳ có được hoàn tiền không?", 3) + p("Gói tháng không hoàn. Gói năm hoàn theo số tháng trọn còn lại, trừ đi 2 tháng đã được tặng.")
     + h("Chia sẻ camera cho người nhà?", 3) + p("Mỗi nhà mời được tối đa 8 thành viên; thành viên được xem trực tiếp, quyền xem lại do chủ nhà bật."),
     parent=POLICIES, labels=["cloud", "gia"])

page("Khuyến mãi đang và sắp chạy",
     table(["Chương trình", "Từ ngày", "Đến ngày", "Nội dung", "Mã"], c.PROMOTIONS)
     + panel("note", "Mỗi đơn chỉ dùng một mã. Mã không áp dụng cho phụ kiện và phí lắp đặt, và không cộng dồn với giá hội viên."),
     parent=POLICIES, labels=["khuyen-mai"])

page("Trung tâm bảo hành", table(["Thành phố", "Địa chỉ", "Giờ làm việc", "Nhánh tổng đài", "Dịch vụ"], c.CENTRES)
     + p("Khách nên đặt lịch trước qua ứng dụng (Hỗ trợ > Đặt lịch trung tâm) để không phải chờ. Khách không hẹn vẫn được nhận, thời gian chờ trung bình 25 phút."),
     parent=POLICIES, labels=["trung-tam"])

page("Phí lắp đặt", table(["Sản phẩm", "Hạng mục", *c.INSTALL_ZONES],
                           [(c.product(pc)["name"], item, *[c.vnd(v) if v else "Miễn phí" for v in fees]) for pc, item, *fees in c.INSTALL_FEES])
     + p("Lịch lắp đặt: 8:00–20:00 hằng ngày. Kỹ thuật viên gọi xác nhận trước 30 phút. Đổi lịch miễn phí nếu báo trước 4 giờ."),
     parent=POLICIES, labels=["lap-dat", "gia"])

# --- Technical ---
page("Bảng mã lỗi", p("Toàn bộ mã lỗi hiển thị trong ứng dụng. Chữ số đầu sau chữ E cho biết dòng sản phẩm.")
     + table(["Mã", "Sản phẩm", "Ý nghĩa", "Cách xử lý", "Cấp xử lý"],
             [(code, c.product(pc)["name"], meaning, action, level) for code, pc, meaning, action, level in c.ERROR_CODES]),
     parent=TECH, labels=["ma-loi"], attachments=["Ma-loi-va-den-bao.xlsx"])

page("Ý nghĩa đèn báo", table(["Trạng thái đèn", "Ý nghĩa"], c.LED_STATES)
     + panel("info", "Đèn tắt hẳn dù đã cắm điện quá 2 phút: thử bộ nguồn khác trước khi tạo phiếu bảo hành."), parent=TECH, labels=["den-bao"])

page("Lịch sử firmware", "".join(h(f"{c.product(pc)['name']} — bản {ver} ({date})", 3) + ul(changes) for ver, pc, date, changes in c.FIRMWARE)
     + p("Thiết bị tự cập nhật trong khung 2:00–4:00 khi đang cắm điện và có Wi-Fi. Lock L9 chỉ cập nhật khi pin trên 30%."),
     parent=TECH, labels=["firmware"])

page("Bảng tương thích", table(["Sản phẩm", *c.COMPATIBILITY["columns"]], [(c.product(code)["name"], *row) for code, row in c.COMPATIBILITY["rows"].items()]),
     parent=TECH, labels=["tuong-thich"])

page("Quy trình ghép thiết bị với Hub H2",
     ol(["Cập nhật ứng dụng lên bản mới nhất và đăng nhập bằng tài khoản chủ nhà.", "Đặt thiết bị cách hub không quá 3 m trong lúc ghép.",
         "Trong ứng dụng chọn Thêm thiết bị, quét mã QR dưới đáy thiết bị.", "Giữ nút ghép trên thiết bị 5 giây đến khi đèn xanh lá nháy chậm.",
         "Chờ tối đa 90 giây. Nếu thất bại, khôi phục cài đặt gốc thiết bị rồi thử lại."])
     + panel("warning", "Không ghép quá 5 thiết bị cùng lúc: hub xử lý tuần tự và sẽ báo E104 nếu hàng chờ đầy."),
     parent=TECH, labels=["ghep-noi", "h2"])

# --- Internal operations ---
k = c.KPI
page("Cấp hỗ trợ và chuyển tiếp", table(["Cấp", "Ai", "Phạm vi", "Thời hạn phản hồi"], c.SUPPORT_LEVELS)
     + h("Chỉ số cam kết")
     + ul([f"Mức hài lòng mục tiêu: {k['csat_target']}", f"Giải quyết ngay cuộc gọi đầu: {k['first_call_resolution']}", f"Nhấc máy: {k['answer_within']}",
           f"Giữ máy tối đa: {k['max_hold']}", f"Gọi lại: {k['callback']}"])
     + h("Khi nào chuyển cấp") + ul(["Đã làm hết kịch bản Cấp 1 mà lỗi còn.", "Khách báo thiết bị nóng, khét hoặc pin phồng: chuyển Cấp 2 ngay, đánh dấu An toàn.",
                                      "Khách yêu cầu gặp quản lý lần thứ hai trong cùng cuộc gọi."]),
     parent=SUPPORT, labels=["noi-bo", "chuyen-cap"])

page("Sổ tay tổng đài viên mới",
     h("Tuần đầu tiên") + ol(["Ngày 1: nhận tài khoản, học sản phẩm với bộ thiết bị mẫu ở phòng Hoa Mộc.", "Ngày 2–3: nghe 20 cuộc gọi mẫu cùng người kèm.",
                               "Ngày 4: trả lời chat có giám sát.", "Ngày 5: bài kiểm tra 40 câu, đạt từ 32 câu trở lên mới nhận cuộc gọi thật."])
     + h("Công cụ") + ul(["Phần mềm tổng đài: đăng nhập bằng tài khoản công ty, số nội bộ 4 chữ số.", "Hệ thống phiếu: mỗi liên hệ một phiếu, mã dạng CS-2026-xxxxxx.",
                          "Không gian kiến thức này và trợ lý tra cứu trên Slack."])
     + h("Quy tắc vàng") + ul(["Xưng tên và chào theo mẫu trong 5 giây đầu.", "Không hứa thời hạn ngoài chính sách.", "Ghi phiếu trong vòng 3 phút sau khi kết thúc liên hệ."])
     + panel("tip", "Người kèm trong 30 ngày đầu được trợ cấp 500.000 đ cho mỗi nhân viên mới qua thử việc."),
     parent=SUPPORT, labels=["noi-bo", "onboarding"])

page("Ca trực và nghỉ phép",
     table(["Ca", "Giờ", "Phụ cấp"], [("Sáng", "8:00–15:00", "Không"), ("Chiều", "14:00–21:00", "Không"), ("Chat tối", "15:00–22:00", "40.000 đ mỗi ca"),
                                       ("Lễ, Tết", "Theo lịch riêng", "300% lương ngày")])
     + p("Đổi ca phải báo trưởng nhóm trước 48 giờ qua biểu mẫu Đổi ca. Mỗi người được đổi tối đa 3 ca mỗi tháng.")
     + p("Nghỉ phép năm: 14 ngày, đăng ký trước 7 ngày; tháng 1 và tháng 2 hạn chế nghỉ vì cao điểm Tết."),
     parent=SUPPORT, labels=["noi-bo", "ca-truc"])

page("Xử lý cuộc gọi khó",
     h("Khách nóng giận") + ol(["Để khách nói hết, không ngắt lời trong 60 giây đầu.", "Nhắc lại vấn đề bằng lời của mình.", "Đưa ra một việc cụ thể sẽ làm và thời hạn.",
                                 "Nếu khách xúc phạm lần thứ ba sau khi đã nhắc, được phép kết thúc cuộc gọi theo mẫu KT-03."])
     + h("Khách doạ đăng mạng xã hội") + p("Không tranh luận. Tạo phiếu ưu tiên Cao, gắn nhãn truyen-thong và báo nhóm Truyền thông qua kênh #cskh-khan trong 15 phút.")
     + h("Nghi ngờ lừa đảo") + p("Nếu người gọi xin đổi số điện thoại của tài khoản mà không trả lời được 2 trong 3 câu xác minh, từ chối và ghi chú AN-NINH trên phiếu."),
     parent=SUPPORT, labels=["noi-bo"])

page("Biên bản họp CSKH tuần 41 năm 2026",
     p("Ngày họp: 09/10/2026. Chủ trì: trưởng bộ phận CSKH.")
     + h("Quyết định") + ul(["Từ 01/11/2026 mở thêm kênh hỗ trợ qua Zalo OA, giờ trực 8:00–21:00.", "Kịch bản E201 bổ sung bước kiểm tra băng tần 2,4 GHz trước khi khôi phục cài đặt gốc.",
                              "Thử nghiệm trợ lý tra cứu trên Slack cho 12 tổng đài viên ca sáng trong 4 tuần."])
     + h("Việc cần làm") + table(["Việc", "Người phụ trách", "Hạn"], [("Soạn kịch bản Zalo OA", "Nhóm Tri thức", "24/10/2026"), ("Cập nhật kịch bản E201", "Cấp 2 camera", "16/10/2026"),
                                                                    ("Báo cáo kết quả thử nghiệm trợ lý", "Trưởng ca sáng", "13/11/2026")]),
     parent=SUPPORT, labels=["noi-bo", "bien-ban"], attachments=["Bao-cao-CSKH-Q3-2026.pdf"])

page("Thuật ngữ", table(["Thuật ngữ", "Giải thích"],
                        [("CSAT", "Mức hài lòng của khách sau liên hệ, thang 1–5, tính tỷ lệ chấm 4 và 5."), ("FCR", "Tỷ lệ giải quyết ngay trong liên hệ đầu tiên."),
                         ("RMA", "Phiếu nhận hàng bảo hành, mã dạng BH-2026-xxxxxx."), ("Tem MLH-SEAL", "Tem niêm phong trên vỏ máy; rách tem là mất bảo hành."),
                         ("Backhaul", "Đường nối giữa các thiết bị Mesh M3, không dây hoặc có dây."), ("Matter", "Chuẩn kết nối nhà thông minh dùng chung giữa các hãng.")]),
     labels=["thuat-ngu"])

page("Frequently asked questions (English)",
     p("For customers and partners who prefer English.")
     + h("How do I contact support?", 3) + p(f"Call {co['hotline']} ({co['hotline_hours']}) or email {co['email']}; we reply within 24 hours. English-speaking agents are available 9:00–18:00 on weekdays.")
     + h("What is the return window?", 3) + p(f"{r['days']} days from delivery, or {r['member_days']} days for Family and Pro members. Refunds take 5–7 working days after the warehouse receives the item.")
     + h("Do you ship abroad?", 3) + p("Not yet. We deliver within Vietnam only; international warranty is not offered.")
     + h("Which voice assistants are supported?", 3) + p("See the compatibility table in the Technical section. Hub H2 is required for Zigbee devices such as Sensor S4.")
     + h("Is my video encrypted?", 3) + p("Yes. Video is encrypted in transit and at rest. Only the home owner and invited members can view it; support agents cannot open customer video."),
     labels=["faq", "english"])

# --- Blog posts ---
blog("Firmware 3.4.0 cho Hub H2 đã phát hành",
     p("Bản 3.4.0 phát hành ngày 15/09/2026, hỗ trợ Matter 1.3 và nâng giới hạn kịch bản lên 200.")
     + p("Tổng đài lưu ý: trong 48 giờ sau cập nhật, một số hub hiện E103 một lần rồi tự hết; không cần tạo phiếu nếu khách không gặp lại."), labels=["firmware", "h2"])
blog("Chuẩn bị cao điểm Tết 2027",
     p("Cao điểm dự kiến từ 15/01/2027 đến 05/02/2027. Lượng cuộc gọi năm ngoái tăng 60% so với ngày thường.")
     + ul(["Tạm dừng nghỉ phép từ 20/01 đến 02/02.", "Trung tâm bảo hành nghỉ từ 28 tháng Chạp đến hết mùng 4 Tết; tổng đài vẫn trực 8:00–21:00.",
           "Đơn bảo hành nhận sau 20/01 được hẹn trả sau Tết."]), labels=["tet", "thong-bao"])
blog("Chương trình Pin Xanh thu hồi pin cũ",
     p("Từ tháng 10/2026, cả 4 trung tâm bảo hành nhận pin cũ miễn phí. Mỗi 10 viên pin, khách nhận mã giảm 20.000 đ cho phụ kiện.")
     + p("Tổng đài viên có thể giới thiệu chương trình khi khách hỏi về thay pin Lock L9 hoặc Sensor S4."), labels=["pin-xanh", "thong-bao"])

import confluence_more  # noqa: E402,F401  second batch of pages and blog posts
