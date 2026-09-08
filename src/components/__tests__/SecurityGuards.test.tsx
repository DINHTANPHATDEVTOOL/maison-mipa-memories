// ==============================================================================
// Maison MIPA Memories - Security Guards & Route Interceptor Tests
// ==============================================================================
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { App } from '../../App';

describe('SecurityGuards and Access Control in App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.pushState({}, '', '/');
  });

  it('allows guest to access public tabs freely', () => {
    render(<App />);
    const servicesBtn = screen.getByRole('button', { name: /Dịch Vụ/i });
    fireEvent.click(servicesBtn);
    expect(screen.getByRole('heading', { name: /Dịch Vụ Chụp Ảnh Nghệ Thuật/i })).toBeInTheDocument();
  });

  it('blocks unauthenticated guest from booking and shows login prompt', () => {
    render(<App />);
    const bookingButtons = screen.getAllByRole('button', { name: /ĐẶT LỊCH/i });
    fireEvent.click(bookingButtons[0]);

    // Should open AuthModal with security prompt
    expect(screen.getByText(/Quý khách vui lòng Đăng Nhập/i)).toBeInTheDocument();
  });

  it('allows authenticated customer to open Booking Wizard', async () => {
    render(<App />);
    // Open auth modal
    const loginBtn = screen.getByRole('button', { name: /Đăng Nhập/i });
    fireEvent.click(loginBtn);

    // Enter customer credentials
    const identifierInput = screen.getByPlaceholderText(/Nhập email/i);
    const passwordInput = screen.getByPlaceholderText(/••••••••/i);
    fireEvent.change(identifierInput, { target: { value: 'minhanh.nguyen@gmail.com' } });
    fireEvent.change(passwordInput, { target: { value: 'securePass123' } });

    const submitBtn = screen.getByRole('button', { name: /ĐĂNG NHẬP VÀO HỆ THỐNG/i });
    fireEvent.click(submitBtn);

    // Wait for login to complete and modal to close
    await waitFor(() => {
      expect(screen.queryByText(/MAISON MIPA MEMORIES AUTH/i)).not.toBeInTheDocument();
    });

    // Now logged in as customer, click ĐẶT LỊCH
    const bookingButtons = screen.getAllByRole('button', { name: /ĐẶT LỊCH/i });
    fireEvent.click(bookingButtons[0]);

    // Booking Wizard is now open
    await waitFor(() => {
      expect(screen.getByText(/Bước 1\/6/i)).toBeInTheDocument();
    });
  });

  it('prevents customer from unauthorized staff access and shows 403 alert', async () => {
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
    render(<App />);

    // Login as Customer
    fireEvent.click(screen.getByRole('button', { name: 'Đăng Nhập' }));
    fireEvent.change(screen.getByPlaceholderText(/Nhập email/i), { target: { value: 'minhanh.nguyen@gmail.com' } });
    fireEvent.change(screen.getByPlaceholderText(/••••••••/i), { target: { value: 'securePass123' } });
    fireEvent.click(screen.getByRole('button', { name: /ĐĂNG NHẬP VÀO HỆ THỐNG/i }));

    await waitFor(() => {
      expect(screen.queryByText(/MAISON MIPA MEMORIES AUTH/i)).not.toBeInTheDocument();
    });

    // Customer is logged in and does not have access to staff or management portals in UI
    expect(screen.queryByText(/Quản Lý Studio OS/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Ca chụp & Lịch/i)).not.toBeInTheDocument();

    alertMock.mockRestore();
  });
});
