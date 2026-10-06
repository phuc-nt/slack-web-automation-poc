# Slack Automation Platform: POC

Một nền tảng nhỏ nối Slack với các hệ thống khác (web app không có API, Jira) và dùng LLM cho phần đọc, viết ở giữa. Mỗi use case là một POC dùng lại cùng các kết nối. Hiện có hai POC:

- **Web form automation:** người dùng gửi yêu cầu từ Slack, hệ thống tự đăng nhập và điền form trên một web app bằng Playwright, dừng ở màn hình xác nhận, và chỉ gửi khi người yêu cầu bấm duyệt. Ví dụ mẫu là form đăng ký khách vào toà nhà trên một website giả lập (mock portal) đi kèm repo.
- **Daily report:** đọc tin nhắn trong ngày của các kênh dự án và issue trên Jira, nhờ LLM viết báo cáo ngày kèm phần đối chiếu giữa chat và Jira.

## Tài liệu

Tất cả bằng tiếng Anh. Đọc theo thứ tự:

1. [docs/01-platform-overview.md](docs/01-platform-overview.md): nền tảng gồm những khối nào (Slack, LLM, Jira, web app, AWS, Confluence trong tương lai), đã kiểm chứng được gì, lý do chọn dịch vụ, chi phí, rủi ro. Cho người ra quyết định.
2. [docs/02-platform-architecture.md](docs/02-platform-architecture.md): phần dùng chung, cách nối từng hệ thống bên ngoài, quy tắc mọi POC phải giữ, các bước thêm một POC mới. Cho kỹ sư.
3. [docs/03-aws-deployment.md](docs/03-aws-deployment.md): hạ tầng AWS, lệnh dựng từng bước, số đo, vận hành, chuyển LLM sang Amazon Bedrock.

Mỗi POC có tài liệu riêng:

- [docs/poc/01-web-form-automation.md](docs/poc/01-web-form-automation.md)
- [docs/poc/02-daily-report.md](docs/poc/02-daily-report.md)

README này chỉ nói cách chạy trên máy cá nhân.

## Chạy ở local

Cần Node.js 22 trở lên.

```bash
npm install
npx playwright install chromium
cp .env.example .env        # điền PORTAL_PASSWORD bất kỳ; các mục khác tuỳ chọn
```

Không cần Slack:

```bash
npm test                    # 42 test; phần form chạy browser thật trên mock portal
npm run demo                # cả luồng trong terminal, hỏi trước khi gửi
npm run demo -- --yes "Register guest Mr. Pham for tomorrow 9:00-10:00 to meet Ms. Vu at Tower B floor 3, purpose: site survey"
```

Đặt `BROWSER_HEADLESS=false` để nhìn browser tự điền form. Có `OPENROUTER_API_KEY` thì 11 trong số 42 test gọi model thật; không có thì app vẫn chạy và form mở trống.

Với một Slack workspace thật (Socket Mode, không cần URL công khai):

1. Vào `https://api.slack.com/apps`, chọn **Create New App → From a manifest**, dán nội dung `slack-app-manifest.yaml`.
2. **Basic Information → App-Level Tokens**: tạo token với scope `connections:write`, ghi vào `SLACK_APP_TOKEN`.
3. **Install App** vào workspace, ghi Bot User OAuth Token vào `SLACK_BOT_TOKEN`.
4. Chạy `npm run portal` và `npm run slack` ở hai terminal.
5. Trong Slack gõ `/visitor`, hoặc `/visitor` kèm một câu mô tả. Bản ghi đã gửi nằm tại `http://localhost:4010/api/submissions`.

Chỉ chạy một tiến trình Slack app cho mỗi app token: hai tiến trình sẽ chia nhau sự kiện.

## Câu thử cho `/visitor`

Mười câu mẫu (tiếng Anh, Việt, Nhật, viết tắt, thiếu thông tin, câu không hợp lệ) cùng kết quả mong đợi nằm trong `test/fixtures/free-text-requests.js`. Ví dụ:

```
/visitor Please register Ms. Tran Thi Mai from Example Trading Co. for tomorrow, 2pm to 3:30pm, to meet Le Van Nam at Tower A floor 12 for a quarterly review.
```

Gửi cùng một khách hai lần trùng giờ và duyệt cả hai để thấy lỗi do portal từ chối được chuyển nguyên văn về Slack.

## Daily report

