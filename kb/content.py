"""Facts of the fictional company every sample document is built from.

Moc Lan Home is invented for this POC: a seller of smart-home devices with a cloud
subscription. Each generator takes its numbers from here, so the documents agree
with each other and a test question has one right answer.
"""

COMPANY = {
    "name": "Mộc Lan Home",
    "short": "MLH",
    "hotline": "1900 0000",
    "hotline_hours": "8:00–21:00 tất cả các ngày, kể cả lễ Tết",
    "email": "hotro@moclanhome.example",
    "email_reply": "24 giờ",
    "chat_hours": "24/7 (trợ lý ảo), nhân viên trực 8:00–22:00",
    "website": "https://moclanhome.example",
    "app": "Mộc Lan Home (iOS 15 trở lên, Android 9 trở lên)",
}


def vnd(amount):
    return f"{amount:,.0f}".replace(",", ".") + " đ"


# code, name, kind, price, warranty months, one-line pitch, specs, box contents
PRODUCTS = [
    {
        "code": "H2", "name": "ML Hub H2", "kind": "Bộ điều khiển trung tâm", "price": 1_490_000, "warranty": 24,
        "pitch": "Kết nối tối đa 120 thiết bị Zigbee và Matter, vẫn chạy kịch bản khi mất Internet.",
        "specs": [("Kết nối", "Zigbee 3.0, Matter 1.3, Wi-Fi 2,4 GHz, Ethernet"), ("Số thiết bị tối đa", "120"),
                  ("Nguồn", "5 V – 2 A, USB-C"), ("Pin dự phòng", "4 giờ"), ("Kích thước", "98 × 98 × 28 mm"),
                  ("Nhiệt độ hoạt động", "0–40 °C")],
        "box": ["Hub H2", "Cáp USB-C 1,5 m", "Bộ nguồn 10 W", "Cáp mạng 1 m", "Hướng dẫn nhanh"],
        "reset": "Giữ nút ở đáy thiết bị 10 giây đến khi đèn nháy cam.",
    },
    {
        "code": "C5", "name": "ML Cam C5", "kind": "Camera trong nhà", "price": 890_000, "warranty": 12,
        "pitch": "Độ phân giải 2K, xoay 355°, đàm thoại hai chiều, phát hiện tiếng khóc trẻ em.",
        "specs": [("Độ phân giải", "2K (2304 × 1296)"), ("Góc xoay", "355° ngang, 90° dọc"), ("Tầm nhìn đêm", "10 m"),
                  ("Thẻ nhớ", "microSD tối đa 256 GB"), ("Nguồn", "5 V – 1 A"), ("Kết nối", "Wi-Fi 2,4 GHz")],
        "box": ["Camera C5", "Cáp nguồn 2 m", "Bộ nguồn 5 W", "Đế gắn trần và vít", "Hướng dẫn nhanh"],
        "reset": "Dùng que chọc lỗ RESET cạnh khe thẻ nhớ trong 5 giây.",
    },
    {
        "code": "O7", "name": "ML Cam O7", "kind": "Camera ngoài trời", "price": 1_650_000, "warranty": 24,
        "pitch": "Cảm biến 4 MP, chuẩn chống nước IP66, đèn và còi báo động khi phát hiện người.",
        "specs": [("Độ phân giải", "4 MP (2560 × 1440)"), ("Chuẩn bảo vệ", "IP66"), ("Tầm nhìn đêm", "30 m, có màu"),
                  ("Còi báo động", "100 dB"), ("Nguồn", "12 V – 1 A hoặc PoE"), ("Nhiệt độ hoạt động", "-20–60 °C")],
        "box": ["Camera O7", "Bộ nguồn 12 V", "Hộp nối chống nước", "Bộ vít nở", "Giấy định vị lỗ khoan"],
        "reset": "Mở nắp cao su mặt dưới, giữ nút RESET 8 giây.",
    },
    {
        "code": "L9", "name": "ML Lock L9", "kind": "Khóa cửa vân tay", "price": 4_990_000, "warranty": 24,
        "pitch": "Mở bằng vân tay, mã số, thẻ từ, chìa cơ hoặc ứng dụng; lưu 100 vân tay.",
        "specs": [("Cách mở", "Vân tay, mã số, thẻ từ, chìa cơ, ứng dụng"), ("Số vân tay", "100"), ("Số mã số", "50"),
                  ("Pin", "4 pin AA, dùng khoảng 10 tháng"), ("Nguồn khẩn cấp", "Cổng USB-C mặt ngoài"),
                  ("Độ dày cửa phù hợp", "38–90 mm")],
        "box": ["Thân khóa trước và sau", "Ruột khóa", "2 chìa cơ", "3 thẻ từ", "4 pin AA", "Bộ vít và mẫu khoan"],
        "reset": "Tháo nắp pin, giữ nút SET 6 giây; toàn bộ vân tay và mã số bị xoá.",
    },
    {
        "code": "M3", "name": "ML Mesh M3", "kind": "Bộ Wi-Fi mesh 3 thiết bị", "price": 2_790_000, "warranty": 36,
        "pitch": "Wi-Fi 6 AX3000, phủ sóng đến 420 m², chịu 150 thiết bị cùng lúc.",
        "specs": [("Chuẩn Wi-Fi", "Wi-Fi 6 AX3000, hai băng tần"), ("Vùng phủ", "420 m² (bộ 3 thiết bị)"),
                  ("Số thiết bị cùng lúc", "150"), ("Cổng mạng", "2 cổng Gigabit mỗi thiết bị"),
                  ("Bảo mật", "WPA3"), ("Nguồn", "12 V – 1,5 A")],
        "box": ["3 thiết bị M3", "3 bộ nguồn", "Cáp mạng 1,2 m", "Hướng dẫn nhanh"],
        "reset": "Giữ nút RESET mặt sau 10 giây đến khi đèn chuyển đỏ.",
    },
    {
        "code": "P1", "name": "ML Plug P1", "kind": "Ổ cắm thông minh", "price": 190_000, "warranty": 12,
        "pitch": "Hẹn giờ, đo điện năng tiêu thụ, tải tối đa 2.500 W.",
        "specs": [("Tải tối đa", "2.500 W (10 A)"), ("Kết nối", "Wi-Fi 2,4 GHz, Matter"), ("Đo điện năng", "Có, sai số ±2%"),
                  ("Điện áp", "100–240 V"), ("Kích thước", "52 × 52 × 60 mm")],
        "box": ["Ổ cắm P1", "Hướng dẫn nhanh"],
        "reset": "Giữ nút nguồn 5 giây đến khi đèn nháy nhanh.",
    },
    {
        "code": "S4", "name": "ML Sensor S4", "kind": "Cảm biến cửa và chuyển động", "price": 290_000, "warranty": 12,
        "pitch": "Hai trong một, pin CR2450 dùng 2 năm, cần Hub H2 để hoạt động.",
        "specs": [("Kết nối", "Zigbee 3.0 (cần Hub H2)"), ("Pin", "CR2450, khoảng 24 tháng"),
                  ("Tầm phát hiện chuyển động", "7 m, góc 120°"), ("Khoảng hở cửa tối đa", "20 mm")],
        "box": ["Cảm biến S4", "Nam châm", "Pin CR2450", "Băng keo hai mặt"],
        "reset": "Giữ nút ghép nối 5 giây đến khi đèn xanh nháy 3 lần.",
    },
    {
        "code": "D6", "name": "ML Bell D6", "kind": "Chuông cửa có hình", "price": 1_290_000, "warranty": 18,
        "pitch": "Camera 2K góc rộng 160°, pin sạc 6.500 mAh dùng 4 tháng, kèm chuông trong nhà.",
        "specs": [("Độ phân giải", "2K"), ("Góc nhìn", "160°"), ("Pin", "6.500 mAh, khoảng 4 tháng mỗi lần sạc"),
                  ("Chuẩn bảo vệ", "IP65"), ("Kết nối", "Wi-Fi 2,4 GHz")],
        "box": ["Chuông D6", "Chuông trong nhà", "Cáp sạc USB-C", "Đế gắn và vít", "Miếng dán chống trộm"],
        "reset": "Giữ nút phía sau thân máy 10 giây.",
    },
]

