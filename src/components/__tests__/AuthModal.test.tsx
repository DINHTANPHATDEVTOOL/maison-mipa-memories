// ==============================================================================
// Maison MIPA Memories - AuthModal Unit Tests
// ==============================================================================
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthModal } from '../auth/AuthModal';
import { AuthProvider } from '../../context/AuthContext';
import { INITIAL_USERS } from '../../mockData';

const renderWithAuth = (ui: React.ReactElement) => {
  return render(<AuthProvider>{ui}</AuthProvider>);
};

describe('AuthModal Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    usersList: INITIAL_USERS,
    onLoginSuccess: vi.fn(),
    onRegisterSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = renderWithAuth(<AuthModal {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders modal header and tabs when isOpen is true', () => {
    renderWithAuth(<AuthModal {...defaultProps} />);
    expect(screen.getByText(/MAISON MIPA MEMORIES AUTH/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^ĐĂNG NHẬP$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ĐĂNG KÝ NHANH/i })).toBeInTheDocument();
  });

  it('displays target feature message when passed', () => {
    renderWithAuth(<AuthModal {...defaultProps} targetFeatureMessage="🔒 Yêu cầu đăng nhập để xem thông tin" />);
    expect(screen.getByText(/🔒 Yêu cầu đăng nhập để xem thông tin/i)).toBeInTheDocument();
  });

  it('switches between LOGIN and REGISTER tabs', () => {
    renderWithAuth(<AuthModal {...defaultProps} />);
    const registerTabBtn = screen.getByRole('button', { name: /ĐĂNG KÝ NHANH/i });
    fireEvent.click(registerTabBtn);
    expect(screen.getByPlaceholderText(/Nguyễn Văn A/i)).toBeInTheDocument();

    const loginTabBtn = screen.getByRole('button', { name: /^ĐĂNG NHẬP$/i });
    fireEvent.click(loginTabBtn);
    expect(screen.getByPlaceholderText(/Nhập email/i)).toBeInTheDocument();
  });

  it('allows filling in credentials and submitting login form', async () => {
    renderWithAuth(<AuthModal {...defaultProps} />);
    const identifierInput = screen.getByPlaceholderText(/Nhập email/i);
    const passwordInput = screen.getByPlaceholderText(/••••••••/i);

    fireEvent.change(identifierInput, { target: { value: 'minhanh.nguyen@gmail.com' } });
    fireEvent.change(passwordInput, { target: { value: 'securePass123' } });

    const submitBtn = screen.getByRole('button', { name: /ĐĂNG NHẬP VÀO HỆ THỐNG/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(defaultProps.onLoginSuccess).toHaveBeenCalled();
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  it('calls onClose when close button is clicked', () => {
    renderWithAuth(<AuthModal {...defaultProps} />);
    const closeBtn = screen.getByLabelText('Đóng hộp thoại');
    fireEvent.click(closeBtn);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});
