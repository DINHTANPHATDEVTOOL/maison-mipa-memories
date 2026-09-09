// ==============================================================================
// Maison MIPA Memories - 4-Step Guest Workflow Section (#6 & #16)
// ==============================================================================
import React from 'react';
import { CalendarCheck, Sparkles, Camera, FolderCheck } from 'lucide-react';

export const ProcessSection: React.FC = () => {
  const steps = [
    {
      num: '01',
      icon: CalendarCheck,
      title: 'Đặt Lịch Trực Tuyến',
      desc: 'Chọn concept, gói chụp, dịch vụ đi kèm và thời gian ưng ý qua cổng đặt lịch trực tuyến 24/7.',
    },
    {
      num: '02',
      icon: Sparkles,
      title: 'Tư Vấn Trang Phục',
      desc: 'Maison MIPA gửi hướng dẫn chuẩn bị trang phục theo concept và hỗ trợ chọn đồ tại studio.',
    },
    {
      num: '03',
      icon: Camera,
      title: 'Buổi Chụp Thư Thái',
      desc: 'Makeup chuyên nghiệp, chụp ảnh trong phòng studio khép kín với nhiếp ảnh gia giàu kinh nghiệm.',
    },
    {
      num: '04',
      icon: FolderCheck,
      title: 'Bàn Giao Google Drive',
      desc: 'Nhận 100% file gốc chất lượng cao ngay sau buổi chụp và link tải ảnh chỉnh sửa sắc nét qua Drive.',
    },
  ];

  return (
    <section style={{ padding: '4rem 1rem', backgroundColor: '#FFFDF6', borderTop: '1px solid var(--mipa-beige)', borderBottom: '1px solid var(--mipa-beige)' }}>
      <div style={{ maxWidth: '1350px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', maxWidth: '650px', margin: '0 auto 3rem' }}>
          <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.18em', color: '#8C6E53', fontWeight: 700 }}>
            QUY TRÌNH CHUẨN MỰC
          </div>
          <h2 style={{ fontSize: 'clamp(1.8rem, 4.5vw, 2.8rem)', color: '#604634', marginTop: '0.4rem', marginBottom: '0.8rem', fontFamily: 'var(--mipa-font-heading)', fontWeight: 700 }}>
            4 Bước Đơn Giản Cho Bộ Ảnh Hoàn Hảo
          </h2>
          <p style={{ color: '#6E5F55', fontSize: '1rem', lineHeight: 1.6 }}>
            Trải nghiệm dịch vụ chuyên nghiệp, minh bạch từ lúc chọn lịch đến khi nhận sản phẩm cuối cùng.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.num}
                style={{
                  position: 'relative',
                  padding: '1.8rem 1.4rem',
                  borderRadius: '20px',
                  backgroundColor: '#FAF8F5',
                  border: '1px solid var(--mipa-beige)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.8rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '12px',
                      backgroundColor: '#EFE6C9',
                      color: '#604634',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon size={20} color="#8C6E53" />
                  </div>
                  <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'rgba(140, 110, 83, 0.3)', fontFamily: 'var(--mipa-font-heading)' }}>
                    {step.num}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.2rem', color: '#604634', margin: 0, fontFamily: 'var(--mipa-font-heading)', fontWeight: 700 }}>
                  {step.title}
                </h3>
                <p style={{ color: '#6E5F55', fontSize: '0.88rem', lineHeight: 1.5, margin: 0 }}>
                  {step.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ProcessSection;
