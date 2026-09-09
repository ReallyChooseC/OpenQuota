from pathlib import Path
import re
root = Path.cwd()
for p in (root / 'src').rglob('*.svelte'):
    s = p.read_text(encoding='utf-8').replace('`Move ${', '`移动 ${')
    p.write_text(s, encoding='utf-8')
# Exact display expectations and accessibility labels, keeping behavioral assertions.
D = {
    'restores every provider': '恢复所有服务商指标',
    'Provider sign-ins, API keys, and usage history stay in place.': '登录状态、API 密钥及用量历史将保留。',
    'Only includes Claude and Codex': '仅包含 Claude、Codex',
    'Status, opens in browser': '服务状态，在浏览器中打开',
    'Dashboard, opens in browser': '网页面板，在浏览器中打开',
    'Docs, opens in browser': 'Docs，在浏览器中打开',
    '额度重置次数 details': '额度重置次数 详情',
    '/重置额度 expiring/': '/使用将于.*到期的重置次数/',
    '/^Last updated/': '/更新$/',
    'OpenQuota 0.1.0 is up to date.': 'OpenQuota 0.1.0 已是最新版本。',
    'OpenQuota 0.2.0 is ready to download.': 'OpenQuota 0.2.0 已可下载。',
    'From your future-provider usage history': '来自你的 future-provider 用量历史',
    'Duplicate provider definition: codex': '服务商定义重复：codex',
    'Duplicate metric definition: codex.session': '指标定义重复：codex.session',
    'Session move cancelled.': '已取消移动当前周期。',
    'Session moved to position 2 of 2.': '已将当前周期移至第 2 项，共 2 项。',
    '~8% spare': '预计剩余约 8%',
    'Next update in 1m': '1 分钟后刷新',
    'Next update in 5m': '5 分钟后刷新',
    'peak 42K tokens': '峰值 42K Token',
    "getByText('million')": "getByText('百万 Token')",
    "'1h 30m'": "'1小时 30分钟'",
    "'3h'": "'3小时'",
}
for provider in ['codex', 'claude', 'antigravity', 'openrouter', 'Codex', 'Claude', 'Claude — Work', 'Work Claude', 'Personal Claude', 'Cursor', 'OpenRouter']:
    D.update({
        f'Enable {provider}': f'启用 {provider}',
        f'Customize {provider}': f'自定义 {provider}',
        f'Configure {provider}': f'配置 {provider}',
        f'{provider} provider': f'{provider} 服务商',
        f'{provider} usage': f'{provider} 用量',
        f'Drag {provider} to reorder': f'拖动 {provider} 调整顺序',
        f'Name for {provider}': f'{provider} 的名称',
        f'{provider} API Key': f'{provider} API 密钥',
        f'{provider} API key': f'{provider} API 密钥',
        f'Move {provider}': f'移动 {provider}',
        f'Refresh {provider}': f'刷新 {provider}',
        f'Hide {provider}': f'隐藏 {provider}',
    })
for en, zh in [('Session', '当前周期'), ('Weekly', '本周额度'), ('Today', '今天'), ('Yesterday', '昨天'), ('Last 30 Days', '最近 30 天'), ('Rate Limit Resets', '额度重置次数'), ('Extra Usage', '额外用量')]:
    for suffix, ch in [(' options', ' 选项'), (' used', ' 已用'), (' quota', ' 额度')]:
        D[en + suffix] = zh + ch
    for prefix, ch in [('Move ', '移动 '), ('Pin ', '置顶 '), ('Unpin ', '取消置顶 '), ('Show ', '显示 ')]:
        D[prefix + en] = ch + zh
more = {
    '用量趋势 options': '用量趋势 选项',
    '额外用量 options': '额外用量 选项',
    'Move Personal': '移动 Personal',
    'Reset Codex': '重置Codex',
    'Retry Codex': '重试 Codex',
    '/^Outdated\\. Last updated/': '/^数据已过期。.*更新$/',
    'OpenRouter API 密钥 source': 'OpenRouter API 密钥来源',
    'Today model usage': '今天 模型用量',
    "expect(screen.getAllByText('3 available')).toHaveLength(2);": "expect(screen.getByText('3 available')).toBeInTheDocument();\n    expect(screen.getByText('可用 3 次')).toBeInTheDocument();",
    "'Codex', 'dollars'": "'Codex', '美元'",
    "getByLabelText('OpenRouter API 密钥')": "getByLabelText('OpenRouter API 密钥', { selector: 'input' })",
    "queryByLabelText('OpenRouter API 密钥')": "queryByLabelText('OpenRouter API 密钥', { selector: 'input' })",
}
for p in (root / 'src').rglob('*.test.ts'):
    s = p.read_text(encoding='utf-8')
    for old, new in sorted(D.items(), key=lambda pair: -len(pair[0])):
        s = s.replace(old, new)
    s = re.sub(r'(\d[\d.,KMB]*|42K) tokens', r'\1 Token', s)
    for old, new in more.items():
        s = s.replace(old, new)
    if p.name == 'metricFormat.test.ts':
        s = s.replace("'count', 'row', 'tokens'", "'count', 'row', 'Token'")
        s = s.replace("'count', 'full', 'tokens'", "'count', 'full', 'Token'")
    p.write_text(s, encoding='utf-8')
p = root / 'src/lib/Dashboard.svelte'
s = p.read_text(encoding='utf-8').replace('<span class="sr-only">. {stalenessTooltip', '<span class="sr-only">。{stalenessTooltip')
p.write_text(s, encoding='utf-8')
fixes = {
    'src-tauri/src/providers/claude/mod.rs': {
        'Retrying in about 6 minutes': '约 6 分钟后重试',
        'Showing the last successful limits · Retrying in about 1 minute': '显示上次成功获取的额度 · 约 1 分钟后重试',
    },
    'src-tauri/src/providers/grok/mapper.rs': {'"2500 cap"': '"上限 2500"'},
    'src-tauri/src/tray_presentation.rs': {
        'unwrap_or("requests")': 'unwrap_or("次请求")',
        'Requests 75 searches left': '请求数 75 searches 剩余',
        'Requests 25 searches used': '请求数 25 searches 已用',
        'Extra Usage $32.84 · 821 credits': '额外用量 $32.84 · 821 credits',
        'Extra Usage 2500 cap': '额外用量 2500 cap',
    },
}
for rel, pairs in fixes.items():
    p = root / rel
    s = p.read_text(encoding='utf-8')
    for old, new in pairs.items():
        s = s.replace(old, new)
    p.write_text(s, encoding='utf-8')
