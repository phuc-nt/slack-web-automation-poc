# Slack Automation Platform: POC

Một nền tảng nhỏ nối Slack với các hệ thống khác (web app không có API, Jira) và dùng LLM cho phần đọc, viết ở giữa. Mỗi use case là một POC dùng lại cùng các kết nối. Hiện có hai POC:

- **Web form automation:** người dùng gửi yêu cầu từ Slack, hệ thống tự đăng nhập và điền form trên một web app bằng Playwright, dừng ở màn hình xác nhận, và chỉ gửi khi người yêu cầu bấm duyệt. Ví dụ mẫu là form đăng ký khách vào toà nhà trên một website giả lập (mock portal) đi kèm repo.
- **Daily report:** đọc tin nhắn trong ngày của các kênh dự án và issue trên Jira, nhờ LLM viết báo cáo ngày kèm phần đối chiếu giữa chat và Jira.

## Tài liệu

Tất cả bằng tiếng Anh. Đọc theo thứ tự:

1. [docs/01-platform-overview.md](docs/01-platform-overview.md): nền tảng gồm những khối nào (Slack, LLM, Jira, web app, AWS, Confluence trong tương lai), đã kiểm chứng được gì, lý do chọn dịch vụ, chi phí, rủi ro. Cho người ra quyết định.
2. [docs/02-platform-architecture.md](docs/02-platform-architecture.md): phần dùng chung, cách nối từng hệ thống bên ngoài, quy tắc mọi POC phải giữ, các bước thêm một POC mới. Cho kỹ sư.
3. [docs/03-aws-deployment.md](docs/03-aws-deployment.md): dựng, kiểm chứng, vận hành và dọn môi trường AWS bằng template và script trong `infra/`; LLM trên Amazon Bedrock; kết quả kiểm chứng; xử lý sự cố. Cho kỹ sư triển khai.
4. [docs/04-operating-cost.md](docs/04-operating-cost.md): ước tính chi phí vận hành hằng tháng, từng khoản, và công thức để tính lại cho Region, model hay khối lượng khác.
5. [docs/05-prerequisites-and-access.md](docs/05-prerequisites-and-access.md): mọi công cụ, dịch vụ và tính năng cần dùng, kèm quyền phải xin và thứ phải đăng ký trước, theo từng giai đoạn tái hiện. Đọc trước khi bắt đầu.

6. [docs/06-dify-and-bedrock.md](docs/06-dify-and-bedrock.md): so sánh cơ bản Dify và Amazon Bedrock khi dựng một nền tảng AI nội bộ: mỗi bên là gì, làm được gì, độ tương thích với các dịch vụ AWS khác, phiên bản, license và chi phí. Cho người ra quyết định.
7. [docs/07-customer-support-bot-dify-vs-bedrock.md](docs/07-customer-support-bot-dify-vs-bedrock.md): một bot chăm sóc khách hàng trên Slack và trên web app, dựng bằng Dify thì thế nào, dựng bằng Bedrock thì thế nào, kèm diagram cho từng trường hợp và bảng so sánh. Cho người ra quyết định.
8. [docs/08-knowledge-base-chatbot.md](docs/08-knowledge-base-chatbot.md): chatbot trên Slack trả lời từ một kho kiến thức (Amazon Bedrock Managed Knowledge Base) lấy nội dung từ Confluence và SharePoint, kèm MCP server để các IDE agent dùng chung kho đó. Cho kỹ sư dựng lại trên môi trường của mình.
9. [docs/09-bedrock-managed-knowledge-base.md](docs/09-bedrock-managed-knowledge-base.md): giới thiệu Amazon Bedrock Managed Knowledge Base từ cơ bản: nó là gì, các connector, tính năng, cách index và cách tìm kiếm, phân quyền theo tài liệu, những gì cấu hình được, chi phí, và những gì repo này quan sát được khi dùng. Cho người mới tiếp cận dịch vụ này.

Tài liệu 6 và 7 là so sánh dựa trên tài liệu của hai nhà cung cấp, chưa dựng hay chạy thử trong repo này.

Mỗi POC có tài liệu riêng:

- [docs/poc/01-web-form-automation.md](docs/poc/01-web-form-automation.md)
- [docs/poc/02-daily-report.md](docs/poc/02-daily-report.md)
- [docs/poc/03-knowledge-base-chatbot.md](docs/poc/03-knowledge-base-chatbot.md)

Mỗi tài liệu POC mô tả một concept đã kiểm chứng, viết cho người ra quyết định và không kèm code: use case, cách hoạt động, các thành phần, các cơ chế an toàn, kết quả kiểm chứng, những quyền cần cấp cho team, ước tính chi phí, rủi ro và bước tiếp theo. Chi tiết kỹ thuật (module, cấu hình, triển khai AWS, bảng giá, danh sách quyền đầy đủ) nằm trong tài liệu 1 đến 5 và trong source code.

README này chỉ nói cách chạy; mọi giá trị riêng của từng môi trường (token, kênh, site Jira, AWS profile, Region) nằm trong `.env` và `infra/local.env`, cả hai đều không được commit.

