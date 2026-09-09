import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import ProviderNoticeRow from './ProviderNoticeRow.svelte';

describe('ProviderNoticeRow', () => {
  it('renders a compact warning status without hiding its retry context', () => {
    render(ProviderNoticeRow, {
      notice: {
        id: 'rateLimited',
        title: '实时用量查询已暂停',
        message: 'Retrying in about 5 minutes',
        tone: 'warning',
      },
    });

    expect(screen.getByRole('status')).toHaveTextContent(
      '实时用量查询已暂停Retrying in about 5 minutes',
    );
  });
});
