import React, { useState } from 'react';
import type { Booking, Album, Photo } from '../../types';
import { INITIAL_ALBUMS } from '../../mockData';
import { Calendar, Clock, Camera, Heart, Download, MessageSquare, Check, Sparkles, Image as ImageIcon, CreditCard } from 'lucide-react';

interface CustomerPortalProps {
  bookings: Booking[];
  onOpenBooking: () => void;
}

export const CustomerPortal: React.FC<CustomerPortalProps> = ({ bookings, onOpenBooking }) => {
  const [activeSubTab, setActiveSubTab] = useState<'bookings' | 'gallery' | 'profile'>('bookings');
  const [selectedAlbum, setSelectedAlbum] = useState<Album>(INITIAL_ALBUMS[0]);
  const [photosList, setPhotosList] = useState<Photo[]>(INITIAL_ALBUMS[0].photos);
  const [retouchNotes, setRetouchNotes] = useState<{ [photoId: string]: string }>({
    p1: 'Chỉnh mịn da giúp mẹ & làm da bé hồng tự nhiên nhé',
  });

  const toggleFavorite = (photoId: string) => {
    setPhotosList(photosList.map(p => p.id === photoId ? { ...p, isFavorite: !p.isFavorite } : p));
  };

  const toggleRetouch = (photoId: string) => {
    setPhotosList(photosList.map(p => p.id === photoId ? { ...p, retouchRequested: !p.retouchRequested } : p));
  };

  const updateComment = (photoId: string, comment: string) => {
    setRetouchNotes({ ...retouchNotes, [photoId]: comment });
  };

  const customerBookings = bookings.filter(b => b.customerId === 'cust_01');

  return (
    <div style={{ maxWidth: '1200px', margin: '2rem auto', padding: '0 1.5rem' }}>
      
      {/* Customer Header Welcome Card */}
      <div className="mipa-card-gold" style={{ padding: '2rem', borderRadius: '20px', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <img
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80"
            alt="Customer Avatar"
            style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #C6A45F' }}
          />
          <div>
            <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#8C6E53', fontWeight: 700 }}>
              CUSTOMER PORTAL • TÀI KHOẢN KHÁCH HÀNG
            </div>
            <h2 style={{ fontSize: '1.8rem', color: '#604634', margin: 0 }}>Xin chào, Nguyễn Minh Anh</h2>
            <p style={{ fontSize: '0.85rem', color: '#6E5F55', margin: '0.2rem 0 0 0' }}>
              Thành viên VIP • Đã lưu giữ 4 bộ kỷ niệm cùng Maison MIPA
            </p>
          </div>
        </div>

        <button onClick={onOpenBooking} className="btn-mipa-gold">
          <Calendar size={16} /> Đặt Lịch Chụp Mới
        </button>
      </div>

      {/* Tabs Control */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--mipa-beige)', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
        {[
          { id: 'bookings', label: '📅 Lịch Chụp Của Tôi' },
          { id: 'gallery', label: '🖼️ Album Ảnh & Chọn Retouch' },
          { id: 'profile', label: '👤 Thông Tin Cá Nhân' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            style={{
              background: activeSubTab === tab.id ? '#8C6E53' : 'transparent',
              color: activeSubTab === tab.id ? '#FFFDF6' : '#604634',
              border: 'none',
              padding: '0.6rem 1.2rem',
              borderRadius: '20px',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* SUBTAB 1: MY BOOKINGS */}
      {activeSubTab === 'bookings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          {customerBookings.map((b) => (
            <div key={b.id} className="mipa-card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', borderBottom: '1px solid #EFE6C9', paddingBottom: '0.8rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8C6E53', letterSpacing: '0.05em' }}>MÃ ĐƠN: {b.bookingCode}</span>
                  <h3 style={{ fontSize: '1.3rem', color: '#604634', margin: '0.2rem 0' }}>{b.packageName} — {b.serviceName}</h3>
                  <div style={{ fontSize: '0.85rem', color: '#6E5F55' }}>
                    🗓️ Ngày chụp: <strong>{b.bookingDate}</strong> lúc <strong>{b.startTime}</strong> tại <strong>{b.studioName}</strong>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span className={`badge-status badge-${b.bookingStatus.toLowerCase()}`}>
                    ● {({
                      DEPOSIT_PAID: '✓ Đã Xác Nhận & Cọc',
                      CONFIRMED: '✓ Đã Duyệt Lịch',
                      CHECKED_IN: '● Đã Đến Studio',
                      SHOOTING: '● Đang Chụp Tại Studio',
                      READY_FOR_REVIEW: '★ Album Đã Sẵn Sàng',
                      COMPLETED: '✓ Hoàn Tất Đơn',
                    } as Record<string, string>)[b.bookingStatus] || b.bookingStatus}
                  </span>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#8C6E53', marginTop: '0.4rem' }}>
                    {b.totalAmount.toLocaleString('vi-VN')}đ
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#047857' }}>
                    Đã cọc 30%: {b.depositAmount.toLocaleString('vi-VN')}đ
                  </div>
                </div>
              </div>

              {/* Workflow Status Progression Line */}
              <div style={{ backgroundColor: '#FFFDF6', padding: '1rem', borderRadius: '12px', border: '1px solid var(--mipa-beige)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#8C6E53', marginBottom: '0.5rem' }}>
                  TIẾN ĐỘ THỰC HIỆN BUỔI CHỤP:
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                  {[
                    { label: 'Đã Đặt Cọc', done: true },
                    { label: 'Đã Check-in', done: b.bookingStatus === 'CHECKED_IN' || b.bookingStatus === 'SHOOTING' || b.bookingStatus === 'READY_FOR_REVIEW' || b.bookingStatus === 'COMPLETED' },
                    { label: 'Đang Chụp Studio', done: b.bookingStatus === 'SHOOTING' || b.bookingStatus === 'READY_FOR_REVIEW' || b.bookingStatus === 'COMPLETED' },
                    { label: 'Hậu Kỳ Editing', done: b.bookingStatus === 'READY_FOR_REVIEW' || b.bookingStatus === 'COMPLETED' },
                    { label: 'Đã Gửi Album', done: b.bookingStatus === 'READY_FOR_REVIEW' || b.bookingStatus === 'COMPLETED' },
                  ].map((step, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: step.done ? '#047857' : '#A39385', fontWeight: step.done ? 600 : 400 }}>
                      <Check size={14} color={step.done ? '#047857' : '#A39385'} />
                      <span>{step.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SUBTAB 2: ONLINE ALBUM GALLERY & RETOUCH SELECTION */}
      {activeSubTab === 'gallery' && (
        <div>
          <div style={{ padding: '1.2rem', backgroundColor: '#F8F3E6', borderRadius: '16px', border: '1px solid #C6A45F', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4 style={{ fontSize: '1.1rem', color: '#604634', margin: 0 }}>
                Album: {selectedAlbum.serviceName} ({selectedAlbum.bookingCode})
              </h4>
              <p style={{ fontSize: '0.82rem', color: '#6E5F55', margin: '0.2rem 0 0 0' }}>
                Nhấn ❤️ để thả tim ảnh yêu thích hoặc tích chọn ✍️ để gửi yêu cầu chỉnh sửa Retouch cho Editor!
              </p>
            </div>
            <button className="btn-mipa-gold" style={{ fontSize: '0.85rem' }}>
              <Download size={15} /> Tải Trọn Bộ Ảnh Gốc HD (ZIP)
            </button>
          </div>

          {/* Photo Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.2rem' }}>
            {photosList.map((photo) => (
              <div key={photo.id} className="mipa-card" style={{ padding: '0.75rem', borderRadius: '14px' }}>
                <div style={{ position: 'relative', height: '220px', borderRadius: '10px', overflow: 'hidden', marginBottom: '0.6rem' }}>
                  <img src={photo.url} alt={photo.filename} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  
                  {/* Action buttons on overlay */}
                  <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '0.4rem' }}>
                    <button
                      onClick={() => toggleFavorite(photo.id)}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        border: 'none',
                        backgroundColor: photo.isFavorite ? '#9D174D' : 'rgba(0,0,0,0.4)',
                        color: '#FFF',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Heart size={16} fill={photo.isFavorite ? '#FFF' : 'none'} />
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 600, color: '#604634' }}>{photo.filename}</span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', fontSize: '0.78rem', color: photo.retouchRequested ? '#8C6E53' : '#6E5F55', fontWeight: photo.retouchRequested ? 700 : 400 }}>
                    <input
                      type="checkbox"
                      checked={photo.retouchRequested}
                      onChange={() => toggleRetouch(photo.id)}
                      style={{ accentColor: '#8C6E53' }}
                    />
                    Yêu cầu Retouch
                  </label>
                </div>

                {photo.retouchRequested && (
                  <input
                    type="text"
                    placeholder="Ghi chú yêu cầu bóp eo, mịn da..."
                    value={retouchNotes[photo.id] || ''}
                    onChange={(e) => updateComment(photo.id, e.target.value)}
                    className="mipa-input"
                    style={{ fontSize: '0.78rem', padding: '0.4rem 0.6rem' }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 3: PROFILE */}
      {activeSubTab === 'profile' && (
        <div className="mipa-card" style={{ padding: '1.8rem', borderRadius: '16px', maxWidth: '600px' }}>
          <h3 style={{ fontSize: '1.3rem', color: '#604634', marginBottom: '1.2rem' }}>Chỉnh Sửa Thông Tin Cá Nhân</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label className="mipa-label">Họ và Tên</label>
              <input type="text" defaultValue="Nguyễn Minh Anh" className="mipa-input" />
            </div>
            <div>
              <label className="mipa-label">Số điện thoại</label>
              <input type="text" defaultValue="0908 123 456" className="mipa-input" />
            </div>
            <div>
              <label className="mipa-label">Email</label>
              <input type="email" defaultValue="minhanh.nguyen@gmail.com" className="mipa-input" />
            </div>
            <div>
              <label className="mipa-label">Tài khoản Instagram</label>
              <input type="text" defaultValue="@minhanh.memories" className="mipa-input" />
            </div>
            <button className="btn-mipa-primary" style={{ marginTop: '1rem' }}>Lưu Thay Đổi</button>
          </div>
        </div>
      )}

    </div>
  );
};
