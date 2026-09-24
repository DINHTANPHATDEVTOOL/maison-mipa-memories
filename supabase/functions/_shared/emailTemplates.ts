// ==============================================================================
// Maison MIPA Memories - Brand Transactional Email Templates
// Responsive, accessible, mobile-safe HTML email templates
// Production Verified: Real Hotline (0966 616 546), Real Email (maisonmipamemories@gmail.com),
// Context-specific notifications, and Direct Deep-Link Action Buttons.
// ==============================================================================

export interface TemplateData {
  customerName?: string;
  bookingCode?: string;
  serviceName?: string;
  packageName?: string;
  totalAmount?: number;
  depositAmount?: number;
  startAt?: string;
  transferReference?: string;
  albumUrl?: string;
  resetLink?: string;
  verifyLink?: string;
  [key: string]: any;
}

const BRAND_GOLD = '#C6A45F';
const BRAND_DARK = '#2C221E';
const BRAND_CARD = '#FFFFFF';
const BRAND_MUTED = '#8C6E53';

const STUDIO_HOTLINE = '0966 616 546';
const STUDIO_EMAIL = 'maisonmipamemories@gmail.com';
const STUDIO_ADDRESS = '88 Phan Sào Nam, Phường 11, Quận Tân Bình, TP. Hồ Chí Minh';

const emailHeader = `
  <div style="background-color: ${BRAND_DARK}; padding: 24px; text-align: center; border-radius: 12px 12px 0 0;">
    <h1 style="color: ${BRAND_GOLD}; font-family: 'Playfair Display', Georgia, serif; font-size: 24px; margin: 0; letter-spacing: 2px;">
      MAISON MIPA MEMORIES
    </h1>
    <p style="color: #EFE6C9; font-size: 12.5px; margin: 6px 0 0 0; letter-spacing: 1px;">
      Tiệm Ảnh Lưu Giữ Kỷ Niệm Thân Thương • Nhà là nơi lưu giữ ký ức
    </p>
  </div>
`;

const emailFooter = `
  <div style="padding: 24px 20px; text-align: center; color: ${BRAND_MUTED}; font-size: 12.5px; border-top: 1px solid #EFE6C9; margin-top: 30px; background-color: #FAF8F3; border-radius: 0 0 12px 12px;">
    <p style="margin: 0 0 6px 0; font-size: 14.5px; color: ${BRAND_DARK}; font-weight: 700;">
      Tiệm Ảnh Maison MIPA Memories
    </p>
    <p style="margin: 0 0 6px 0; color: #604634;">
      Hotline tụi mình: <a href="tel:0966616546" style="color: #047857; text-decoration: none; font-weight: 700;">${STUDIO_HOTLINE}</a> • Email: <a href="mailto:${STUDIO_EMAIL}" style="color: #604634; text-decoration: none; font-weight: 600;">${STUDIO_EMAIL}</a>
    </p>
    <p style="margin: 0 0 8px 0; color: #8C6E53; font-size: 12px;">
      Địa chỉ tiệm: ${STUDIO_ADDRESS}
    </p>
    <p style="margin: 0; color: #A39385; font-size: 11.5px;">
      Maison MIPA — Nhà là nơi lưu giữ ký ức. Tụi mình luôn ở đây và rất vui được đồng hành cùng bạn! ✨
    </p>
  </div>
`;

