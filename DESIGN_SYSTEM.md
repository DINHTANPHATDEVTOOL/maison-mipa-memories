# MAISON MIPA MEMORIES — DESIGN SYSTEM

> **Document type**: Design system reference  
> **Last updated**: 2026-09-17

---

## Design Philosophy

**French Editorial Studio Aesthetic**  
Warm, premium, romantic, minimal. Ivory & espresso palette with gold accents.  
Not a SaaS dashboard. Every pixel should feel like a curated photography studio.

---

## Color Tokens

Defined in [`src/styles/tokens.css`](./src/styles/tokens.css).

### Core Surface
| Token | Value | Usage |
|-------|-------|-------|
| `--mipa-bg` | `#15110E` | Page background |
| `--mipa-surface` | `#1E1814` | Card / panel background |
| `--mipa-surface-soft` | `#28201B` | Subtle insets, inputs |
| `--mipa-surface-card` | `#221A15` | Booking cards |
| `--mipa-surface-elevated` | `#322822` | Modals, drawers |
| `--mipa-surface-glass` | `rgba(30,24,20,0.85)` | Glassmorphism elements |

### Typography Colors
| Token | Value | Usage |
|-------|-------|-------|
| `--mipa-text` | `#FBF6EE` | Primary text |
| `--mipa-text-soft` | `#D1C4B7` | Secondary text |
| `--mipa-text-muted` | `#9E8E80` | Labels, placeholders |

### Atelier Gold
| Token | Value | Usage |
|-------|-------|-------|
| `--mipa-gold` | `#C6A45F` | Primary accent, CTAs |
| `--mipa-gold-light` | `#E0C287` | Headings, hover states |
| `--mipa-gold-dark` | `#A68745` | Dark gold variant |
| `--mipa-gold-glow` | `rgba(198,164,95,0.22)` | Hover backgrounds |

### Status Colors
| Token | Value |
|-------|-------|
| `--mipa-success` | `#10B981` |
| `--mipa-warning` | `#F59E0B` |
| `--mipa-danger` | `#EF4444` |
| `--mipa-info` | `#3B82F6` |

---

## Typography

**Heading font**: `Cormorant Garamond` — editorial serif, 400/500/600/700 weights  
**Body font**: `Be Vietnam Pro` — clean sans-serif, 300–700 weights

```css
font-family: var(--mipa-font-heading); /* editorial headings */
font-family: var(--mipa-font-body);    /* all body text, labels, UI */
```

---

## Spacing Scale
```
--space-xs:  0.25rem  (4px)
--space-sm:  0.5rem   (8px)
--space-md:  1rem     (16px)
--space-lg:  1.5rem   (24px)
--space-xl:  2rem     (32px)
--space-2xl: 3rem     (48px)
--space-3xl: 4.5rem   (72px)
```

---

## Radius Scale
```
--radius-xs:   4px
--radius-sm:   8px
--radius-md:   12px
--radius-lg:   18px
--radius-xl:   24px
--radius-full: 9999px
```

---

## Shadow Scale
```
--shadow-sm:   0 2px 8px rgba(0,0,0,0.35)
--shadow-md:   0 10px 30px rgba(0,0,0,0.50)
--shadow-lg:   0 20px 48px rgba(0,0,0,0.65)
--shadow-gold: 0 4px 24px rgba(198,164,95,0.25)
```

---

## UI Primitives (`src/components/ui/`)

### Button (`Button.tsx`)
```tsx
<Button variant="gold" size="md" loading={false} icon={<Icon />}>Label</Button>
```
Variants: `gold` (primary), `outline`, `ghost`, `danger`, `success`  
Sizes: `sm`, `md`, `lg`  
Props: `loading`, `icon`, `iconRight`, `fullWidth`

### StatusBadge (`Badge.tsx`)
```tsx
<StatusBadge status="EDITING" size="sm" pulseDot />
```
Covers all `BookingStatus` values with Vietnamese human-readable labels.

### Generic Badge (`Badge.tsx`)
```tsx
<Badge label="Premium" variant="gold" size="sm" />
```
Variants: `gold`, `info`, `success`, `warning`, `danger`, `muted`

### Modal (`Modal.tsx`)
```tsx
<Modal open={open} onClose={onClose} title="Title" footer={<>...</>}>
  content
</Modal>
```
Accessible: Escape key, backdrop click, focus trap, scroll lock.

### Drawer (`Drawer.tsx`)
```tsx
<Drawer open={open} onClose={onClose} title="Booking Detail" side="right">
  content
</Drawer>
```
Slide-over panel. Used for booking detail views and mobile menus.

### ConfirmDialog (`ConfirmDialog.tsx`)
```tsx
<ConfirmDialog open={open} onClose={() => {}} onConfirm={fn} title="..." message="..." variant="danger" />
```

### Async States (`AsyncStates.tsx`)
```tsx
<LoadingState label="Đang tải..." height={200} />
<ErrorState title="Lỗi" message={err} onRetry={fn} />
<EmptyState icon={<Icon />} title="Chưa có dữ liệu" action={<Button>Tạo mới</Button>} />
```

---

## Booking Status Colors

| Status | Label | Color |
|--------|-------|-------|
| `CONSULTATION_REQUESTED` | Chờ tư vấn | `#F59E0B` (amber) |
| `CONSULTING` | Đang tư vấn | `#8B5CF6` (violet) |
| `CONFIRMED` | Đã xác nhận | `#10B981` (green) |
| `CHECKED_IN` | Đã check-in | `#14B8A6` (teal) |
| `SHOOTING` | Đang chụp | `#EF4444` (red, pulsing) |
| `AWAITING_SELECTION` | Chờ chọn ảnh | `#FB923C` (orange) |
| `EDITING` | Đang hậu kỳ | `#A855F7` (purple) |
| `READY_FOR_REVIEW` | Chờ duyệt | `#3B82F6` (blue) |
| `DELIVERED` | Đã giao ảnh | `#10B981` (green) |
| `COMPLETED` | Hoàn tất | `#C6A45F` (gold) |
| `CANCELLED` | Đã huỷ | `#EF4444` (red) |
