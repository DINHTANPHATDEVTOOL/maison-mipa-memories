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
  const serviceName = getVal('serviceName', 'service_name') || 'Dịch Vụ Studio';
  const packageName = getVal('packageName', 'package_name') || 'Gói Chụp Maison MIPA';
  const packagePrice = Number(getVal('packagePrice', 'package_price') || 0);
  const durationMinutes = getVal('durationMinutes', 'duration_minutes');
  const conceptsCount = getVal('conceptsCount', 'concepts_count');
  const conceptNames = getVal('conceptNames', 'concept_names', 'concepts');
  const editedPhotosCount = getVal('editedPhotosCount', 'edited_photos_count');
  const studioName = getVal('studioName', 'studio_name') || 'Phòng Studio Maison MIPA';
  const startAt = getVal('startAt', 'start_at') || 'Theo lịch hẹn';
  const subtotal = Number(getVal('subtotal', 'sub_total') || 0);
  const addonTotal = Number(getVal('addonTotal', 'addon_total') || 0);
  const addonsData = getVal('addons', 'addon_names');
  const discountTotal = Number(getVal('discountTotal', 'discount_total') || 0);
  const totalAmount = Number(getVal('totalAmount', 'total_amount') || 0);
  const depositAmount = Number(getVal('depositAmount', 'deposit_amount') || Math.round(totalAmount * 0.3));
  const remainingAmount = Math.max(0, totalAmount - depositAmount);
  const transferRef = getVal('transferReference', 'transfer_reference') || (bookingCode ? `MIPA ${bookingCode}` : 'MIPA');
  const occasion = getVal('occasion');
  const customerNote = getVal('customerNote', 'customer_note');

  let subject = 'Thông báo từ Maison MIPA Memories';
  let bodyContent = '';

  switch (templateKey) {
    case 'booking_created':
      const serviceTitle = serviceName ? ` - ${serviceName}` : '';
      const packageTitle = packageName ? ` (${packageName})` : '';
      subject = `[Maison MIPA] Xác nhận đặt lịch #${bookingCode}${packageTitle}${serviceTitle}`;

      const rawFeatures = getVal('features');
      const featureItems = Array.isArray(rawFeatures) && rawFeatures.length > 0
        ? rawFeatures.map((f: string) => `<li style="margin-bottom: 5px; color: #4A3525;">${f}</li>`).join('')
        : '';

      const conceptDisplay = Array.isArray(conceptNames) && conceptNames.length > 0
        ? conceptNames.join(', ')
        : (typeof conceptNames === 'string' ? conceptNames : (conceptsCount ? `${conceptsCount} concept bối cảnh` : 'Theo tư vấn studio'));

      let addonDisplay = '';
      if (Array.isArray(addonsData) && addonsData.length > 0) {
        addonDisplay = addonsData
          .map((a: any) => typeof a === 'string' ? a : `${a.name}${a.lineTotal ? ` (${formatVnd(a.lineTotal)})` : ''}`)
          .join(', ');
      }

      bodyContent = `
        <h2 style="color: ${BRAND_DARK}; font-size: 21px; margin-top: 0; font-family: 'Playfair Display', Georgia, serif;">
          Kính chào ${name},
        </h2>
        <p style="color: #604634; line-height: 1.6; font-size: 14.5px;">
          Maison MIPA Memories chân thành cảm ơn bạn đã tin tưởng lựa chọn studio để lưu giữ những khoảnh khắc quý giá. Yêu cầu đặt lịch chụp ảnh của bạn đã được ghi nhận thành công trên hệ thống.
        </p>

        <!-- 1. Card Chi Tiết Buổi Chụp -->
        <div style="background: #FAF6EE; border: 1.5px solid #E6D7B9; border-radius: 12px; padding: 20px; margin: 20px 0;">
          <div style="border-bottom: 1.5px solid #E6D7B9; padding-bottom: 10px; margin-bottom: 14px;">
            <div style="font-size: 16.5px; font-weight: 700; color: #604634; text-transform: uppercase; letter-spacing: 0.5px;">
              📸 Gói Chụp: ${packageName}
            </div>
            <div style="font-size: 13px; color: #8C6E53; margin-top: 3px; font-weight: 600;">
              Dịch vụ: ${serviceName} • Mã đơn: <span style="font-family: monospace; color: #604634;">#${bookingCode}</span>
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse; font-size: 13.5px; color: #4A3525;">
            <tr>
              <td style="padding: 6px 0; width: 42%; color: #8C6E53;">⏱️ Thời gian chụp hẹn:</td>
              <td style="padding: 6px 0; font-weight: 700; color: #2C221E;">${startAt}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #8C6E53;">🏛️ Phòng Studio:</td>
              <td style="padding: 6px 0; font-weight: 600;">${studioName}</td>
            </tr>
            ${durationMinutes ? `
            <tr>
              <td style="padding: 6px 0; color: #8C6E53;">⏳ Thời lượng chụp:</td>
              <td style="padding: 6px 0; font-weight: 600;">${durationMinutes} phút</td>
            </tr>` : ''}
            <tr>
              <td style="padding: 6px 0; color: #8C6E53;">🎨 Concept bối cảnh:</td>
              <td style="padding: 6px 0; font-weight: 600;">${conceptDisplay}</td>
            </tr>
            ${editedPhotosCount ? `
            <tr>
              <td style="padding: 6px 0; color: #8C6E53;">✨ Ảnh hoàn thiện retouch:</td>
              <td style="padding: 6px 0; font-weight: 600;">${editedPhotosCount} ảnh chỉnh sửa cao cấp</td>
            </tr>` : ''}
            ${addonDisplay ? `
            <tr>
              <td style="padding: 6px 0; color: #8C6E53;">🎁 Dịch vụ cộng thêm:</td>
              <td style="padding: 6px 0; font-weight: 600;">${addonDisplay}</td>
            </tr>` : ''}
            ${occasion ? `
            <tr>
              <td style="padding: 6px 0; color: #8C6E53;">🎉 Dịp kỷ niệm:</td>
              <td style="padding: 6px 0; font-weight: 600;">${occasion}</td>
            </tr>` : ''}
            ${customerNote ? `
            <tr>
              <td style="padding: 6px 0; color: #8C6E53;">📝 Ghi chú yêu cầu:</td>
              <td style="padding: 6px 0; font-weight: 500; font-style: italic;">"${customerNote}"</td>
            </tr>` : ''}
          </table>

          ${featureItems ? `
          <div style="border-top: 1px dashed #D9C8A9; padding-top: 10px; margin-top: 12px;">
            <p style="margin: 0 0 6px 0; font-weight: 700; font-size: 13px; color: #604634;">Quyền lợi trọn gói bao gồm:</p>
            <ul style="margin: 0; padding-left: 18px; font-size: 13px; line-height: 1.5;">
              ${featureItems}
            </ul>
          </div>` : ''}
        </div>

        <!-- 2. Bảng Kê Chi Phí & Số Tiền Cọc Nổi Bật -->
        <div style="background: #FFFFFF; border: 1.5px solid #EFE6C9; border-radius: 12px; padding: 20px; margin: 20px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.03);">
          <div style="font-size: 15px; font-weight: 700; color: #604634; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #EFE6C9; padding-bottom: 8px; margin-bottom: 12px;">
            💰 Chi Tiết Giá Tiền & Tiền Cọc Giữ Lịch
          </div>

          <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #4A3525;">
            ${packagePrice > 0 ? `
            <tr>
              <td style="padding: 5px 0; color: #6E5F55;">Giá niêm yết gói chụp:</td>
              <td style="padding: 5px 0; text-align: right; font-weight: 600;">${formatVnd(packagePrice)}</td>
            </tr>` : ''}
            ${addonTotal > 0 ? `
            <tr>
              <td style="padding: 5px 0; color: #6E5F55;">Phụ phí Add-on dịch vụ:</td>
              <td style="padding: 5px 0; text-align: right; font-weight: 600;">+ ${formatVnd(addonTotal)}</td>
            </tr>` : ''}
            ${discountTotal > 0 ? `
            <tr>
              <td style="padding: 5px 0; color: #047857;">Ưu đãi giảm giá Voucher:</td>
              <td style="padding: 5px 0; text-align: right; font-weight: 600; color: #047857;">- ${formatVnd(discountTotal)}</td>
            </tr>` : ''}
            <tr style="border-top: 1px solid #EFE6C9;">
              <td style="padding: 10px 0 6px 0; font-weight: 700; color: #2C221E; font-size: 15px;">Tổng Chi Phí Buổi Chụp:</td>
              <td style="padding: 10px 0 6px 0; text-align: right; font-weight: 700; color: #2C221E; font-size: 16px;">${formatVnd(totalAmount || subtotal)}</td>
            </tr>
          </table>

          <!-- Khung Tiền Cọc Nổi Bật -->
          <div style="background: #FFFDF6; border: 2px solid ${BRAND_GOLD}; border-radius: 10px; padding: 14px 18px; margin: 14px 0 6px 0; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #8C6E53;">
                SỐ TIỀN CỌC CẦN THANH TOÁN
              </div>
              <div style="font-size: 11.5px; color: #8C6E53; margin-top: 2px;">
                (Thanh toán để xác nhận giữ lịch & khóa phòng studio)
              </div>
            </div>
            <div style="font-size: 20px; font-weight: 800; color: #B45309; text-align: right;">
              ${formatVnd(depositAmount)}
            </div>
          </div>

          <div style="font-size: 13px; color: #8C6E53; text-align: right; margin-top: 6px;">
            Số tiền còn lại thanh toán tại studio: <strong>${formatVnd(remainingAmount)}</strong>
          </div>
        </div>

        <!-- 3. Hướng Dẫn Chuyển Khoản & VietQR -->
        <div style="background: #FAF8F5; border: 1px solid #E6D7B9; border-radius: 10px; padding: 16px 20px; margin: 20px 0;">
          <div style="font-weight: 700; font-size: 14px; color: #604634; margin-bottom: 8px;">
            🏦 Hướng Dẫn Chuyển Khoản Đặt Cọc
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #4A3525;">
            <tr>
              <td style="padding: 4px 0; width: 38%; color: #8C6E53;">Ngân hàng:</td>
              <td style="padding: 4px 0; font-weight: 600;">ACB - Ngân Hàng TMCP Á Châu</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #8C6E53;">Số tài khoản:</td>
              <td style="padding: 4px 0; font-weight: 700; font-family: monospace; font-size: 14px; color: #2C221E;">118822999</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #8C6E53;">Chủ tài khoản:</td>
              <td style="padding: 4px 0; font-weight: 700; text-transform: uppercase;">MAISON MIPA MEMORIES</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #8C6E53;">Số tiền cọc:</td>
              <td style="padding: 4px 0; font-weight: 700; color: #B45309;">${formatVnd(depositAmount)}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #8C6E53;">Nội dung chuyển khoản:</td>
              <td style="padding: 4px 0; font-weight: 700; font-family: monospace; color: #B45309; font-size: 14px;">${transferRef}</td>
            </tr>
          </table>
          <p style="margin: 10px 0 0 0; font-size: 12.5px; color: #8C6E53; line-height: 1.4;">
            * Quý khách có thể quét mã VietQR tự động trên hệ thống web để thanh toán nhanh chóng. Lịch chụp được bảo lưu trong vòng 24 giờ.
          </p>
        </div>
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
