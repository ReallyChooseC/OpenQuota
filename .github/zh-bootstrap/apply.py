"""One-time source editing helper. Removed from the tree after applying; not runtime i18n."""
from pathlib import Path
import json
import re

root = Path.cwd()
D = {}
for p in sorted(Path(__file__).parent.glob('*.txt')):
    for row in p.read_text(encoding='utf-8').splitlines():
        if '|' in row:
            key, value = row.split('|', 1)
            D[key] = value
for name in ['Claude', 'Codex', 'Cursor', 'Grok', 'Copilot', 'GitHub', 'Devin', 'Kimi', 'MiniMax', 'OpenRouter', 'Z.ai', 'OpenCode Go']:
    command = name.lower()
    for key, value in [
        (f'Could not connect to {name}. Check your internet connection.', f'无法连接 {name}，请检查网络连接。'),
        (f'Could not reach {name}. Check your internet connection.', f'无法连接 {name}，请检查网络连接。'),
        (f'{name} returned an invalid usage response.', f'{name} 返回的用量数据无效。'),
        (f'{name} returned an invalid billing response.', f'{name} 返回的账单数据无效。'),
        (f'{name} usage request failed (HTTP {{0}}).', f'{name} 用量请求失败（HTTP {{0}}）。'),
        (f'{name} request failed (HTTP {{0}}).', f'{name} 请求失败（HTTP {{0}}）。'),
        (f'{name} billing request failed (HTTP {{0}}).', f'{name} 账单请求失败（HTTP {{0}}）。'),
        (f'Local {name} usage logs could not be processed.', f'无法处理本地 {name} 用量日志。'),
        (f'Refreshed {name} credentials could not be saved.', f'无法保存刷新后的 {name} 凭据。'),
        (f'The refreshed {name} login is active for this session but could not be saved.', f'刷新后的 {name} 登录状态在本次运行中有效，但无法保存。'),
        (f'{name} usage data is temporarily unavailable.', f'{name} 用量数据暂时不可用。'),
        (f'The {name} API key could not be read or updated.', f'无法读取或更新 {name} API 密钥。'),
        (f'Not logged in. Run `{command}` to authenticate.', f'尚未登录。请运行 `{command}` 完成登录。'),
        (f'Your {name} session expired. Run `{command}` to sign in again.', f'{name} 会话已过期。请运行 `{command}` 重新登录。'),
        (f'Your {name} token expired. Run `{command}` to sign in again.', f'{name} 令牌已过期。请运行 `{command}` 重新登录。'),
    ]:
        D[key] = value
for noun, zh in [
    ('OpenQuota settings', 'OpenQuota 设置'), ('OpenQuota account settings', 'OpenQuota 账号设置'), ('OpenQuota account names', 'OpenQuota 账号名称'),
    ('OpenQuota panel state', 'OpenQuota 面板状态'), ('OpenQuota window', 'OpenQuota 窗口'), ('OpenQuota window mode', 'OpenQuota 窗口模式'),
    ('OpenQuota window position', 'OpenQuota 窗口位置'), ('OpenQuota window size', 'OpenQuota 窗口尺寸'), ('OpenQuota display', 'OpenQuota 显示器信息'),
    ('OpenQuota content size', 'OpenQuota 内容尺寸'), ('OpenQuota display scale', 'OpenQuota 显示缩放比例'), ('OpenQuota native window', 'OpenQuota 原生窗口'),
    ('OpenQuota panel size limits', 'OpenQuota 面板尺寸限制'), ('OpenQuota panel resize', 'OpenQuota 面板尺寸调整'),
    ('The macOS Keychain', 'macOS 钥匙串'), ('The macOS Keychain item', 'macOS 钥匙串条目'),
    ('Windows Credential Manager', 'Windows 凭据管理器'), ('Windows Credential Manager item', 'Windows 凭据管理器条目'),
    ('Linux Secret Service', 'Linux 密钥服务'), ('Linux Secret Service item', 'Linux 密钥服务条目'),
    ('XDG autostart entry', 'XDG 自动启动项'), ('XDG autostart directory', 'XDG 自动启动目录'), ('XDG configuration directory', 'XDG 配置目录'),
]:
    for suffix in [' is unavailable.', ' are unavailable.', ' are temporarily unavailable.']:
        D[noun + suffix] = zh + '暂时不可用。'
    for verb, ch in [('read', '读取'), ('updated', '更新'), ('removed', '移除'), ('searched', '搜索'), ('unlocked', '解锁'), ('saved', '保存'), ('loaded', '加载'), ('restored', '恢复'), ('changed', '更改'), ('shown', '显示'), ('applied', '应用'), ('resized', '调整'), ('enabled', '启用'), ('settled', '完成'), ('resolved', '获取'), ('created', '创建'), ('written', '写入'), ('installed', '安装')]:
        D[noun + ' could not be ' + verb + '.'] = '无法' + ch + zh + '。'
