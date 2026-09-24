import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { PricingPage } from '../PricingPage';
import { getExtraSlotPrice, setExtraSlotPrice } from '../../services/pricingService';

const mockUseAuth = vi.fn();

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('PricingPage: Admin Slot Price Configuration', () => {
  beforeEach(() => {
    localStorage.clear();
    setExtraSlotPrice(100000);
    vi.clearAllMocks();
  });

  it('renders admin slot price toolbar when user is ADMIN or MANAGER', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'admin_1', email: 'admin@maisonmipa.vn' },
      role: 'ADMIN',
      isAdmin: true,
      isManager: false,
    });

    render(
      <MemoryRouter>
        <PricingPage onOpenBooking={vi.fn()} />
      </MemoryRouter>
    );

    // Check Admin slot pricing panel is visible
    expect(screen.getByText(/Mức giá phụ thu ca chụp thêm:/i)).toBeInTheDocument();
    expect(screen.getAllByText(/100\.000 VNĐ \/ ca/i).length).toBeGreaterThanOrEqual(1);

    // Click "Chỉnh sửa giá ca"
    const editBtn = screen.getByRole('button', { name: /Chỉnh sửa giá ca/i });
    fireEvent.click(editBtn);

    // Form inputs appear
    const priceInput = screen.getByLabelText(/Giá mới \(VNĐ\):/i) as HTMLInputElement;
    expect(priceInput).toBeInTheDocument();
    expect(priceInput.value).toBe('100000');

    // Change price to 150,000 VND
    fireEvent.change(priceInput, { target: { value: '150000' } });
    const saveBtn = screen.getByRole('button', { name: /Lưu giá ca/i });
    fireEvent.click(saveBtn);

    // Check updated value in service and UI
    await waitFor(() => {
      expect(getExtraSlotPrice()).toBe(150000);
    });
    expect(screen.getAllByText(/150\.000 VNĐ \/ ca/i).length).toBeGreaterThanOrEqual(1);

    // Test Reset button
    const resetBtn = screen.getByRole('button', { name: /Đặt lại 100k/i });
    fireEvent.click(resetBtn);
    expect(getExtraSlotPrice()).toBe(100000);
    expect(screen.getAllByText(/100\.000 VNĐ \/ ca/i).length).toBeGreaterThanOrEqual(1);
  });

  it('hides admin toolbar for normal customers but displays flexible slot policy banner', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      role: null,
      isAdmin: false,
      isManager: false,
    });

    render(
      <MemoryRouter>
        <PricingPage onOpenBooking={vi.fn()} />
      </MemoryRouter>
    );

    // Admin toolbar should NOT be rendered
    expect(screen.queryByText(/Mục Set Giá Tiền Ca Chụp Thêm \(Admin\)/i)).not.toBeInTheDocument();

    // Public policy banner should be visible
    expect(screen.getByText(/Chính Sách Chụp Thêm Ca Linh Hoạt/i)).toBeInTheDocument();
    expect(screen.getByText(/\+100\.000 VNĐ \/ ca/i)).toBeInTheDocument();
  });
});