ACCESSORIES = [
    ("PK-TM64", "Thẻ nhớ microSD 64 GB", 180_000, 12),
    ("PK-TM128", "Thẻ nhớ microSD 128 GB", 320_000, 12),
    ("PK-NG12", "Bộ nguồn 12 V – 1,5 A", 150_000, 6),
    ("PK-TT3", "Bộ 3 thẻ từ cho Lock L9", 120_000, 6),
    ("PK-PIN2450", "Pin CR2450 (vỉ 2 viên)", 60_000, 0),
    ("PK-GD-O7", "Giá đỡ góc tường cho Cam O7", 210_000, 12),
    ("PK-SOLAR", "Tấm pin mặt trời cho Bell D6", 490_000, 12),
]

# name, monthly price, days of video history, cameras, support response time
PLANS = [
    ("Free", 0, "24 giờ", 1, "48 giờ"),
    ("Plus", 49_000, "7 ngày", 2, "24 giờ"),
    ("Family", 99_000, "30 ngày", 6, "8 giờ"),
    ("Pro", 199_000, "60 ngày", 12, "2 giờ"),
]
PLAN_YEARLY_NOTE = "Trả theo năm chỉ tính 10 tháng, tức được tặng 2 tháng."

RETURNS = {
    "days": 15, "member_days": 30,
    "refund": "5–7 ngày làm việc kể từ khi kho nhận lại hàng",
    "conditions": ["Sản phẩm còn nguyên hộp, phụ kiện và tem MLH-SEAL", "Có hoá đơn hoặc mã đơn hàng",
                   "Không trầy xước, vào nước hoặc đã khoan lắp lên tường"],
    "exclusions": ["Thẻ nhớ và pin đã bóc vỉ", "Sản phẩm mua trong chương trình xả kho",
                   "Lock L9 đã lắp lên cửa (chỉ đổi khi lỗi kỹ thuật)"],
    "fee": "Miễn phí nếu lỗi do nhà sản xuất; khách chịu phí gửi 35.000 đ nếu đổi ý.",
}

SHIPPING = {
    "free_from": 500_000, "fee": 30_000,
    "times": [("Nội thành Hà Nội, Đà Nẵng, TP.HCM", "1–2 ngày"), ("Các tỉnh thành khác", "3–5 ngày"),
              ("Huyện đảo", "7–10 ngày")],
    "express": "Giao nhanh 4 giờ tại nội thành Hà Nội và TP.HCM, phụ phí 45.000 đ, đặt trước 16:00.",
    "carriers": ["Giao Nhanh Việt", "Bưu Vận 24", "đội giao hàng của Mộc Lan Home"],
}

PAYMENTS = ["Tiền mặt khi nhận hàng (đơn dưới 10.000.000 đ)", "Chuyển khoản ngân hàng", "Thẻ Visa, Mastercard, JCB",
            "Ví điện tử", "Trả góp 0% kỳ hạn 6 hoặc 12 tháng cho đơn từ 3.000.000 đ"]

