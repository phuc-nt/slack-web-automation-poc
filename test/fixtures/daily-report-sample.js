// One invented project day: two channels and six Jira issues, in the shapes the Slack
// reader and the Jira reader return. Used by the tests and by `npm run report -- --sample`.
// What a careful reader should notice is listed in SAMPLE_EXPECTATIONS.

export const SAMPLE_DATE = '2026-10-06';

export const SAMPLE_CHANNELS = [
  {
    id: 'C0PROJECT',
    name: 'proj-visitor-dev',
    messages: [
      { time: '09:05', user: 'Mai', text: 'Sáng nay em xong VIS-101 rồi, màn hình đăng nhập đã merge vào main. Jira em chưa kịp chuyển trạng thái.' },
      {
        time: '09:20', user: 'Nam', text: 'VIS-102 đang kẹt: API danh sách tầng của bên toà nhà trả 500 từ hôm qua, em chưa test được dropdown.',
        replies: [
          { time: '09:31', user: 'Hoa', text: 'Chị đã mail cho bên toà nhà, họ hẹn trả lời trong chiều nay.' },
          { time: '15:40', user: 'Nam', text: 'Vẫn chưa thấy họ trả lời. Nếu mai chưa có thì VIS-102 trễ so với hạn 08/10.' },
        ],
      },
      { time: '10:02', user: 'Duc', text: 'Em đang làm VIS-103 (màn hình xác nhận), được khoảng 60%, dự kiến xong ngày mai.' },
      { time: '11:15', user: 'Hoa', text: 'Chốt với khách: bản demo dời sang thứ Sáu 09/10, không demo thứ Năm nữa. Mọi người lưu ý.' },
      { time: '14:10', user: 'Duc', text: 'Có ai biết môi trường staging dùng account nào để đăng nhập portal không ạ?' },
      { time: '16:30', user: 'Mai', text: 'Mai em bắt đầu VIS-106, viết test cho luồng huỷ đăng ký.' },
    ],
  },
  {
    id: 'C0QA',
    name: 'proj-visitor-qa',
    messages: [
      { time: '13:25', user: 'Lan', text: 'QA báo: trên Safari nút Submit ở bước 3 bị che bởi footer. Em đã tạo VIS-107, mức độ cao.' },
      { time: '13:50', user: 'Lan', text: 'Vòng regression 2 chạy được 40/55 case, chưa có case nào fail ngoài lỗi Safari ở trên.' },
    ],
  },
];

export const SAMPLE_ISSUES = [
  { key: 'VIS-101', summary: 'Login screen', type: 'Story', status: 'In Progress', done: false, assignee: 'Mai', priority: 'Medium', dueDate: '2026-10-06', updated: '2026-10-05' },
  { key: 'VIS-102', summary: 'Floor dropdown loads from building API', type: 'Story', status: 'In Progress', done: false, assignee: 'Nam', priority: 'High', dueDate: '2026-10-08', updated: '2026-10-05' },
  { key: 'VIS-103', summary: 'Confirmation screen', type: 'Story', status: 'In Progress', done: false, assignee: 'Duc', priority: 'Medium', dueDate: '2026-10-09', updated: '2026-10-06' },
  { key: 'VIS-104', summary: 'Audit log of submitted registrations', type: 'Task', status: 'To Do', done: false, assignee: 'Hoa', priority: 'Medium', dueDate: '2026-10-03', updated: '2026-09-28' },
  { key: 'VIS-105', summary: 'Parking plate validation', type: 'Task', status: 'To Do', done: false, assignee: '', priority: 'Low', dueDate: '2026-10-08', updated: '2026-09-30' },
  { key: 'VIS-107', summary: 'Safari: Submit button hidden by footer on step 3', type: 'Bug', status: 'To Do', done: false, assignee: '', priority: 'High', dueDate: '', updated: '2026-10-06' },
];

// Each entry: a fact the report must carry, as a pattern that must appear in it.
export const SAMPLE_EXPECTATIONS = [
  { name: 'finished in chat but still open in Jira', pattern: /VIS-101/ },
  { name: 'blocked issue', pattern: /VIS-102/ },
  { name: 'overdue issue nobody talked about', pattern: /VIS-104/ },
  { name: 'unassigned issue due in two days, not in chat', pattern: /VIS-105/ },
  { name: 'new bug from QA', pattern: /VIS-107/ },
  { name: 'demo moved to Friday', pattern: /09\/10|thứ Sáu|Friday/i },
];
