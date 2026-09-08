import React, { useState } from 'react';
import type { CustomerProfile, Booking } from '../../types';
import { INITIAL_CUSTOMERS } from '../../mockData';
import { Users, Search, Phone, Mail, Share2, Gift, Sparkles, Clock, Heart, Calendar } from 'lucide-react';

interface CustomerCRMProps {
  bookings: Booking[];
}

export const CustomerCRM: React.FC<CustomerCRMProps> = ({ bookings }) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfile>(INITIAL_CUSTOMERS[0]);

  const filteredCustomers = INITIAL_CUSTOMERS.filter(
    (c) =>
      c.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const customerBookings = bookings.filter(b => b.customerId === selectedCustomer.id);

  return (
    <div style={{ maxWidth: '1350px', margin: '1.5rem auto', padding: '0 1.5rem' }}>
      
      {/* CRM Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#8C6E53', fontWeight: 700 }}>
            MAISON MIPA CLIENT RELATIONSHIP MANAGEMENT
          </div>
          <h2 style={{ fontSize: '1.8rem', color: '#604634', margin: 0 }}>
            Quản Lý Khách Hàng (Customer CRM & Insights)
          </h2>
        </div>

        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8C6E53' }} />
          <input
            type="text"
            placeholder="Tìm tên, SĐT, email khách hàng..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mipa-input"
            style={{ paddingLeft: '36px', height: '38px', borderRadius: '20px' }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '1.5rem' }}>
        
        {/* Left Column: Customer Directory List */}
        <div className="mipa-card" style={{ padding: '1.2rem', borderRadius: '20px' }}>
          <h3 style={{ fontSize: '1.1rem', color: '#604634', marginBottom: '1rem', borderBottom: '1px solid #EFE6C9', paddingBottom: '0.6rem' }}>
            Danh Sách Khách Hàng ({filteredCustomers.length})
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {filteredCustomers.map((cust) => {
              const isSelected = selectedCustomer.id === cust.id;
              return (
                <div
                  key={cust.id}
                  onClick={() => setSelectedCustomer(cust)}
                  style={{
                    padding: '1rem',
                    borderRadius: '14px',
                    border: isSelected ? '2px solid #C6A45F' : '1px solid var(--mipa-beige)',
                    backgroundColor: isSelected ? '#FFFDF6' : '#FFFFFF',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: '#EFE6C9',
                      color: '#604634',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {cust.fullName.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: '#604634', fontSize: '0.95rem' }}>{cust.fullName}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6E5F55' }}>📞 {cust.phone}</div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#8C6E53' }}>
                      {cust.totalSpent.toLocaleString('vi-VN')}đ
                    </span>
                    <div style={{ fontSize: '0.72rem', color: '#6E5F55' }}>{cust.totalBookings} lần chụp</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Customer Detailed Profile & Marketing Campaign Automation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          
          <div className="mipa-card-gold" style={{ padding: '1.8rem', borderRadius: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  backgroundColor: '#8C6E53',
                  color: '#FFFDF6',
                  fontSize: '1.4rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {selectedCustomer.fullName.charAt(0)}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.5rem', color: '#604634', margin: 0 }}>{selectedCustomer.fullName}</h3>
                  <div style={{ fontSize: '0.82rem', color: '#6E5F55' }}>
                    Lần đầu chụp: {selectedCustomer.firstVisit} • Gần nhất: {selectedCustomer.lastVisit}
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ backgroundColor: '#604634', color: '#EFE6C9', fontSize: '0.7rem', fontWeight: 700, padding: '0.3rem 0.8rem', borderRadius: '12px' }}>
                  KHÁCH HÀNG VIP
                </span>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#8C6E53', marginTop: '0.4rem' }}>
                  {selectedCustomer.totalSpent.toLocaleString('vi-VN')}đ
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', padding: '1rem', backgroundColor: '#FFFFFF', borderRadius: '12px', fontSize: '0.82rem', marginBottom: '1.2rem' }}>
              <div>📞 SĐT: <strong>{selectedCustomer.phone}</strong></div>
              <div>✉️ Email: <strong>{selectedCustomer.email}</strong></div>
              <div>📸 Insta: <strong>{selectedCustomer.instagram || 'Chưa cập nhật'}</strong></div>
            </div>

            {/* Smart Marketing Automation Insight */}
            <div style={{ padding: '0.9rem 1.2rem', backgroundColor: '#ECFDF5', borderRadius: '12px', border: '1px solid #A7F3D0', color: '#047857', fontSize: '0.85rem' }}>
              <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                <Sparkles size={16} /> GỢI Ý CHIẾN DỊCH TỰ ĐỘNG (AUTOMATIC MARKETING CAMPAIGN)
              </div>
              <div>
                Khách đã chụp <strong>Couple Photography</strong> 1 năm trước. Gợi ý gửi Voucher <strong>Happy Anniversary — Maison MIPA (Giảm 20%)</strong> để mời khách chụp kỷ niệm năm tiếp theo!
              </div>
            </div>

          </div>

          {/* Customer Booking History Timeline */}
          <div className="mipa-card" style={{ padding: '1.5rem', borderRadius: '20px' }}>
            <h4 style={{ fontSize: '1.1rem', color: '#604634', marginBottom: '1rem' }}>Lịch Sử Tất Cả Đơn Đặt Lịch</h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {customerBookings.map((b) => (
                <div key={b.id} style={{ padding: '0.9rem 1.1rem', borderRadius: '12px', border: '1px solid var(--mipa-beige)', backgroundColor: '#FFFDF6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#8C6E53' }}>{b.bookingCode}</div>
                    <div style={{ fontWeight: 700, color: '#604634', fontSize: '0.95rem' }}>{b.serviceName} ({b.packageName})</div>
                    <div style={{ fontSize: '0.78rem', color: '#6E5F55' }}>Ngày chụp: {b.bookingDate} tại {b.studioName}</div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: '#8C6E53' }}>{b.totalAmount.toLocaleString('vi-VN')}đ</div>
                    <span className={`badge-status badge-${b.bookingStatus.toLowerCase()}`} style={{ fontSize: '0.65rem' }}>
                      ● {b.bookingStatus}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
