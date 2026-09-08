import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AuthModal } from '../auth/AuthModal';
import { INITIAL_USERS } from '../../mockData';

describe('AuthModal Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    usersList: INITIAL_USERS,
    onLoginSuccess: vi.fn(),
    onRegisterSuccess: vi.fn(),
  };

  it('renders nothing when isOpen is false', () => {
    const { container } = render(<AuthModal {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders modal header and tabs when isOpen is true', () => {
    render(<AuthModal {...defaultProps} />);
    expect(screen.getByText(/MAISON MIPA MEMORIES AUTH/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^ĐĂNG NHẬP$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ĐĂNG KÝ NHANH/i })).toBeInTheDocument();
  });

  it('displays target feature message when passed', () => {
    render(<AuthModal {...defaultProps} targetFeatureMessage="🔒 Yêu cầu đăng nhập để xem thông tin" />);
    expect(screen.getByText(/🔒 Yêu cầu đăng nhập để xem thông tin/i)).toBeInTheDocument();
  });

  it('switches between LOGIN and REGISTER tabs', () => {
    render(<AuthModal {...defaultProps} />);
    const registerTabBtn = screen.getByRole('button', { name: /ĐĂNG KÝ NHANH/i });
    fireEvent.click(registerTabBtn);
    expect(screen.getByPlaceholderText(/Nguyễn Văn A/i)).toBeInTheDocument();

    const loginTabBtn = screen.getByRole('button', { name: /^ĐĂNG NHẬP$/i });
    fireEvent.click(loginTabBtn);
    expect(screen.getByPlaceholderText(/Nhập email/i)).toBeInTheDocument();
  });

  it('allows filling in credentials and submitting login form', () => {
    render(<AuthModal {...defaultProps} />);
    const identifierInput = screen.getByPlaceholderText(/Nhập email/i);
    const passwordInput = screen.getByPlaceholderText(/••••••••/i);

    fireEvent.change(identifierInput, { target: { value: 'minhanh.nguyen@gmail.com' } });
    fireEvent.change(passwordInput, { target: { value: 'mipa123' } });

    const submitBtn = screen.getByRole('button', { name: /ĐĂNG NHẬP VÀO HỆ THỐNG/i });
    fireEvent.click(submitBtn);

    expect(defaultProps.onLoginSuccess).toHaveBeenCalled();
  });

  it('calls onClose when close button is clicked', () => {
    render(<AuthModal {...defaultProps} />);
    const closeButtons = screen.getAllByRole('button');
    // Top right close button has X icon
    fireEvent.click(closeButtons[0]);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});
