"""Writes the HTML sources of the PDF sample documents and a manifest for kb/render-pdf.js.

Usage: python3 kb/build_pdf_html.py <work directory> <sharepoint directory> <confluence attachment directory>
"""

import html
import json
import sys
from pathlib import Path

import content as c

WORK = Path(sys.argv[1] if len(sys.argv) > 1 else "artifacts/kb/_html")
SHAREPOINT = Path(sys.argv[2] if len(sys.argv) > 2 else "artifacts/kb/sharepoint")
ATTACHMENTS = Path(sys.argv[3] if len(sys.argv) > 3 else "artifacts/kb/confluence-attachments")

STYLE = """
body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; color: #1b1b1b; line-height: 1.45; }
h1 { font-size: 22pt; color: #1f4e79; margin: 0 0 4pt; }
h2 { font-size: 14pt; color: #1f4e79; border-bottom: 1px solid #c8d3df; padding-bottom: 2pt; margin-top: 18pt; }
.sub { color: #5a6570; margin-bottom: 14pt; }
table { border-collapse: collapse; width: 100%; margin: 8pt 0; }
th, td { border: 1px solid #c8d3df; padding: 5pt 7pt; text-align: left; vertical-align: top; }
th { background: #eaf0f6; }
.note { background: #fff6dd; border-left: 4px solid #e0a800; padding: 8pt 10pt; margin: 10pt 0; }
.price { font-size: 18pt; font-weight: bold; color: #b03a2e; }
"""

manifest = []


def esc(text):
    return html.escape(str(text))


def ul(items):
    return "<ul>" + "".join(f"<li>{esc(i)}</li>" for i in items) + "</ul>"


def ol(items):
    return "<ol>" + "".join(f"<li>{esc(i)}</li>" for i in items) + "</ol>"


def tbl(header, rows):
    head = "".join(f"<th>{esc(h)}</th>" for h in header)
    body = "".join("<tr>" + "".join(f"<td>{esc(v)}</td>" for v in row) + "</tr>" for row in rows)
    return f"<table><tr>{head}</tr>{body}</table>"


def page(name, target, title, subtitle, body, lang="vi"):
    WORK.mkdir(parents=True, exist_ok=True)
    source = WORK / f"{name}.html"
    source.write_text(
        f'<!doctype html><html lang="{lang}"><head><meta charset="utf-8"><title>{esc(title)}</title><style>{STYLE}</style></head>'
        f'<body><h1>{esc(title)}</h1><div class="sub">{esc(subtitle)}</div>{body}</body></html>', encoding="utf-8")
    manifest.append({"html": str(source), "pdf": str(target)})


def datasheets():
    for p in c.PRODUCTS:
        errors = [(code, meaning, action) for code, pc, meaning, action, _ in c.ERROR_CODES if pc == p["code"]]
        fees = [(item, *[c.vnd(v) if v else "Miễn phí" for v in (a, b, z)]) for pc, item, a, b, z in c.INSTALL_FEES if pc == p["code"]]
        compat = list(zip(c.COMPATIBILITY["columns"], c.COMPATIBILITY["rows"][p["code"]]))
        body = (f"<p>{esc(p['pitch'])}</p><p class='price'>{c.vnd(p['price'])}</p>"
                f"<p>Bảo hành chính hãng {p['warranty']} tháng. Mã sản phẩm: {p['code']}.</p>"
                "<h2>Thông số kỹ thuật</h2>" + tbl(["Thông số", "Giá trị"], p["specs"])
                + "<h2>Trong hộp có gì</h2>" + ul(p["box"])
                + "<h2>Tương thích</h2>" + tbl(["Tiêu chí", "Hỗ trợ"], compat)
                + (("<h2>Phí lắp đặt</h2>" + tbl(["Hạng mục", *c.INSTALL_ZONES], fees)) if fees else "")
                + "<h2>Mã lỗi thường gặp</h2>" + tbl(["Mã", "Ý nghĩa", "Cách xử lý"], errors)
                + f"<h2>Khôi phục cài đặt gốc</h2><p>{esc(p['reset'])}</p>"
                + f"<div class='note'>Hỗ trợ: {c.COMPANY['hotline']} ({c.COMPANY['hotline_hours']}).</div>")
        slug = p["name"].replace(" ", "-")
        page(f"datasheet-{p['code']}", SHAREPOINT / "san-pham" / f"Thong-so-{slug}.pdf",
             f"{p['name']} — {p['kind']}", "Tờ thông số sản phẩm, bản 2026", body)


