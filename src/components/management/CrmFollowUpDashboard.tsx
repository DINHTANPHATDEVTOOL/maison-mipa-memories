import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Calendar,
  User,
  Plus,
  Filter,
  Check,
  RefreshCw,
  MessageSquare,
} from 'lucide-react';
import { FocusTrap } from '../ui/FocusTrap';
import { getFollowUpTasks, updateFollowUpTaskStatus, createFollowUpTask } from '../../services/crmService';
import type { CrmFollowUpTask, CrmTaskStatus, CrmTaskPriority } from '../../types';

export const CrmFollowUpDashboard: React.FC = () => {
  const [tasks, setTasks] = useState<CrmFollowUpTask[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'today' | 'overdue' | 'upcoming' | 'completed'>('today');

  // New task modal
  const [showModal, setShowModal] = useState<boolean>(false);
  const [form, setForm] = useState<{
    customerId: string;
    title: string;
    description: string;
    dueAt: string;
    priority: CrmTaskPriority;
  }>({
    customerId: '',
    title: '',
    description: '',
    dueAt: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
    priority: 'NORMAL',
  });
  const [saving, setSaving] = useState<boolean>(false);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getFollowUpTasks();
      setTasks(data);
    } catch (err: any) {
      console.error('[FollowUp] Load error:', err);
      setError(err.message || 'Không thể tải danh sách follow-up.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();

  const overdueTasks = tasks.filter(t => t.status !== 'DONE' && t.status !== 'CANCELLED' && t.dueAt < todayStart);
  const todayTasks = tasks.filter(t => t.status !== 'DONE' && t.status !== 'CANCELLED' && t.dueAt >= todayStart && t.dueAt <= todayEnd);
  const upcomingTasks = tasks.filter(t => t.status !== 'DONE' && t.status !== 'CANCELLED' && t.dueAt > todayEnd);
  const completedTasks = tasks.filter(t => t.status === 'DONE');

  const displayedTasks =
    activeTab === 'today'
      ? todayTasks
      : activeTab === 'overdue'
      ? overdueTasks
      : activeTab === 'upcoming'
      ? upcomingTasks
      : completedTasks;

  const handleToggleTask = async (taskId: string, currentStatus: CrmTaskStatus) => {
    const nextStatus = currentStatus === 'DONE' ? 'TODO' : 'DONE';
    try {
      await updateFollowUpTaskStatus(taskId, nextStatus);
      await loadTasks();
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.dueAt) return;
    setSaving(true);
    try {
      await createFollowUpTask({
        customerId: form.customerId || 'cust-direct',
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        dueAt: new Date(form.dueAt).toISOString(),
        priority: form.priority,
      });
      setShowModal(false);
      setForm({
        customerId: '',
        title: '',
        description: '',
        dueAt: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
        priority: 'NORMAL',
      });
      await loadTasks();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi tạo nhiệm vụ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '1350px', margin: '1.5rem auto', padding: '0 1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#8C6E53', fontWeight: 700 }}>
            MAISON MIPA FOLLOW-UP MANAGEMENT
          </div>
          <h2 style={{ fontSize: '1.8rem', color: '#604634', margin: '0.2rem 0 0 0', fontFamily: 'Cinzel, serif', fontWeight: 600 }}>
            Nhiệm Vụ Follow-up Khách Hàng
          </h2>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            onClick={() => setShowModal(true)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#604634',
              border: 'none',
              borderRadius: '12px',
              color: '#FFFDF6',
              fontWeight: 600,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <Plus size={15} /> Thêm Nhiệm Vụ
          </button>
          <button
            onClick={loadTasks}
            style={{
              padding: '0.5rem',
              backgroundColor: '#F7F3EB',
              border: '1px solid #EFE6C9',
              borderRadius: '12px',
              color: '#604634',
              cursor: 'pointer',
            }}
            aria-label="Tải lại nhiệm vụ"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Overview Metric Tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div
          onClick={() => setActiveTab('today')}
          style={{
            backgroundColor: activeTab === 'today' ? '#FFFDF6' : '#FFFFFF',
            border: activeTab === 'today' ? '2px solid #8C6E53' : '1px solid #EFE6C9',
            padding: '1.1rem',
            borderRadius: '16px',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(96, 70, 52, 0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#604634' }}>Hôm Nay Cần Làm</span>
            <Clock size={18} color="#8C6E53" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#604634', marginTop: '0.4rem' }}>
            {todayTasks.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#8C6E53', marginTop: '0.2rem' }}>Cần xử lý trong ngày</div>
        </div>

        <div
          onClick={() => setActiveTab('overdue')}
          style={{
            backgroundColor: activeTab === 'overdue' ? '#FFFDF6' : '#FFFFFF',
            border: activeTab === 'overdue' ? '2px solid #DC2626' : '1px solid #FCA5A5',
            padding: '1.1rem',
            borderRadius: '16px',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(220, 38, 38, 0.06)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#DC2626' }}>Quá Hạn</span>
            <AlertTriangle size={18} color="#DC2626" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#DC2626', marginTop: '0.4rem' }}>
            {overdueTasks.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#DC2626', marginTop: '0.2rem' }}>Cần can thiệp khẩn cấp</div>
        </div>

        <div
          onClick={() => setActiveTab('upcoming')}
          style={{
            backgroundColor: activeTab === 'upcoming' ? '#FFFDF6' : '#FFFFFF',
            border: activeTab === 'upcoming' ? '2px solid #2563EB' : '1px solid #BFDBFE',
            padding: '1.1rem',
            borderRadius: '16px',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(37, 99, 235, 0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#2563EB' }}>Sắp Tới</span>
            <Calendar size={18} color="#2563EB" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#2563EB', marginTop: '0.4rem' }}>
            {upcomingTasks.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#2563EB', marginTop: '0.2rem' }}>Hạn trong các ngày tới</div>
        </div>

        <div
          onClick={() => setActiveTab('completed')}
          style={{
            backgroundColor: activeTab === 'completed' ? '#FFFDF6' : '#FFFFFF',
            border: activeTab === 'completed' ? '2px solid #059669' : '1px solid #A7F3D0',
            padding: '1.1rem',
            borderRadius: '16px',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(5, 150, 105, 0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#059669' }}>Đã Hoàn Thành</span>
            <CheckCircle2 size={18} color="#059669" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#059669', marginTop: '0.4rem' }}>
            {completedTasks.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#059669', marginTop: '0.2rem' }}>Đã xử lý xong</div>
        </div>
      </div>

      {/* Task List Content */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '18px',
        border: '1px solid #EFE6C9',
        padding: '1.5rem',
        boxShadow: '0 4px 12px rgba(96, 70, 52, 0.05)',
      }}>
        <h3 style={{ margin: '0 0 1rem 0', color: '#604634', fontSize: '1.1rem', fontFamily: 'Cinzel, serif' }}>
          {activeTab === 'today' && 'Nhiệm Vụ Cần Xử Lý Hôm Nay'}
          {activeTab === 'overdue' && 'Nhiệm Vụ Đã Quá Hạn'}
          {activeTab === 'upcoming' && 'Nhiệm Vụ Kế Tiếp'}
          {activeTab === 'completed' && 'Nhiệm Vụ Đã Hoàn Thành'}
          {' '}({displayedTasks.length})
        </h3>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: '#8C6E53' }}>
            Đang tải dữ liệu nhiệm vụ...
          </div>
        ) : displayedTasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: '#8C6E53' }}>
            <CheckCircle2 size={36} style={{ opacity: 0.4, marginBottom: '0.5rem', color: '#059669' }} />
            <div style={{ fontSize: '1rem', fontWeight: 600, color: '#604634' }}>Không có nhiệm vụ nào trong mục này</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {displayedTasks.map((task) => (
              <div
                key={task.id}
                style={{
                  padding: '1rem 1.2rem',
                  borderRadius: '14px',
                  border: '1px solid #EFE6C9',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.8rem',
                  backgroundColor: task.status === 'DONE' ? '#F9FAFB' : '#FFFDF6',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
                  <button
                    onClick={() => handleToggleTask(task.id, task.status)}
                    aria-label={task.status === 'DONE' ? 'Đánh dấu chưa xong' : 'Đánh dấu hoàn thành'}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: task.status === 'DONE' ? '#059669' : '#D1D5DB',
                      padding: 0,
                    }}
                  >
                    <CheckCircle2 size={24} />
                  </button>

                  <div>
                    <div style={{
                      fontWeight: 600,
                      color: '#604634',
                      fontSize: '0.95rem',
                      textDecoration: task.status === 'DONE' ? 'line-through' : 'none',
                    }}>
                      {task.title}
                    </div>
                    {task.description && (
                      <div style={{ fontSize: '0.82rem', color: '#6E5F55', marginTop: '0.2rem' }}>
                        {task.description}
                      </div>
                    )}
                    <div style={{ fontSize: '0.75rem', color: '#8C6E53', marginTop: '0.2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      <span>Khách hàng: <strong>{task.customerName || 'Khách hàng'}</strong> ({task.customerPhone || 'SĐT'})</span>
                      <span>Hạn: <strong>{new Date(task.dueAt).toLocaleString('vi-VN')}</strong></span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{
                    padding: '0.2rem 0.6rem',
                    borderRadius: '8px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    backgroundColor:
                      task.priority === 'HIGH' ? '#FEE2E2' : task.priority === 'LOW' ? '#F3F4F6' : '#FEF3C7',
                    color:
                      task.priority === 'HIGH' ? '#991B1B' : task.priority === 'LOW' ? '#374151' : '#92400E',
                  }}>
                    Ưu tiên: {task.priority}
                  </span>
                  <span style={{
                    padding: '0.2rem 0.6rem',
                    borderRadius: '8px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    backgroundColor: task.status === 'DONE' ? '#DCFCE7' : '#EFE6C9',
                    color: task.status === 'DONE' ? '#166534' : '#604634',
                  }}>
                    {task.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Create Task */}
      {showModal && (
        <FocusTrap onEscape={() => setShowModal(false)}>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              zIndex: 1100,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '1rem',
            }}
            onClick={() => setShowModal(false)}
          >
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '20px',
                padding: '1.8rem',
                width: '100%',
                maxWidth: '500px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ margin: '0 0 1rem 0', color: '#604634', fontSize: '1.2rem', fontFamily: 'Cinzel, serif' }}>
                Thêm Nhiệm Vụ Follow-up
              </h3>
              <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#604634', marginBottom: '0.3rem' }}>
                    Tiêu đề *
                  </label>
                  <input
                    required
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="VD: Nhắc khách chọn ảnh album..."
                    className="mipa-input"
                    style={{ width: '100%', height: '38px' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#604634', marginBottom: '0.3rem' }}>
                      Hạn xử lý *
                    </label>
                    <input
                      required
                      type="datetime-local"
                      value={form.dueAt}
                      onChange={(e) => setForm({ ...form, dueAt: e.target.value })}
                      className="mipa-input"
                      style={{ width: '100%', height: '38px' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#604634', marginBottom: '0.3rem' }}>
                      Mức độ ưu tiên
                    </label>
                    <select
                      value={form.priority}
                      onChange={(e) => setForm({ ...form, priority: e.target.value as any })}
                      className="mipa-input"
                      style={{ width: '100%', height: '38px' }}
                    >
                      <option value="LOW">Thấp (Low)</option>
                      <option value="NORMAL">Bình thường (Normal)</option>
                      <option value="HIGH">Cao (High)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#604634', marginBottom: '0.3rem' }}>
                    Ghi chú chi tiết
                  </label>
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Nội dung cần trao đổi..."
                    className="mipa-input"
                    style={{ width: '100%', padding: '0.6rem' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#F3F4F6',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      color: '#4B5563',
                    }}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    style={{
                      padding: '0.5rem 1.2rem',
                      backgroundColor: '#604634',
                      color: '#FFFDF6',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    {saving ? 'Đang tạo...' : 'Tạo Nhiệm Vụ'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </FocusTrap>
      )}
    </div>
  );
};