# city, address, hours, phone extension, services
CENTRES = [
    ("Hà Nội", "Số 12 phố Hoa Sữa, quận Cầu Giấy", "8:30–18:00 thứ Hai đến thứ Bảy", "nhánh 1", "Bảo hành, lắp đặt, trải nghiệm"),
    ("Đà Nẵng", "Số 45 đường Biển Xanh, quận Hải Châu", "8:30–17:30 thứ Hai đến thứ Bảy", "nhánh 2", "Bảo hành, lắp đặt"),
    ("TP.HCM", "Số 88 đường Sao Mai, quận 3", "8:00–20:00 tất cả các ngày", "nhánh 3", "Bảo hành, lắp đặt, trải nghiệm, sửa lấy ngay"),
    ("Cần Thơ", "Số 7 đường Bến Sông, quận Ninh Kiều", "8:30–17:00 thứ Hai đến thứ Sáu", "nhánh 4", "Nhận bảo hành, gửi về TP.HCM"),
]

# product code, zone -> fee
INSTALL_FEES = [
    ("L9", "Lắp khóa lên cửa gỗ", 0, 250_000, 400_000),
    ("L9", "Lắp khóa lên cửa nhôm hoặc cửa sắt", 300_000, 450_000, 600_000),
    ("O7", "Lắp camera ngoài trời (dưới 4 m)", 150_000, 200_000, 300_000),
    ("O7", "Lắp camera ngoài trời (từ 4 m, cần thang)", 250_000, 300_000, 400_000),
    ("C5", "Lắp camera trong nhà", 80_000, 120_000, 180_000),
    ("D6", "Lắp chuông cửa", 100_000, 150_000, 220_000),
    ("M3", "Cài đặt và đo sóng mesh tại nhà", 120_000, 180_000, 260_000),
    ("H2", "Cài đặt hub và ghép 10 thiết bị", 150_000, 200_000, 280_000),
]
INSTALL_ZONES = ("Nội thành (dưới 15 km)", "Ngoại thành (15–40 km)", "Tỉnh lân cận (40–100 km)")

# code, product code, meaning, what the customer does, escalate to
ERROR_CODES = [
    ("E101", "H2", "Hub không kết nối được Internet", "Kiểm tra cáp mạng, khởi động lại router rồi hub", "Cấp 1"),
    ("E102", "H2", "Hub đầy bộ nhớ kịch bản", "Xoá kịch bản không dùng (tối đa 200 kịch bản)", "Cấp 1"),
    ("E103", "H2", "Thiết bị Zigbee ngoài vùng phủ", "Đưa thiết bị lại gần hub dưới 10 m hoặc thêm thiết bị lặp", "Cấp 1"),
    ("E110", "H2", "Lỗi cập nhật firmware", "Giữ nguồn, chờ 15 phút; nếu đèn đỏ liên tục thì gửi bảo hành", "Cấp 2"),
    ("E201", "C5", "Camera ngoại tuyến", "Kiểm tra nguồn và Wi-Fi 2,4 GHz; camera không dùng mạng 5 GHz", "Cấp 1"),
    ("E202", "C5", "Không đọc được thẻ nhớ", "Định dạng thẻ trong ứng dụng; dùng thẻ Class 10 trở lên", "Cấp 1"),
    ("E203", "C5", "Động cơ xoay bị kẹt", "Tắt nguồn, gỡ vật cản, bật lại để camera tự hiệu chỉnh", "Cấp 2"),
    ("E207", "C5", "Hình ảnh ban đêm bị trắng xoá", "Lau ống kính, không đặt camera sát kính cửa sổ", "Cấp 1"),
    ("E301", "O7", "Camera ngoài trời mất nguồn PoE", "Kiểm tra bộ cấp PoE chuẩn 802.3af và cáp dưới 80 m", "Cấp 2"),
    ("E302", "O7", "Còi báo động không kêu", "Bật còi trong mục Cảnh báo; kiểm tra chế độ Im lặng ban đêm", "Cấp 1"),
    ("E305", "O7", "Hơi nước trong ống kính", "Ngừng dùng và gửi bảo hành; không tự tháo vỏ", "Cấp 2"),
    ("E401", "L9", "Khóa báo pin yếu", "Thay cả 4 pin AA cùng lúc bằng pin kiềm; không dùng pin sạc", "Cấp 1"),
    ("E402", "L9", "Không nhận vân tay", "Lau khô tay và mặt đọc; đăng ký lại vân tay với 3 góc đặt", "Cấp 1"),
    ("E403", "L9", "Khóa tạm ngưng sau 5 lần nhập sai", "Chờ 3 phút hoặc mở bằng chìa cơ", "Cấp 1"),
    ("E404", "L9", "Chốt khóa không thụt hết", "Kiểm tra cửa có bị xệ; gọi kỹ thuật viên căn lại", "Cấp 2"),
    ("E409", "L9", "Hết pin hoàn toàn", "Cấp nguồn tạm bằng sạc dự phòng qua cổng USB-C mặt ngoài rồi mở cửa", "Cấp 1"),
    ("E501", "M3", "Thiết bị vệ tinh mất kết nối với thiết bị chính", "Đặt hai thiết bị cách nhau không quá 2 bức tường", "Cấp 1"),
    ("E502", "M3", "Tốc độ thấp hơn gói cước", "Cắm thiết bị chính vào cổng LAN 1 Gbps của modem", "Cấp 1"),
    ("E503", "M3", "Trùng địa chỉ IP với modem", "Chuyển modem sang chế độ bridge hoặc bật chế độ Access Point", "Cấp 2"),
    ("E601", "P1", "Ổ cắm tự ngắt", "Tải vượt 2.500 W; giảm tải rồi bật lại sau 60 giây", "Cấp 1"),
    ("E602", "P1", "Không ghép được với ứng dụng", "Bật Bluetooth điện thoại, đứng cách ổ cắm dưới 3 m", "Cấp 1"),
    ("E701", "S4", "Cảm biến báo pin yếu", "Thay pin CR2450; không dùng CR2032", "Cấp 1"),
    ("E702", "S4", "Báo mở cửa sai", "Căn lại nam châm, khoảng hở dưới 20 mm", "Cấp 1"),
    ("E801", "D6", "Chuông không đổ trong nhà", "Ghép lại chuông trong nhà: giữ nút bên hông 5 giây", "Cấp 1"),
    ("E802", "D6", "Pin tụt nhanh", "Giảm độ nhạy phát hiện chuyển động về mức Thấp", "Cấp 1"),
    ("E805", "D6", "Không sạc được", "Dùng bộ sạc 5 V – 2 A; nếu vẫn lỗi thì gửi bảo hành", "Cấp 2"),
]

