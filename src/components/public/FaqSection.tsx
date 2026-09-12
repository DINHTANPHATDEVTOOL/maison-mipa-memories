// ==============================================================================
// Maison MIPA Memories — Editorial Minimalist FAQ Section
// Art Direction: Clean horizontal rule dividers, no card boxes, no decorative icons.
// ==============================================================================
import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'Có cần chuẩn bị trang phục trước khi đến chụp không?',
    answer: 'Studio có sẵn bộ sưu tập trang phục và phụ kiện phong cách Pháp nhẹ nhàng (váy ren, sơ mi lụa, vest tone trầm). Bạn cũng có thể mang theo trang phục cá nhân yêu thích, chuyên viên sẽ tư vấn phối hợp hài hòa với bối cảnh.',
  },
  {
    question: 'Bao lâu sau buổi chụp thì tôi nhận được ảnh?',
    answer: 'Toàn bộ file ảnh gốc chất lượng cao được tải lên thư mục Google Drive riêng tư của bạn trong vòng 24 giờ. Ảnh chỉnh sửa hậu kỳ (retouch) sẽ hoàn tất trong 3–5 ngày làm việc sau khi bạn chọn ảnh.',
  },
  {
    question: 'Tôi có được nhận lại toàn bộ file ảnh gốc không?',
    answer: 'Có. Maison MIPA tặng 100% file ảnh gốc sắc nét độ phân giải cao cho tất cả các gói chụp, hoàn toàn không phụ thu bất kỳ chi phí mua ảnh gốc nào.',
  },
  {
    question: 'Chính sách đặt cọc và thanh toán như thế nào?',
    answer: 'Để giữ lịch phòng và kíp chụp riêng tư, bạn thanh toán cọc 30% giá trị gói chụp qua mã chuyển khoản VietQR tự động. Số tiền còn lại bạn có thể thanh toán sau khi hoàn tất buổi chụp tại studio.',
  },
  {
    question: 'Nếu có việc bận đột xuất, tôi có thể đổi lịch chụp không?',
    answer: 'Bạn có thể yêu cầu dời lịch chụp trước ít nhất 48 giờ. Maison MIPA sẽ hỗ trợ đổi sang khung giờ trống thuận tiện cho bạn và bảo lưu trọn vẹn số tiền cọc đã thanh toán.',
  },
];

export const FaqSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleIndex = (idx: number) => {
    setOpenIndex((prev) => (prev === idx ? null : idx));
  };

  return (
    <section id="faq" className="editorial-section" style={{ backgroundColor: 'var(--editorial-bg)' }}>
      <div className="editorial-container-narrow">
        {/* Editorial Section Header */}
        <div style={{ marginBottom: '3.5rem', textAlign: 'left' }}>
          <span className="editorial-overline">HỎI ĐÁP & CHÍNH SÁCH</span>
          <h2 className="editorial-h2">Những câu hỏi thường gặp</h2>
          <p className="editorial-copy">
            Những thông tin cần thiết về trang phục, đặt cọc và quy trình bàn giao ảnh tại studio.
          </p>
        </div>

        {/* Minimalist Accordion List with Horizontal Dividers */}
        <div className="editorial-faq-list">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div key={idx} className="editorial-faq-item">
                <button
                  onClick={() => toggleIndex(idx)}
                  aria-expanded={isOpen}
                  className="editorial-faq-button"
                >
                  <span>{item.question}</span>
                  <ChevronDown
                    size={18}
                    style={{
                      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.25s ease',
                      flexShrink: 0,
                      color: 'var(--editorial-brown-accent)',
                    }}
                  />
                </button>

                {isOpen && (
                  <div className="editorial-faq-answer">
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