def terms():
    s, r = c.SHIPPING, c.RETURNS
    body = ("<h2>1. Đặt hàng và thanh toán</h2>" + ul(c.PAYMENTS)
            + "<h2>2. Giao hàng</h2>"
            + f"<p>Miễn phí giao hàng cho đơn từ {c.vnd(s['free_from'])}; đơn nhỏ hơn tính phí {c.vnd(s['fee'])}.</p>"
            + tbl(["Khu vực", "Thời gian giao"], s["times"]) + f"<p>{esc(s['express'])}</p>"
            + f"<p>Đơn vị vận chuyển: {esc(', '.join(s['carriers']))}.</p>"
            + "<h2>3. Đổi trả</h2>"
            + f"<p>Đổi trả trong {r['days']} ngày kể từ ngày nhận hàng; hội viên gói Family và Pro được {r['member_days']} ngày. "
              f"Hoàn tiền trong {esc(r['refund'])}.</p>"
            + "<p>Điều kiện:</p>" + ul(r["conditions"]) + "<p>Không áp dụng cho:</p>" + ul(r["exclusions"])
            + f"<p>{esc(r['fee'])}</p>"
            + "<h2>4. Kiểm hàng khi nhận</h2>"
              "<p>Khách được mở hộp kiểm tra ngoại quan trước khi thanh toán, nhưng không cắm điện thử. "
              "Nếu hộp móp méo hoặc tem MLH-SEAL rách, hãy từ chối nhận và chụp ảnh gửi bộ phận hỗ trợ trong 24 giờ.</p>"
            + "<h2>5. Giải quyết tranh chấp</h2>"
              "<p>Hai bên ưu tiên thương lượng trong 30 ngày. Sau thời hạn này, tranh chấp được giải quyết theo pháp luật Việt Nam.</p>")
    page("terms", SHAREPOINT / "chinh-sach" / "Dieu-khoan-va-dieu-kien-mua-hang.pdf",
         "Điều khoản và điều kiện mua hàng", f"{c.COMPANY['name']} — hiệu lực từ 01/01/2026", body)


def mesh_troubleshooting():
    p = c.product("M3")
    errors = [(code, meaning, action, level) for code, pc, meaning, action, level in c.ERROR_CODES if pc == "M3"]
    body = ("<h2>1. Kiểm tra nhanh trong 2 phút</h2>"
            + ol(["Đèn thiết bị chính phải xanh lá đứng yên.", "Thiết bị chính cắm vào cổng LAN của modem bằng cáp đi kèm.",
                  "Hai thiết bị M3 liền kề không cách nhau quá 2 bức tường hoặc 12 m.",
                  "Ứng dụng báo phiên bản firmware 4.1.2 trở lên."])
            + "<h2>2. Mã lỗi</h2>" + tbl(["Mã", "Ý nghĩa", "Cách xử lý", "Chuyển tiếp"], errors)
            + "<h2>3. Tốc độ chậm</h2>"
            + ul(["Đo tốc độ ngay cạnh thiết bị chính trước; nếu ở đây đã chậm thì lỗi nằm ở đường truyền của nhà mạng.",
                  "Bật tính năng Tối ưu kênh lúc 3:00 để hệ thống tự chọn kênh ít nhiễu.",
                  "Nối dây giữa các thiết bị M3 (Ethernet backhaul) tăng tốc độ ở tầng xa khoảng 2 lần.",
                  "Thiết bị cũ chỉ hỗ trợ Wi-Fi 4 làm chậm cả mạng 2,4 GHz; hãy bật mạng riêng cho thiết bị thông minh."])
            + "<h2>4. Vị trí đặt</h2>"
            + ul(["Đặt cao trên 1 m, không đặt trong tủ kín hoặc sau tivi.", "Tránh xa lò vi sóng và bể cá ít nhất 1,5 m.",
                  "Nhà 3 tầng: mỗi tầng một thiết bị, lệch nhau theo chiều dọc không quá 4 m."])
            + f"<h2>5. Khôi phục cài đặt gốc</h2><p>{esc(p['reset'])}</p>"
            + "<div class='note'>Nếu đã thử hết các bước mà mã E503 vẫn xuất hiện, hãy gửi tệp chẩn đoán từ ứng dụng: "
              "Cài đặt &gt; Hỗ trợ &gt; Gửi nhật ký. Kỹ thuật viên Cấp 2 phản hồi trong 4 giờ làm việc.</div>")
    page("mesh-troubleshooting", SHAREPOINT / "huong-dan" / "Xu-ly-su-co-Mesh-M3.pdf",
         "Xử lý sự cố ML Mesh M3", "Sổ tay cho khách hàng và tổng đài viên", body)