LED_STATES = [
    ("Xanh lá đứng yên", "Hoạt động bình thường"),
    ("Xanh lá nháy chậm", "Đang chờ ghép nối"),
    ("Cam nháy", "Đang khôi phục cài đặt gốc hoặc cập nhật firmware"),
    ("Đỏ đứng yên", "Mất kết nối Internet"),
    ("Đỏ nháy nhanh", "Lỗi phần cứng, liên hệ bảo hành"),
    ("Tắt", "Mất nguồn hoặc đang ở chế độ Ban đêm"),
]

SUPPORT_LEVELS = [
    ("Cấp 1", "Tổng đài viên", "Hướng dẫn theo kịch bản, xử lý trong cuộc gọi", "30 phút"),
    ("Cấp 2", "Kỹ thuật viên sản phẩm", "Chẩn đoán từ xa, quyết định bảo hành", "4 giờ làm việc"),
    ("Cấp 3", "Nhóm kỹ sư", "Lỗi firmware, lỗi hàng loạt", "2 ngày làm việc"),
]

WARRANTY = {
    "process_days": "7 ngày làm việc tại trung tâm, 12 ngày làm việc nếu gửi qua bưu điện",
    "one_for_one": "Đổi mới trong 30 ngày đầu nếu lỗi phần cứng do nhà sản xuất.",
    "loaner": "Khách gói Pro được mượn thiết bị thay thế trong lúc chờ bảo hành Lock L9 và Mesh M3.",
    "exclusions": ["Tem MLH-SEAL bị rách hoặc có dấu hiệu tự tháo máy", "Hư hỏng do nước với sản phẩm không có chuẩn IP",
                   "Sét đánh, chập điện, dùng sai bộ nguồn", "Hao mòn tự nhiên của pin và vỏ máy",
                   "Phần mềm bị can thiệp ngoài bản chính hãng"],
    "extended": "Gói bảo hành mở rộng thêm 12 tháng giá bằng 8% giá sản phẩm, mua trong 30 ngày đầu.",
    "battery_swap_l9": 150_000,
    "out_of_warranty_check": 80_000,
}

# version, product code, date, changes
FIRMWARE = [
    ("3.4.0", "H2", "2026-09-15", ["Hỗ trợ Matter 1.3", "Tăng giới hạn kịch bản từ 150 lên 200", "Sửa lỗi E103 báo sai khi mất điện"]),
    ("2.8.1", "C5", "2026-08-20", ["Thêm phát hiện tiếng khóc trẻ em", "Sửa lỗi lệch giờ trên video ghi vào thẻ nhớ"]),
    ("2.2.0", "O7", "2026-09-02", ["Thêm vùng riêng tư che hình", "Còi báo động chọn được 3 mức âm lượng"]),
    ("1.9.3", "L9", "2026-10-01", ["Thêm mã số dùng một lần cho khách", "Cảnh báo pin sớm hơn, khi còn 20%"]),
    ("4.1.2", "M3", "2026-07-30", ["Thêm mạng khách tự tắt sau 24 giờ", "Cải thiện chuyển vùng giữa các thiết bị"]),
    ("1.3.0", "D6", "2026-09-25", ["Trả lời nhanh bằng câu ghi âm sẵn", "Giảm 15% mức tiêu thụ pin khi chờ"]),
]

PROMOTIONS = [
    ("Tuần lễ An toàn", "2026-10-20", "2026-10-26", "Giảm 15% Cam C5 và Cam O7", "ANTOAN15"),
    ("Ngày đôi 11.11", "2026-11-11", "2026-11-11", "Giảm 20% Mesh M3, tặng 3 tháng gói Plus", "SALE1111"),
    ("Black Friday", "2026-11-27", "2026-11-30", "Giảm 12% toàn bộ sản phẩm, trừ Lock L9", "BF2026"),
    ("Tết Sum vầy", "2027-01-15", "2027-02-05", "Mua Lock L9 tặng Bell D6 giảm 50%", "TET2027"),
]

DEALERS = [
    ("DL-001", "Điện máy Hồng Hà", "Hải Phòng", "Cấp 1"), ("DL-002", "Thế giới Nhà Thông Minh", "Hà Nội", "Cấp 1"),
    ("DL-003", "Siêu thị Kim Liên", "Nghệ An", "Cấp 2"), ("DL-004", "Công nghệ Biển Đông", "Đà Nẵng", "Cấp 1"),
    ("DL-005", "Nhà Xinh Tây Nguyên", "Đắk Lắk", "Cấp 2"), ("DL-006", "An Phát Smart", "TP.HCM", "Cấp 1"),
    ("DL-007", "Điện tử Sông Hậu", "Cần Thơ", "Cấp 2"), ("DL-008", "Phương Nam Digital", "Bình Dương", "Cấp 2"),
    ("DL-009", "Sao Việt Home", "Quảng Ninh", "Cấp 2"), ("DL-010", "Mekong Tech", "An Giang", "Cấp 2"),
]

# product code -> works with (assistant / standard)
COMPATIBILITY = {
    "columns": ["Matter", "Trợ lý giọng nói A", "Trợ lý giọng nói G", "Cần Hub H2", "Gói Cloud"],
    "rows": {
        "H2": ["Có", "Có", "Có", "—", "Không cần"], "C5": ["Không", "Có", "Có", "Không", "Nên có"],
        "O7": ["Không", "Có", "Có", "Không", "Nên có"], "L9": ["Có", "Có", "Không", "Không", "Không cần"],
        "M3": ["Không", "Không", "Không", "Không", "Không cần"], "P1": ["Có", "Có", "Có", "Không", "Không cần"],
        "S4": ["Qua hub", "Qua hub", "Qua hub", "Có", "Không cần"], "D6": ["Không", "Có", "Có", "Không", "Nên có"],
    },
}

