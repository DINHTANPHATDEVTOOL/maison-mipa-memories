import React, { useState, useEffect, useCallback } from 'react';
import { FocusTrap } from '../ui/FocusTrap';
import {
  Users,
  Camera,
  CheckCircle2,
  AlertTriangle,
  X,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import type { Booking, BookingAssignment, ResourceReservation, StudioResource, StaffRole } from '../../types';
import { INITIAL_EMPLOYEES } from '../../mockData';
import { assignBookingStaffV2 } from '../../services/staffSchedulingService';
import { getStudioResources, getBookingReservations, reserveBookingResource } from '../../services/resourcePlanningService';

interface BookingCrewAndResourcePlannerProps {
  booking: Booking;
  onClose: () => void;
  onUpdated?: () => void;
}

export const BookingCrewAndResourcePlanner: React.FC<BookingCrewAndResourcePlannerProps> = ({
  booking,
  onClose,
  onUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'CREW' | 'RESOURCES'>('CREW');
  const [assignments, setAssignments] = useState<BookingAssignment[]>(booking.assignments || []);
  const [reservations, setReservations] = useState<ResourceReservation[]>([]);
  const [availableResources, setAvailableResources] = useState<StudioResource[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Staff assignment form
  const [selectedStaffRole, setSelectedStaffRole] = useState<StaffRole>('PHOTOGRAPHER');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(INITIAL_EMPLOYEES[0]?.id || '');
  const [isAssigning, setIsAssigning] = useState<boolean>(false);

  // Resource reservation form
  const [selectedResourceId, setSelectedResourceId] = useState<string>('');
  const [isReserving, setIsReserving] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [resv, allRes] = await Promise.all([
        getBookingReservations(booking.id),
        getStudioResources({ status: 'AVAILABLE' }),
      ]);
      setReservations(resv);
      setAvailableResources(allRes);
      if (allRes.length > 0) {
        setSelectedResourceId(allRes[0].id);
      }
    } catch (err: any) {
      console.error('Error loading planner data:', err);
    } finally {
      setLoading(false);
    }
  }, [booking.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAssignStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsAssigning(true);

    try {
      const newAssignment = await assignBookingStaffV2({
        bookingId: booking.id,
        employeeId: selectedEmployeeId,
        assignmentRole: selectedStaffRole,
      });

      setAssignments(prev => [
        ...prev.filter(a => !(a.employeeId === selectedEmployeeId && a.assignmentRole === selectedStaffRole)),
        newAssignment
      ]);
      setSuccessMsg(`Đã phân công ${selectedStaffRole} thành công.`);
      if (onUpdated) onUpdated();
    } catch (err: any) {
      setErrorMsg(err.message || 'Phân công nhân viên thất bại do trùng lịch hoặc xung đột nghỉ phép.');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleReserveResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResourceId) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsReserving(true);

    try {
      const newResv = await reserveBookingResource({
        bookingId: booking.id,
        resourceId: selectedResourceId,
        quantity: 1,
      });

      setReservations(prev => [...prev, newResv]);
      setSuccessMsg(`Đã giữ thiết bị [${newResv.assetCode}] thành công.`);
      await loadData();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      setErrorMsg(err.message || 'Đặt giữ thiết bị thất bại do trùng lịch.');
    } finally {
      setIsReserving(false);
    }
  };

  const hasPhotographer = assignments.some(a => a.assignmentRole === 'PHOTOGRAPHER');
  const hasMakeup = assignments.some(a => a.assignmentRole === 'MAKEUP');
  const hasEditor = assignments.some(a => a.assignmentRole === 'EDITOR');

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1100,
      padding: '1rem',
    }}>
      <FocusTrap
        onEscape={onClose}
        aria-labelledby="planner-modal-title"
        style={{
          backgroundColor: '#FFFDF6',
          borderRadius: '16px',
          maxWidth: '800px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '2rem',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          position: 'relative',
          color: '#2C2420',
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: '#888',
          }}
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid #E5DFD7', paddingBottom: '1rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#8C6E53', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
            <Sparkles size={14} color="#C6A45F" /> Điều Phối Nhân Sự & Thiết Bị
          </div>
          <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.5rem', margin: '0.2rem 0 0', fontWeight: 700 }}>
            Booking {booking.bookingCode} — {booking.customerName}
          </h2>
          <p style={{ margin: '0.3rem 0 0', fontSize: '0.88rem', color: '#666' }}>
            Gói: <strong>{booking.packageName}</strong> • Thời gian: {booking.bookingDate} ({booking.startTime} - {booking.endTime}) • Phòng: {booking.studioName}
            {loading && <span style={{ marginLeft: '0.5rem', color: '#B8860B' }}>• Đang đồng bộ...</span>}
          </p>
        </div>

        {errorMsg && (
          <div style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: '8px',
            padding: '0.85rem 1rem',
            color: '#B91C1C',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.88rem',
          }}>
            <ShieldAlert size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div style={{
            backgroundColor: '#F0FDF4',
            border: '1px solid #BBF7D0',
            borderRadius: '8px',
            padding: '0.85rem 1rem',
            color: '#15803D',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.88rem',
          }}>
            <CheckCircle2 size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Subtabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid #E5DFD7' }}>
          <button
            onClick={() => setActiveTab('CREW')}
            style={{
              padding: '0.6rem 1.2rem',
              border: 'none',
              borderBottom: activeTab === 'CREW' ? '2.5px solid #604634' : '2.5px solid transparent',
              backgroundColor: 'transparent',
              color: activeTab === 'CREW' ? '#604634' : '#888',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <Users size={16} /> Đội Ngũ Crew (Nhân sự)
          </button>
          <button
            onClick={() => setActiveTab('RESOURCES')}
            style={{
              padding: '0.6rem 1.2rem',
              border: 'none',
              borderBottom: activeTab === 'RESOURCES' ? '2.5px solid #604634' : '2.5px solid transparent',
              backgroundColor: 'transparent',
              color: activeTab === 'RESOURCES' ? '#604634' : '#888',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <Camera size={16} /> Thiết Bị & Máy Ảnh ({reservations.length})
          </button>
        </div>

        {activeTab === 'CREW' ? (
          <div>
            {/* Crew Status Summary */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{
                flex: 1,
                padding: '0.75rem',
                borderRadius: '8px',
                backgroundColor: hasPhotographer ? '#F0FDF4' : '#FEF2F2',
                border: hasPhotographer ? '1px solid #DCFCE7' : '1px solid #FEE2E2',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}>
                {hasPhotographer ? <CheckCircle2 size={16} color="#16A34A" /> : <AlertTriangle size={16} color="#DC2626" />}
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#666', fontWeight: 600 }}>Nhiếp ảnh gia</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: hasPhotographer ? '#15803D' : '#B91C1C' }}>
                    {hasPhotographer ? assignments.find(a => a.assignmentRole === 'PHOTOGRAPHER')?.employeeName : 'Chưa có'}
                  </div>
                </div>
              </div>

              <div style={{
                flex: 1,
                padding: '0.75rem',
                borderRadius: '8px',
                backgroundColor: hasMakeup ? '#F0FDF4' : '#FEF2F2',
                border: hasMakeup ? '1px solid #DCFCE7' : '1px solid #FEE2E2',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}>
                {hasMakeup ? <CheckCircle2 size={16} color="#16A34A" /> : <AlertTriangle size={16} color="#DC2626" />}
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#666', fontWeight: 600 }}>Chuyên viên Makeup</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: hasMakeup ? '#15803D' : '#B91C1C' }}>
                    {hasMakeup ? assignments.find(a => a.assignmentRole === 'MAKEUP')?.employeeName : 'Chưa có'}
                  </div>
                </div>
              </div>

              <div style={{
                flex: 1,
                padding: '0.75rem',
                borderRadius: '8px',
                backgroundColor: hasEditor ? '#F0FDF4' : '#FFFBEB',
                border: hasEditor ? '1px solid #DCFCE7' : '1px solid #FDE68A',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}>
                {hasEditor ? <CheckCircle2 size={16} color="#16A34A" /> : <AlertTriangle size={16} color="#D97706" />}
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#666', fontWeight: 600 }}>Editor Hậu kỳ</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: hasEditor ? '#15803D' : '#B45309' }}>
                    {hasEditor ? assignments.find(a => a.assignmentRole === 'EDITOR')?.employeeName : 'Chưa gán'}
                  </div>
                </div>
              </div>
            </div>

            {/* Current Assignments List */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ margin: '0 0 0.6rem', fontSize: '0.9rem', color: '#604634', fontWeight: 700 }}>
                Nhân sự đã được phân công ({assignments.length})
              </h4>
              {assignments.length === 0 ? (
                <div style={{ padding: '1rem', textAlign: 'center', color: '#888', backgroundColor: '#F3EFEA', borderRadius: '8px', fontSize: '0.85rem' }}>
                  Chưa có nhân sự nào được phân công cho ca chụp này.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {assignments.map(a => (
                    <div key={a.id || a.employeeId} style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      backgroundColor: '#FFF',
                      border: '1px solid #E5DFD7',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}>
                      <div>
                        <strong>{a.employeeName}</strong>
                        <span style={{ fontSize: '0.78rem', color: '#8C6E53', marginLeft: '0.5rem', fontWeight: 600 }}>
                          [{a.assignmentRole}]
                        </span>
                      </div>
                      <span style={{ fontSize: '0.78rem', color: '#16A34A', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        <CheckCircle2 size={13} /> Khả dụng
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Assign Staff Form */}
            <form onSubmit={handleAssignStaff} style={{
              backgroundColor: '#F3EFEA',
              padding: '1.25rem',
              borderRadius: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
            }}>
              <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#604634', fontWeight: 700 }}>
                Phân Công Thêm Nhân Sự Mới
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.25rem', color: '#666' }}>
                    Vai trò
                  </label>
                  <select
                    value={selectedStaffRole}
                    onChange={e => setSelectedStaffRole(e.target.value as any)}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #D1C7BD', backgroundColor: '#FFF' }}
                  >
                    <option value="PHOTOGRAPHER">Photographer (Chính)</option>
                    <option value="MAKEUP">Makeup Artist</option>
                    <option value="EDITOR">Editor Hậu kỳ</option>
                    <option value="RECEPTIONIST">Lễ tân</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.25rem', color: '#666' }}>
                    Chọn nhân viên
                  </label>
                  <select
                    value={selectedEmployeeId}
                    onChange={e => setSelectedEmployeeId(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #D1C7BD', backgroundColor: '#FFF' }}
                  >
                    {INITIAL_EMPLOYEES.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                type="submit"
                disabled={isAssigning}
                style={{
                  alignSelf: 'flex-end',
                  padding: '0.55rem 1.25rem',
                  borderRadius: '6px',
                  backgroundColor: '#604634',
                  color: '#FFFDF6',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                {isAssigning ? 'Đang kiểm tra xung đột...' : 'Xác nhận phân công'}
              </button>
            </form>
          </div>
        ) : (
          <div>
            {/* Reserved Resources List */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ margin: '0 0 0.6rem', fontSize: '0.9rem', color: '#604634', fontWeight: 700 }}>
                Thiết bị đã được giữ cho ca chụp này ({reservations.length})
              </h4>
              {reservations.length === 0 ? (
                <div style={{ padding: '1rem', textAlign: 'center', color: '#888', backgroundColor: '#F3EFEA', borderRadius: '8px', fontSize: '0.85rem' }}>
                  Chưa có thiết bị nào được giữ trước.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {reservations.map(r => (
                    <div key={r.id} style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      backgroundColor: '#FFF',
                      border: '1px solid #E5DFD7',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}>
                      <div>
                        <strong>[{r.assetCode}] {r.resourceName}</strong>
                        <span style={{ fontSize: '0.78rem', color: '#888', marginLeft: '0.5rem' }}>
                          (SL: {r.quantity})
                        </span>
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '8px', backgroundColor: '#DCFCE7', color: '#15803D' }}>
                        {r.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Reserve Resource Form */}
            <form onSubmit={handleReserveResource} style={{
              backgroundColor: '#F3EFEA',
              padding: '1.25rem',
              borderRadius: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
            }}>
              <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#604634', fontWeight: 700 }}>
                Giữ Chỗ Thiết Bị Mới
              </h4>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.25rem', color: '#666' }}>
                  Chọn thiết bị từ kho (Sẵn sàng)
                </label>
                <select
                  value={selectedResourceId}
                  onChange={e => setSelectedResourceId(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #D1C7BD', backgroundColor: '#FFF' }}
                >
                  {availableResources.map(res => (
                    <option key={res.id} value={res.id}>
                      [{res.assetCode}] {res.name} — {res.categoryName}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={isReserving || availableResources.length === 0}
                style={{
                  alignSelf: 'flex-end',
                  padding: '0.55rem 1.25rem',
                  borderRadius: '6px',
                  backgroundColor: '#604634',
                  color: '#FFFDF6',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                {isReserving ? 'Đang khóa tài nguyên...' : 'Xác nhận giữ máy'}
              </button>
            </form>
          </div>
        )}
      </FocusTrap>
    </div>
  );
};