def battery_safety():
    body = ("<h2>1. Sản phẩm dùng pin</h2>"
            + tbl(["Sản phẩm", "Loại pin", "Tuổi thọ"],
                  [("ML Lock L9", "4 pin AA kiềm", "Khoảng 10 tháng"), ("ML Sensor S4", "CR2450", "Khoảng 24 tháng"),
                   ("ML Bell D6", "Pin sạc lithium 6.500 mAh", "Khoảng 4 tháng mỗi lần sạc"), ("ML Hub H2", "Pin dự phòng lithium", "4 giờ khi mất điện")])
            + "<h2>2. Quy tắc an toàn</h2>"
            + ul(["Không sạc Bell D6 khi nhiệt độ môi trường dưới 0 °C hoặc trên 45 °C.",
                  "Không dùng lẫn pin cũ và pin mới, hoặc pin của hai hãng khác nhau trong Lock L9.",
                  "Pin cúc áo CR2450 nguy hiểm nếu trẻ nuốt phải: cất ngoài tầm tay trẻ em và đưa trẻ đi cấp cứu ngay.",
                  "Pin phồng, nóng bất thường hoặc có mùi lạ: ngừng dùng, đặt thiết bị trên bề mặt không cháy và gọi tổng đài."])
            + "<h2>3. Thu hồi pin cũ</h2>"
              "<p>Cả 4 trung tâm bảo hành nhận pin cũ miễn phí. Mỗi 10 viên pin mang đến, khách được tặng mã giảm 20.000 đ "
              "cho lần mua phụ kiện tiếp theo. Chương trình có tên Pin Xanh.</p>"
            + "<h2>4. Vận chuyển</h2>"
              "<p>Thiết bị có pin lithium gửi bảo hành bằng đường bộ; không gửi đường hàng không nếu pin đang phồng. "
              "Dán nhãn “Có pin lithium” lên hộp.</p>")
    page("battery-safety", SHAREPOINT / "huong-dan" / "An-toan-pin.pdf",
         "Hướng dẫn an toàn pin", "Áp dụng cho Lock L9, Sensor S4, Bell D6 và Hub H2", body)