export function renderEmailHtml(templateKey: string, data: TemplateData): { subject: string; html: string } {
  // Support both camelCase and snake_case transparently
  const getVal = (...keys: string[]) => {
    for (const k of keys) {
      if (data[k] !== undefined && data[k] !== null && data[k] !== '') {
        return data[k];
      }
    }
    return undefined;
  };

  const formatVnd = (val?: number | null) => {
    const num = Number(val);
    if (isNaN(num) || num <= 0) return '0 đ';
    return num.toLocaleString('vi-VN') + ' đ';
  };

  const name = getVal('customerName', 'customer_name') || 'Quý khách';
  const bookingCode = getVal('bookingCode', 'booking_code') || '';
  const serviceName = getVal('serviceName', 'service_name') || 'Dịch Vụ Chụp Ảnh';
  const packageName = getVal('packageName', 'package_name') || 'Gói Chụp Maison MIPA';
  const durationMinutes = getVal('durationMinutes', 'duration_minutes');
  const conceptsCount = getVal('conceptsCount', 'concepts_count');
  const conceptNames = getVal('conceptNames', 'concept_names', 'concepts');
  const studioName = getVal('studioName', 'studio_name') || 'Tiệm ảnh Maison MIPA (Atelier ánh sáng tự nhiên tone ấm phong cách Pháp)';
  const startAt = getVal('startAt', 'start_at', 'bookingDate', 'booking_date') || 'Theo lịch hẹn';
  const subtotal = Number(getVal('subtotal', 'sub_total') || 0);
  const addonsData = getVal('addons', 'addon_names');
  const totalAmount = Number(getVal('totalAmount', 'total_amount') || 0);
  const depositAmount = Number(getVal('depositAmount', 'deposit_amount') || Math.round(totalAmount * 0.3));
  const remainingAmount = Math.max(0, totalAmount - depositAmount);
  const customerNote = getVal('customerNote', 'customer_note');

  // Customer direct URL deep-link to exact booking in account portal
  const customerDirectLink = bookingCode
    ? `https://maisonmipa.io.vn/account?tab=bookings&bookingCode=${encodeURIComponent(bookingCode)}`
    : `https://maisonmipa.io.vn/account`;

  // Admin/Studio direct deep-link to exact booking in management dashboard
  const adminDirectLink = data.directLink || (bookingCode
    ? `https://maisonmipa.io.vn/management?tab=dashboard&bookingCode=${encodeURIComponent(bookingCode)}&bookingId=${data.bookingId || data.id || ''}`
    : `https://maisonmipa.io.vn/management`);

  // Helper for generating standardized CTA buttons
  const renderCustomerCta = (buttonText: string = `👉 XEM CHI TIẾT ĐƠN ĐẶT LỊCH #${bookingCode}`) => `
    <div style="text-align: center; margin: 28px 0 16px;">
      <a href="${customerDirectLink}" style="background-color: ${BRAND_DARK}; color: ${BRAND_GOLD}; border: 2px solid ${BRAND_GOLD}; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14.5px; display: inline-block; letter-spacing: 0.5px; box-shadow: 0 4px 12px rgba(41, 35, 31, 0.2);">
        ${buttonText}
      </a>
      <p style="margin-top: 8px; font-size: 12px; color: #8C6E53;">
        Bấm nút trên để mở trực tiếp đơn đặt lịch và theo dõi tiến độ trên hệ thống Maison MIPA
      </p>
    </div>
  `;

  const renderAdminCta = (buttonText: string = `👉 XEM VÀ XỬ LÝ TRÊN HỆ THỐNG QUẢN LÝ`) => `
    <div style="text-align: center; margin: 28px 0 16px;">
      <a href="${adminDirectLink}" style="background-color: ${BRAND_DARK}; color: ${BRAND_GOLD}; border: 2px solid ${BRAND_GOLD}; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14.5px; display: inline-block; letter-spacing: 0.5px; box-shadow: 0 4px 12px rgba(41, 35, 31, 0.2);">
        ${buttonText}
      </a>
      <p style="margin-top: 8px; font-size: 12px; color: #8C6E53;">
        Bấm nút trên để mở trực tiếp đơn hàng trong trang điều phối & vận hành kíp chụp
      </p>
    </div>
  `;

  // Normalize key to lower-case for seamless matching
  const normalizedKey = (templateKey || data.event_type || data.eventType || data.template_key || data.templateKey || '').toLowerCase().trim();

  let subject = 'Thông báo từ Maison MIPA Memories';
  let bodyContent = '';

  switch (normalizedKey) {
    // --------------------------------------------------------------------------
    // 1. Khách đặt lịch mới — Chờ tiệm tư vấn & xác nhận cọc
    // --------------------------------------------------------------------------
    case 'booking_consultation_requested':
    case 'booking_created':
    case 'consultation_requested': {
      const serviceTitle = serviceName ? ` - ${serviceName}` : '';
      const packageTitle = packageName ? ` (${packageName})` : '';
      subject = `[Maison MIPA] Tụi mình đã nhận yêu cầu lịch chụp #${bookingCode} từ bạn nè ✨`;

      const conceptDisplay = Array.isArray(conceptNames) && conceptNames.length > 0
        ? conceptNames.join(', ')
        : (typeof conceptNames === 'string' ? conceptNames : (conceptsCount ? `${conceptsCount} concept bối cảnh` : 'Theo tư vấn cùng tiệm'));

      let addonDisplay = '';
      if (Array.isArray(addonsData) && addonsData.length > 0) {
        addonDisplay = addonsData
          .map((a: any) => typeof a === 'string' ? a : `${a.name}${a.lineTotal ? ` (${formatVnd(a.lineTotal)})` : ''}`)
          .join(', ');
      }

      bodyContent = `
        <h2 style="color: ${BRAND_DARK}; font-size: 21px; margin-top: 0; font-family: 'Playfair Display', Georgia, serif;">
          Maison MIPA mến chào bạn ${name},
        </h2>
        <p style="color: #604634; line-height: 1.6; font-size: 14.5px;">
          Tiệm ảnh Maison MIPA tụi mình rất vui và hạnh phúc khi nhận được lời nhắn của bạn. Cảm ơn bạn thật nhiều vì đã trao gửi những khoảnh khắc yêu thương cho tiệm nhé!
        </p>

        <div style="background: #FFFBEB; border: 1.5px solid #FCD34D; border-radius: 10px; padding: 16px; margin: 16px 0; color: #92400E; font-size: 14px; line-height: 1.5;">
          <strong>🌿 Nhắn nhỏ từ tiệm:</strong> Lịch hẹn của bạn hiện đang ở bước <strong>Chờ tư vấn</strong> nha. Tụi mình sẽ sớm liên hệ nhẹ nhàng qua điện thoại hoặc Zalo để trò chuyện, gợi ý concept thật xinh xắn, xác nhận lịch chụp và cùng bạn chuẩn bị buổi chụp trọn vẹn nhất.
        </div>

        <!-- Chi Tiết Yêu Cầu Tư Vấn -->
        <div style="background: #FAF6EE; border: 1.5px solid #E6D7B9; border-radius: 12px; padding: 20px; margin: 20px 0;">
          <div style="border-bottom: 1.5px solid #E6D7B9; padding-bottom: 10px; margin-bottom: 14px;">
            <div style="font-size: 16.5px; font-weight: 700; color: #604634; text-transform: uppercase; letter-spacing: 0.5px;">
              📸 Gói Chụp: ${packageName}
            </div>
            <div style="font-size: 13px; color: #8C6E53; margin-top: 3px; font-weight: 600;">
              Dịch vụ: ${serviceName} • Mã yêu cầu: <span style="font-family: monospace; color: #604634;">#${bookingCode}</span>
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse; font-size: 13.5px; color: #4A3525;">
            <tr>
              <td style="padding: 6px 0; width: 42%; color: #8C6E53;">⏱️ Khung giờ mong muốn:</td>
              <td style="padding: 6px 0; font-weight: 700; color: #2C221E;">${startAt}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #8C6E53;">📍 Địa điểm / Không gian:</td>
              <td style="padding: 6px 0; font-weight: 600;">${studioName}</td>
            </tr>
            ${durationMinutes ? `
            <tr>
              <td style="padding: 6px 0; color: #8C6E53;">⏳ Thời lượng dự kiến:</td>
              <td style="padding: 6px 0; font-weight: 600;">${durationMinutes} phút</td>
            </tr>` : ''}
            <tr>
              <td style="padding: 6px 0; color: #8C6E53;">🎨 Concept bối cảnh:</td>
              <td style="padding: 6px 0; font-weight: 600;">${conceptDisplay}</td>
            </tr>
            ${addonDisplay ? `
            <tr>
              <td style="padding: 6px 0; color: #8C6E53;">🎁 Dịch vụ kèm theo:</td>
              <td style="padding: 6px 0; font-weight: 600;">${addonDisplay}</td>
            </tr>` : ''}
            ${customerNote ? `
            <tr>
              <td style="padding: 6px 0; color: #8C6E53;">📝 Lời nhắn của bạn:</td>
              <td style="padding: 6px 0; font-weight: 500; font-style: italic;">"${customerNote}"</td>
            </tr>` : ''}
          </table>
        </div>

        <!-- Ước tính chi phí -->
        <div style="background: #FFFFFF; border: 1.5px solid #EFE6C9; border-radius: 12px; padding: 20px; margin: 20px 0;">
          <div style="font-size: 15px; font-weight: 700; color: #604634; border-bottom: 1px solid #EFE6C9; padding-bottom: 8px; margin-bottom: 12px;">
            💰 Chi Phí Dự Kiến
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: 700; color: #2C221E;">
            <span>Tổng chi phí dự kiến:</span>
            <span>${formatVnd(totalAmount || subtotal)}</span>
          </div>
          <p style="margin: 8px 0 0 0; font-size: 12.5px; color: #8C6E53;">
            * Chi phí chính xác và khoản cọc giữ lịch sẽ được thống nhất sau khi tiệm ảnh Maison MIPA trò chuyện cùng bạn nha.
          </p>
        </div>

        <p style="color: #604634; line-height: 1.6; font-size: 14px; text-align: center; margin-top: 20px;">
          Tụi mình chúc bạn một ngày thật ngọt ngào và an yên! ✨
        </p>

        ${renderCustomerCta(`👉 XEM CHI TIẾT YÊU CẦU ĐẶT LỊCH #${bookingCode}`)}
      `;
      break;
    }

    // --------------------------------------------------------------------------
    // 2. Xác nhận cọc & chốt lịch chính thức
    // --------------------------------------------------------------------------
    case 'deposit_received':
    case 'payment_received':
    case 'booking_confirmed':
    case 'deposit_confirmed':
    case 'confirmed': {
      subject = `[Maison MIPA] ✓ Lịch chụp #${bookingCode} của bạn đã được giữ chỗ thành công rồi nè! 🌿`;
      const confConceptDisplay = Array.isArray(conceptNames) && conceptNames.length > 0
        ? conceptNames.join(', ')
        : (typeof conceptNames === 'string' ? conceptNames : 'Theo tư vấn cùng tiệm');

      let confAddonDisplay = '';
      if (Array.isArray(addonsData) && addonsData.length > 0) {
        confAddonDisplay = addonsData
          .map((a: any) => typeof a === 'string' ? a : a.name)
          .join(', ');
      }

      bodyContent = `
        <h2 style="color: #047857; font-size: 21px; margin-top: 0; font-family: 'Playfair Display', Georgia, serif;">
          ✓ Đã Giữ Chỗ & Xác Nhận Lịch Chụp Thành Công
        </h2>
        <p style="color: #604634; line-height: 1.6; font-size: 14.5px;">
          Thương chào bạn ${name},
        </p>
        <p style="color: #604634; line-height: 1.6; font-size: 14.5px;">
          <strong>Tiệm ảnh Maison MIPA đã nhận được khoản cọc và giữ lịch chụp chính thức cho bạn rồi nhé!</strong> Tụi mình đang rất háo hức chờ ngày đón bạn ghé tiệm để cùng lưu giữ những bức hình thật ưng ý.
        </p>

        <!-- Card Chi Tiết Lịch Chụp Chính Thức -->
        <div style="background: #FAF6EE; border: 1.5px solid #E6D7B9; border-radius: 12px; padding: 20px; margin: 20px 0;">
          <div style="border-bottom: 1.5px solid #E6D7B9; padding-bottom: 10px; margin-bottom: 14px;">
            <div style="font-size: 16.5px; font-weight: 700; color: #604634; text-transform: uppercase;">
              📸 ${packageName}
            </div>
            <div style="font-size: 13px; color: #8C6E53; margin-top: 3px;">
              Dịch vụ: ${serviceName} • Mã đơn: <strong style="color: #604634; font-family: monospace;">#${bookingCode}</strong>
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse; font-size: 13.5px; color: #4A3525;">
            <tr>
              <td style="padding: 6px 0; width: 40%; color: #8C6E53;">Khách hàng:</td>
              <td style="padding: 6px 0; font-weight: 600;">${name} (${getVal('customerPhone', 'customer_phone') || ''})</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #8C6E53;">Thời gian chụp:</td>
              <td style="padding: 6px 0; font-weight: 700; color: #047857;">${startAt}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #8C6E53;">Địa điểm chụp:</td>
              <td style="padding: 6px 0; font-weight: 600;">${studioName}</td>
            </tr>
            ${durationMinutes ? `
            <tr>
              <td style="padding: 6px 0; color: #8C6E53;">Thời lượng:</td>
              <td style="padding: 6px 0; font-weight: 600;">${durationMinutes} phút</td>
            </tr>` : ''}
            <tr>
              <td style="padding: 6px 0; color: #8C6E53;">Concept:</td>
              <td style="padding: 6px 0; font-weight: 600;">${confConceptDisplay}</td>
            </tr>
            ${confAddonDisplay ? `
            <tr>
              <td style="padding: 6px 0; color: #8C6E53;">Dịch vụ kèm theo:</td>
              <td style="padding: 6px 0; font-weight: 600;">${confAddonDisplay}</td>
            </tr>` : ''}
          </table>
        </div>

        <!-- Bảng Kê Tài Chính -->
        <div style="background: #FFFFFF; border: 1.5px solid #EFE6C9; border-radius: 12px; padding: 20px; margin: 20px 0;">
          <div style="font-size: 15px; font-weight: 700; color: #604634; border-bottom: 1px solid #EFE6C9; padding-bottom: 8px; margin-bottom: 12px;">
            💰 Chi Tiết Chi Phí & Khoản Cọc Đã Nhận
          </div>

          <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #4A3525;">
            <tr>
              <td style="padding: 6px 0; color: #6E5F55;">Tổng giá trị buổi chụp:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 700;">${formatVnd(totalAmount)}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #047857;">Tiền cọc đã nhận:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 700; color: #047857;">${formatVnd(depositAmount)}</td>
            </tr>
            <tr style="border-top: 1px solid #EFE6C9;">
              <td style="padding: 10px 0 6px 0; font-weight: 700; color: #2C221E;">Số tiền còn lại thanh toán vào ngày chụp:</td>
              <td style="padding: 10px 0 6px 0; text-align: right; font-weight: 700; color: #B45309; font-size: 16px;">${formatVnd(remainingAmount)}</td>
            </tr>
          </table>
        </div>

        <p style="color: #604634; font-size: 13.5px; line-height: 1.5;">
          📍 <strong>Nhắn nhỏ từ tiệm:</strong> Bạn nhớ ghé tiệm trước tầm 15 phút để tụi mình cùng bạn chuẩn bị trang phục và makeup thật thảnh thơi, xinh đẹp nha!
        </p>

        ${renderCustomerCta(`👉 XEM CHI TIẾT LỊCH HẸN #${bookingCode}`)}
      `;
      break;
    }

    // --------------------------------------------------------------------------
    // 3. Khách dời lịch chụp sang ngày/giờ mới
    // --------------------------------------------------------------------------
    case 'booking_rescheduled':
    case 'rescheduled':
    case 'booking_reschedule': {
      const newSlot = getVal('newSlot', 'new_slot', 'rescheduleRequestedSlot', 'reschedule_slot', 'startTime') || '';
      const newDate = getVal('newDate', 'new_date', 'rescheduleRequestedDate', 'reschedule_date', 'bookingDate') || (startAt !== 'Theo lịch hẹn' ? startAt : 'Theo thỏa thuận');
      subject = `[Maison MIPA] Xác nhận cập nhật lịch chụp mới #${bookingCode} — Hẹn sớm gặp bạn nhé! ✨`;

      bodyContent = `
        <div style="background-color: #FEF3C7; border: 1.5px solid #F59E0B; border-radius: 10px; padding: 16px 20px; margin-bottom: 22px;">
          <h2 style="color: #92400E; font-size: 18px; margin: 0 0 6px 0;">
            🗓️ LỊCH CHỤP MỚI ĐÃ ĐƯỢC CẬP NHẬT THÀNH CÔNG
          </h2>
          <p style="color: #78350F; font-size: 13.5px; margin: 0; line-height: 1.5;">
            Thương chào bạn ${name}, tiệm ảnh Maison MIPA đã cập nhật lịch hẹn mới cho đơn <strong>#${bookingCode}</strong> theo đúng mong muốn của bạn rồi nha.
          </p>
        </div>

        <div style="background: #FAF6EE; border: 1.5px solid #E6D7B9; border-radius: 12px; padding: 20px; margin: 20px 0;">
          <div style="font-size: 15px; font-weight: 700; color: #604634; text-transform: uppercase; border-bottom: 1px solid #E6D7B9; padding-bottom: 8px; margin-bottom: 12px;">
            📸 Thông Tin Lịch Chụp Mới
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 13.5px; color: #4A3525;">
            <tr>
              <td style="padding: 6px 0; width: 40%; color: #8C6E53;">Mã đơn:</td>
              <td style="padding: 6px 0; font-weight: 700; font-family: monospace; color: #604634;">#${bookingCode}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #8C6E53;">Khách hàng:</td>
              <td style="padding: 6px 0; font-weight: 600;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #8C6E53;">Khung giờ mới:</td>
              <td style="padding: 6px 0; font-weight: 700; color: #047857; font-size: 14.5px;">${newDate} ${newSlot ? `(${newSlot})` : ''}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #8C6E53;">Gói chụp:</td>
              <td style="padding: 6px 0; font-weight: 600;">${packageName} (${serviceName})</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #8C6E53;">Địa điểm chụp:</td>
              <td style="padding: 6px 0; font-weight: 600;">${studioName}</td>
            </tr>
          </table>
        </div>

        <p style="color: #604634; font-size: 13px; line-height: 1.5;">
          📍 <strong>Địa chỉ tiệm:</strong> ${STUDIO_ADDRESS}. Bạn nhớ ghé tiệm trước tầm 15 phút để tụi mình cùng bạn chuẩn bị trang phục và makeup thật thảnh thơi, xinh xắn nha!
        </p>

        ${renderCustomerCta(`👉 XEM LỊCH HẸN MỚI #${bookingCode}`)}
      `;
      break;
    }

    // --------------------------------------------------------------------------
    // 4. Khách gửi yêu cầu hủy — Gửi xác nhận tiếp nhận cho khách hàng
    // --------------------------------------------------------------------------
    case 'customer_cancel_request_ack': {
      const cancelReason = getVal('cancelReason', 'cancel_reason', 'reason', 'customerNote') || 'Theo yêu cầu của bạn';
      subject = `[Maison MIPA] Đã tiếp nhận yêu cầu hủy lịch #${bookingCode} — Tụi mình luôn ở đây bạn nhé! ✨`;

      bodyContent = `
        <div style="background-color: #FEF2F2; border: 1.5px solid #FCA5A5; border-radius: 10px; padding: 16px 20px; margin-bottom: 22px;">
          <h2 style="color: #991B1B; font-size: 18px; margin: 0 0 6px 0;">
            ⏳ ĐÃ NHẬN LỜI NHẮN HỦY ĐƠN ĐẶT LỊCH
          </h2>
          <p style="color: #7F1D1D; font-size: 13.5px; margin: 0; line-height: 1.5;">
            Mến chào bạn ${name}, tiệm ảnh Maison MIPA đã nhận được lời nhắn của bạn về việc hủy đơn đặt lịch <strong>#${bookingCode}</strong>.
          </p>
        </div>

        <div style="background: #FFFDF9; border: 1.5px solid #FECDD3; border-radius: 12px; padding: 18px; margin: 18px 0;">
          <div style="font-size: 13px; font-weight: 700; color: #9F1239; margin-bottom: 6px;">
            📝 Lý do bạn đã nhắn gửi:
          </div>
          <div style="font-size: 14px; color: #881337; font-style: italic; background: #FFF1F2; padding: 10px 12px; border-radius: 6px;">
            "${cancelReason}"
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #4A3525; margin-top: 12px;">
            <tr>
              <td style="padding: 4px 0; width: 40%; color: #8C6E53;">Mã đơn:</td>
              <td style="padding: 4px 0; font-weight: 700;">#${bookingCode}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #8C6E53;">Gói chụp:</td>
              <td style="padding: 4px 0; font-weight: 600;">${packageName}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #8C6E53;">Lịch hẹn:</td>
              <td style="padding: 4px 0;">${startAt}</td>
            </tr>
          </table>
        </div>

        <p style="color: #604634; font-size: 13.5px; line-height: 1.5;">
          Tụi mình rất tiếc khi buổi chụp lần này chưa thể diễn ra. Bộ phận hỗ trợ của tiệm sẽ sớm liên hệ nhẹ nhàng với bạn qua điện thoại hoặc Zalo để hỗ trợ chu đáo nhất nhé.
        </p>

        ${renderCustomerCta(`👉 THEO DÕI TIẾN ĐỘ ĐƠN #${bookingCode}`)}
      `;
      break;
    }

    // --------------------------------------------------------------------------
    // 5. Đơn đặt lịch đã được duyệt hủy chính thức
    // --------------------------------------------------------------------------
    case 'booking_cancelled':
    case 'cancelled':
    case 'booking_cancel': {
      subject = `[Maison MIPA] Thông báo hủy lịch chụp #${bookingCode}`;
      const cancelReason = getVal('cancelReason', 'cancel_reason', 'reason', 'staffNote') || 'Đã duyệt hủy theo yêu cầu';

      bodyContent = `
        <div style="background-color: #FAF8F5; border: 1.5px solid #E6D7B9; border-radius: 10px; padding: 16px 20px; margin-bottom: 22px;">
          <h2 style="color: #604634; font-size: 18px; margin: 0 0 6px 0;">
            ĐƠN ĐẶT LỊCH ĐÃ ĐƯỢC DUYỆT HỦY
          </h2>
          <p style="color: #8C6E53; font-size: 13.5px; margin: 0; line-height: 1.5;">
            Mến chào bạn ${name}, tiệm ảnh Maison MIPA xin thông báo lịch chụp <strong>#${bookingCode}</strong> của bạn đã được hoàn tất thủ tục hủy trên hệ thống.
          </p>
        </div>

        <div style="background: #FAF6EE; border: 1.5px solid #E6D7B9; border-radius: 12px; padding: 18px; margin: 18px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13.5px; color: #4A3525;">
            <tr>
              <td style="padding: 6px 0; width: 40%; color: #8C6E53;">Mã đơn:</td>
              <td style="padding: 6px 0; font-weight: 700; font-family: monospace;">#${bookingCode}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #8C6E53;">Gói chụp:</td>
              <td style="padding: 6px 0; font-weight: 600;">${packageName} (${serviceName})</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #8C6E53;">Ngày chụp đã hủy:</td>
              <td style="padding: 6px 0; color: #DC2626; font-weight: 600;">${startAt}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #8C6E53;">Lý do hủy lịch:</td>
              <td style="padding: 6px 0; font-weight: 700; color: #604634; font-size: 14px;">"${cancelReason}"</td>
            </tr>
          </table>
        </div>

        <p style="color: #604634; font-size: 13.5px; line-height: 1.6;">
          Tiệm ảnh Maison MIPA rất tiếc khi buổi chụp lần này chưa thể diễn ra như dự định. Tụi mình luôn ở đây và rất mong sẽ sớm có dịp được đón bạn ghé tiệm chụp những bức hình thật ưng ý vào một ngày gần nhất nhé! Chúc bạn luôn thật nhiều niềm vui và an lành! ✨
        </p>

        ${renderCustomerCta(`👉 XEM TRẠNG THÁI ĐƠN HÀNG #${bookingCode}`)}
      `;
      break;
    }

    // --------------------------------------------------------------------------
    // 6. Cảnh báo quản lý: Khách gửi yêu cầu hủy đơn
    // --------------------------------------------------------------------------
    case 'admin_cancel_request_alert':
    case 'studio_cancel_request_notification': {
      const cancelReason = getVal('cancelReason', 'cancel_reason', 'reason', 'customerNote') || 'Khách hàng không cung cấp lý do';
      const phone = getVal('customerPhone', 'customer_phone') || 'Chưa cung cấp';
      const email = getVal('customerEmail', 'customer_email') || 'Chưa cung cấp';
      const bookingDate = getVal('bookingDate', 'booking_date') || startAt;

      subject = `[Maison MIPA] 🚨 YÊU CẦU HỦY ĐƠN #${bookingCode} — ${name} (${phone})`;
      bodyContent = `
        <div style="background: #FEF2F2; border-left: 5px solid #DC2626; padding: 16px 20px; border-radius: 8px; margin-bottom: 24px;">
          <h2 style="color: #991B1B; font-size: 18px; margin: 0 0 6px 0; display: flex; align-items: center; gap: 8px;">
            🚨 KHÁCH HÀNG YÊU CẦU HỦY ĐƠN ĐẶT LỊCH
          </h2>
          <p style="color: #7F1D1D; font-size: 13.5px; margin: 0; line-height: 1.5;">
            Khách hàng <strong>${name}</strong> vừa gửi yêu cầu hủy đơn chụp <strong>#${bookingCode}</strong> trên trang cá nhân. Vui lòng liên hệ khách hoặc duyệt hủy để giải phóng slot chụp.
          </p>
        </div>

        <!-- Khung lý do hủy -->
        <div style="background: #FFF1F2; border: 1.5px solid #FECDD3; border-radius: 12px; padding: 16px 18px; margin-bottom: 20px;">
          <div style="font-size: 13px; font-weight: 700; color: #9F1239; text-transform: uppercase; margin-bottom: 6px;">
            📝 Lý Do Khách Hàng Muốn Hủy:
          </div>
          <div style="font-size: 14.5px; color: #881337; font-style: italic; background: #FFFFFF; padding: 12px 14px; border-radius: 8px; border: 1px dashed #FDA4AF; line-height: 1.5;">
            "${cancelReason}"
          </div>
        </div>

        <!-- Thông Tin Khách Hàng -->
        <div style="background: #FFFFFF; border: 1.5px solid #EFE6C9; border-radius: 12px; padding: 18px; margin-bottom: 20px;">
          <div style="font-size: 14px; font-weight: 700; color: #604634; text-transform: uppercase; border-bottom: 1px solid #EFE6C9; padding-bottom: 8px; margin-bottom: 12px;">
            👤 Thông Tin Khách Hàng Cần Liên Hệ
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 13.5px; color: #2C221E;">
            <tr>
              <td style="padding: 5px 0; width: 38%; color: #8C6E53;">Họ tên khách:</td>
              <td style="padding: 5px 0; font-weight: 700; color: #604634;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #8C6E53;">Số điện thoại:</td>
              <td style="padding: 5px 0; font-weight: 700;">
                <a href="tel:${phone}" style="color: #047857; text-decoration: none; font-size: 14.5px;">📞 ${phone} (Bấm để gọi ngay)</a>
              </td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #8C6E53;">Email liên hệ:</td>
              <td style="padding: 5px 0;">
                <a href="mailto:${email}" style="color: #604634; text-decoration: none;">✉️ ${email}</a>
              </td>
            </tr>
          </table>
        </div>

        <!-- Chi Tiết Đơn Đặt Lịch -->
        <div style="background: #FFFFFF; border: 1.5px solid #EFE6C9; border-radius: 12px; padding: 18px; margin-bottom: 22px;">
          <div style="font-size: 14px; font-weight: 700; color: #604634; text-transform: uppercase; border-bottom: 1px solid #EFE6C9; padding-bottom: 8px; margin-bottom: 12px;">
            📸 Chi Tiết Kíp Chụp Cần Xử Lý
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 13.5px; color: #2C221E;">
            <tr>
              <td style="padding: 5px 0; width: 38%; color: #8C6E53;">Mã đơn đặt lịch:</td>
              <td style="padding: 5px 0; font-weight: 700; font-family: monospace; color: #8C6E53;">#${bookingCode}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #8C6E53;">Gói chụp:</td>
              <td style="padding: 5px 0; font-weight: 700; color: #604634;">${packageName} — ${serviceName}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #8C6E53;">Thời gian đã chọn:</td>
              <td style="padding: 5px 0; font-weight: 700; color: #B45309;">${startAt || bookingDate}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #8C6E53;">Không gian / Địa điểm:</td>
              <td style="padding: 5px 0;">${studioName}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #8C6E53;">Tổng giá trị đơn:</td>
              <td style="padding: 5px 0; font-weight: 700;">${formatVnd(totalAmount || subtotal)}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #8C6E53;">Tiền cọc:</td>
              <td style="padding: 5px 0; font-weight: 700; color: #047857;">${formatVnd(depositAmount)}</td>
            </tr>
          </table>
        </div>

        ${renderAdminCta(`👉 XEM VÀ XỬ LÝ YÊU CẦU HỦY ĐƠN #${bookingCode}`)}
      `;
      break;
    }

    // --------------------------------------------------------------------------
    // 7. Cảnh báo quản lý: Khách mới đặt lịch hẹn
    // --------------------------------------------------------------------------
    case 'admin_new_booking_alert':
    case 'studio_new_booking_notification': {
      const phone = getVal('customerPhone', 'customer_phone') || 'Chưa cung cấp';
      const email = getVal('customerEmail', 'customer_email') || 'Chưa cung cấp';
      subject = `[Maison MIPA] 🔔 ĐƠN ĐẶT LỊCH MỚI #${bookingCode} — ${name} (${phone}) — ${packageName}`;

      const conceptDisplayAdmin = Array.isArray(conceptNames) && conceptNames.length > 0
        ? conceptNames.join(', ')
        : (typeof conceptNames === 'string' ? conceptNames : (getVal('conceptNames', 'concept_names') || 'Theo tư vấn tiệm ảnh'));

      let addonDisplayAdmin = 'Không có';
      if (getVal('addonNames', 'addon_names')) {
        addonDisplayAdmin = String(getVal('addonNames', 'addon_names'));
      } else if (Array.isArray(addonsData) && addonsData.length > 0) {
        addonDisplayAdmin = addonsData
          .map((a: any) => typeof a === 'string' ? a : `${a.name}${a.lineTotal ? ` (${formatVnd(a.lineTotal)})` : ''}`)
          .join(', ');
      }

      bodyContent = `
        <div style="background-color: #FEF3C7; border: 1.5px solid #F59E0B; border-radius: 10px; padding: 16px 20px; margin-bottom: 22px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 20px;">🔔</span>
            <strong style="color: #92400E; font-size: 15.5px; text-transform: uppercase; letter-spacing: 0.5px;">
              Khách Hàng Mới Đặt Lịch Tư Vấn — Cần Phản Hồi Ngay!
            </strong>
          </div>
          <p style="margin: 8px 0 0; color: #78350F; font-size: 13.5px; line-height: 1.5;">
            Khách hàng vừa gửi yêu cầu đặt lịch hẹn từ website. Khách <strong>CHƯA XÁC NHẬN CỌC</strong>. Vui lòng liên hệ với khách qua Số điện thoại hoặc Zalo ngay để tư vấn concept, chốt kíp chụp và hướng dẫn thanh toán cọc.
          </p>
        </div>

        <!-- Thông Tin Khách Hàng -->
        <div style="background: #FDFBF7; border: 1.5px solid #EFE6C9; border-radius: 12px; padding: 18px; margin-bottom: 20px;">
          <div style="font-size: 14px; font-weight: 700; color: #604634; text-transform: uppercase; border-bottom: 1px solid #EFE6C9; padding-bottom: 8px; margin-bottom: 12px;">
            👤 Thông Tin Khách Hàng
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 13.5px; color: #2C221E;">
            <tr>
              <td style="padding: 5px 0; width: 38%; color: #8C6E53;">Họ & Tên:</td>
              <td style="padding: 5px 0; font-weight: 700; font-size: 14.5px;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #8C6E53;">Số điện thoại / Zalo:</td>
              <td style="padding: 5px 0; font-weight: 700;">
                <a href="tel:${phone}" style="color: #B45309; text-decoration: none; font-size: 15px;">📞 ${phone} (Bấm để gọi ngay)</a>
              </td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #8C6E53;">Email liên hệ:</td>
              <td style="padding: 5px 0;">
                <a href="mailto:${email}" style="color: #604634; text-decoration: none;">✉️ ${email}</a>
              </td>
            </tr>
            ${customerNote ? `
            <tr>
              <td style="padding: 5px 0; color: #8C6E53;">Ghi chú của khách:</td>
              <td style="padding: 5px 0; font-style: italic; color: #B45309; background: #FFFBEB; padding: 6px 10px; border-radius: 6px;">
                "${customerNote}"
              </td>
            </tr>` : ''}
          </table>
        </div>

        <!-- Chi Tiết Lịch Chụp -->
        <div style="background: #FFFFFF; border: 1.5px solid #EFE6C9; border-radius: 12px; padding: 18px; margin-bottom: 22px;">
          <div style="font-size: 14px; font-weight: 700; color: #604634; text-transform: uppercase; border-bottom: 1px solid #EFE6C9; padding-bottom: 8px; margin-bottom: 12px;">
            📸 Chi Tiết Gói & Thời Gian Khách Đặt
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 13.5px; color: #2C221E;">
            <tr>
              <td style="padding: 5px 0; width: 38%; color: #8C6E53;">Mã đơn đặt lịch:</td>
              <td style="padding: 5px 0; font-weight: 700; font-family: monospace; color: #8C6E53;">#${bookingCode}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #8C6E53;">Gói chụp:</td>
              <td style="padding: 5px 0; font-weight: 700; color: #604634;">${packageName} — ${serviceName}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #8C6E53;">Thời gian chụp yêu cầu:</td>
              <td style="padding: 5px 0; font-weight: 700; color: #B45309;">${startAt}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #8C6E53;">Không gian / Địa điểm:</td>
              <td style="padding: 5px 0;">${studioName}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #8C6E53;">Concept lựa chọn:</td>
              <td style="padding: 5px 0;">${conceptDisplayAdmin}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #8C6E53;">Dịch vụ cộng thêm:</td>
              <td style="padding: 5px 0;">${addonDisplayAdmin}</td>
            </tr>
            <tr style="border-top: 1px dashed #EFE6C9;">
              <td style="padding: 7px 0; color: #8C6E53; font-weight: 600;">Tổng giá trị dự kiến:</td>
              <td style="padding: 7px 0; font-weight: 700; font-size: 15px; color: #2C221E;">${formatVnd(totalAmount || subtotal)}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #8C6E53;">Khoản cọc dự kiến (30%):</td>
              <td style="padding: 5px 0; font-weight: 700; color: #047857;">${formatVnd(depositAmount)}</td>
            </tr>
          </table>
        </div>

        ${renderAdminCta(`👉 TRUY CẬP TRỰC TIẾP ĐƠN ĐẶT LỊCH #${bookingCode}`)}
      `;
      break;
    }

    // --------------------------------------------------------------------------
    // 8. Bộ ảnh kỷ niệm đã hoàn tất (Giao ảnh Google Drive)
    // --------------------------------------------------------------------------
    case 'album_ready':
    case 'delivered':
    case 'photos_delivered': {
      subject = `[Maison MIPA] ✨ Những bức hình xinh xắn của bạn đã hoàn tất rồi nè! #${bookingCode}`;
      const albumLink = data.albumUrl || data.finalFolderUrl || data.driveFolderUrl || customerDirectLink;

      bodyContent = `
        <div style="background-color: #ECFDF5; border: 1.5px solid #10B981; border-radius: 12px; padding: 20px; margin-bottom: 22px; text-align: center;">
          <h2 style="color: #065F46; font-size: 20px; margin: 0 0 8px 0; font-family: 'Playfair Display', Georgia, serif;">
            ✨ BỘ ẢNH KỶ NIỆM CỦA BẠN ĐÃ HOÀN TẤT!
          </h2>
          <p style="color: #047857; font-size: 14.5px; margin: 0; line-height: 1.5;">
            Maison MIPA mến chào ${name} thương mến 🥰
          </p>
        </div>

        <p style="color: #604634; line-height: 1.7; font-size: 14.5px; margin: 0 0 14px 0;">
          Tụi mình vui mừng thông báo những bức hình xinh xắn trong buổi chụp của bạn (Mã đơn <strong>#${bookingCode}</strong>) đã được tụi mình hoàn thiện hậu kỳ chu đáo, tỉ mỉ rồi nè!
        </p>

        <p style="color: #604634; line-height: 1.7; font-size: 14.5px; margin: 0 0 20px 0;">
          Từng khoảnh khắc dịu dàng và ngập tràn cảm xúc đã được tụi mình nâng niu gửi trọn vào album này. Mời bạn bấm vào nút bên dưới để ngắm nghía và tải về trọn bộ ảnh chất lượng cao nha:
        </p>

        <div style="text-align: center; margin: 26px 0 22px;">
          <a href="${albumLink}" style="background-color: #047857; color: #FFFFFF; padding: 15px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 14px rgba(4, 120, 87, 0.25);">
            📥 NGẮM & TẢI BỘ ẢNH TRÊN GOOGLE DRIVE
          </a>
        </div>

        <div style="background: #FDFBF7; border: 1px solid #EFE6C9; border-radius: 10px; padding: 14px 16px; margin: 18px 0; font-size: 13.5px; color: #8C6E53; line-height: 1.6;">
          💡 <em>Nếu bạn cần tiệm hỗ trợ thêm gì về màu ảnh, kích thước in ấn hay đóng khung kỷ niệm, bạn cứ thoải mái nhắn tin cho tụi mình nhé, tiệm luôn sẵn lòng đồng hành cùng bạn!</em>
        </div>

        ${renderCustomerCta(`👉 Xem thông tin đơn hàng tại tiệm`)}
      `;
      break;
    }

    // --------------------------------------------------------------------------
    // 9. Nhắc thanh toán cọc giữ lịch
    // --------------------------------------------------------------------------
    case 'pending_deposit': {
      subject = `[Maison MIPA] 💌 Nhắc bạn chút xíu về khoản cọc giữ lịch #${bookingCode}`;
      bodyContent = `
        <h2 style="color: ${BRAND_DARK}; font-size: 20px; margin-top: 0; font-family: 'Playfair Display', Georgia, serif;">
          Maison MIPA thương chào ${name} ✨,
        </h2>
        <p style="color: #604634; line-height: 1.7; font-size: 14.5px;">
          Tụi mình xin gửi lời nhắc nhẹ nhàng về đơn đặt lịch <strong>#${bookingCode}</strong> (${packageName}) mà bạn đã đặt tại tiệm nè.
        </p>
        <p style="color: #604634; line-height: 1.7; font-size: 14.5px;">
          Để giữ trọn khung giờ đẹp này và để tụi mình chuẩn bị không gian thật tươm tất, chu đáo đón bạn, bạn vui lòng hoàn tất khoản cọc giữ chỗ giúp tụi mình nha:
        </p>
        <div style="background: #FFFBEB; border: 1.5px solid #FCD34D; border-radius: 10px; padding: 18px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0; color: #92400E; font-size: 15px;"><strong>Khoản cọc giữ lịch (30%):</strong> <span style="font-size: 17px; font-weight: 700; color: #047857;">${formatVnd(depositAmount)}</span></p>
          <p style="margin: 0 0 8px 0; color: #92400E; font-size: 14px;"><strong>Thời gian hẹn:</strong> ${startAt}</p>
          <p style="margin: 0; color: #B45309; font-size: 13px; line-height: 1.5;">
            🌸 <em>Bạn giúp tụi mình hoàn tất sớm trong vòng 24 giờ để khung giờ chụp của bạn được giữ trọn vẹn nghen!</em>
          </p>
        </div>

        ${renderCustomerCta(`👉 XEM ĐƠN & GỬI CỌC GIỮ LỊCH #${bookingCode}`)}

        <p style="color: #8C6E53; font-size: 13.5px; line-height: 1.6; margin-top: 18px;">
          Nếu bạn có bất kỳ băn khoăn nào hoặc muốn đổi khung giờ, cứ thoải mái nhắn tin qua Hotline/Zalo cho tụi mình để tiệm hỗ trợ bạn ngay nha!
        </p>
      `;
      break;
    }

    // --------------------------------------------------------------------------
    // 10. Nhắc lịch chụp ngày mai
    // --------------------------------------------------------------------------
    case 'shoot_reminder': {
      subject = `[Maison MIPA] 🌿 Mai tụi mình có hẹn chụp ảnh cùng nhau rồi nè! #${bookingCode}`;
      bodyContent = `
        <h2 style="color: ${BRAND_DARK}; font-size: 20px; margin-top: 0; font-family: 'Playfair Display', Georgia, serif;">
          Maison MIPA thương chào ${name} ✨,
        </h2>
        <p style="color: #604634; line-height: 1.7; font-size: 14.5px;">
          Ngày mai tụi mình sẽ được gặp nhau rồi, tiệm ảnh Maison MIPA đang rất háo hức chờ đón bạn nè! 🥰
        </p>
        <p style="color: #604634; line-height: 1.7; font-size: 14.5px;">
          Tụi mình xin gửi bạn một chút thông tin tóm tắt cho buổi hẹn ngày mai nghen:
        </p>
        <div style="background: #FDFBF7; border: 1.5px solid #EFE6C9; border-radius: 12px; padding: 18px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0; color: ${BRAND_DARK}; font-size: 14px;"><strong>Mã đơn:</strong> <span style="font-family: monospace; font-weight: 700; color: #8C6E53;">#${bookingCode}</span></p>
          <p style="margin: 0 0 8px 0; color: #047857; font-weight: 700; font-size: 15px;"><strong>Thời gian hẹn:</strong> ${startAt}</p>
          <p style="margin: 0 0 8px 0; color: ${BRAND_DARK}; font-size: 14px;"><strong>Gói chụp:</strong> ${packageName} (${serviceName})</p>
          <p style="margin: 0; color: #8C6E53; font-size: 14px;"><strong>Địa chỉ tiệm:</strong> ${STUDIO_ADDRESS}</p>
        </div>

        <div style="background: #FAF6EE; border-left: 4px solid ${BRAND_GOLD}; border-radius: 0 8px 8px 0; padding: 14px 16px; margin: 18px 0; font-size: 13.5px; color: #604634; line-height: 1.6;">
          <strong style="color: #8C6E53;">✨ Một vài lời dặn dò nho nhỏ từ tụi mình:</strong>
          <ul style="margin: 6px 0 0 0; padding-left: 18px;">
            <li>Tối nay bạn nhớ ngủ sớm và uống đủ nước để mai có một tinh thần và làn da thật rạng rỡ nha.</li>
            <li>Bạn ghé tiệm trước khoảng 10-15 phút để tụi mình cùng bạn chuẩn bị trang phục, makeup và làm quen với không gian thật thoải mái nhé.</li>
            <li>Nếu bạn cần tiệm chỉ đường hoặc hỗ trợ gì thêm, đừng ngần ngại alo ngay cho hotline tụi mình nha!</li>
          </ul>
        </div>

        ${renderCustomerCta(`👉 XEM CHI TIẾT BUỔI CHỤP #${bookingCode}`)}
      `;
      break;
    }

    // --------------------------------------------------------------------------
    // 11. Auth: Xác thực email & Quên mật khẩu
    // --------------------------------------------------------------------------
    case 'email_verification': {
      subject = `[Maison MIPA] ✨ Xác thực tài khoản của bạn tại tiệm ảnh Maison MIPA`;
      bodyContent = `
        <h2 style="color: ${BRAND_DARK}; font-size: 20px; margin-top: 0; font-family: 'Playfair Display', Georgia, serif;">
          Maison MIPA mến chào ${name} ✨,
        </h2>
        <p style="color: #604634; line-height: 1.7; font-size: 14.5px;">
          Tụi mình rất vui và cảm ơn bạn đã ghé thăm và tạo tài khoản cùng tiệm ảnh Maison MIPA. Mời bạn bấm vào nút bên dưới để xác thực địa chỉ email và cùng khám phá không gian lưu giữ kỷ niệm thân thương tại tiệm nha:
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.verifyLink || 'https://maisonmipa.io.vn/account'}" style="background-color: ${BRAND_GOLD}; color: #FFFFFF; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 12px rgba(180, 83, 9, 0.2);">
            ✨ XÁC THỰC TÀI KHOẢN CÙNG TIỆM ✨
          </a>
        </div>
        <p style="color: #8C6E53; font-size: 13px; line-height: 1.5;">Nếu bạn không tạo tài khoản này, bạn cứ an tâm bỏ qua email này nhé.</p>
      `;
      break;
    }

    case 'password_reset': {
      subject = `[Maison MIPA] 🔐 Đặt lại mật khẩu tài khoản của bạn`;
      bodyContent = `
        <h2 style="color: ${BRAND_DARK}; font-size: 20px; margin-top: 0; font-family: 'Playfair Display', Georgia, serif;">
          Maison MIPA mến chào ${name} ✨,
        </h2>
        <p style="color: #604634; line-height: 1.7; font-size: 14.5px;">
          Tụi mình nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn tại tiệm. Bạn đừng lo lắng nhé, hãy bấm vào nút bên dưới để tạo mật khẩu mới dễ dàng nha:
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.resetLink || 'https://maisonmipa.io.vn/reset-password'}" style="background-color: ${BRAND_GOLD}; color: #FFFFFF; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 12px rgba(180, 83, 9, 0.2);">
            🔐 ĐẶT LẠI MẬT KHẨU MỚI
          </a>
        </div>
        <p style="color: #8C6E53; font-size: 13px; line-height: 1.5;">Nếu không phải bạn gửi yêu cầu, hãy an tâm bỏ qua email này hoặc nhắn cho tiệm nếu bạn cần hỗ trợ nha.</p>
      `;
      break;
    }

    // --------------------------------------------------------------------------
    // 12. Fallback thông minh: KHÔNG BAO GIỜ hiển thị thông báo trống rỗng!
    // --------------------------------------------------------------------------
    default: {
      const fallbackTitle = data.subject || data.title || (bookingCode ? `Thông báo về đơn đặt lịch #${bookingCode}` : 'Thông báo từ tiệm ảnh Maison MIPA');
      const fallbackMsg = data.message || (bookingCode
        ? `Tiệm ảnh Maison MIPA gửi đến bạn thông báo cập nhật về đơn đặt lịch #${bookingCode}. Bạn vui lòng bấm nút bên dưới để xem chi tiết đầy đủ nha!`
        : 'Bạn có thông báo mới từ tiệm ảnh Maison MIPA nè.');

      subject = `[Maison MIPA] ${fallbackTitle}`;
      bodyContent = `
        <h2 style="color: ${BRAND_DARK}; font-size: 20px; margin-top: 0; font-family: 'Playfair Display', Georgia, serif;">
          Maison MIPA thương chào ${name} ✨,
        </h2>
        <div style="background: #FAF6EE; border: 1.5px solid #E6D7B9; border-radius: 12px; padding: 18px; margin: 16px 0;">
          <div style="font-size: 15px; font-weight: 700; color: #604634; margin-bottom: 8px;">
            📢 ${fallbackTitle}
          </div>
          <p style="color: #4A3525; line-height: 1.6; font-size: 14px; margin: 0 0 12px 0;">
            ${fallbackMsg}
          </p>
          ${bookingCode ? `
          <table style="width: 100%; border-collapse: collapse; font-size: 13.5px; color: #4A3525; border-top: 1px dashed #E6D7B9; padding-top: 10px; margin-top: 10px;">
            <tr>
              <td style="padding: 5px 0; width: 38%; color: #8C6E53;">Mã đơn:</td>
              <td style="padding: 5px 0; font-weight: 700; color: #604634;">#${bookingCode}</td>
            </tr>
            ${packageName ? `
            <tr>
              <td style="padding: 5px 0; color: #8C6E53;">Gói chụp:</td>
              <td style="padding: 5px 0; font-weight: 600;">${packageName} ${serviceName ? `— ${serviceName}` : ''}</td>
            </tr>` : ''}
            ${startAt && startAt !== 'Theo lịch hẹn' ? `
            <tr>
              <td style="padding: 5px 0; color: #8C6E53;">Thời gian:</td>
              <td style="padding: 5px 0; font-weight: 600; color: #047857;">${startAt}</td>
            </tr>` : ''}
          </table>` : ''}
        </div>
        ${bookingCode ? renderCustomerCta(`👉 XEM CHI TIẾT ĐƠN ĐẶT LỊCH #${bookingCode}`) : ''}
      `;
      break;
    }
  }

  const html = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="margin: 0; padding: 20px; background-color: #F8F6F0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background-color: ${BRAND_CARD}; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
        ${emailHeader}
        <div style="padding: 30px;">
          ${bodyContent}
        </div>
        ${emailFooter}
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}
