import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ConfirmationSheet from './ConfirmationSheet.svelte';

afterEach(cleanup);

function show(pending = false) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(ConfirmationSheet, {
    title: '重置所有自定义设置？',
    message: 'This 恢复所有服务商指标 layout.',
    confirmLabel: '全部重置',
    pending,
    onConfirm,
    onCancel,
  });
  return { onConfirm, onCancel };
}

describe('confirmation sheet', () => {
  it('opens as an attached alert dialog and keeps keyboard focus inside', async () => {
    show();
    const dialog = screen.getByRole('alertdialog', { name: '重置所有自定义设置？' });
    const cancel = screen.getByRole('button', { name: '取消' });
    const confirm = screen.getByRole('button', { name: '全部重置' });

    await waitFor(() => expect(cancel).toHaveFocus());
    await fireEvent.keyDown(cancel, { key: 'Tab', shiftKey: true });
    expect(confirm).toHaveFocus();
    await fireEvent.keyDown(confirm, { key: 'Tab' });
    expect(cancel).toHaveFocus();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('cancels with Escape and blocks dismissal while the action is pending', async () => {
    const idle = show();
    await fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' });
    expect(idle.onCancel).toHaveBeenCalledOnce();
    cleanup();

    const pending = show(true);
    const dialog = screen.getByRole('alertdialog');
    expect(screen.getByRole('button', { name: '取消' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '正在重置…' })).toBeDisabled();
    await fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(pending.onCancel).not.toHaveBeenCalled();
  });
});