KPI = {"csat_target": "92%", "first_call_resolution": "78%", "answer_within": "20 giây cho 85% cuộc gọi",
       "max_hold": "90 giây", "callback": "trong 2 giờ làm việc"}


def product(code):
    return next(p for p in PRODUCTS if p["code"] == code)


# --- Second batch of facts: programmes, how-to, reports, incidents, internal rules ---

# tier, spend over 12 months, discount, perks
LOYALTY_NAME = "Mộc Lan Club"
LOYALTY = [
    ("Thành viên", 0, "0%", "Tích 1 điểm cho mỗi 10.000 đ đã mua"),
    ("Bạc", 5_000_000, "3%", "Miễn phí giao hàng cho mọi đơn"),
    ("Vàng", 15_000_000, "5%", "Miễn phí một lần lắp đặt mỗi năm và được ưu tiên khi gọi tổng đài"),
    ("Kim cương", 40_000_000, "8%", "Tặng bảo hành mở rộng 12 tháng cho một sản phẩm mỗi năm; kỹ thuật viên đến nhà trong 24 giờ"),
]
LOYALTY_RULES = ["Mỗi điểm đổi được 100 đ khi thanh toán, tối đa 30% giá trị đơn hàng.", "Điểm hết hạn sau 12 tháng kể từ ngày tích.",
                 "Hạng được xét lại vào ngày 1 tháng 1 hằng năm theo chi tiêu của 12 tháng trước.",
                 "Chiết khấu hạng không cộng dồn với mã khuyến mãi; hệ thống tự chọn mức có lợi hơn cho khách.",
                 "Phí lắp đặt và gói Cloud không được tính điểm.", "Sinh nhật: tặng 200 điểm, dùng trong 30 ngày."]

DEALER_TERMS = [
    ("Cấp 1", "22%", "300 triệu đồng mỗi quý", "30 ngày", "Được đặt hàng trước sản phẩm mới 14 ngày"),
    ("Cấp 2", "15%", "100 triệu đồng mỗi quý", "15 ngày", "Được đặt hàng trước sản phẩm mới 7 ngày"),
]
DEALER_RULES = ["Thưởng trưng bày 3 triệu đồng mỗi quý cho kệ đủ 8 sản phẩm.", "Hàng trưng bày lỗi được đổi trong 7 ngày làm việc.",
                "Đại lý không bán thấp hơn 95% giá niêm yết, trừ chương trình do Mộc Lan Home công bố.",
                "Đại lý nhận bảo hành thay khách và gửi về trung tâm gần nhất; phí vận chuyển do Mộc Lan Home trả.",
                "Đào tạo sản phẩm cho đại lý hai lần mỗi năm, vào tháng 3 và tháng 9.",
                "Không đạt cam kết hai quý liên tiếp thì bị xét hạ cấp."]
DEALER_TRAINING = [("2026-09-10", "Hà Nội", "Sản phẩm mới và kỹ năng tư vấn camera", "40 chỗ"), ("2026-09-17", "TP.HCM", "Lắp đặt Lock L9 nâng cao", "30 chỗ"),
                   ("2027-03-11", "Đà Nẵng", "Giới thiệu Cam C7 và hệ sinh thái Matter", "35 chỗ"), ("2027-03-18", "TP.HCM", "Giới thiệu Cam C7 và hệ sinh thái Matter", "40 chỗ")]

QUICK_START = {
    "H2": ["Cắm nguồn USB-C và cáp mạng vào router.", "Chờ đèn xanh lá nháy chậm (khoảng 40 giây).", "Trong ứng dụng chọn Thêm thiết bị > Hub và quét mã QR ở đáy hub.",
           "Đặt tên nhà và phòng; quá trình ghép mất khoảng 2 phút."],
    "C5": ["Cắm nguồn, chờ camera xoay một vòng và đọc câu \"Sẵn sàng ghép nối\".", "Trong ứng dụng chọn Thêm thiết bị > Camera trong nhà.",
           "Nhập mật khẩu Wi-Fi 2,4 GHz rồi đưa mã QR trên điện thoại ra trước ống kính, cách 15–20 cm.", "Lắp thẻ nhớ khi camera đang tắt nguồn."],
    "O7": ["Thử camera ở trong nhà trước khi khoan lắp.", "Cấp nguồn 12 V hoặc cáp PoE; đèn đỏ đứng yên rồi chuyển xanh nháy chậm.",
           "Ghép trong ứng dụng bằng mã QR trên thân máy.", "Lắp ở độ cao 2,5–3 m, nối dây trong hộp nối chống nước đi kèm."],
    "L9": ["Lắp 4 pin AA kiềm.", "Đổi mã quản trị mặc định 123456 ngay lần đầu.", "Đăng ký vân tay quản trị, mỗi vân tay đặt 3 lần.",
           "Bật Bluetooth điện thoại và ghép khóa trong ứng dụng."],
    "M3": ["Tắt Wi-Fi của modem nhà mạng.", "Cắm thiết bị M3 chính vào cổng LAN của modem, chờ đèn trắng nháy.",
           "Tạo tên mạng và mật khẩu trong ứng dụng (mật khẩu ít nhất 10 ký tự).", "Cắm hai thiết bị còn lại ở tầng khác; chúng tự nối trong 3 phút."],
    "P1": ["Cắm ổ P1 vào ổ điện tường, đèn nháy nhanh.", "Bật Bluetooth điện thoại, chọn Thêm thiết bị > Ổ cắm.", "Chọn mạng Wi-Fi 2,4 GHz.", "Đặt lịch hẹn giờ hoặc giới hạn công suất nếu cần."],
    "S4": ["Rút miếng nhựa cách điện ở khay pin.", "Giữ nút ghép nối 5 giây, đèn xanh nháy.", "Trong ứng dụng chọn hub rồi Thêm thiết bị Zigbee.",
           "Dán thân cảm biến lên khung cửa và nam châm lên cánh cửa."],
    "D6": ["Sạc đầy pin bằng cáp USB-C (khoảng 5 giờ cho lần đầu).", "Cắm chuông trong nhà vào ổ điện, cách cửa không quá 10 m.", "Ghép chuông trong ứng dụng bằng mã QR.",
           "Gắn đế ở độ cao 1,2–1,4 m và dán miếng chống trộm."],
}
CARE = {
    "H2": ["Đặt nơi thoáng, cách router ít nhất 50 cm để giảm nhiễu.", "Thay pin dự phòng sau khoảng 3 năm."],
    "C5": ["Lau ống kính bằng khăn sợi nhỏ mỗi tháng.", "Định dạng lại thẻ nhớ 6 tháng một lần."],
    "O7": ["Kiểm tra gioăng hộp nối trước mùa mưa.", "Không sơn lên thân máy và không che lỗ còi."],
    "L9": ["Thay pin khi ứng dụng báo còn 20%.", "Lau mặt đọc vân tay bằng khăn khô, không dùng cồn.", "Tra dầu ruột khóa cơ mỗi năm một lần."],
    "M3": ["Đặt thiết bị ở nơi cao, không để trong tủ kín.", "Khởi động lại theo lịch hằng tuần trong ứng dụng nếu nhà có trên 60 thiết bị."],
    "P1": ["Không cắm nối tiếp nhiều ổ P1.", "Không dùng ở nơi ẩm như phòng tắm hay ngoài trời."],
    "S4": ["Dùng đúng pin CR2450.", "Tránh gắn lên cửa kim loại dày hơn 3 mm nếu không có miếng đệm đi kèm."],
    "D6": ["Sạc khi pin còn 15%.", "Lau ống kính sau mưa bụi; không xịt nước áp lực."],
}

