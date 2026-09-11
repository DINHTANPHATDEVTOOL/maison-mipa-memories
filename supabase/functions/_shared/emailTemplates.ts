// ==============================================================================
// Maison MIPA Memories - Brand Transactional Email Templates
// Responsive, accessible, mobile-safe HTML email templates
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
const BRAND_BG = '#FFFDF6';
const BRAND_CARD = '#FFFFFF';
const BRAND_MUTED = '#8C6E53';

const emailHeader = `
  <div style="background-color: ${BRAND_DARK}; padding: 24px; text-align: center; border-radius: 12px 12px 0 0;">
    <h1 style="color: ${BRAND_GOLD}; font-family: 'Playfair Display', Georgia, serif; font-size: 24px; margin: 0; letter-spacing: 2px;">
      MAISON MIPA MEMORIES
    </h1>
    <p style="color: #EFE6C9; font-size: 12px; margin: 6px 0 0 0; text-transform: uppercase; letter-spacing: 1px;">
      Studio Nhiếp Ảnh & Lưu Giữ Kỷ Niệm Cao Cấp
    </p>
  </div>
`;

const emailFooter = `
  <div style="padding: 20px; text-align: center; color: ${BRAND_MUTED}; font-size: 12px; border-top: 1px solid #EFE6C9; margin-top: 30px;">
    <p style="margin: 0 0 6px 0;"><strong>Maison MIPA Memories Studio</strong></p>
    <p style="margin: 0 0 6px 0;">Hotline: 0908 123 456 • Email: contact@maisonmipa.io.vn</p>
    <p style="margin: 0; color: #A39385;">Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email hoặc liên hệ hỗ trợ.</p>
  </div>
`;