def quarterly_report():
    body = ("<h2>1. Tóm tắt</h2>"
            "<p>Quý 3 năm 2026 tổng đài nhận 48.210 liên hệ, tăng 12% so với quý 2. Mức hài lòng đạt 93,1%, vượt mục tiêu 92%.</p>"
            + "<h2>2. Chỉ số</h2>"
            + tbl(["Chỉ số", "Mục tiêu", "Quý 2", "Quý 3"],
                  [("Mức hài lòng (CSAT)", c.KPI["csat_target"], "91,4%", "93,1%"),
                   ("Giải quyết ngay cuộc gọi đầu", c.KPI["first_call_resolution"], "76,0%", "79,5%"),
                   ("Trả lời trong 20 giây", "85%", "82%", "88%"), ("Thời gian xử lý trung bình", "6 phút", "6 phút 40 giây", "5 phút 50 giây")])
            + "<h2>3. Năm lý do liên hệ nhiều nhất</h2>"
            + tbl(["Lý do", "Tỷ lệ"], [("Camera ngoại tuyến (E201)", "18%"), ("Hỏi về gói Cloud và hoá đơn", "15%"),
                                        ("Khóa báo pin yếu (E401)", "11%"), ("Tiến độ bảo hành", "9%"), ("Hướng dẫn ghép thiết bị với hub", "8%")])
            + "<h2>4. Việc cần làm trong quý 4</h2>"
            + ul(["Đưa trợ lý ảo trả lời câu hỏi về mã lỗi vào kênh chat, mục tiêu tự xử lý 30% hội thoại.",
                  "Tuyển thêm 6 tổng đài viên cho ca tối trước mùa Tết.",
                  "Rút thời gian bảo hành qua bưu điện từ 12 xuống 10 ngày làm việc."]))
    page("report-q3", ATTACHMENTS / "Bao-cao-CSKH-Q3-2026.pdf",
         "Báo cáo Chăm sóc khách hàng quý 3 năm 2026", "Tài liệu nội bộ", body)


TIPS = {
    "H2": ["Hub và router nên cách nhau ít nhất 50 cm.", "Sau khi mất điện, hub cần khoảng 3 phút để nối lại toàn bộ thiết bị Zigbee."],
    "C5": ["Camera chỉ dùng Wi-Fi 2,4 GHz; tên mạng không nên có ký tự đặc biệt.", "Thẻ nhớ phải từ Class 10 trở lên và được định dạng trong ứng dụng."],
    "O7": ["Cáp PoE dài tối đa 80 m.", "Hơi nước trong ống kính là lỗi phần cứng: không tự tháo vỏ, gửi bảo hành."],
    "L9": ["Luôn thay cả 4 pin cùng lúc bằng pin kiềm.", "Cửa xệ là nguyên nhân phổ biến nhất khiến chốt không thụt hết."],
    "P1": ["Không dùng cho bình nóng lạnh trực tiếp và bếp từ.", "Ổ cắm tự bật lại sau 60 giây khi tải đã giảm."],
    "S4": ["Chỉ dùng pin CR2450.", "Khoảng hở giữa cảm biến và nam châm phải dưới 20 mm khi cửa đóng."],
    "D6": ["Dùng bộ sạc 5 V – 2 A.", "Độ nhạy phát hiện chuyển động ở mức Cao làm pin tụt nhanh gấp đôi."],
}


def troubleshooting():
    for p in c.PRODUCTS:
        if p["code"] == "M3":  # has its own, longer handbook
            continue
        errors = [(code, meaning, action, level) for code, pc, meaning, action, level in c.ERROR_CODES if pc == p["code"]]
        body = ("<h2>1. Trước khi gọi tổng đài</h2>" + ol(["Kiểm tra nguồn và đèn báo.", "Cập nhật ứng dụng lên bản mới nhất.", "Ghi lại mã lỗi hiện trong ứng dụng."])
                + "<h2>2. Mã lỗi</h2>" + tbl(["Mã", "Ý nghĩa", "Cách xử lý", "Chuyển tiếp"], errors)
                + "<h2>3. Mẹo từ kỹ thuật viên</h2>" + ul(TIPS[p["code"]])
                + "<h2>4. Ý nghĩa đèn báo</h2>" + tbl(["Trạng thái đèn", "Ý nghĩa"], c.LED_STATES)
                + f"<h2>5. Khôi phục cài đặt gốc</h2><p>{esc(p['reset'])}</p>"
                + f"<div class='note'>Vẫn chưa được? Gọi {c.COMPANY['hotline']} và đọc số sê-ri 12 ký tự bắt đầu bằng MLH.</div>")
        page(f"trouble-{p['code']}", SHAREPOINT / "huong-dan" / "xu-ly-su-co" / f"Xu-ly-su-co-{p['name'].replace(' ', '-')}.pdf",
             f"Xử lý sự cố {p['name']}", "Sổ tay cho khách hàng và tổng đài viên", body)