# title, steps, note
HOWTO = [
    ("Chia sẻ nhà cho người thân", ["Vào Tài khoản > Nhà của tôi > Thành viên.", "Chọn Mời thành viên và nhập số điện thoại.", "Chọn quyền: Xem, Điều khiển hoặc Quản trị.",
                                     "Người được mời bấm chấp nhận trong ứng dụng của họ trong 72 giờ."], "Mỗi nhà có tối đa 8 thành viên. Chỉ chủ nhà mới xoá được thành viên Quản trị."),
    ("Tạo mã số dùng một lần cho Lock L9", ["Mở Lock L9 trong ứng dụng, chọn Mã khách.", "Chọn Dùng một lần hoặc Theo khung giờ.", "Gửi mã 6 số cho khách qua tin nhắn."],
     "Mã dùng một lần hết hạn sau 6 giờ nếu chưa dùng. Cần firmware 1.9.3 trở lên."),
    ("Đổi mạng Wi-Fi cho camera", ["Mở camera trong ứng dụng, vào Cài đặt > Mạng.", "Chọn Đổi Wi-Fi và nhập mạng 2,4 GHz mới.", "Đưa mã QR ra trước ống kính khi camera yêu cầu."],
     "Không cần khôi phục cài đặt gốc. Video trên thẻ nhớ được giữ nguyên."),
    ("Đặt vùng riêng tư trên Cam O7", ["Vào Cài đặt > Hình ảnh > Vùng riêng tư.", "Vẽ tối đa 4 vùng che trên khung hình.", "Bấm Lưu; vùng che áp dụng cho cả xem trực tiếp và video lưu."],
     "Cần firmware 2.2.0 trở lên. Vùng đã che không khôi phục lại được trên video đã ghi."),
    ("Xuất toàn bộ dữ liệu cá nhân", ["Vào Tài khoản > Quyền riêng tư > Xuất dữ liệu.", "Xác nhận bằng mã gửi qua email.", "Tải tệp nén từ đường dẫn gửi về email."],
     "Tệp sẵn sàng trong 48 giờ và đường dẫn có hiệu lực 7 ngày."),
    ("Chuyển thiết bị sang tài khoản khác", ["Chủ cũ vào Thiết bị > Thông tin > Gỡ khỏi tài khoản.", "Khôi phục cài đặt gốc thiết bị.", "Chủ mới ghép thiết bị như thiết bị mới."],
     "Bảo hành đi theo số sê-ri, không theo tài khoản. Gói Cloud không chuyển được sang tài khoản khác."),
    ("Bật chế độ Vắng nhà", ["Trên màn hình chính bấm biểu tượng ngôi nhà.", "Chọn Vắng nhà.", "Kiểm tra danh sách camera và khóa sẽ được bật."],
     "Có từ ứng dụng bản 5.2.0. Có thể tự bật khi thành viên cuối cùng rời nhà quá 200 m."),
    ("Xem điện năng tiêu thụ của Plug P1", ["Mở Plug P1 trong ứng dụng.", "Chọn thẻ Điện năng.", "Chọn xem theo giờ, ngày hoặc tháng; bấm Xuất để nhận tệp CSV qua email."],
     "Dữ liệu được lưu 12 tháng. Đơn giá điện mặc định là 2.500 đ/kWh và sửa được trong Cài đặt."),
]

