import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Navbar } from '../Navbar';

describe('Navbar Component', () => {
  const defaultProps = {
    currentUser: null,
    currentRole: 'GUEST' as const,
    onRoleChange: vi.fn(),
    activeTab: 'home',
    setActiveTab: vi.fn(),
    onOpenBooking: vi.fn(),
    searchQuery: '',
    setSearchQuery: vi.fn(),
    onOpenAuthModal: vi.fn(),
    onLogout: vi.fn(),
  };

  it('renders brand name and navigation items', () => {
    render(<Navbar {...defaultProps} />);
    expect(screen.getByText(/MAISON MIPA/i)).toBeInTheDocument();
    expect(screen.getByText(/Dịch Vụ/i)).toBeInTheDocument();
    expect(screen.getByText(/Bảng Giá/i)).toBeInTheDocument();
    expect(screen.getByText(/Portfolio/i)).toBeInTheDocument();
  });

  it('calls onOpenBooking when clicking booking button', () => {
    render(<Navbar {...defaultProps} />);
    const bookingButtons = screen.getAllByRole('button', { name: /ĐẶT LỊCH/i });
    expect(bookingButtons.length).toBeGreaterThan(0);
    fireEvent.click(bookingButtons[0]);
    expect(defaultProps.onOpenBooking).toHaveBeenCalled();
  });

  it('calls onOpenAuthModal when clicking login button as guest', () => {
    render(<Navbar {...defaultProps} />);
    const loginButton = screen.getByRole('button', { name: /Đăng Nhập/i });
    fireEvent.click(loginButton);
    expect(defaultProps.onOpenAuthModal).toHaveBeenCalledWith('LOGIN');
  });

  it('displays user info and opens dropdown to logout when logged in', () => {
    const loggedInProps = {
      ...defaultProps,
      currentRole: 'CUSTOMER' as const,
      currentUser: {
        id: 'cust_01',
        fullName: 'Nguyễn Minh Anh',
        email: 'minhanh@gmail.com',
        phone: '0908123456',
        role: 'CUSTOMER' as const,
        status: 'ACTIVE' as const,
        createdAt: '2026-01-01',
      },
    };
    render(<Navbar {...loggedInProps} />);
    const userLabel = screen.getByText(/Nguyễn Minh Anh/i);
    expect(userLabel).toBeInTheDocument();

    // Click profile dropdown trigger
    fireEvent.click(userLabel);

    // Logout button appears in dropdown
    const logoutBtn = screen.getByRole('button', { name: /Đăng Xuất/i });
    expect(logoutBtn).toBeInTheDocument();
    fireEvent.click(logoutBtn);
    expect(defaultProps.onLogout).toHaveBeenCalled();
  });
});