def monthly_reports():
    for month, total, phone, chat, email, csat, fcr, top in c.MONTHLY:
        body = (f"<h2>1. Tóm tắt</h2><p>Tháng {month} tổng đài nhận {total:,} liên hệ. Lý do nhiều nhất: {esc(top)}.</p>".replace(",", ".", 1)
                + "<h2>2. Theo kênh</h2>" + tbl(["Kênh", "Số liên hệ"], [("Điện thoại", f"{phone:,}".replace(",", ".")), ("Chat", f"{chat:,}".replace(",", ".")),
                                                                       ("Email", f"{email:,}".replace(",", "."))])
                + "<h2>3. Chất lượng</h2>" + tbl(["Chỉ số", "Mục tiêu", "Kết quả"], [("Mức hài lòng (CSAT)", c.KPI["csat_target"], csat),
                                                                                    ("Giải quyết ngay lần đầu", c.KPI["first_call_resolution"], fcr)]))
        target = f"Bao-cao-CSKH-{month[3:]}-{month[:2]}.pdf"
        page(f"report-{month[:2]}", SHAREPOINT / "bao-cao" / target, f"Báo cáo Chăm sóc khách hàng tháng {month}", "Tài liệu nội bộ", body)


def promo_flyers():
    for name, start, end, offer, code in c.PROMOTIONS:
        body = (f"<p class='price'>{esc(offer)}</p><p>Thời gian: từ {start} đến {end}. Mã giảm giá: <strong>{code}</strong>.</p>"
                "<h2>Điều kiện</h2>" + ul(c.PROMO_TERMS[code] + ["Mỗi đơn chỉ dùng một mã.", "Không cộng dồn với chiết khấu hạng " + c.LOYALTY_NAME + "."])
                + f"<div class='note'>Đặt hàng tại {c.COMPANY['website']}, trong ứng dụng hoặc gọi {c.COMPANY['hotline']}.</div>")
        page(f"promo-{code}", SHAREPOINT / "khuyen-mai" / f"Khuyen-mai-{code}.pdf", name, "Tờ rơi chương trình khuyến mãi", body)


def catalogues():
    rows = [(p["name"], p["kind"], c.vnd(p["price"]), f"{p['warranty']} tháng", p["pitch"]) for p in c.PRODUCTS]
    body = ("<h2>Sản phẩm</h2>" + tbl(["Sản phẩm", "Loại", "Giá", "Bảo hành", "Điểm nổi bật"], rows)
            + "<h2>Phụ kiện</h2>" + tbl(["Mã", "Tên", "Giá", "Bảo hành (tháng)"], [(a, b, c.vnd(pr), w) for a, b, pr, w in c.ACCESSORIES])
            + "<h2>Gói Cloud</h2>" + tbl(["Gói", "Giá mỗi tháng", "Lưu video", "Số camera"], [(n, c.vnd(pr) if pr else "Miễn phí", d, cams) for n, pr, d, cams, _ in c.PLANS])
            + f"<p>{esc(c.PLAN_YEARLY_NOTE)}</p>")
    page("catalogue", SHAREPOINT / "san-pham" / "Catalogue-2026.pdf", "Catalogue sản phẩm 2026", c.COMPANY["name"], body)
    kinds = {"H2": "Smart home hub", "C5": "Indoor camera", "O7": "Outdoor camera", "L9": "Fingerprint door lock", "M3": "Wi-Fi 6 mesh, pack of 3",
             "P1": "Smart plug", "S4": "Door and motion sensor", "D6": "Video doorbell"}
    en = ("<h2>Products</h2>" + tbl(["Product", "Type", "List price (VND)", "Warranty"],
                                    [(p["name"], kinds[p["code"]], f"{p['price']:,}", f"{p['warranty']} months") for p in c.PRODUCTS])
          + "<h2>Cloud plans</h2>" + tbl(["Plan", "Monthly price (VND)", "Cameras"], [(n, f"{pr:,}" if pr else "Free", cams) for n, pr, _, cams, _ in c.PLANS])
          + "<p>Yearly billing charges ten months, so two months are free. Delivery within Vietnam only.</p>")
    page("catalogue-en", SHAREPOINT / "san-pham" / "Product-Catalogue-2026-EN.pdf", "Product Catalogue 2026", "Moc Lan Home — English edition", en, lang="en")


