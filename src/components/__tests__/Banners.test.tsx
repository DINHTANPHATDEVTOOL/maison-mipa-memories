import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EditorialMarqueeBanner } from '../public/EditorialMarqueeBanner';
import { SeasonalCampaignBanner } from '../public/SeasonalCampaignBanner';
import { CuratorialSplitBanner } from '../public/CuratorialSplitBanner';

describe('Editorial Banners Suite', () => {
  it('renders EditorialMarqueeBanner with artistic texts', () => {
    render(<EditorialMarqueeBanner />);
    expect(screen.getAllByText(/MAISON MIPA MEMORIES/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/TRIỂN LÃM KHÔNG GIAN 3 CHIỀU/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/100% FILE ẢNH GỐC NGUYÊN BẢN/i).length).toBeGreaterThan(0);
  });

  it('renders SeasonalCampaignBanner with 3 privileges and calls onOpenBooking', () => {
    const handleOpenBooking = vi.fn();
    render(<SeasonalCampaignBanner onOpenBooking={handleOpenBooking} />);

    expect(screen.getByText(/Đặc Quyền Mùa Triển Lãm & Kỷ Niệm/i)).toBeInTheDocument();
    expect(screen.getByText(/Tặng Album Photobook Mở Phẳng/i)).toBeInTheDocument();
    expect(screen.getByText(/Tặng 01 Khung Ảnh Gỗ Sồi Lớn/i)).toBeInTheDocument();
    expect(screen.getByText(/Trọn Bộ 100% File Ảnh Gốc/i)).toBeInTheDocument();

    const ctaBtn = screen.getByRole('button', { name: /Nhận Trọn Bộ Đặc Quyền & Đặt Lịch/i });
    fireEvent.click(ctaBtn);
    expect(handleOpenBooking).toHaveBeenCalledTimes(1);
  });

  it('renders CuratorialSplitBanner with manifesto quote and film rebate details', () => {
    render(<CuratorialSplitBanner />);

    expect(screen.getByText(/Ánh sáng không chỉ để nhìn thấy, mà để cảm nhận khoảnh khắc vĩnh cửu/i)).toBeInTheDocument();
    expect(screen.getByText(/Cam Kết Chuẩn Nghệ Thuật Fine Art/i)).toBeInTheDocument();
    expect(screen.getByText(/KODAK PORTRA 400 • 36 EXP/i)).toBeInTheDocument();
    expect(screen.getByText(/COLLECTION PRIVÉE 2026/i)).toBeInTheDocument();
  });
});