export function renderEmailHtml(templateKey: string, data: TemplateData): { subject: string; html: string } {
  const name = data.customerName || 'Quý khách';

  let subject = 'Thông báo từ Maison MIPA Memories';
  let bodyContent = '';

  switch (templateKey) {
    case 'booking_created':
      const serviceTitle = data.serviceName ? ` - ${data.serviceName}` : '';
      const packageTitle = data.packageName ? ` (${data.packageName})` : '';
      subject = `[Maison MIPA] Xác nhận đặt lịch #${data.bookingCode || ''}${packageTitle}${serviceTitle}`;

      const featureItems = Array.isArray(data.features) && data.features.length > 0
        ? data.features.map((f: string) => `<li style="margin-bottom: 6px; color: #4A3525;">${f}</li>`).join('')
        : '';

      bodyContent = `
        <h2 style="color: ${BRAND_DARK}; font-size: 20px; margin-top: 0; font-family: 'Playfair Display', Georgia, serif;">
          Kính chào ${name},
        </h2>
        <p style="color: #604634; line-height: 1.6; font-size: 14.5px;">
          Maison MIPA Memories chân thành cảm ơn bạn đã tin tưởng lựa chọn chúng tôi để lưu giữ những khoảnh khắc quý giá. Yêu cầu đặt lịch chụp ảnh của bạn đã được ghi nhận thành công trên hệ thống.
        </p>

        <!-- Chi tiết gói chụp nổi bật -->
        <div style="background: #FAF6EE; border: 1.5px solid #E6D7B9; border-radius: 10px; padding: 18px 20px; margin: 20px 0;">
          <div style="border-bottom: 1px solid #E6D7B9; padding-bottom: 10px; margin-bottom: 14px;">
            <div style="font-size: 16px; font-weight: 700; color: #604634; text-transform: uppercase; letter-spacing: 0.5px;">
              📸 Gói Chụp: ${data.packageName || 'Gói Chụp Maison MIPA'}
            </div>
            ${data.serviceName ? `<div style="font-size: 13px; color: #8C6E53; margin-top: 3px; font-weight: 600;">Dịch vụ: ${data.serviceName}</div>` : ''}
          </div>

          <table style="width: 100%; border-collapse: collapse; font-size: 13.5px; color: #4A3525; margin-bottom: 12px;">
            ${data.durationMinutes ? `
            <tr>
              <td style="padding: 4px 0; width: 42%; color: #8C6E53;">⏱️ Thời lượng buổi chụp:</td>
              <td style="padding: 4px 0; font-weight: 600;">${data.durationMinutes} phút</td>
            </tr>` : ''}
            ${data.conceptsCount ? `
            <tr>
              <td style="padding: 4px 0; color: #8C6E53;">🎨 Số Concept bối cảnh:</td>
              <td style="padding: 4px 0; font-weight: 600;">${data.conceptsCount} concept độc quyền</td>
            </tr>` : ''}
            ${data.editedPhotosCount ? `
            <tr>
              <td style="padding: 4px 0; color: #8C6E53;">✨ Ảnh hoàn thiện sắc nét:</td>
              <td style="padding: 4px 0; font-weight: 600;">${data.editedPhotosCount} ảnh chỉnh sửa cao cấp</td>
            </tr>` : ''}
            ${data.studioName ? `
            <tr>
              <td style="padding: 4px 0; color: #8C6E53;">🏛️ Không gian Studio:</td>
              <td style="padding: 4px 0; font-weight: 600;">${data.studioName}</td>
            </tr>` : ''}
          </table>

          ${featureItems ? `
          <div style="border-top: 1px dashed #D9C8A9; padding-top: 10px; margin-top: 10px;">
            <p style="margin: 0 0 8px 0; font-weight: 700; font-size: 13px; color: #604634;">Quyền lợi & Dịch vụ bao gồm trong gói:</p>
            <ul style="margin: 0; padding-left: 18px; font-size: 13px; line-height: 1.5;">
              ${featureItems}
            </ul>
          </div>` : ''}
        </div>

        <!-- Thông tin đơn đặt lịch -->
        <div style="background: #FFFFFF; border: 1px solid #EFE6C9; border-radius: 8px; padding: 16px 20px; margin: 18px 0;">
          <p style="margin: 0 0 8px 0; color: ${BRAND_DARK}; font-size: 14px;"><strong>Mã đơn:</strong> <span style="font-family: monospace; font-size: 15px; color: #8C6E53; font-weight: 700;">#${data.bookingCode}</span></p>
          <p style="margin: 0 0 8px 0; color: ${BRAND_DARK}; font-size: 14px;"><strong>Thời gian chụp:</strong> ${data.startAt || 'Theo thỏa thuận'}</p>
          <p style="margin: 0 0 8px 0; color: ${BRAND_DARK}; font-size: 14px;"><strong>Tổng chi phí:</strong> <span style="font-weight: 700;">${data.totalAmount ? Number(data.totalAmount).toLocaleString('vi-VN') + ' đ' : 'Liên hệ studio'}</span></p>
          <p style="margin: 0; color: #B45309; font-size: 14.5px;"><strong>Tiền cọc giữ lịch:</strong> <span style="font-weight: 700; font-size: 16px;">${data.depositAmount ? Number(data.depositAmount).toLocaleString('vi-VN') + ' đ' : 'Liên hệ studio'}</span></p>
        </div>

        <p style="color: #604634; line-height: 1.6; font-size: 14px;">
          Để hoàn tất giữ lịch và bảo lưu phòng chụp, quý khách vui lòng tiến hành chuyển khoản cọc theo mã QR VietQR hiển thị trên hệ thống với nội dung chuyển khoản: <strong>MIPA ${data.bookingCode}</strong>.
        </p>
      `;
      break;

    case 'deposit_received':
      subject = `[Maison MIPA] Đã nhận thanh toán tiền cọc #${data.bookingCode || ''}`;
      bodyContent = `
        <h2 style="color: #16A34A; font-size: 20px; margin-top: 0;">✓ Thanh Toán Cọc Thành Công</h2>
        <p style="color: #604634; line-height: 1.6;">Xin chào ${name},</p>
        <p style="color: #604634; line-height: 1.6;">
          Maison MIPA Memories xác nhận đã nhận khoản tiền cọc <strong>${data.amount ? Number(data.amount).toLocaleString('vi-VN') + ' đ' : ''}</strong> cho đơn đặt lịch <strong>${data.bookingCode}</strong>.
        </p>
        <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0 0 6px 0; color: #166534;"><strong>Mã giao dịch:</strong> ${data.transferReference || 'N/A'}</p>
          <p style="margin: 0; color: #166534;"><strong>Trạng thái:</strong> ĐÃ XÁC NHẬN GIỮ LỊCH</p>
        </div>
        <p style="color: #604634; line-height: 1.6;">
          Bộ phận điều phối sẽ phân công chuyên viên nhiếp ảnh và makeup phù hợp nhất với concept của bạn.
        </p>
      `;
      break;

    case 'booking_confirmed':
      subject = `[Maison MIPA] Lịch chụp đã được duyệt & gán kíp #${data.bookingCode || ''}`;
      bodyContent = `
        <h2 style="color: ${BRAND_DARK}; font-size: 20px; margin-top: 0;">Lịch Chụp Đã Sẵn Sàng</h2>
        <p style="color: #604634; line-height: 1.6;">Xin chào ${name},</p>
        <p style="color: #604634; line-height: 1.6;">
          Đơn chụp <strong>${data.bookingCode}</strong> đã được studio phê duyệt và sắp xếp phòng studio hoàn tất. Bạn có thể đăng nhập vào cổng khách hàng để xác nhận lịch chụp.
        </p>
      `;
      break;

    case 'booking_rescheduled':
      subject = `[Maison MIPA] Thông báo đổi lịch chụp #${data.bookingCode || ''}`;
      bodyContent = `
        <h2 style="color: ${BRAND_DARK}; font-size: 20px; margin-top: 0;">Cập Nhật Lịch Chụp Mới</h2>
        <p style="color: #604634; line-height: 1.6;">Xin chào ${name},</p>
        <p style="color: #604634; line-height: 1.6;">
          Yêu cầu đổi lịch cho đơn <strong>${data.bookingCode}</strong> đã được cập nhật thành công sang khung giờ mới: <strong>${data.startAt || ''}</strong>.
        </p>
      `;
      break;

    case 'booking_cancelled':
      subject = `[Maison MIPA] Thông báo hủy lịch chụp #${data.bookingCode || ''}`;
      bodyContent = `
        <h2 style="color: #DC2626; font-size: 20px; margin-top: 0;">Lịch Chụp Đã Hủy</h2>
        <p style="color: #604634; line-height: 1.6;">Xin chào ${name},</p>
        <p style="color: #604634; line-height: 1.6;">
          Đơn đặt lịch <strong>${data.bookingCode}</strong> của bạn đã được hủy theo yêu cầu. Nếu có bất kỳ thắc mắc nào về chính sách bảo lưu cọc, vui lòng liên hệ hotline của chúng tôi.
        </p>
      `;
      break;

    case 'album_ready':
      subject = `[Maison MIPA] Bộ ảnh của bạn đã sẵn sàng! #${data.bookingCode || ''}`;
      bodyContent = `
        <h2 style="color: ${BRAND_DARK}; font-size: 20px; margin-top: 0;">Bộ Ảnh Của Bạn Đã Hoàn Tất!</h2>
        <p style="color: #604634; line-height: 1.6;">Xin chào ${name},</p>
        <p style="color: #604634; line-height: 1.6;">
          Maison MIPA Memories đã hoàn thiện hậu kỳ cho bộ ảnh của bạn. Bạn có thể truy cập ngay vào Google Drive hoặc cổng khách hàng để thưởng thức và tải ảnh chất lượng cao.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.albumUrl || 'https://maisonmipa.io.vn/account'}" style="background-color: ${BRAND_GOLD}; color: #FFFFFF; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            Xem & Tải Ảnh Ngay
          </a>
        </div>
      `;
      break;

    case 'pending_deposit':
      subject = `[Maison MIPA] Nhắc thanh toán cọc giữ lịch #${data.bookingCode || ''}`;
      bodyContent = `
        <h2 style="color: ${BRAND_DARK}; font-size: 20px; margin-top: 0;">Nhắc Thanh Toán Cọc Giữ Lịch</h2>
        <p style="color: #604634; line-height: 1.6;">Xin chào ${name},</p>
        <p style="color: #604634; line-height: 1.6;">
          Đơn đặt lịch <strong>#${data.bookingCode}</strong> của bạn tại Maison MIPA Memories đang chờ thanh toán tiền cọc để hoàn tất giữ chỗ.
        </p>
        <div style="background: #FEF3C7; border: 1px solid #FCD34D; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0 0 6px 0; color: #92400E;"><strong>Số tiền cọc:</strong> ${data.depositAmount ? Number(data.depositAmount).toLocaleString('vi-VN') + ' đ' : (data.amount ? Number(data.amount).toLocaleString('vi-VN') + ' đ' : '')}</p>
          <p style="margin: 0 0 6px 0; color: #92400E;"><strong>Nội dung chuyển khoản:</strong> ${data.transferReference || ''}</p>
          <p style="margin: 0; color: #92400E; font-size: 13px;">Vui lòng hoàn tất trong vòng 24 giờ để lịch chụp không bị hủy tự động.</p>
        </div>
      `;
      break;

    case 'shoot_reminder':
      subject = `[Maison MIPA] Nhắc hẹn lịch chụp ngày mai #${data.bookingCode || ''}`;
      bodyContent = `
        <h2 style="color: ${BRAND_DARK}; font-size: 20px; margin-top: 0;">Lịch Chụp Ngày Mai</h2>
        <p style="color: #604634; line-height: 1.6;">Xin chào ${name},</p>
        <p style="color: #604634; line-height: 1.6;">
          Maison MIPA Memories xin nhắc bạn về buổi chụp ảnh diễn ra vào ngày mai:
        </p>
        <div style="background: #FDFBF7; border: 1px solid #EFE6C9; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0; color: ${BRAND_DARK};"><strong>Mã đơn:</strong> #${data.bookingCode}</p>
          <p style="margin: 0 0 8px 0; color: ${BRAND_DARK};"><strong>Thời gian:</strong> ${data.startTime || ''} ngày ${data.bookingDate || ''}</p>
          <p style="margin: 0 0 8px 0; color: ${BRAND_DARK};"><strong>Gói chụp:</strong> ${data.packageName || ''} (${data.serviceName || ''})</p>
          <p style="margin: 0; color: #8C6E53;"><strong>Địa chỉ:</strong> Studio Maison MIPA, TP. Hồ Chí Minh</p>
        </div>
        <p style="color: #604634; line-height: 1.6; font-size: 13px;">
          Lưu ý: Quý khách vui lòng đến trước 15 phút để chuẩn bị trang phục và makeup chu đáo nhất.
        </p>
      `;
      break;

    case 'email_verification':
      subject = `[Maison MIPA] Xác thực tài khoản của bạn`;
      bodyContent = `
        <h2 style="color: ${BRAND_DARK}; font-size: 20px; margin-top: 0;">Xác Thực Tài Khoản</h2>
        <p style="color: #604634; line-height: 1.6;">Xin chào ${name},</p>
        <p style="color: #604634; line-height: 1.6;">
          Cảm ơn bạn đã đăng ký tài khoản tại Maison MIPA Memories. Vui lòng bấm vào nút bên dưới để xác thực địa chỉ email và kích hoạt tài khoản của bạn.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.verifyLink || '#'}" style="background-color: ${BRAND_GOLD}; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            Xác Thực Tài Khoản
          </a>
        </div>
        <p style="color: #8C6E53; font-size: 13px;">Nếu bạn không tạo tài khoản này, vui lòng bỏ qua email này.</p>
      `;
      break;

    case 'password_reset':
      subject = `[Maison MIPA] Yêu cầu đặt lại mật khẩu tài khoản`;
      bodyContent = `
        <h2 style="color: ${BRAND_DARK}; font-size: 20px; margin-top: 0;">Đặt Lại Mật Khẩu</h2>
        <p style="color: #604634; line-height: 1.6;">Xin chào ${name},</p>
        <p style="color: #604634; line-height: 1.6;">
          Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản Maison MIPA của bạn. Vui lòng bấm vào nút bên dưới để tạo mật khẩu mới.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.resetLink || '#'}" style="background-color: ${BRAND_GOLD}; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            Đặt Lại Mật Khẩu
          </a>
        </div>
        <p style="color: #8C6E53; font-size: 13px;">Liên kết này có hiệu lực trong vòng 60 phút.</p>
      `;
      break;

    default:
      subject = `[Maison MIPA] Thông báo hệ thống`;
      bodyContent = `
        <h2 style="color: ${BRAND_DARK}; font-size: 20px; margin-top: 0;">Kính chào ${name},</h2>
        <p style="color: #604634; line-height: 1.6;">${data.message || 'Bạn có thông báo mới từ Maison MIPA Memories.'}</p>
      `;
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
