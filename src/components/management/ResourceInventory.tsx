import React, { useState, useEffect } from 'react';
import { FocusTrap } from '../ui/FocusTrap';
import {
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';
import type {
  StudioResource,
  ResourceCategory,
  ResourceCondition,
} from '../../types';
import {
  getStudioResources,
  getResourceCategories,
  checkoutBookingResource,
  returnBookingResource,
} from '../../services/resourcePlanningService';

export const ResourceInventory: React.FC = () => {
  const [resources, setResources] = useState<StudioResource[]>([]);
  const [categories, setCategories] = useState<ResourceCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [lowStockOnly, setLowStockOnly] = useState<boolean>(false);

  // Handoff modal states
  const [handoffResource, setHandoffResource] = useState<StudioResource | null>(null);
  const [handoffType, setHandoffType] = useState<'CHECKOUT' | 'RETURN'>('CHECKOUT');
  const [condition, setCondition] = useState<ResourceCondition>('EXCELLENT');
  const [isDamaged, setIsDamaged] = useState<boolean>(false);
  const [damageSeverity, setDamageSeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [damageDescription, setDamageDescription] = useState<string>('');
  const [handoffNote, setHandoffNote] = useState<string>('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cats, res] = await Promise.all([
        getResourceCategories(),
        getStudioResources({
          categoryId: selectedCategory || undefined,
          status: selectedStatus || undefined,
          searchQuery: searchQuery || undefined,
          lowStockOnly,
        }),
      ]);
      setCategories(cats);
      setResources(res);
    } catch (err: any) {
      console.error('Error loading inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCategory, selectedStatus, lowStockOnly]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleExecuteHandoff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handoffResource) return;
    setActionError(null);
    setActionSuccess(null);

    try {
      if (handoffType === 'CHECKOUT') {
        await checkoutBookingResource({
          reservationId: `resv-${handoffResource.id}`,
          employeeId: 'emp-01',
          conditionBefore: condition,
          notes: handoffNote,
        });
        setActionSuccess(`Đã xuất kho thiết bị [${handoffResource.assetCode}] thành công.`);
      } else {
        await returnBookingResource({
          reservationId: `resv-${handoffResource.id}`,
          conditionAfter: condition,
          isDamaged,
          damageSeverity: isDamaged ? damageSeverity : undefined,
          damageDescription: isDamaged ? damageDescription : undefined,
          notes: handoffNote,
        });
        setActionSuccess(`Đã thu hồi hoàn trả thiết bị [${handoffResource.assetCode}].`);
      }
      setHandoffResource(null);
      await loadData();
    } catch (err: any) {
      setActionError(err.message || 'Thao tác bàn giao thiết bị thất bại.');
    }
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto', color: '#2C2420' }}>
      {/* Header Banner */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '2rem',
        borderBottom: '1px solid rgba(96, 70, 52, 0.15)',
        paddingBottom: '1.25rem',
      }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#8C6E53', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
            <Sparkles size={14} color="#C6A45F" /> Quản Lý Thiết Bị & Đạo Cụ Studio
          </div>
          <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.75rem', margin: '0.3rem 0 0', fontWeight: 700, color: '#2C2420' }}>
            Resource Inventory — Kho Tài Nguyên & Thiết Bị
          </h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.9rem', color: '#666' }}>
            Kiểm soát máy ảnh, ống kính, đèn chiếu sáng, trang phục, vật tư tiêu hao và quy trình xuất/trả.
          </p>
        </div>

        <button
          onClick={loadData}
          style={{
            padding: '0.55rem 1rem',
            borderRadius: '8px',
            border: '1px solid #D1C7BD',
            backgroundColor: '#FFFDF6',
            color: '#604634',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <RefreshCw size={14} /> Làm mới kho
        </button>
      </div>

      {actionSuccess && (
        <div style={{
          backgroundColor: '#F0FDF4',
          border: '1px solid #BBF7D0',
          borderRadius: '8px',
          padding: '0.9rem 1.2rem',
          color: '#15803D',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <CheckCircle2 size={18} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div style={{
          backgroundColor: '#FEF2F2',
          border: '1px solid #FCA5A5',
          borderRadius: '8px',
          padding: '0.9rem 1.2rem',
          color: '#B91C1C',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <AlertTriangle size={18} />
          <span>{actionError}</span>
        </div>
      )}

      {/* Filter Toolbar */}
      <div style={{
        backgroundColor: '#FFFDF6',
        borderRadius: '12px',
        border: '1px solid #E5DFD7',
        padding: '1.25rem',
        marginBottom: '1.5rem',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem',
        alignItems: 'center',
        boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
      }}>
        <form onSubmit={handleSearch} style={{ flex: '1', minWidth: 'min(100%, 200px)', display: 'flex', gap: '0.5rem' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={16} color="#888" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Tìm theo mã tài sản (CAM-001) hoặc tên thiết bị..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 1rem 0.55rem 2.4rem',
                borderRadius: '8px',
                border: '1px solid #D1C7BD',
                backgroundColor: '#FFF',
                fontSize: '0.88rem',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              padding: '0.55rem 1rem',
              borderRadius: '8px',
              backgroundColor: '#604634',
              color: '#FFFDF6',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            Tìm
          </button>
        </form>

        <select
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value)}
          style={{ padding: '0.55rem 1rem', borderRadius: '8px', border: '1px solid #D1C7BD', backgroundColor: '#FFF', fontSize: '0.88rem' }}
        >
          <option value="">Tất cả danh mục</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select
          value={selectedStatus}
          onChange={e => setSelectedStatus(e.target.value)}
          style={{ padding: '0.55rem 1rem', borderRadius: '8px', border: '1px solid #D1C7BD', backgroundColor: '#FFF', fontSize: '0.88rem' }}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="AVAILABLE">AVAILABLE (Sẵn sàng)</option>
          <option value="RESERVED">RESERVED (Đang giữ chỗ)</option>
          <option value="IN_USE">IN_USE (Đang chụp)</option>
          <option value="MAINTENANCE">MAINTENANCE (Bảo trì)</option>
          <option value="DAMAGED">DAMAGED (Hỏng hóc)</option>
        </select>

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={e => setLowStockOnly(e.target.checked)}
          />
          <span style={{ color: lowStockOnly ? '#DC2626' : '#666', fontWeight: 600 }}>Cảnh báo sắp hết</span>
        </label>
      </div>

      {/* Resources Table */}
      <div style={{
        backgroundColor: '#FFFDF6',
        borderRadius: '12px',
        border: '1px solid #E5DFD7',
        padding: '1.25rem',
        boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
        overflowX: 'auto',
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem' }} />
            Đang tải danh mục thiết bị...
          </div>
        ) : resources.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>
            Không tìm thấy thiết bị nào phù hợp với bộ lọc.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #E5DFD7', textAlign: 'left', color: '#8C6E53' }}>
                <th style={{ padding: '0.75rem' }}>Mã tài sản</th>
                <th style={{ padding: '0.75rem' }}>Tên thiết bị / Đạo cụ</th>
                <th style={{ padding: '0.75rem' }}>Danh mục</th>
                <th style={{ padding: '0.75rem' }}>Vị trí</th>
                <th style={{ padding: '0.75rem' }}>Tình trạng</th>
                <th style={{ padding: '0.75rem' }}>Số lượng</th>
                <th style={{ padding: '0.75rem' }}>Trạng thái</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {resources.map(res => {
                const isAvailable = res.status === 'AVAILABLE';
                return (
                  <tr key={res.id} style={{ borderBottom: '1px solid #F0EAE1' }}>
                    <td style={{ padding: '0.85rem 0.75rem', fontWeight: 700, color: '#604634' }}>
                      {res.assetCode}
                    </td>
                    <td style={{ padding: '0.85rem 0.75rem' }}>
                      <div style={{ fontWeight: 600, color: '#2C2420' }}>{res.name}</div>
                      {res.brand && (
                        <div style={{ fontSize: '0.78rem', color: '#777' }}>
                          {res.brand} {res.model}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem 0.75rem', color: '#666' }}>{res.categoryName}</td>
                    <td style={{ padding: '0.85rem 0.75rem', color: '#555' }}>📍 {res.currentLocation}</td>
                    <td style={{ padding: '0.85rem 0.75rem' }}>
                      <span style={{ fontSize: '0.78rem', backgroundColor: '#F3EFEA', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                        {res.condition}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 0.75rem' }}>
                      {res.isSerialized ? (
                        <span style={{ fontSize: '0.78rem', color: '#888' }}>Thiết bị độc bản (1)</span>
                      ) : (
                        <span style={{ fontWeight: 600, color: res.quantityAvailable <= res.reorderThreshold ? '#DC2626' : '#2C2420' }}>
                          {res.quantityAvailable} / {res.quantityTotal} {res.unit}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem 0.75rem' }}>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '0.2rem 0.6rem',
                        borderRadius: '12px',
                        backgroundColor:
                          res.status === 'AVAILABLE' ? '#DCFCE7' :
                          res.status === 'RESERVED' ? '#FEF3C7' :
                          res.status === 'IN_USE' ? '#E0E7FF' :
                          res.status === 'DAMAGED' ? '#FEE2E2' : '#F3EFEA',
                        color:
                          res.status === 'AVAILABLE' ? '#15803D' :
                          res.status === 'RESERVED' ? '#B45309' :
                          res.status === 'IN_USE' ? '#3730A3' :
                          res.status === 'DAMAGED' ? '#B91C1C' : '#604634',
                      }}>
                        {res.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 0.75rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                        {isAvailable ? (
                          <button
                            onClick={() => {
                              setHandoffResource(res);
                              setHandoffType('CHECKOUT');
                              setCondition(res.condition);
                              setIsDamaged(false);
                            }}
                            style={{
                              padding: '0.35rem 0.7rem',
                              borderRadius: '6px',
                              backgroundColor: '#604634',
                              border: 'none',
                              color: '#FFFDF6',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                            }}
                          >
                            <ArrowUpRight size={13} /> Xuất
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setHandoffResource(res);
                              setHandoffType('RETURN');
                              setCondition(res.condition);
                              setIsDamaged(false);
                            }}
                            style={{
                              padding: '0.35rem 0.7rem',
                              borderRadius: '6px',
                              backgroundColor: '#FFFDF6',
                              border: '1px solid #604634',
                              color: '#604634',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                            }}
                          >
                            <ArrowDownLeft size={13} /> Thu hồi
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Handoff Modal (Check out / Return) */}
      {handoffResource && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '1rem',
        }}>
          <FocusTrap
            onEscape={() => setHandoffResource(null)}
            aria-labelledby="handoff-modal-title"
            style={{
              backgroundColor: '#FFFDF6',
              borderRadius: '14px',
              maxWidth: '480px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            }}
          >
            <h3 id="handoff-modal-title" style={{ fontFamily: 'Cinzel, serif', fontSize: '1.25rem', margin: '0 0 1rem', color: '#2C2420' }}>
              {handoffType === 'CHECKOUT' ? 'Bàn Giao Xuất Kho Thiết Bị' : 'Thu Hồi & Hoàn Trả Thiết Bị'}
            </h3>

            <div style={{ backgroundColor: '#F3EFEA', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.25rem' }}>
              <div style={{ fontWeight: 700, color: '#604634' }}>
                [{handoffResource.assetCode}] {handoffResource.name}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.2rem' }}>
                Vị trí: {handoffResource.currentLocation} • Danh mục: {handoffResource.categoryName}
              </div>
            </div>

            <form onSubmit={handleExecuteHandoff} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem', color: '#604634' }}>
                  {handoffType === 'CHECKOUT' ? 'Tình trạng trước khi giao' : 'Tình trạng khi nhận lại'}
                </label>
                <select
                  value={condition}
                  onChange={e => setCondition(e.target.value as any)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #D1C7BD', backgroundColor: '#FFF' }}
                >
                  <option value="EXCELLENT">EXCELLENT (Hoàn hảo)</option>
                  <option value="GOOD">GOOD (Tốt / Bình thường)</option>
                  <option value="FAIR">FAIR (Khá / Có xước dăm)</option>
                  <option value="POOR">POOR (Kém / Cần vệ sinh)</option>
                  <option value="DAMAGED">DAMAGED (Hỏng hóc)</option>
                </select>
              </div>

              {handoffType === 'RETURN' && (
                <div style={{ borderTop: '1px solid #E5DFD7', paddingTop: '0.85rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', cursor: 'pointer', color: '#B91C1C', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={isDamaged}
                      onChange={e => setIsDamaged(e.target.checked)}
                    />
                    Ghi nhận sự cố hư hỏng (Damage Incident)
                  </label>

                  {isDamaged && (
                    <div style={{ marginTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem', color: '#991B1B' }}>
                          Mức độ nghiêm trọng
                        </label>
                        <select
                          value={damageSeverity}
                          onChange={e => setDamageSeverity(e.target.value as any)}
                          style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #FCA5A5', backgroundColor: '#FEF2F2' }}
                        >
                          <option value="LOW">LOW (Trầy nhẹ không ảnh hưởng chụp)</option>
                          <option value="MEDIUM">MEDIUM (Hỏng phụ kiện / Kẹt nút)</option>
                          <option value="HIGH">HIGH (Nứt kính / Lỗi sensor)</option>
                          <option value="CRITICAL">CRITICAL (Không hoạt động được)</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem', color: '#991B1B' }}>
                          Mô tả chi tiết hỏng hóc
                        </label>
                        <textarea
                          value={damageDescription}
                          onChange={e => setDamageDescription(e.target.value)}
                          placeholder="Mô tả cụ thể biểu hiện lỗi..."
                          rows={2}
                          required={isDamaged}
                          style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #FCA5A5', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem', color: '#604634' }}>
                  Ghi chú bàn giao
                </label>
                <input
                  type="text"
                  placeholder="Ghi chú người nhận hoặc lưu ý thêm..."
                  value={handoffNote}
                  onChange={e => setHandoffNote(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #D1C7BD', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setHandoffResource(null)}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    border: '1px solid #D1C7BD',
                    backgroundColor: 'transparent',
                    color: '#666',
                    cursor: 'pointer',
                  }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.5rem 1.2rem',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: handoffType === 'CHECKOUT' ? '#604634' : isDamaged ? '#DC2626' : '#15803D',
                    color: '#FFFDF6',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {handoffType === 'CHECKOUT' ? 'Xác nhận xuất kho' : 'Xác nhận thu hồi'}
                </button>
              </div>
            </form>
          </FocusTrap>
        </div>
      )}
    </div>
  );
};