D.update({'OpenQuota data directory could not be created': '无法创建 OpenQuota 数据目录', 'OpenQuota database is unavailable': 'OpenQuota 数据库不可用', 'Cached OpenQuota data is invalid': 'OpenQuota 缓存数据无效', 'OpenQuota database lock is unavailable': '无法锁定 OpenQuota 数据库', 'Linux Secret Service could not save the API key.': 'Linux 密钥服务无法保存 API 密钥。'})
ordered = sorted(D, key=len, reverse=True)
for p in (root / 'src').rglob('*'):
    if p.suffix not in ('.ts', '.svelte'):
        continue
    s = p.read_text(encoding='utf-8')
    for en in ordered:
        zh = D[en]
        for quote in ['"', "'", '`']:
            s = s.replace(quote + en + quote, quote + zh + quote)
        if p.suffix == '.svelte':
            s = re.sub(r'(?<=>)(\s*)' + re.escape(en) + r'(\s*)(?=<)', lambda m: m[1] + zh + m[2], s)
        if ' ' in en and len(en) > 7:
            s = s.replace(en, zh)
        if '.test.' in p.name and '\\' not in en and '\n' not in en:
            s = s.replace('/' + en + '/', '/' + zh + '/')
    for a, b in [('Notifications {#if', '通知 {#if'), ('{provider.metrics.length} metrics', '{provider.metrics.length} 项指标'), ('{count} available', '可用 {count} 次')]:
        s = s.replace(a, b)
    p.write_text(s, encoding='utf-8')
# Rust: literals only. Never translate wire keys, CSV headers, identifiers, or credentials.
for p in (root / 'src-tauri/src').rglob('*.rs'):
    if p.name == 'csv.rs':
        continue
    s = p.read_text(encoding='utf-8')
    s = re.sub(r'"((?:\\.|[^"\\])*)"', lambda m: '"' + D.get(m[1], m[1]) + '"', s)
    p.write_text(s, encoding='utf-8')

def patch(rel, pairs):
    p = root / rel
    s = p.read_text(encoding='utf-8')
    for old, new in pairs.items():
        s = s.replace(old, new)
    p.write_text(s, encoding='utf-8')

fragments = {
    "`${value.toFixed(0)} ${countUnit} ${usageDisplay}`": "`${usageDisplay === 'left' ? '剩余' : '已用'} ${value.toFixed(0)} ${countUnit}`",
    "`$${Math.max(0, quota.limitValue - quota.usedValue).toFixed(2)} left`": "`剩余 $${Math.max(0, quota.limitValue - quota.usedValue).toFixed(2)}`",
    "`$${quota.usedValue.toFixed(2)} spent`": "`已用 $${quota.usedValue.toFixed(2)}`",
    "`${(usageDisplay === 'used' ? used : remaining).toFixed(0)}% ${usageDisplay}`": "`${usageDisplay === 'left' ? '剩余' : '已用'} ${(usageDisplay === 'used' ? used : remaining).toFixed(0)}%`",
    "`${opposite.toFixed(0)} ${countUnit} ${usageDisplay === 'left' ? 'used' : 'left'}`": "`${usageDisplay === 'left' ? '已用' : '剩余'} ${opposite.toFixed(0)} ${countUnit}`",
    "`${used.toFixed(0)}% used`": "`已用 ${used.toFixed(0)}%`",
    "`${remaining.toFixed(0)}% left`": "`剩余 ${remaining.toFixed(0)}%`",
    "`${(settings.usageDisplay === 'used' ? used : remaining).toFixed(0)}% ${settings.usageDisplay}`": "`${settings.usageDisplay === 'left' ? '剩余' : '已用'} ${(settings.usageDisplay === 'used' ? used : remaining).toFixed(0)}%`",
    "`${displayed.toFixed(0)} ${quota.unit?.trim() || 'requests'} ${settings.usageDisplay}`": "`${settings.usageDisplay === 'left' ? '剩余' : '已用'} ${displayed.toFixed(0)} ${quota.unit?.trim() || '次请求'}`",
    "`$${displayed.toFixed(2)} ${settings.usageDisplay === 'left' ? 'left' : 'spent'}`": "`${settings.usageDisplay === 'left' ? '剩余' : '已用'} $${displayed.toFixed(2)}`",
    "`Last updated ${hours}h${remainingMinutes ? ` ${remainingMinutes}m` : ''} ago`": "`${hours} 小时${remainingMinutes ? ` ${remainingMinutes} 分钟` : ''}前更新`",
    "`${point.date}: ${compact(point.tokens)} tokens`": "`${point.date}：${compact(point.tokens)} Token`",
    "`${dayLabel(highlightedPoint.date)} · ${compact(highlightedPoint.tokens)} tokens`": "`${dayLabel(highlightedPoint.date)} · ${compact(highlightedPoint.tokens)} Token`",
    "quota.unit?.trim() || 'requests'": "quota.unit?.trim() || '次请求'",
}
for p in (root / 'src').rglob('*'):
    if p.suffix in ('.ts', '.svelte'):
        patch(p.relative_to(root), fragments)
