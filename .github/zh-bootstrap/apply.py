from pathlib import Path
import re
root = Path.cwd()
fixes = {
    'src-tauri/src/settings.rs': {
        'error.contains("Settings changed")': 'error.contains("设置已发生变化")',
    },
    'src-tauri/src/desktop_integration.rs': {
        'GNOME · Wayland · standalone window': 'GNOME · Wayland · 独立窗口',
        'KDE Plasma · X11 · standalone window': 'KDE Plasma · X11 · 独立窗口',
    },
    'src-tauri/src/providers/openrouter/mod.rs': {
        'missing.to_string().contains("Add an OpenRouter API key")': 'missing.to_string().contains("添加 OpenRouter API 密钥")',
    },
    'src-tauri/src/providers/zai/mod.rs': {
        'missing.to_string().contains("Add a Z.ai API key")': 'missing.to_string().contains("添加 Z.ai API 密钥")',
        'no_plan.to_string().contains("GLM Coding Plan")': 'no_plan.to_string().contains("GLM 编程套餐")',
    },
    'src-tauri/src/providers/opencode/mapper.rs': {
        'OpenCode Go usage request failed (HTTP 429).': 'OpenCode Go 用量请求失败（HTTP 429）。',
    },
    'src-tauri/src/providers/codex/mapper.rs': {
        'label: Some("credits".into())': 'label: Some("点数".into())',
    },
    'src-tauri/src/providers/copilot/mapper.rs': {
        'label: Some("credits".into())': 'label: Some("点数".into())',
        'unit: Some(unit.into())': 'unit: Some(match unit { "credits" => "点数", "requests" => "次请求", value => value }.into())',
        'Some("credits")': 'Some("点数")',
        'Some("requests")': 'Some("次请求")',
    },
    'src-tauri/src/providers/zai/mapper.rs': {
        'unit: Some("searches".into())': 'unit: Some("次搜索".into())',
        'Some("searches")': 'Some("次搜索")',
    },
}
for rel, pairs in fixes.items():
    p = root / rel
    s = p.read_text(encoding='utf-8')
    for old, new in pairs.items():
        s = s.replace(old, new)
    p.write_text(s, encoding='utf-8')
# These are display labels in frontend fixtures, not API status values or IDs.
for p in (root / 'src').rglob('*.ts'):
    if '.test.' not in p.name and p.name != 'appFixtures.ts':
        continue
    s = p.read_text(encoding='utf-8')
    s = s.replace("label: 'credits'", "label: '点数'").replace("label: 'available'", "label: '可用'")
    s = re.sub(r'(\d[\d.,KMB]*) credits', r'\1 点数', s)
    s = re.sub(r'(\d[\d.,KMB]*) available', r'\1 可用', s)
    p.write_text(s, encoding='utf-8')
