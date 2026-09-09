// ==============================================================================
// Maison MIPA Memories - Editorial FAQ Accordion Section (#6 & #16)
// Covers: Duration, Google Drive delivery, posing guidance, makeup,
// deposit VietQR, rescheduling policy, and raw file delivery.
// ==============================================================================
import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'Một buổi chụp tại Maison MIPA thường kéo dài bao lâu?',
    answer: 'Thời lượng tùy thuộc vào gói chụp bạn lựa chọn: Gói MIPA Basic kéo dài 60 phút, Gói MIPA Signature kéo dài 120 phút, và Gói Premium Luxury là 180 phút trọn vẹn. Thời gian này đã được studio tính toán kỹ lưỡng để bạn có thể trang điểm, thay trang phục và chụp thư thái mà không bị vội vã.',
  },
  {
    question: 'Quy trình nhận ảnh qua Google Drive như thế nào?',
    answer: 'Ngay sau buổi chụp, studio sẽ khởi tạo thư mục Google Drive riêng tư dành riêng cho bạn. Toàn bộ file ảnh gốc chất lượng cao sẽ được tải lên trong vòng 24 giờ. Link truy cập được lưu an toàn trong Customer Portal và gửi qua email xác nhận để bạn có thể xem và tải về mọi lúc.',
  },
  {
    question: 'Mình chưa từng chụp ảnh trước ống kính, studio có hướng dẫn pose dáng không?',
    answer: 'Bạn hoàn toàn có thể yên tâm. 100% buổi chụp tại Maison MIPA đều có nhiếp ảnh gia chuyên nghiệp tận tình trò chuyện, hướng dẫn góc mặt đẹp và gợi mở các dáng pose tự nhiên, mang lại không khí vui vẻ và thoải mái nhất.',
  },
  {
    question: 'Dịch vụ trang điểm (Makeup) và trang phục tại studio được hỗ trợ ra sao?',
    answer: 'Các gói chụp MIPA Signature và MIPA Premium Luxury đã bao gồm trọn gói dịch vụ trang điểm và làm tóc chuyên nghiệp theo concept. Studio chuẩn bị sẵn các dòng trang phục phong cách Pháp (váy ren vintage, vest, áo sơ mi lụa) phù hợp với bối cảnh phòng chụp.',
  },
  {
    question: 'Chính sách đặt cọc và thanh toán VietQR như thế nào?',
    answer: 'Để giữ lịch phòng và kíp chụp riêng tư, bạn thanh toán cọc 30% giá trị gói chụp qua mã VietQR chính xác được hệ thống sinh tự động. Sau khi hoàn tất chuyển khoản, trạng thái sẽ được xác nhận và gửi email thông báo. Số tiền còn lại bạn có thể thanh toán sau khi kết thúc buổi chụp tại studio.',
  },
  {
    question: 'Nếu có việc bận đột xuất, tôi có thể đổi lịch hoặc dời ngày chụp không?',
    answer: 'Bạn có thể gửi yêu cầu đổi lịch trực tiếp trên Customer Portal trước ít nhất 48 giờ so với giờ chụp. Maison MIPA sẽ hỗ trợ dời lịch sang khung giờ trống phù hợp và bảo lưu toàn bộ tiền cọc của bạn.',
  },
  {
    question: 'Tôi có được nhận lại toàn bộ file ảnh gốc không?',
    answer: 'Có. Maison MIPA cam kết tặng 100% file ảnh gốc sắc nét độ phân giải cao cho tất cả các gói chụp, không phụ thu phí mua ảnh gốc.',
  },
  {
    question: 'Ảnh chỉnh sửa hậu kỳ (retouch) sẽ hoàn thành trong bao lâu?',
    answer: 'Sau khi bạn chọn các tấm ảnh ưng ý trên album online, đội ngũ hậu kỳ của Maison MIPA sẽ tiến hành chỉnh sửa màu sắc, làm mịn da và trau chuốt ánh sáng theo tone màu Parisian trong khoảng 3–5 ngày làm việc.',
  },
];

export const FaqSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0); // first item open by default

  const toggleIndex = (idx: number) => {
    setOpenIndex((prev) => (prev === idx ? null : idx));
  };

  return (
    <section id="faq" style={{ padding: '4.5rem 1rem', backgroundColor: '#FAF8F5', borderTop: '1px solid var(--mipa-beige)' }}>
      <div style={{ maxWidth: '850px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.18em', color: '#8C6E53', fontWeight: 700 }}>
            HỎI ĐÁP & CHÍNH SÁCH
          </div>
          <h2 style={{ fontSize: 'clamp(1.8rem, 4.5vw, 2.8rem)', color: '#604634', marginTop: '0.4rem', marginBottom: '0.8rem', fontFamily: 'var(--mipa-font-heading)', fontWeight: 700 }}>
            Những Câu Hỏi Thường Gặp
          </h2>
          <p style={{ color: '#6E5F55', fontSize: '1rem', lineHeight: 1.6 }}>
            Mọi thông tin về quy trình, thời lượng, đặt cọc và bàn giao ảnh đều được giải đáp minh bạch.
          </p>
        </div>

        {/* Accordion List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                style={{
                  borderRadius: '16px',
                  backgroundColor: '#FFFDF6',
                  border: '1px solid var(--mipa-beige)',
                  overflow: 'hidden',
                  transition: 'box-shadow 0.2s ease',
                  boxShadow: isOpen ? '0 4px 15px rgba(96, 70, 52, 0.08)' : 'none',
                }}
              >
                <button
                  onClick={() => toggleIndex(idx)}
                  aria-expanded={isOpen}
                  style={{
                    width: '100%',
                    padding: '1.2rem 1.4rem',
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1rem',
                    cursor: 'pointer',
                    color: '#604634',
                    fontWeight: 600,
                    fontSize: '1rem',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <HelpCircle size={17} color="#C6A45F" style={{ flexShrink: 0 }} />
                    {item.question}
                  </span>
                  <ChevronDown
                    size={18}
                    color="#8C6E53"
                    style={{
                      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.3s ease',
                      flexShrink: 0,
                    }}
                  />
                </button>

                {isOpen && (
                  <div
                    style={{
                      padding: '0 1.4rem 1.4rem 2.8rem',
                      color: '#6E5F55',
                      fontSize: '0.92rem',
                      lineHeight: 1.7,
                      borderTop: '1px solid rgba(140, 110, 83, 0.1)',
                      paddingTop: '0.8rem',
                    }}
                  >
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FaqSection;