patch('src/lib/pacing.ts', {
    "formatDeadline('Resets'": "formatDeadline('重置'", "formatDeadline('Limit'": "formatDeadline('用尽'",
    '`${prefix} soon`': '`即将${prefix}`', '`${prefix} in ${formatDuration(remaining)}`': '`${formatDuration(remaining)}后${prefix}`',
    '`${prefix} today at ${time}`': '`今天 ${time} ${prefix}`', '`${prefix} tomorrow at ${time}`': '`明天 ${time} ${prefix}`',
    '`${prefix} ${monthDay} at ${time}`': '`${monthDay} ${time} ${prefix}`', "date.toLocaleTimeString([],": "date.toLocaleTimeString('zh-CN',",
    'new Intl.DateTimeFormat(undefined,': "new Intl.DateTimeFormat('zh-CN',", '`${days}d ${hours}h`': '`${days}天 ${hours}小时`',
    '`${hours}h ${remainder}m`': '`${hours}小时 ${remainder}分钟`', '`${hours}h`': '`${hours}小时`', '`${remainder}m`': '`${remainder}分钟`',
})
for name in ['ValueMetric.svelte', 'ResetCreditsDetail.svelte']:
    patch('src/lib/' + name, {'/^Resets(?: in)?\\s*/': '/(?:后)?重置$/', '/^Resets\\s*/': '/\\s*重置$/', "relative === 'soon'": "relative === '即将'"})
patch('src/lib/ValueMetric.svelte', {'return `${index + 1}. ${formatted}`;': "return `${index + 1}. ${formatted === '即将' ? '即将到期' : formatted}`;"})
patch('src/lib/UsageTrend.svelte', {"Intl.DateTimeFormat('en-US'": "Intl.DateTimeFormat('zh-CN'"})
patch('src/lib/SettingsScreen.svelte', {'Activate to record. While recording, press a modifier shortcut to save it, Delete to clear\n        it, or Escape to cancel.': '点击后录入快捷键：按组合键保存，按 Delete 清除，按 Escape 取消。'})
patch('src/lib/metricFormat.ts', {"unit: 'dollars'": "unit: '美元'", "unit: 'MTok'": "unit: '每百万 Token'", "unit: 'billion'": "unit: '十亿 Token'", "unit: 'million'": "unit: '百万 Token'", "unit: 'thousand'": "unit: '千 Token'", "unit: 'tokens'": "unit: 'Token'", '`${dollars}/MTok`': '`${dollars}/百万 Token`'})
for rel in ['ModelUsageDetail.svelte', 'UsageMetric.svelte', 'shareCard.ts']:
    patch('src/lib/' + rel, {"'row', 'tokens'": "'row', 'Token'", "'full', 'tokens'": "'full', 'Token'"})
for rel in ['providers/codex/mapper.rs', 'providers/claude/mapper.rs']:
    patch('src-tauri/src/' + rel, {'label: Some("available".into())': 'label: Some("可用".into())', 'label: Some("spent".into())': 'label: Some("已用".into())', 'label.as_deref(), Some("available")': 'label.as_deref(), Some("可用")', 'label.as_deref(), Some("spent")': 'label.as_deref(), Some("已用")'})