## Chạy ở local

Cần Node.js 22 trở lên.

```bash
npm install
npx playwright install chromium
cp .env.example .env        # điền PORTAL_PASSWORD bất kỳ; các mục khác tuỳ chọn
```

Không cần Slack:

```bash
npm test                    # 44 test; phần form chạy browser thật trên mock portal
npm run demo                # cả luồng trong terminal, hỏi trước khi gửi
npm run demo -- --yes "Register guest Mr. Pham for tomorrow 9:00-10:00 to meet Ms. Vu at Tower B floor 3, purpose: site survey"
```

Đặt `BROWSER_HEADLESS=false` để nhìn browser tự điền form. Có LLM thì 11 trong số 44 test gọi model thật; không có thì app vẫn chạy và form mở trống. LLM chọn bằng `LLM_PROVIDER`: `openrouter` (mặc định, cần `OPENROUTER_API_KEY`) hoặc `bedrock` (Amazon Bedrock, mặc định model `zai.glm-4.7-flash`, dùng credential AWS sẵn có như `AWS_PROFILE`, không cần key).

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

Thử ngay với dữ liệu mẫu, chỉ cần một LLM (`OPENROUTER_API_KEY` hoặc `LLM_PROVIDER=bedrock`):

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

Bỏ `--post` thì hai lệnh seed chỉ in ra những gì sẽ tạo. Mỗi issue mẫu là một tình huống báo cáo cần xử lý; bảng tình huống và kết quả nằm trong [docs/02-platform-architecture.md](docs/02-platform-architecture.md), mục 7; bản tóm tắt theo nhóm kết quả nằm trong [docs/poc/02-daily-report.md](docs/poc/02-daily-report.md), mục 6. Lệnh seed vào kênh cần scope `chat:write.customize` (đã có trong manifest).

Báo cáo luôn được đăng vào `REPORT_POST_CHANNEL`, không gửi riêng cho người gõ lệnh. Nội dung chat và issue được gửi tới LLM đã chọn (OpenRouter hoặc Amazon Bedrock) để viết báo cáo. Trả lời trong một thread cũ (mở từ ngày trước) không được đọc.

## Chạy trên AWS

Cả hai POC chạy trong một task ECS Fargate, LLM gọi qua Amazon Bedrock bằng task role. Mọi tài nguyên nằm trong hai CloudFormation stack và mang tag `Project=slack-web-automation-poc`. Cần AWS CLI v2 đã đăng nhập, Docker, và `.env` đã điền; quyền cần có nằm trong [docs/05-prerequisites-and-access.md](docs/05-prerequisites-and-access.md), mục 6. Không chạy `npm run slack` ở local cùng lúc.

```bash
cp infra/local.env.example infra/local.env   # điền Region, CLI profile, múi giờ của bạn; file này bị git ignore

infra/poc.sh up                 # dựng tất cả theo profile private-nat (hoặc: up public)
infra/poc.sh verify             # task chạy một lần: IP ra ngoài, luồng form, báo cáo hôm nay
infra/poc.sh status             # stack, task đang chạy, IP ra ngoài, mọi tài nguyên có tag
infra/poc.sh pause | resume     # dừng hoặc chạy lại task
infra/poc.sh down               # xoá phần tốn tiền, giữ image và secret (khoảng 0,5 USD/tháng)
infra/poc.sh down --all         # xoá sạch
```

| Profile (`infra/profiles/`) | Mạng | Chi phí khi chạy cả tháng |
|---|---|---|
| `private-nat` | Private subnet, NAT Gateway, Elastic IP cố định | khoảng 82 USD |
| `public` | Public subnet, IP đổi mỗi lần task khởi động | khoảng 39 USD |

Chi phí là ví dụ theo giá niêm yết của một Region; bảng đầy đủ ở [docs/04-operating-cost.md](docs/04-operating-cost.md). Hướng dẫn chi tiết và kết quả kiểm chứng: [docs/03-aws-deployment.md](docs/03-aws-deployment.md).

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
| `src/llm/` | Gọi LLM (OpenRouter hoặc Amazon Bedrock): điền sẵn form từ câu mô tả tự do, viết daily report |
| `infra/` | CloudFormation, resource profile và script `poc.sh` để dựng, kiểm chứng và dọn môi trường AWS |
| `src/report/` | Daily report: đọc kênh Slack, đọc Jira, dựng và đăng báo cáo |
| `src/slack/` | Modal, handler và điểm khởi động app Slack |
| `src/mock-portal/` | Website giả lập |
| `test/`, `test/fixtures/` | Test và dữ liệu mẫu: câu yêu cầu, một ngày chat, issue Jira |
| `scripts/` | Chạy form và daily report trong terminal; seed dữ liệu mẫu vào Slack và Jira |
| `docs/` | Tài liệu nền tảng và tài liệu từng POC |
| `Dockerfile` | Một image cho cả Slack app và mock portal |
