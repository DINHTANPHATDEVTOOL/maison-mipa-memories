// ==============================================================================
// Maison MIPA Memories - Reset Password Page (/auth/reset-password)
// ==============================================================================
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SeoHead } from '../components/seo/SeoHead';

export const ResetPasswordPage: React.FC = () => {
  const { updatePassword, authError, clearError } = useAuth();
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalError('');

    if (newPassword.length < 6) {
      setLocalError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setLocalError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setIsSubmitting(true);
    const result = await updatePassword(newPassword);
    setIsSubmitting(false);

    if (result.success) {
      setIsSuccess(true);
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } else {
      setLocalError(result.error || 'Không thể cập nhật mật khẩu.');
    }
  };

  return (
    <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
      <SeoHead
        title="Đặt Lại Mật Khẩu | Maison MIPA Memories"
        description="Đặt lại mật khẩu tài khoản Maison MIPA Memories"
        canonicalPath="/auth/reset-password"
      />

      <div className="mipa-card" style={{ maxWidth: '440px', width: '100%', padding: '2.5rem 2rem', borderRadius: '20px', textAlign: 'center' }}>
        <div style={{
          width: '54px',
          height: '54px',
          borderRadius: '50%',
          backgroundColor: '#FFFDF6',
          border: '2px solid #C6A45F',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.2rem',
        }}>
          <KeyRound size={26} color="#8C6E53" />
        </div>

        <h2 style={{ fontSize: '1.5rem', color: '#604634', marginBottom: '0.5rem' }}>
          Thiết Lập Mật Khẩu Mới
        </h2>
        <p style={{ fontSize: '0.88rem', color: '#6E5F55', marginBottom: '1.5rem', lineHeight: 1.5 }}>
          Vui lòng nhập mật khẩu mới cho tài khoản Maison MIPA của bạn.
        </p>

        {isSuccess ? (
          <div style={{ padding: '1.5rem', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '12px', color: '#166534' }}>
            <CheckCircle size={32} color="#16A34A" style={{ margin: '0 auto 0.5rem' }} />
            <div style={{ fontWeight: 700, marginBottom: '0.3rem' }}>Đổi mật khẩu thành công!</div>
            <p style={{ fontSize: '0.85rem', margin: 0 }}>Hệ thống sẽ tự động chuyển hướng bạn về trang chủ trong giây lát...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {(localError || authError) && (
              <div style={{ padding: '0.75rem 1rem', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', color: '#991B1B', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={16} />
                <span>{localError || authError}</span>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#604634', marginBottom: '0.3rem' }}>
                Mật khẩu mới
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Ít nhất 6 ký tự..."
                className="mipa-input"
                style={{ width: '100%', height: '42px', borderRadius: '10px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#604634', marginBottom: '0.3rem' }}>
                Xác nhận mật khẩu
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới..."
                className="mipa-input"
                style={{ width: '100%', height: '42px', borderRadius: '10px' }}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-mipa-gold"
              style={{ width: '100%', height: '44px', marginTop: '0.5rem', fontWeight: 700 }}
            >
              {isSubmitting ? 'Đang cập nhật...' : 'Xác Nhận Đổi Mật Khẩu'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