patch('src-tauri/src/commands/provider.rs', {'incomplete_mutation_warning("saved securely")': 'incomplete_mutation_warning("安全保存")', 'incomplete_mutation_warning("removed")': 'incomplete_mutation_warning("移除")'})
patch('src-tauri/src/providers/cursor/mapper.rs', {'|| "requests".into()': '|| "次请求".into()'})
patch('src-tauri/src/providers/claude/mod.rs', {'format!(\n        "{minutes} {}",\n        if minutes == 1 { "minute" } else { "minutes" }\n    )': 'format!("{minutes} 分钟")'})
patch('src-tauri/src/providers/grok/mapper.rs', {'"{} cap"': '"上限 {}"'})
patch('src-tauri/src/tray_presentation.rs', {'UsageDisplay::Used => "used"': 'UsageDisplay::Used => "已用"', 'UsageDisplay::Left => "left"': 'UsageDisplay::Left => "剩余"', '"spent"': '"已用"'})
patch('src-tauri/src/updates.rs', {'https://github.com/deviffyy/OpenQuota/releases/latest': 'https://github.com/ReallyChooseC/OpenQuota/releases', '.contains("release page")': '.contains("发行页面")'})
patch('index.html', {'lang="en"': 'lang="zh-CN"'})
config = root / 'src-tauri/tauri.conf.json'
obj = json.loads(config.read_text(encoding='utf-8'))
obj['bundle']['windows']['nsis'].update(languages=['SimpChinese'], displayLanguageSelector=False)
obj['bundle']['createUpdaterArtifacts'] = False
obj['plugins']['updater']['endpoints'] = ['https://github.com/ReallyChooseC/OpenQuota/releases/latest/download/latest.json']
config.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
# Expected display strings change; behavioral assertions and machine enum values do not.
T = {'~40% left at reset': '重置时预计剩余约 40%', '~92% used at reset': '重置时预计已用约 92%', '~20% over limit at reset': '重置时预计超额约 20%', 'Resets today at': '今天 ', 'Resets tomorrow at': '明天 ', 'Resets soon': '即将重置', 'Limit soon': '即将用尽', 'Codex usage could not be refreshed.': '无法刷新 Codex 的用量。'}
for p in (root / 'src').rglob('*.test.ts'):
    s = p.read_text(encoding='utf-8')
    def display(m):
        t = m[1]
        t = re.sub(r'(Resets|Limit) in ([0-9]+)h(?: ([0-9]+)m)?', lambda z: z[2] + '小时' + (' ' + z[3] + '分钟' if z[3] else '') + ('后重置' if z[1] == 'Resets' else '后用尽'), t)
        t = re.sub(r'(Resets|Limit) in ([0-9]+)m', lambda z: z[2] + '分钟' + ('后重置' if z[1] == 'Resets' else '后用尽'), t)
        t = T.get(t, t)
        t = re.sub(r'^([\d.]+%|\$[\d.,]+|\d+ [A-Za-z]+) (left|used|spent)$', lambda z: ('剩余' if z[2] == 'left' else '已用') + ' ' + z[1], t)
        return "'" + t.replace('/MTok', '/百万 Token') + "'"
    s = re.sub(r"'((?:\\.|[^'\\])*)'", display, s)
    s = s.replace('/Resets in/', '/后重置/').replace('/Limit in/', '/后用尽/').replace('/left at reset/', '/重置时预计剩余/').replace('/^Resets .+ at /', '/.+重置$/')
    if p.name == 'pacing.test.ts':
        s = s.replace('new Intl.DateTimeFormat([],', "new Intl.DateTimeFormat('zh-CN',")
    if p.name in ['metricFormat.test.ts', 'spendRing.test.ts', 'shareCard.test.ts', 'TotalSpendSummary.test.ts']:
        for old, new in [('dollars', '美元'), ('million', '百万 Token'), ('billion', '十亿 Token'), ('thousand', '千 Token')]:
            s = s.replace("unit: '" + old + "'", "unit: '" + new + "'")
    p.write_text(s, encoding='utf-8')
print(f'Applied {len(D)} source translation rules. No runtime translation layer added.')