def service_sheets():
    fees = [(c.product(pc)["name"], item, *[c.vnd(v) if v else "Miễn phí" for v in (a, b, z)]) for pc, item, a, b, z in c.INSTALL_FEES]
    body = (tbl(["Sản phẩm", "Hạng mục", *c.INSTALL_ZONES], fees)
            + "<h2>Điều kiện</h2>" + ul(["Đặt lịch trước ít nhất 24 giờ.", "Huỷ trước 4 giờ không mất phí; huỷ muộn hơn tính 50.000 đ.",
                                         "Sau 18:00 và Chủ nhật cộng 20% phí lắp.", "Dây điện, ống ghen và cáp mạng tính riêng 12.000 đ mỗi mét.",
                                         f"Hội viên hạng Vàng của {c.LOYALTY_NAME} được miễn phí một lần lắp đặt mỗi năm."]))
    page("install-fees", SHAREPOINT / "dich-vu" / "Bang-phi-lap-dat.pdf", "Bảng phí lắp đặt", "Áp dụng từ 01/01/2026", body)
    for city, address, hours, branch, services in c.CENTRES:
        ext, parking, counters, locker, extra = c.CENTRE_DETAILS[city]
        body = tbl(["Mục", "Thông tin"], [("Địa chỉ", address), ("Giờ làm việc", hours), ("Tổng đài", f"{c.COMPANY['hotline']} {branch}"), ("Dịch vụ", services),
                                          ("Số quầy tiếp nhận", counters), ("Gửi xe", parking), ("Tủ nhận thiết bị", locker)]) + f"<p>{esc(extra)}</p>"
        slug = city.replace(".", "").replace(" ", "-").replace("à", "a").replace("ộ", "o").replace("Đ", "D").replace("ẵ", "a").replace("ầ", "a").replace("ơ", "o")
        page(f"centre-{slug}", SHAREPOINT / "dich-vu" / "trung-tam" / f"Trung-tam-bao-hanh-{slug}.pdf", f"Trung tâm bảo hành {city}", "Thông tin cho khách hàng", body)


def loyalty_and_privacy():
    body = (tbl(["Hạng", "Chi tiêu trong 12 tháng", "Chiết khấu", "Quyền lợi"], [(t, "Từ " + c.vnd(s) if s else "Đăng ký tài khoản", d, perk) for t, s, d, perk in c.LOYALTY])
            + "<h2>Quy định</h2>" + ul(c.LOYALTY_RULES))
    page("loyalty", SHAREPOINT / "chinh-sach" / "To-roi-Moc-Lan-Club.pdf", f"Hội viên {c.LOYALTY_NAME}", "Tờ giới thiệu chương trình", body)
    rows = [(code, date, title, duration, comp) for code, date, title, duration, _, _, _, comp in c.INCIDENTS]
    page("incidents", SHAREPOINT / "noi-bo" / "su-co" / "Tong-hop-su-co-Q3-2026.pdf", "Tổng hợp sự cố quý 3 năm 2026", "Tài liệu nội bộ",
         tbl(["Mã", "Ngày", "Sự cố", "Thời gian ảnh hưởng", "Bồi thường"], rows)
         + "".join(f"<h2>{code}</h2><p>Phạm vi: {esc(impact)}.</p><p>Nguyên nhân: {esc(cause)}.</p><p>Khắc phục: {esc(fix)}.</p>"
                   for code, _, _, _, impact, cause, fix, _ in c.INCIDENTS))


def main():
    for build in (datasheets, terms, mesh_troubleshooting, battery_safety, quarterly_report, troubleshooting, monthly_reports, promo_flyers, catalogues,
                  service_sheets, loyalty_and_privacy):
        build()
    (WORK / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"{len(manifest)} HTML sources in {WORK}")


if __name__ == "__main__":
    main()
