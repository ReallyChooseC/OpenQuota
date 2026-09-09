"""One-time exact source edits; removed after committing the resulting source."""
from pathlib import Path

root = Path.cwd()
fixes = {
    'src-tauri/src/models.rs': {
        'ProviderLink::new(" Status ",': 'ProviderLink::new(" 服务状态 ",',
    },
    'src-tauri/src/providers/registry.rs': {
        'ProviderLink::new(" Status ",': 'ProviderLink::new(" 服务状态 ",',
    },
    'src-tauri/src/providers/claude/mapper.rs': {
        'Some("spent")': 'Some("已用")',
    },
    'src-tauri/src/providers/copilot/mapper.rs': {
        'Some(unit.to_owned())': 'Some(match unit { "credits" => "点数", "requests" => "次请求", value => value }.to_owned())',
    },
    'src-tauri/src/providers/minimax/mapper.rs': {
        'format!("{label} (Unlimited)")': 'format!("{label}（不限量）")',
        '.label.contains("Unlimited")': '.label.contains("不限量")',
        '"Weekly (Unlimited)"': '"本周额度（不限量）"',
    },
    'src-tauri/src/providers/minimax/mod.rs': {
        '"Weekly (Unlimited)"': '"本周额度（不限量）"',
    },
    'src-tauri/src/providers/openrouter/mod.rs': {
        'error.to_string().contains("invalid")': 'error.to_string().contains("无效")',
    },
    'src-tauri/src/providers/zai/mod.rs': {
        'invalid.to_string().contains("invalid")': 'invalid.to_string().contains("无效")',
        'Some("searches")': 'Some("次搜索")',
    },
}
for rel, edits in fixes.items():
    path = root / rel
    text = path.read_text(encoding='utf-8')
    for old, new in edits.items():
        if old not in text:
            raise RuntimeError(f'Expected source not found in {rel}: {old}')
        text = text.replace(old, new)
    path.write_text(text, encoding='utf-8')
print('Fixed remaining native display labels and corresponding regression assertions.')