# name, trigger, actions, devices needed
SCENES = [
    ("Về nhà", "Mở Lock L9 bằng vân tay sau 18:00", "Bật Plug P1 đèn phòng khách, tắt chế độ Vắng nhà", "L9, P1, H2"),
    ("Đi ngủ", "22:30 hằng ngày", "Khóa cửa, bật ghi hình Cam C5 phòng khách, tắt mọi Plug P1 trừ tủ lạnh", "L9, C5, P1, H2"),
    ("Cửa mở ban đêm", "Sensor S4 báo mở cửa từ 23:00 đến 5:00", "Bật đèn hành lang 5 phút và gửi thông báo cho chủ nhà", "S4, P1, H2"),
    ("Có khách bấm chuông", "Bell D6 được bấm", "Cam O7 ở cổng quay 30 giây, loa trong nhà đổ chuông", "D6, O7"),
    ("Tiết kiệm điện", "Plug P1 đo công suất dưới 5 W trong 30 phút", "Tự ngắt ổ cắm", "P1"),
    ("Báo động", "Cam O7 phát hiện người khi đang ở chế độ Vắng nhà", "Bật còi và đèn của O7, gửi thông báo kèm ảnh", "O7"),
]

# month, total, phone, chat, email, CSAT, first-contact resolution, top reason
MONTHLY = [
    ("07/2026", 15_120, 9_070, 4_540, 1_510, "92,4%", "78,6%", "Camera ngoại tuyến (E201)"),
    ("08/2026", 16_040, 9_460, 4_970, 1_610, "93,0%", "79,4%", "Hỏi về gói Cloud và hoá đơn"),
    ("09/2026", 17_050, 9_890, 5_460, 1_700, "93,8%", "80,4%", "Camera ngoại tuyến (E201)"),
]

# id, date, title, duration, impact, cause, fix, compensation
INCIDENTS = [
    ("SC-2026-011", "2026-07-12", "Thông báo đẩy đến trễ", "2 giờ 35 phút (02:10–04:45)", "Khoảng 18.000 tài khoản nhận thông báo trễ 5–20 phút",
     "Hàng đợi thông báo bị nghẽn sau khi nhà cung cấp tin nhắn đổi chứng chỉ", "Gia hạn chứng chỉ, thêm cảnh báo khi hàng đợi vượt 10.000 tin", "Không bồi thường; gửi thư xin lỗi"),
    ("SC-2026-014", "2026-08-23", "Không xem lại được video trên Cloud", "3 giờ 20 phút (19:40–23:00)", "Toàn bộ khách dùng gói trả phí không xem lại được video; ghi hình không bị mất",
     "Cụm lưu trữ đầy 100% chỉ mục do tác vụ dọn dẹp bị tắt nhầm", "Bật lại tác vụ dọn dẹp, thêm cảnh báo ở mức 80%", "Tặng 7 ngày sử dụng cho mọi gói trả phí"),
    ("SC-2026-017", "2026-09-16", "Hub H2 báo E103 sai sau khi cập nhật 3.4.0", "48 giờ", "1.240 hub hiện E103 dù thiết bị vẫn trong vùng phủ",
     "Bảng định tuyến Zigbee được dựng lại chậm sau cập nhật", "Sửa phía máy chủ ngày 18/09/2026; không cần firmware mới", "Không bồi thường; tổng đài không tạo phiếu nếu lỗi tự hết"),
]

# warehouse -> quantity per product code, counted on 2026-10-01
WAREHOUSES = [("Kho Bắc", "Long Biên, Hà Nội"), ("Kho Trung", "Liên Chiểu, Đà Nẵng"), ("Kho Nam", "Thủ Đức, TP.HCM")]
STOCK = {"H2": (420, 150, 610), "C5": (1_180, 390, 1_540), "O7": (530, 210, 760), "L9": (260, 80, 340),
         "M3": (310, 120, 450), "P1": (2_400, 900, 3_100), "S4": (1_650, 520, 2_050), "D6": (380, 140, 520)}

# code, situation, text
MACROS = [
    ("KT-01", "Kết thúc liên hệ thông thường", "Cảm ơn anh/chị đã liên hệ Mộc Lan Home. Chúc anh/chị một ngày tốt lành."),
    ("KT-03", "Kết thúc cuộc gọi khi khách xúc phạm lần thứ ba", "Em rất tiếc không thể tiếp tục cuộc gọi này. Anh/chị vui lòng liên hệ lại khi thuận tiện; yêu cầu của anh/chị đã được ghi nhận."),
    ("BH-02", "Báo tiến độ bảo hành", "Thiết bị của anh/chị đang ở bước [bước]. Dự kiến trả ngày [ngày]. Anh/chị theo dõi trong ứng dụng, mục Hỗ trợ > Yêu cầu của tôi."),
    ("DT-01", "Xác nhận yêu cầu đổi trả", "Mộc Lan Home đã nhận yêu cầu đổi trả [mã DT]. Anh/chị gửi hàng trong 3 ngày; tiền được hoàn trong 5–7 ngày làm việc sau khi kho nhận hàng."),
    ("CL-04", "Khách hỏi vì sao bị xoá video khi hạ gói", "Khi hạ gói, video cũ hơn thời hạn của gói mới bị xoá sau 72 giờ. Anh/chị có thể tải video về máy trước thời điểm đó."),
    ("AN-01", "Từ chối đổi thông tin tài khoản khi chưa xác minh", "Để bảo vệ tài khoản, em chưa thể đổi thông tin khi chưa xác minh đủ. Anh/chị vui lòng mang giấy tờ đến trung tâm bảo hành gần nhất."),
    ("SC-01", "Thông báo sự cố hệ thống", "Hệ thống đang gặp sự cố [mô tả]. Đội kỹ thuật đang xử lý, dự kiến xong lúc [giờ]. Thiết bị tại nhà vẫn hoạt động bình thường."),
]

