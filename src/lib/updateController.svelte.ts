import { checkForApplicationUpdates, installApplicationUpdate, openUpdatePage } from './backend';
import { SvelteDate } from 'svelte/reactivity';
import type { UpdateFailure, UpdateProgress, UpdateStatus } from './types';

const USAGE_REFRESH_INTERVAL_MS = 5 * 60_000;

export class UpdateController {
  status = $state<UpdateStatus | null>(null);
  error = $state<UpdateFailure | null>(null);
  checking = $state(false);
  installing = $state(false);
  progress = $state<UpdateProgress | null>(null);

  async check(
    manual: boolean,
    onChecked: (checkedAt: string) => void,
    onMessage: (message: string) => void,
  ) {
    if (this.checking || this.installing) return;
    this.checking = true;
    if (manual) this.error = null;
    try {
      const status = await checkForApplicationUpdates();
      this.status = status;
      onChecked(new SvelteDate().toISOString());
      if (manual) onMessage(updateCheckMessage(status));
    } catch (error) {
      if (manual) this.error = updateFailure(error, '无法检查更新。');
    } finally {
      this.checking = false;
    }
  }

  async install() {
    if (this.installing || this.checking) return;
    this.installing = true;
    this.progress = { phase: 'downloading', downloaded: 0, total: null, percent: null };
    this.error = null;
    try {
      await installApplicationUpdate();
    } catch (error) {
      this.error = updateFailure(error, '无法安装更新。');
      this.installing = false;
      this.progress = null;
    }
  }

  async openDownloadPage() {
    try {
      await openUpdatePage();
    } catch (error) {
      this.error = updateFailure(error, '无法打开 OpenQuota 下载页面。');
    }
  }

  setProgress(progress: UpdateProgress) {
    this.progress = progress;
  }
}

export function nextUpdateLabel(value: string | undefined, now: number) {
  if (!value) return '等待首次刷新';
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return '无法获取下次刷新时间';
  const remaining = Math.min(
    USAGE_REFRESH_INTERVAL_MS,
    Math.max(0, timestamp + USAGE_REFRESH_INTERVAL_MS - now),
  );
  const seconds = Math.ceil(remaining / 1000);
  return seconds >= 60 ? `${Math.ceil(seconds / 60)} 分钟后刷新` : `${seconds} 秒后刷新`;
}

export function updateFailure(error: unknown, fallback: string): UpdateFailure {
  if (error && typeof error === 'object') {
    const candidate = error as Partial<UpdateFailure>;
    if (typeof candidate.message === 'string') {
      return {
        code: typeof candidate.code === 'string' ? candidate.code : 'update_failed',
        message: candidate.message,
        action: typeof candidate.action === 'string' ? candidate.action : '请稍后重试。',
        retryable: candidate.retryable !== false,
      };
    }
  }
  return {
    code: 'update_failed',
    message: typeof error === 'string' ? error : fallback,
    action: '请重试，或从发行页面下载安装包。',
    retryable: true,
  };
}

function updateCheckMessage(status: UpdateStatus) {
  if (!status.available) return `OpenQuota ${status.currentVersion} 已是最新版本。`;
  return status.version ? `OpenQuota ${status.version} 已可下载。` : 'OpenQuota 有可用更新。';
}
