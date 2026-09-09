<script lang="ts">
  import type { PanelHeightMode } from './backend';
  import Icon from './Icon.svelte';
  import type { DesktopPlatform } from './platform';
  import SelectMenu from './SelectMenu.svelte';
  import type {
    AppSettings,
    NotificationPreferences,
    SettingsViewState,
    UpdateFailure,
  } from './types';

  interface Props {
    settingsView: SettingsViewState;
    platform: DesktopPlatform;
    panelHeightMode: PanelHeightMode;
    onChange: (settings: AppSettings) => void;
    onPanelHeightModeChange: (mode: PanelHeightMode) => void;
    onRequestNotifications: () => void;
    onOpenNotificationSettings: () => void;
    updateError: UpdateFailure | null;
    checkingUpdate: boolean;
    onCheckForUpdates: () => void;
    onCustomize: () => void;
    onCopyLogPath: () => Promise<void>;
    onOpenLogFolder: () => Promise<void>;
    onResetAllSettings: () => void;
  }
  let {
    settingsView,
    platform,
    panelHeightMode,
    onChange,
    onPanelHeightModeChange,
    onRequestNotifications,
    onOpenNotificationSettings,
    updateError,
    checkingUpdate,
    onCheckForUpdates,
    onCustomize,
    onCopyLogPath,
    onOpenLogFolder,
    onResetAllSettings,
  }: Props = $props();
  let recording = $state(false);
  let logActionError = $state<string | null>(null);
  const settings = $derived(settingsView.settings);
  const revealLogLabel = $derived(
    platform === 'macos'
      ? '在访达中显示'
      : platform === 'windows'
        ? '在文件资源管理器中显示'
        : '打开所在文件夹',
  );
  const anyNotificationEnabled = $derived(
    settings.notifications.almostOut ||
      settings.notifications.cuttingItClose ||
      settings.notifications.willRunOut,
  );
  const notificationsNeedAttention = $derived(
    anyNotificationEnabled && settingsView.notificationPermission !== 'granted',
  );

  function patch(value: Partial<AppSettings>) {
    onChange({ ...settings, ...value });
  }
  function patchNotification(key: keyof NotificationPreferences, enabled: boolean) {
    patch({ notifications: { ...settings.notifications, [key]: enabled } });
    if (enabled && settingsView.notificationPermission === 'prompt') onRequestNotifications();
  }
  async function copyLogPath() {
    try {
      await onCopyLogPath();
      logActionError = null;
    } catch {
      logActionError = '无法将日志路径复制到剪贴板。';
    }
  }
  async function revealLogFile() {
    try {
      await onOpenLogFolder();
      logActionError = null;
    } catch {
      logActionError = '无法显示日志文件。';
    }
  }
  function record(event: KeyboardEvent) {
    if (!recording) return;
    if (event.key === 'Tab') {
      recording = false;
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (event.key === 'Escape') {
      recording = false;
      return;
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      patch({ globalShortcut: null });
      recording = false;
      return;
    }
    if (
      !(event.ctrlKey || event.altKey || event.metaKey) ||
      ['Control', 'Alt', 'Meta', 'Shift'].includes(event.key)
    )
      return;
    const modifiers = [
      event.ctrlKey && 'Ctrl',
      event.altKey && 'Alt',
      event.shiftKey && 'Shift',
      event.metaKey && 'Super',
    ].filter(Boolean);
    const key = event.code.startsWith('Key')
      ? event.code.slice(3)
      : event.code.startsWith('Digit')
        ? event.code.slice(5)
        : event.key.length === 1
          ? event.key.toUpperCase()
          : event.key;
    patch({ globalShortcut: [...modifiers, key].join('+') });
    recording = false;
  }
</script>

<section class="screen settings-screen" aria-label="设置">
  {#if settingsView.integrationError}<p class="notice" role="alert">
      {settingsView.integrationError}
    </p>{/if}

  {#if settingsView.platformSummary}<div class="settings-section">
      <h2>Linux</h2>
      <div class="setting-row">
        <span><b>桌面集成</b><small>{settingsView.platformSummary}</small></span>
      </div>
    </div>{/if}

  <div class="settings-section">
    <h2>常规</h2>
    <label class="setting-row"
      ><span><b>显示总用量</b></span><input
        type="checkbox"
        checked={settings.showTotalSpend}
        onchange={(event) => patch({ showTotalSpend: event.currentTarget.checked })}
      /></label
    >
    <label class="setting-row"
      ><span><b>开机启动</b></span><input
        type="checkbox"
        checked={settings.launchAtLogin}
        onchange={(event) => patch({ launchAtLogin: event.currentTarget.checked })}
      /></label
    >
    <div class="setting-row">
      <span><b>全局快捷键</b></span>
      <div class="shortcut-field">
        <button
          class:recording
          type="button"
          aria-pressed={recording}
          aria-describedby="shortcut-recording-help"
          data-tooltip="在任何位置打开 OpenQuota"
          onclick={() => (recording = !recording)}
          onkeydown={record}
          onblur={() => (recording = false)}
          >{recording ? '请按下快捷键…' : (settings.globalShortcut ?? '录入快捷键')}</button
        >{#if settings.globalShortcut}<button
            type="button"
            aria-label="清除全局快捷键"
            onclick={() => patch({ globalShortcut: null })}
            ><Icon name="close" size={10} strokeWidth={2.2} /></button
          >{/if}
      </div>
      <small id="shortcut-recording-help" class="sr-only"
        >点击后录入快捷键：按组合键保存，按 Delete 清除，按 Escape 取消。</small
      >
    </div>
  </div>

  <div class="settings-section">
    <h2>外观</h2>
    {#if platform === 'macos'}
      <div class="setting-row">
        <span><b>图标样式</b></span><SelectMenu
          label="图标样式"
          value={settings.menuBarStyle}
          options={[
            { value: 'text', label: '文字' },
            { value: 'bars', label: '进度条' },
          ]}
          onChange={(value) => patch({ menuBarStyle: value as AppSettings['menuBarStyle'] })}
        />
      </div>
    {/if}
    <div class="setting-row">
      <span><b>主题</b></span><SelectMenu
        label="主题"
        value={settings.theme}
        options={[
          { value: 'system', label: '跟随系统' },
          { value: 'light', label: '浅色' },
          { value: 'dark', label: '深色' },
        ]}
        onChange={(value) => patch({ theme: value as AppSettings['theme'] })}
      />
    </div>
    <div class="setting-row">
      <span><b>界面密度</b></span><SelectMenu
        label="界面密度"
        value={settings.density}
        options={[
          { value: 'default', label: '默认' },
          { value: 'compact', label: '紧凑' },
        ]}
        onChange={(value) => patch({ density: value as AppSettings['density'] })}
      />
    </div>
    <label class="setting-row"
      ><span><b>减少动画</b></span><input
        type="checkbox"
        checked={settings.reduceAnimations}
        onchange={(event) => patch({ reduceAnimations: event.currentTarget.checked })}
      /></label
    >
    {#if settingsView.trayAvailable}
      <div class="setting-row">
        <span><b>窗口模式</b></span><SelectMenu
          label="窗口模式"
          value={settings.windowMode}
          options={[
            { value: 'popup', label: '托盘弹窗' },
            { value: 'floating', label: '悬浮窗口' },
          ]}
          onChange={(value) => patch({ windowMode: value as AppSettings['windowMode'] })}
        />
      </div>
    {/if}
    <div class="setting-row">
      <span><b>面板高度</b></span><SelectMenu
        label="面板高度"
        value={panelHeightMode}
        options={[
          { value: 'automatic', label: '自动' },
          { value: 'manual', label: '手动' },
        ]}
        onChange={(value) => onPanelHeightModeChange(value as PanelHeightMode)}
      />
    </div>
    <div class="setting-row">
      <span><b>时间格式</b></span><SelectMenu
        label="时间格式"
        value={settings.timeFormat}
        options={[
          { value: 'system', label: '自动' },
          { value: 'twelveHour', label: '12 小时制' },
          { value: 'twentyFourHour', label: '24 小时制' },
        ]}
        onChange={(value) => patch({ timeFormat: value as AppSettings['timeFormat'] })}
      />
    </div>
  </div>

  <div class="settings-section">
    <h2>用量显示</h2>
    <div class="setting-row">
      <span><b>显示内容</b></span><SelectMenu
        label="显示内容"
        value={settings.usageDisplay}
        options={[
          { value: 'left', label: '剩余额度' },
          { value: 'used', label: '已用额度' },
        ]}
        onChange={(value) => patch({ usageDisplay: value as AppSettings['usageDisplay'] })}
      />
    </div>
    <div class="setting-row">
      <span><b>重置时间</b></span><SelectMenu
        label="重置时间"
        value={settings.resetDisplay}
        options={[
          { value: 'countdown', label: '倒计时' },
          { value: 'exact', label: '具体时间' },
        ]}
        onChange={(value) => patch({ resetDisplay: value as AppSettings['resetDisplay'] })}
      />
    </div>
    <label class="setting-row"
      ><span
        ><b>始终显示消耗速度</b><i
          class="setting-info"
          data-tooltip="始终显示各项指标的消耗速度，而不只显示即将用尽的指标"
          aria-label="始终显示各项指标的消耗速度，而不只显示即将用尽的指标"
          ><Icon name="about" size={12} strokeWidth={1.8} /></i
        ></span
      ><input
        type="checkbox"
        checked={settings.alwaysShowPacing}
        onchange={(event) => patch({ alwaysShowPacing: event.currentTarget.checked })}
      /></label
    >
  </div>

  <div class="settings-section">
    <h2>
      通知 {#if notificationsNeedAttention}<span class="permission-warning">!</span>{/if}
    </h2>
    <label class="setting-row"
      ><span
        ><b>额度即将用尽</b><i
          class="setting-info"
          data-tooltip="剩余额度低于 10% 时提醒。"
          aria-label="剩余额度低于 10% 时提醒。"
          ><Icon name="about" size={12} strokeWidth={1.8} /></i
        ></span
      ><input
        type="checkbox"
        checked={settings.notifications.almostOut}
        onchange={(event) => patchNotification('almostOut', event.currentTarget.checked)}
      /></label
    >
    <label class="setting-row"
      ><span
        ><b>额度可能不足</b><i
          class="setting-info"
          data-tooltip="预计到重置时额度所剩不多时提醒。"
          aria-label="预计到重置时额度所剩不多时提醒。"
          ><Icon name="about" size={12} strokeWidth={1.8} /></i
        ></span
      ><input
        type="checkbox"
        checked={settings.notifications.cuttingItClose}
        onchange={(event) => patchNotification('cuttingItClose', event.currentTarget.checked)}
      /></label
    >
    <label class="setting-row"
      ><span
        ><b>预计提前用尽</b><i
          class="setting-info"
          data-tooltip="预计在重置前用尽额度时提醒。"
          aria-label="预计在重置前用尽额度时提醒。"
          ><Icon name="about" size={12} strokeWidth={1.8} /></i
        ></span
      ><input
        type="checkbox"
        checked={settings.notifications.willRunOut}
        onchange={(event) => patchNotification('willRunOut', event.currentTarget.checked)}
      /></label
    >
    {#if notificationsNeedAttention}
      <div class="notification-actions">
        <div class="notification-attention" role="status">
          <span
            ><b
              >{settingsView.notificationPermission === 'denied'
                ? '通知已被禁止'
                : '需要通知权限'}</b
            ><small
              >{settingsView.notificationPermission === 'denied'
                ? '请在系统设置中启用 OpenQuota 通知。'
                : '允许通知后即可接收上方所选提醒。'}</small
            ></span
          >
          <button
            class="secondary-button"
            type="button"
            onclick={settingsView.notificationPermission === 'denied'
              ? onOpenNotificationSettings
              : onRequestNotifications}
            >{settingsView.notificationPermission === 'denied' ? '打开设置' : '允许'}</button
          >
        </div>
      </div>
    {/if}
  </div>

  <div class="settings-section">
    <h2>高级</h2>
    <div class="setting-row">
      <span><b>日志级别</b></span><SelectMenu
        label="日志级别"
        value={settings.logLevel}
        options={[
          { value: 'error', label: '错误' },
          { value: 'warn', label: '警告' },
          { value: 'info', label: '信息' },
          { value: 'debug', label: '调试' },
        ]}
        onChange={(value) => patch({ logLevel: value as AppSettings['logLevel'] })}
      />
    </div>
    <div class="setting-row setting-row--button">
      <button class="secondary-button settings-wide-button" type="button" onclick={copyLogPath}
        >复制日志路径</button
      >
    </div>
    <div class="setting-row setting-row--button">
      <button class="secondary-button settings-wide-button" type="button" onclick={revealLogFile}
        >{revealLogLabel}</button
      >
    </div>
    {#if logActionError}<p class="settings-note log-action-error" role="alert">
        {logActionError}
      </p>{/if}
    <div class="setting-row setting-row--button">
      <button
        class="secondary-button settings-wide-button settings-reset-button"
        type="button"
        onclick={onResetAllSettings}>重置所有设置…</button
      >
    </div>
  </div>

  <div class="settings-section">
    <h2>更新</h2>
    <label class="setting-row"
      ><span><b>自动检查更新</b></span><input
        type="checkbox"
        checked={settings.autoCheckUpdates}
        onchange={(event) => patch({ autoCheckUpdates: event.currentTarget.checked })}
      /></label
    >
    <div class="setting-row setting-row--button">
      <button
        type="button"
        class="secondary-button settings-wide-button"
        disabled={checkingUpdate}
        onclick={onCheckForUpdates}>{checkingUpdate ? '正在检查…' : '检查更新…'}</button
      >
    </div>
    {#if updateError}<div class="settings-update-error" role="alert">
        <b>{updateError.message}</b><small>{updateError.action}</small>
      </div>{/if}
  </div>

  <button class="screen-cross-link" type="button" aria-label="自定义" onclick={onCustomize}>
    <Icon name="sliders" size={17} />
    <span><b>自定义</b><small>选择显示内容及其位置</small></span>
    <Icon name="chevron-right" size={13} strokeWidth={2.2} />
  </button>
</section>

<style>
  :global {
    .settings-section {
      margin-bottom: 10px;
    }

    .setting-row {
      display: flex;
      min-height: 40px;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 6px 10px;
      border-top: 1px solid var(--separator);
      font-size: 11px;
    }

    .settings-section h2 + .setting-row {
      border-top: 0;
    }

    .setting-row > span {
      display: flex;
      min-width: 0;
      flex-direction: column;
      gap: 1px;
    }

    .setting-row b {
      font-weight: 550;
    }

    .setting-row small {
      color: var(--secondary);
      font-size: 9px;
      line-height: 12px;
    }

    input[type='checkbox'] {
      width: 15px;
      height: 15px;
      accent-color: var(--meter-fill);
    }

    input[type='checkbox']:focus-visible {
      outline: 2px solid var(--meter-fill);
      outline-offset: 2px;
    }

    .settings-reset-button {
      color: var(--error);
    }

    .shortcut-field {
      display: flex;
      align-items: center;
      gap: 3px;
    }

    .shortcut-field button {
      max-width: 115px;
      padding: 4px 7px;
      overflow: hidden;
      border: 1px solid var(--separator);
      border-radius: 6px;
      color: var(--secondary);
      background: var(--tray);
      font-family: ui-monospace, monospace;
      font-size: 12px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .shortcut-field button.recording {
      border-color: var(--meter-fill);
      color: var(--text);
    }

    .shortcut-field button[aria-label='清除全局快捷键'] {
      display: grid;
      width: 24px;
      height: 24px;
      padding: 0;
      color: var(--secondary);
      font-family: inherit;
      place-items: center;
    }

    .shortcut-field button[aria-label='清除全局快捷键']:hover,
    .shortcut-field button[aria-label='清除全局快捷键']:focus-visible {
      outline: none;
      color: var(--text);
      background: var(--button-hover);
    }

    .secondary-button {
      flex: 0 0 auto;
      padding: 4px 8px;
      border: 1px solid var(--separator);
      border-radius: 6px;
      color: var(--text);
      background: var(--tray);
      font-size: 12px;
      font-weight: 500;
    }

    .secondary-button:disabled {
      opacity: 0.55;
    }

    .permission-warning {
      display: inline-grid;
      width: 13px;
      height: 13px;
      margin-left: 3px;
      border-radius: 50%;
      color: white;
      background: var(--warning);
      font-size: 8px;
      place-items: center;
    }

    .settings-note,
    .version-row {
      margin: 0;
      padding: 6px 10px 9px;
      color: var(--warning);
      font-size: 9px;
    }

    .version-row {
      padding: 3px 0 8px;
      color: var(--tertiary);
      text-align: center;
    }

    .settings-section {
      margin-bottom: 14px;
      overflow: visible;
      background: transparent;
    }

    .settings-section > .setting-row {
      border-top: 0;
      background: var(--card);
    }

    .settings-section > h2 + .setting-row {
      border-radius: 12px 12px 0 0;
    }

    .settings-section > .setting-row:last-child,
    .settings-section > .settings-note:last-child {
      border-radius: 0 0 12px 12px;
    }

    .settings-section > h2 + .setting-row:last-child {
      border-radius: 12px;
    }

    .setting-row {
      min-height: 40px;
      padding: 9px 12px;
      border: 0;
      font-size: 13px;
    }

    .setting-row b {
      font-weight: 400;
    }

    .setting-row .select-menu__trigger {
      font-size: 13px;
    }

    .setting-row small {
      font-size: 10px;
      line-height: 12px;
    }

    input[type='checkbox'] {
      width: 28px;
      height: 16px;
      flex: 0 0 auto;
      margin: 0;
      appearance: none;
      border-radius: 9px;
      background: var(--meter-track);
      cursor: pointer;
      transition: background-color 160ms ease;
    }

    input[type='checkbox']::after {
      display: block;
      width: 12px;
      height: 12px;
      margin: 2px;
      border-radius: 50%;
      background: white;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
      content: '';
      transition: transform 160ms ease;
    }

    input[type='checkbox']:checked {
      background: var(--meter-fill);
    }

    input[type='checkbox']:checked::after {
      transform: translateX(12px);
    }

    .version-row {
      font-size: 10px;
    }

    .setting-row > span:has(.setting-info) {
      align-items: center;
      flex-direction: row;
      gap: 6px;
    }

    .setting-info {
      display: inline-grid;
      flex: 0 0 auto;
      color: var(--secondary);
      font-style: normal;
      place-items: center;
    }

    .setting-row--button {
      display: block;
    }

    .settings-wide-button {
      width: 100%;
      min-height: 28px;
      font-size: 12px;
    }

    .settings-note.log-action-error {
      background: var(--card);
    }

    .notification-actions {
      padding: 8px 12px 10px;
      border-top: 1px solid var(--separator);
      border-radius: 0 0 12px 12px;
      background: var(--card);
    }

    .notification-attention {
      display: flex;
      align-items: center;
      gap: 10px;
      color: var(--warning);
    }

    .notification-attention > span {
      display: flex;
      min-width: 0;
      flex: 1;
      flex-direction: column;
      gap: 2px;
    }

    .notification-attention b {
      font-size: 11px;
      font-weight: 600;
      line-height: 13px;
    }

    .notification-attention small {
      color: var(--secondary);
      font-size: 9px;
      line-height: 12px;
    }

    .notification-attention .secondary-button {
      flex: 0 0 auto;
    }

    .settings-update-error {
      display: flex;
      flex-direction: column;
      gap: 2px;
      margin: 0 12px 8px;
      padding: 8px;
      border-radius: 8px;
      color: var(--error);
      background: var(--error-bg);
    }

    .settings-update-error b {
      font-size: 11px;
      line-height: 14px;
    }

    .settings-update-error small {
      color: var(--error);
      font-size: 9px;
      line-height: 12px;
    }

    :root[data-density='compact'] .setting-row {
      gap: 8px;
      padding-right: 10px;
      padding-left: 10px;
    }

    :root[data-density='compact'] .screen-cross-link {
      min-height: 42px;
      margin-top: 8px;
    }
  }
</style>