# question, answer
QUIZ = [
    ("Lock L9 lưu được bao nhiêu vân tay?", "100"), ("Hub H2 kết nối tối đa bao nhiêu thiết bị?", "120"), ("Pin của Sensor S4 là loại gì?", "CR2450"),
    ("Thời hạn đổi trả thông thường là bao nhiêu ngày?", "15 ngày"), ("Mesh M3 bảo hành bao lâu?", "36 tháng"), ("Camera C5 dùng băng tần Wi-Fi nào?", "2,4 GHz"),
    ("Nhập sai mã Lock L9 bao nhiêu lần thì khóa tạm ngưng?", "5 lần, tạm ngưng 3 phút"), ("Tải tối đa của Plug P1?", "2.500 W"),
    ("Gói Cloud nào lưu video 30 ngày?", "Family"), ("Đơn từ bao nhiêu thì miễn phí giao hàng?", "500.000 đ"),
    ("Tổng đài viên tự tặng mã giảm giá tối đa bao nhiêu?", "100.000 đ"), ("Mã phiếu bảo hành bắt đầu bằng gì?", "BH-2026"),
    ("Khách báo pin phồng thì làm gì?", "Chuyển Cấp 2 ngay và đánh dấu An toàn"), ("Thời gian bảo hành tại trung tâm?", "7 ngày làm việc"),
    ("Chuẩn chống nước của Cam O7?", "IP66"), ("Trung tâm nào làm việc cả Chủ nhật?", "TP.HCM"),
    ("Phí kiểm tra thiết bị hết bảo hành?", "80.000 đ"), ("Mỗi nhà mời được bao nhiêu thành viên?", "8"),
    ("Giữ máy tối đa bao lâu?", "90 giây"), ("Số nội bộ kỹ thuật viên trực Lock L9?", "8009"),
]

# city -> manager extension, parking, counters, pickup lockers, extra
CENTRE_DETAILS = {
    "Hà Nội": ("1101", "Gửi xe máy miễn phí; ô tô gửi tại bãi cách 80 m, 20.000 đ mỗi lượt", 6, "Có tủ nhận thiết bị 24/7", "Phòng trải nghiệm ở tầng 2, có nhà mẫu 40 m²."),
    "Đà Nẵng": ("2101", "Gửi xe máy và ô tô miễn phí trong sân", 3, "Không có tủ nhận thiết bị", "Nhận lắp đặt cho cả Quảng Nam và Thừa Thiên Huế."),
    "TP.HCM": ("3101", "Gửi xe máy miễn phí; không có chỗ đậu ô tô", 8, "Có tủ nhận thiết bị 24/7", "Sửa lấy ngay trong 90 phút cho Cam C5, Plug P1 và Sensor S4."),
    "Cần Thơ": ("4101", "Gửi xe máy miễn phí", 2, "Không có tủ nhận thiết bị", "Thiết bị được chuyển về TP.HCM vào thứ Ba và thứ Sáu hằng tuần, cộng thêm 3 ngày làm việc."),
}

# promotion code -> extra terms
PROMO_TERMS = {
    "ANTOAN15": ["Mỗi tài khoản mua tối đa 4 camera với giá giảm.", "Áp dụng trên website, ứng dụng và 4 trung tâm; không áp dụng tại đại lý.", "Miễn phí lắp đặt Cam C5 trong nội thành."],
    "SALE1111": ["Chỉ áp dụng trong ngày 11/11/2026, từ 0:00 đến 23:59.", "Số lượng: 500 bộ Mesh M3.", "3 tháng gói Plus được kích hoạt trong 30 ngày kể từ ngày giao hàng."],
    "BF2026": ["Không áp dụng cho Lock L9, phụ kiện và phí lắp đặt.", "Đơn trong chương trình vẫn được đổi trả 15 ngày.", "Giao hàng có thể chậm thêm 2 ngày do cao điểm."],
    "TET2027": ["Bell D6 giảm 50% phải mua cùng đơn với Lock L9.", "Lắp đặt sau ngày 20/01/2027 được hẹn sau Tết.", "Không đổi quà tặng thành tiền."],
}

INFOSEC_RULES = ["Khoá màn hình khi rời bàn; máy tự khoá sau 5 phút.", "Mật khẩu ít nhất 14 ký tự, đổi mỗi 180 ngày, bắt buộc xác thực hai lớp.",
                 "Không chép dữ liệu khách hàng ra USB, email cá nhân hay ứng dụng nhắn tin cá nhân.", "Không chụp ảnh màn hình phiếu hỗ trợ bằng điện thoại.",
                 "Xác minh khách bằng 2 trong 3 câu: số điện thoại đăng ký, 4 số cuối sê-ri thiết bị, ngày mua gần nhất.",
                 "Báo sự cố an ninh cho nhóm An toàn thông tin trong 30 phút qua số nội bộ 7007.", "Ghi âm cuộc gọi được lưu 180 ngày rồi tự xoá."]

PRIVACY = ["Dữ liệu thu thập: số điện thoại, email, địa chỉ giao hàng, số sê-ri thiết bị, nhật ký hoạt động của thiết bị.",
           "Video chỉ được lưu khi khách lắp thẻ nhớ hoặc đăng ký gói Cloud.", "Mộc Lan Home không bán dữ liệu cá nhân cho bên thứ ba.",
           "Nhật ký thiết bị được giữ 90 ngày; hoá đơn được giữ 10 năm theo quy định kế toán.",
           "Khách yêu cầu xoá tài khoản trong ứng dụng; tài khoản và video bị xoá trong 30 ngày.",
           "Liên hệ về dữ liệu cá nhân: baomat@moclanhome.example, trả lời trong 72 giờ."]

ZALO = {"start": "01/11/2026", "hours": "8:00–21:00", "reply": "5 phút trong giờ trực", "scope": "Tra cứu bảo hành, đổi lịch lắp đặt, hỏi khuyến mãi; không nhận thanh toán qua Zalo"}
GREEN_BATTERY = {"start": "10/2026", "reward": "Mỗi 10 viên pin cũ đổi một mã giảm 20.000 đ cho phụ kiện", "limit": "Tối đa 5 mã mỗi khách mỗi tháng"}
