<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { deleteProviderApiKey, getProviderApiKeyState, saveProviderApiKey } from './backend';
  import Icon from './Icon.svelte';
  import ProviderIcon from './ProviderIcon.svelte';
  import type { ApiKeyStatus, ProviderApiKeyState } from './types';

  interface Props {
    providerId: string;
    providerName: string;
  }

  let { providerId, providerName }: Props = $props();
  let credentialState = $state<ProviderApiKeyState | null>(null);
  let supported = $state<boolean | null>(null);
  let open = $state(false);
  let overrideExternal = $state(false);
  let apiKey = $state('');
  let revealInput = $state(false);
  let saving = $state(false);
  let confirmingRemoval = $state(false);
  let error = $state<string | null>(null);
  let notice = $state<string | null>(null);
  let availabilityError = $state<string | null>(null);
  let editorToggle = $state<HTMLButtonElement>();
  let removeTrigger = $state<HTMLButtonElement>();
  let removeCancelButton = $state<HTMLButtonElement>();
  const status = $derived<ApiKeyStatus>(credentialState?.status ?? 'notSet');
  const editable = $derived(status === 'notSet' || overrideExternal);
  const canClear = $derived(status === 'saved' || status === 'overrideActive');
  const sourceLabel = $derived(
    status === 'fromEnvironment'
      ? '来自环境变量'
      : status === 'fromConfig'
        ? '来自配置文件'
        : status === 'saved'
          ? '已安全保存'
          : status === 'overrideActive'
            ? '自定义密钥'
            : '',
  );

  function errorMessage(cause: unknown, fallback: string) {
    if (typeof cause === 'string') return cause;
    if (cause instanceof Error && cause.message) return cause.message;
    return fallback;
  }

  function displayValue(node: HTMLInputElement, value: string) {
    node.value = value;
    return {
      update(next: string) {
        node.value = next;
      },
    };
  }

  function resetEditor() {
    overrideExternal = false;
    apiKey = '';
    revealInput = false;
    confirmingRemoval = false;
    error = null;
    notice = null;
  }

  function toggleOpen() {
    open = !open;
    if (open) resetEditor();
  }

  async function save() {
    const value = apiKey.trim();
    if (!value || saving) return;
    saving = true;
    error = null;
    notice = null;
    try {
      const outcome = await saveProviderApiKey(providerId, value);
      credentialState = { providerId: outcome.providerId, status: outcome.status };
      availabilityError = null;
      resetEditor();
      notice = outcome.warning ?? null;
      await tick();
      editorToggle?.focus();
    } catch (cause) {
      error = errorMessage(cause, '无法保存 API 密钥。');
    } finally {
      saving = false;
    }
  }

  async function remove() {
    if (saving) return;
    saving = true;
    error = null;
    notice = null;
    try {
      const outcome = await deleteProviderApiKey(providerId);
      credentialState = { providerId: outcome.providerId, status: outcome.status };
      availabilityError = null;
      resetEditor();
      notice = outcome.warning ?? null;
      await tick();
      editorToggle?.focus();
    } catch (cause) {
      error = errorMessage(cause, '无法移除已保存的 API 密钥。');
    } finally {
      saving = false;
    }
  }

  async function requestRemoval() {
    if (saving || confirmingRemoval) return;
    confirmingRemoval = true;
    error = null;
    await tick();
    removeCancelButton?.focus();
  }

  async function cancelRemoval() {
    if (saving) return;
    confirmingRemoval = false;
    await tick();
    removeTrigger?.focus();
  }

  function handleRemovalKeydown(event: KeyboardEvent) {
    if (event.key !== 'Escape' || saving) return;
    event.preventDefault();
    event.stopPropagation();
    void cancelRemoval();
  }

  onMount(() => {
    void getProviderApiKeyState(providerId)
      .then((next) => {
        supported = next !== null;
        credentialState = next;
      })
      .catch((cause) => {
        supported = true;
        availabilityError = errorMessage(cause, '系统凭据存储不可用。');
      });
  });
