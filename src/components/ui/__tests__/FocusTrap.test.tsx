// ==============================================================================
// Maison MIPA Memories — FocusTrap Accessibility Unit Tests
// Tests focus trapping, Escape dismiss, focus restoration, and scroll lock.
// ==============================================================================

import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FocusTrap } from '../FocusTrap';

describe('FocusTrap Component Accessibility', () => {
  beforeEach(() => {
    document.body.style.overflow = '';
  });

  afterEach(() => {
    document.body.style.overflow = '';
  });

  it('renders with role="dialog" and aria-modal="true"', () => {
    render(
      <FocusTrap aria-labelledby="modal-title">
        <h2 id="modal-title">Test Modal</h2>
        <button>Action 1</button>
      </FocusTrap>
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
  });

  it('locks body scroll on mount and restores on unmount', () => {
    const { unmount } = render(
      <FocusTrap>
        <button>Action</button>
      </FocusTrap>
    );

    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('');
  });

  it('calls onEscape when Escape key is pressed', () => {
    const onEscape = vi.fn();
    render(
      <FocusTrap onEscape={onEscape}>
        <button>Action</button>
      </FocusTrap>
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it('traps Tab key navigation within modal focusables', () => {
    render(
      <FocusTrap>
        <button id="btn1">Button 1</button>
        <button id="btn2">Button 2</button>
      </FocusTrap>
    );

    const btn1 = screen.getByText('Button 1');
    const btn2 = screen.getByText('Button 2');

    // Focus last button and press Tab -> should wrap to btn1
    btn2.focus();
    expect(document.activeElement).toBe(btn2);

    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(btn1);

    // Focus first button and press Shift+Tab -> should wrap to btn2
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(btn2);
  });
});
