// An invented working day in one project channel, for seeding a real Slack channel with
// `npm run seed`. It tells the same story as daily-report-sample.js with the noise a real
// channel has: greetings, lunch, side talk, a thread that goes nowhere.
// {KEY} is replaced by the Jira project key when seeding.

export const CHANNEL_DUMP = [
  { user: 'Hoa (PM)', text: 'Chào cả nhà. Hôm nay mọi người cập nhật tiến độ vào kênh này trước 17h giúp chị nhé, chiều chị gửi báo cáo cho khách.' },
  { user: 'Mai', text: 'Dạ chị. Sáng nay em xong {KEY}-101 rồi, màn hình đăng nhập đã merge vào main. Jira em chưa kịp chuyển trạng thái.' },
  {
    user: 'Nam', text: '{KEY}-102 đang kẹt: API danh sách tầng của bên toà nhà trả 500 từ hôm qua, em chưa test được dropdown.',
    replies: [
      { user: 'Hoa (PM)', text: 'Em gửi chị request mẫu và thời điểm lỗi, chị mail cho bên toà nhà ngay.' },
      { user: 'Nam', text: 'Em gửi rồi ạ: GET /api/buildings/tower-a/floors, lỗi từ khoảng 16h hôm qua.' },
      { user: 'Hoa (PM)', text: 'Chị đã mail, họ hẹn trả lời trong chiều nay.' },
    ],
  },
  { user: 'Duc', text: 'Em đang làm {KEY}-103 (màn hình xác nhận), được khoảng 60%, dự kiến xong ngày mai.' },
  { user: 'Lan (QA)', text: 'Cho em hỏi bản build sáng nay đã có {KEY}-101 chưa để em đưa vào vòng regression 2?' },
  { user: 'Mai', text: 'Có rồi chị, build #214.' },
  { user: 'Duc', text: 'Trưa nay ai đi ăn bún chả không ạ?' },
  { user: 'Nam', text: 'Em đi, 12h nhé.' },
  {
    user: 'Hoa (PM)', text: 'Chốt với khách: bản demo dời sang thứ Sáu 09/10, không demo thứ Năm nữa. Mọi người lưu ý.',
    replies: [
      { user: 'Duc', text: 'Vậy {KEY}-103 em có thêm một ngày, em sẽ làm luôn phần hiển thị người đi cùng.' },
      { user: 'Hoa (PM)', text: 'Ok em, nhưng đừng mở rộng thêm ngoài phần đó.' },
    ],
  },
  { user: 'Lan (QA)', text: 'QA báo: trên Safari nút Submit ở bước 3 bị che bởi footer. Em đã tạo {KEY}-107, mức độ cao, chưa có ai nhận.' },
  { user: 'Mai', text: 'Lỗi Safari đó chắc do position sticky của footer, chiều em xem thử nếu kịp.' },
  { user: 'Lan (QA)', text: 'Vòng regression 2 chạy được 40/55 case, chưa có case nào fail ngoài lỗi Safari ở trên.' },
  { user: 'Duc', text: 'Có ai biết môi trường staging dùng account nào để đăng nhập portal không ạ?' },
  {
    user: 'Nam', text: 'Mọi người nghĩ sao nếu mình cache danh sách tầng ở phía mình để không phụ thuộc API bên toà nhà?',
    replies: [
      { user: 'Mai', text: 'Em thấy hợp lý, tầng gần như không đổi.' },
      { user: 'Hoa (PM)', text: 'Để chị hỏi khách xem họ có chấp nhận dữ liệu trễ không đã, chưa quyết nhé.' },
    ],
  },
  { user: 'Nam', text: 'Cập nhật {KEY}-102: vẫn chưa thấy bên toà nhà trả lời. Nếu mai chưa có thì trễ so với hạn 08/10.' },
  { user: 'Mai', text: 'Em chưa kịp xem lỗi Safari. Mai em bắt đầu {KEY}-106, viết test cho luồng huỷ đăng ký.' },
  { user: 'Lan (QA)', text: 'Mai em chạy nốt 15 case còn lại của regression 2.' },
  { user: 'Hoa (PM)', text: 'Cảm ơn mọi người. Chị chốt báo cáo ngày nhé.' },
];