</script>

{#if supported}
  <section class="api-key-section" aria-label={`${providerName} API 密钥`}>
    <h2>API 密钥</h2>
    <div class="api-key-card">
      <div class="api-key-summary">
        <ProviderIcon {providerId} size={18} />
        <span class="api-key-provider">{providerName}</span>
        <i class:missing={status === 'notSet'} aria-hidden="true"></i>
        <button bind:this={editorToggle} type="button" onclick={toggleOpen}
          >{open ? '完成' : status === 'notSet' ? '添加' : '编辑'}</button
        >
      </div>
      {#if availabilityError}
        <div class="api-key-error availability-error" role="alert">{availabilityError}</div>
      {/if}
      {#if open}
        <div class="api-key-editor">
          {#key `${status}:${editable}`}
            {#if editable}
              <div class="api-key-input">
                <input
                  type={revealInput ? 'text' : 'password'}
                  bind:value={apiKey}
                  autocomplete="off"
                  spellcheck="false"
                  placeholder="粘贴 API 密钥"
                  aria-label={`${providerName} API 密钥`}
                  disabled={saving}
                />
                <button
                  class="field-icon"
                  type="button"
                  aria-label={revealInput ? '隐藏 API 密钥' : '显示 API 密钥'}
                  onclick={() => (revealInput = !revealInput)}
                >
                  <Icon name={revealInput ? 'eye-off' : 'eye'} size={15} />
                </button>
              </div>
              <div class="api-key-actions">
                <button
                  class="primary"
                  type="button"
                  disabled={!apiKey.trim() || saving}
                  onclick={save}>{saving ? '正在保存…' : '保存'}</button
                >
                {#if overrideExternal}
                  <button type="button" disabled={saving} onclick={resetEditor}>取消</button>
                {/if}
              </div>
            {:else}
              <div class="api-key-input api-key-readonly">
                {#if canClear}
                  <button
                    bind:this={removeTrigger}
                    class="field-icon clear-icon"
                    type="button"
                    disabled={saving || confirmingRemoval}
                    aria-controls={`remove-api-key-${providerId}`}
                    aria-expanded={confirmingRemoval}
                    aria-label="移除已保存的 API 密钥"
                    title="移除已保存的 API 密钥"
                    onclick={() => void requestRemoval()}
                  >
                    <Icon name="clear-filled" size={16} strokeWidth={1.8} />
                  </button>
                {/if}
                <input
                  class="api-key-source-field"
                  type="text"
                  use:displayValue={sourceLabel}
                  aria-label={`${providerName} API 密钥来源`}
                  disabled
                />
              </div>
              {#if confirmingRemoval}
                <div
                  id={`remove-api-key-${providerId}`}
                  class="api-key-remove-confirm"
                  role="group"
                  aria-labelledby={`remove-api-key-title-${providerId}`}
                  aria-describedby={`remove-api-key-message-${providerId}`}
                >
                  <strong id={`remove-api-key-title-${providerId}`}>移除已保存的 API 密钥？</strong>
                  <span id={`remove-api-key-message-${providerId}`}
                    >将从安全存储中移除该密钥。此操作无法撤销。</span
                  >
                  <div class="api-key-remove-actions">
                    <button
                      bind:this={removeCancelButton}
                      type="button"
                      disabled={saving}
                      onkeydown={handleRemovalKeydown}
                      onclick={() => void cancelRemoval()}>取消</button
                    >
                    <button
                      class="destructive"
                      type="button"
                      disabled={saving}
                      onkeydown={handleRemovalKeydown}
                      onclick={() => void remove()}>{saving ? '正在移除…' : '移除密钥'}</button
                    >
                  </div>
                </div>
              {/if}
              {#if status === 'fromEnvironment' || status === 'fromConfig'}
                <label class="api-key-override">
                  <input type="checkbox" bind:checked={overrideExternal} disabled={saving} />
                  改用自定义密钥
                </label>
              {/if}
            {/if}
          {/key}
          {#if error}<div class="api-key-error" role="alert">{error}</div>{/if}
          {#if notice}<div class="api-key-notice" role="status">{notice}</div>{/if}
        </div>
      {/if}
    </div>
  </section>
{/if}

<style>
  .api-key-section {
    margin-bottom: 14px;
  }

  .api-key-section h2 {
    margin: 0 8px 5px;
    color: var(--secondary);
    font-size: 11px;
    font-weight: 600;
  }

  .api-key-card {
    overflow: hidden;
    border-radius: 12px;
    background: var(--card);
  }

  .api-key-summary {
    display: flex;
    min-height: 42px;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
  }

  .api-key-provider {
    min-width: 0;
    flex: 1;
    font-size: 13px;
    font-weight: 600;
  }

  .api-key-summary i {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #34c759;
  }

  .api-key-summary i.missing {
    background: var(--meter-critical);
  }

  button {
    padding: 4px 8px;
    border: 0;
    border-radius: 6px;
    color: var(--text);
    background: var(--button-hover);
    font-size: 10px;
  }

  .api-key-editor {
    display: grid;
    gap: 9px;
    padding: 11px 12px 12px;
    border-top: 1px solid var(--separator);
    background: color-mix(in srgb, var(--card) 75%, var(--tray));
  }

  .api-key-input {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .api-key-input input {
    min-width: 0;
    height: 28px;
    flex: 1;
    padding: 4px 8px;
    border: 1px solid var(--separator);
    border-radius: 7px;
    color: var(--text);
    background: var(--tray);
    font: inherit;
    font-size: 11px;
    outline: none;
  }

  .api-key-source-field:disabled {
    opacity: 1;
    color: var(--secondary);
    -webkit-text-fill-color: var(--secondary);
  }

  .api-key-input input:focus {
    border-color: var(--meter-fill);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--meter-fill) 20%, transparent);
  }

  .api-key-input .field-icon {
    display: grid;
    width: 26px;
    height: 26px;
    padding: 0;
    color: var(--secondary);
    background: transparent;
    place-items: center;
  }

  .api-key-input .field-icon:hover:not(:disabled) {
    background: var(--button-hover);
  }

  .api-key-actions {
    display: flex;
    justify-self: start;
    align-items: center;
    gap: 7px;
  }

  .api-key-actions button {
    min-height: 26px;
    padding: 5px 10px;
  }

  .api-key-readonly {
    gap: 4px;
  }

  .api-key-actions .primary {
    min-width: 56px;
    padding-inline: 12px;
    color: white;
    background: var(--meter-fill);
    font-weight: 600;
  }

  .api-key-readonly .clear-icon {
    width: 18px;
    height: 18px;
    flex: 0 0 18px;
    padding: 0;
  }

  .api-key-override {
    display: flex;
    align-items: center;
    gap: 7px;
    color: var(--secondary);
    font-size: 10px;
  }

  .api-key-remove-confirm {
    display: grid;
    gap: 6px;
    padding: 9px;
    border-radius: 8px;
    background: color-mix(in srgb, var(--meter-critical) 8%, transparent);
    font-size: 10px;
  }

  .api-key-remove-confirm > span {
    color: var(--secondary);
    line-height: 14px;
  }

  .api-key-remove-actions {
    display: flex;
    gap: 7px;
  }

  .api-key-remove-actions button {
    min-height: 26px;
    padding: 5px 10px;
  }

  .api-key-remove-actions .destructive {
    color: var(--tray);
    background: var(--error);
    font-weight: 600;
  }

  .api-key-error {
    padding: 6px 7px;
    border-radius: 7px;
    color: var(--error);
    background: var(--error-bg);
    font-size: 10px;
  }

  .api-key-notice {
    padding: 6px 7px;
    border-radius: 7px;
    color: var(--text);
    background: var(--button-hover);
    font-size: 10px;
  }

  .availability-error {
    margin: 0 12px 11px;
  }
</style>