POC thứ hai, không dùng browser: đọc tin nhắn trong ngày của các kênh dự án, đọc issue trên Jira, nhờ LLM viết báo cáo ngày kèm phần đối chiếu tiến độ (issue quá hạn, việc chat nói đã xong nhưng Jira chưa đóng, issue sắp tới hạn mà không ai nhắc tới), rồi đăng vào một kênh cố định.

Thử ngay với dữ liệu mẫu, chỉ cần `OPENROUTER_API_KEY`:

```bash
npm run report -- --sample
```

Chạy với Slack và Jira thật:

1. Cập nhật Slack app theo `slack-app-manifest.yaml` (thêm lệnh `/daily-report` và các scope đọc kênh), rồi cài lại app vào workspace.
2. Mời bot vào từng kênh cần đọc và kênh nhận báo cáo: `/invite @Visitor Registration`.
3. Điền nhóm biến `REPORT_*` trong `.env`; muốn có phần đối chiếu thì điền thêm nhóm `JIRA_*` (API token tạo tại `https://id.atlassian.com/manage-profile/security/api-tokens`).
4. `npm run report` in báo cáo ra terminal, thêm `--post` để đăng lên Slack. Khi `npm run slack` đang chạy, gõ `/daily-report` hoặc `/daily-report 2026-10-05`; đặt `REPORT_TIME=18:00` để tự đăng mỗi ngày.

Muốn có dữ liệu thử trên Slack và Jira thật mà không dùng dữ liệu dự án thật:

```bash
npm run seed:jira -- --post              # tạo 17 issue mẫu trong JIRA_PROJECT_KEY, nhãn daily-report-seed
npm run seed -- <channel ID> --post      # đăng 25 tin nhắn mẫu vào kênh, dùng đúng key issue vừa tạo
npm run report                           # in báo cáo ra terminal
```

Bỏ `--post` thì hai lệnh seed chỉ in ra những gì sẽ tạo. Mỗi issue mẫu là một tình huống báo cáo cần xử lý; bảng tình huống và kết quả nằm trong [docs/poc/02-daily-report.md](docs/poc/02-daily-report.md), mục 7. Lệnh seed vào kênh cần scope `chat:write.customize` (đã có trong manifest).

Báo cáo luôn được đăng vào `REPORT_POST_CHANNEL`, không gửi riêng cho người gõ lệnh. Nội dung chat và issue được gửi tới OpenRouter để viết báo cáo. Trả lời trong một thread cũ (mở từ ngày trước) không được đọc.

## Mock portal

Form là một wizard ba bước, cố ý có những thứ website thật hay có: dropdown tầng tải bất đồng bộ sau khi chọn toà nhà, dòng người đi cùng thêm theo yêu cầu, trường biển số chỉ hiện khi cần chỗ đậu xe, và màn hình xác nhận hiển thị nhãn thay cho giá trị thô.

Quy tắc của portal:

- Công ty bắt buộc với Contractor và Delivery; biển số bắt buộc khi cần chỗ đậu xe.
- Ngày thăm từ hôm nay tới 30 ngày sau; giờ thăm trong 07:00 đến 19:00.
- Tower A có 20 tầng, Tower B 12 tầng, Annex 3 tầng; Annex đóng cửa cuối tuần.
- Điện thoại 8 đến 15 chữ số; tối đa 4 người đi cùng.
- Một khách không được có hai đăng ký trùng giờ trong cùng ngày. Chỉ portal biết quy tắc này, nên nó chỉ lộ ra sau khi điền form.

## Cấu trúc

| Đường dẫn | Vai trò |
|---|---|
| `src/core/` | Định nghĩa trường và validation, điều phối job, secret store, logger |
| `src/worker/` | Playwright: đăng nhập, điền wizard, so khớp màn hình xác nhận, gửi |
| `src/llm/` | Gọi OpenRouter: điền sẵn form từ câu mô tả tự do, viết daily report |
| `src/report/` | Daily report: đọc kênh Slack, đọc Jira, dựng và đăng báo cáo |
| `src/slack/` | Modal, handler và điểm khởi động app Slack |
| `src/mock-portal/` | Website giả lập |
| `test/`, `test/fixtures/` | Test và dữ liệu mẫu: câu yêu cầu, một ngày chat, issue Jira |
| `scripts/` | Chạy form và daily report trong terminal; seed dữ liệu mẫu vào Slack và Jira |
| `docs/` | Tài liệu nền tảng và tài liệu từng POC |
| `Dockerfile` | Một image cho cả Slack app và mock portal |
