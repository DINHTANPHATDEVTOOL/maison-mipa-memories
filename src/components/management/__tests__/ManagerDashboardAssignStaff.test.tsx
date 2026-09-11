import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ManagerDashboard } from '../ManagerDashboard';
import type { Booking, Employee, StudioRoom } from '../../../types';
import { getEmployees } from '../../../services/catalogService';

describe('ManagerDashboard - Staff Assignment Modal & Employee Resolution', () => {
  const mockBooking: Booking = {
    id: 'b-001',
    bookingCode: 'MIPA-260911-F639',
    customerId: 'u-1',
    customerName: 'Phat Dinh Tan',
    customerPhone: '0966616546',
    customerEmail: 'phatdt@greystonevn.com',
    serviceId: 'srv-1',
    serviceName: 'Dịch Vụ MIPA',
    packageId: 'pkg-1',
    packageName: 'Gói Chụp MIPA',
    packagePrice: 4090000,
    subtotal: 4090000,
    discount: 0,
    depositAmount: 1047000,
    totalAmount: 4090000,
    paymentStatus: 'DEPOSIT_PAID',
    bookingStatus: 'CONFIRMED',
    studioId: 'std-1',
    studioName: 'Phòng Studio MIPA',
    bookingDate: '2026-09-12',
    startTime: '09:00',
    endTime: '11:30',
    addons: [],
    assignments: [],
    conceptIds: [],
    customerNote: 'Khách hàng VIP',
    createdAt: '2026-09-11T10:00:00Z',
    updatedAt: '2026-09-11T10:00:00Z',
  };

  const mockEmployees: Employee[] = [
    {
      id: 'emp-photo-1',
      name: 'Nguyễn Văn Nhiếp',
      phone: '0911222333',
      email: 'nhiep@mipa.vn',
      role: 'PHOTOGRAPHER',
      avatar: '/hero.png',
      skills: ['Portrait', 'Fashion'],
      rating: 4.9,
      totalSessions: 120,
      status: 'ACTIVE',
      shiftSchedule: {},
    },
    {
      id: 'emp-makeup-1',
      name: 'Trần Thị Trang Điểm',
      phone: '0944555666',
      email: 'makeup@mipa.vn',
      role: 'MAKEUP',
      avatar: '/studio.png',
      skills: ['Bridal', 'Soft Glam'],
      rating: 4.8,
      totalSessions: 95,
      status: 'ACTIVE',
      shiftSchedule: {},
    },
    {
      id: 'emp-mgr-1',
      name: 'Phat Dinh Tan (Manager)',
      phone: '0988777666',
      email: 'phat.mgr@mipa.vn',
      role: 'MANAGER',
      avatar: '/hero.png',
      skills: ['Operations'],
      rating: 5.0,
      totalSessions: 10,
      status: 'ACTIVE',
      shiftSchedule: {},
    },
  ];

  const mockStudios: StudioRoom[] = [
    {
      id: 'std-1',
      name: 'Phòng Studio MIPA',
      code: 'MIPA-ROOM-1',
      capacity: 10,
      status: 'ACTIVE',
      image: '',
      description: 'Studio tiêu chuẩn',
    },
  ];

  it('1. opens modal with rich booking context and close button without text clipping', () => {
    const onAssignStaff = vi.fn();
    render(
      <ManagerDashboard
        bookings={[mockBooking]}
        employees={mockEmployees}
        studios={mockStudios}
        onOpenBooking={vi.fn()}
        onUpdateStatus={vi.fn()}
        onAssignStaff={onAssignStaff}
        onNavigateTab={vi.fn()}
      />
    );

    // Click "Gán Kíp" button on the booking card
    const assignBtn = screen.getByRole('button', { name: /👤 Gán Kíp/i });
    fireEvent.click(assignBtn);

    // Modal should be opened
    expect(screen.getByText(/Phân Công: #MIPA-260911-F639/i)).toBeDefined();
    expect(screen.getByText(/ĐIỀU PHỐI NHÂN SỰ STUDIO/i)).toBeDefined();

    // Verify booking context is clearly visible
    expect(screen.getAllByText(/Phat Dinh Tan/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/0966616546/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Gói Chụp MIPA/i).length).toBeGreaterThan(0);

    // Verify role select box styling does NOT constrain height to 40px (which caused text clipping)
    const roleSelect = screen.getByLabelText(/Vai trò phân công/i) as HTMLSelectElement;
    expect(roleSelect.style.height).not.toBe('40px');
    expect(roleSelect.style.minHeight).toBe('48px');

    // Verify employee select box styling
    const empSelect = screen.getByLabelText(/Chọn nhân viên/i) as HTMLSelectElement;
    expect(empSelect.style.height).not.toBe('40px');
    expect(empSelect.style.minHeight).toBe('48px');

    // Close button (X) closes modal
    const closeBtn = screen.getByLabelText('Đóng cửa sổ');
    fireEvent.click(closeBtn);
    expect(screen.queryByText(/ĐIỀU PHỐI NHÂN SỰ STUDIO/i)).toBeNull();
  });

  it('2. populates matching specialty employees and other available staff in separate optgroups', () => {
    const onAssignStaff = vi.fn();
    render(
      <ManagerDashboard
        bookings={[mockBooking]}
        employees={mockEmployees}
        studios={mockStudios}
        onOpenBooking={vi.fn()}
        onUpdateStatus={vi.fn()}
        onAssignStaff={onAssignStaff}
        onNavigateTab={vi.fn()}
      />
    );

    // Open modal
    fireEvent.click(screen.getByRole('button', { name: /👤 Gán Kíp/i }));

    const empSelect = screen.getByLabelText(/Chọn nhân viên/i) as HTMLSelectElement;
    expect(empSelect).toBeDefined();

    // Matching group has PHOTOGRAPHER (Nguyễn Văn Nhiếp)
    expect(screen.getByText(/Nguyễn Văn Nhiếp — PHOTOGRAPHER/i)).toBeDefined();

    // Other group has other available staff (Trần Thị Trang Điểm, Phat Dinh Tan)
    expect(screen.getByText(/Trần Thị Trang Điểm — MAKEUP/i)).toBeDefined();
    expect(screen.getByText(/Phat Dinh Tan \(Manager\) — MANAGER/i)).toBeDefined();

    // Select employee and submit form
    fireEvent.change(empSelect, { target: { value: 'emp-photo-1' } });
    fireEvent.click(screen.getByRole('button', { name: /Lưu Phân Công/i }));

    expect(onAssignStaff).toHaveBeenCalledWith('b-001', 'emp-photo-1', 'PHOTOGRAPHER');
  });

  it('3. dynamically regroups options when assignment role is changed', () => {
    const onAssignStaff = vi.fn();
    render(
      <ManagerDashboard
        bookings={[mockBooking]}
        employees={mockEmployees}
        studios={mockStudios}
        onOpenBooking={vi.fn()}
        onUpdateStatus={vi.fn()}
        onAssignStaff={onAssignStaff}
        onNavigateTab={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /👤 Gán Kíp/i }));

    const roleSelect = screen.getByLabelText(/Vai trò phân công/i) as HTMLSelectElement;
    fireEvent.change(roleSelect, { target: { value: 'MAKEUP' } });

    // When role is MAKEUP, Trần Thị Trang Điểm is in matching optgroup
    const matchingGroup = screen.getByRole('group', { name: /⭐ Đúng chuyên môn \(MAKEUP\)/i });
    expect(matchingGroup).toBeDefined();

    const empSelect = screen.getByLabelText(/Chọn nhân viên/i) as HTMLSelectElement;
    fireEvent.change(empSelect, { target: { value: 'emp-makeup-1' } });
    fireEvent.click(screen.getByRole('button', { name: /Lưu Phân Công/i }));

    expect(onAssignStaff).toHaveBeenCalledWith('b-001', 'emp-makeup-1', 'MAKEUP');
  });

  it('4. falls back to mock employees when database employees array is empty', () => {
    render(
      <ManagerDashboard
        bookings={[mockBooking]}
        employees={[]} // empty list
        studios={mockStudios}
        onOpenBooking={vi.fn()}
        onUpdateStatus={vi.fn()}
        onAssignStaff={vi.fn()}
        onNavigateTab={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /👤 Gán Kíp/i }));

    // Dropdown should not be blank - should have fallback employees available
    const empSelect = screen.getByLabelText(/Chọn nhân viên/i) as HTMLSelectElement;
    const options = empSelect.querySelectorAll('option');
    expect(options.length).toBeGreaterThan(1);
  });

  it('5. getEmployees catalog service provides robust fallback', async () => {
    const employees = await getEmployees();
    expect(Array.isArray(employees)).toBe(true);
    expect(employees.length).toBeGreaterThan(0);
    expect(employees[0].name).toBeDefined();
    expect(employees[0].role).toBeDefined();
  });
});
