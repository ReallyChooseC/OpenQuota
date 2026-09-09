"""One-time exact edits to preserve Credits/credits as product-specific terminology."""
from pathlib import Path

ROOT = Path.cwd()


def replace_exact(relative_path: str, old: str, new: str, expected: int = 1) -> None:
    path = ROOT / relative_path
    text = path.read_text(encoding="utf-8")
    actual = text.count(old)
    if actual != expected:
        raise RuntimeError(
            f"Expected {expected} occurrence(s) in {relative_path}, found {actual}: {old!r}"
        )
    path.write_text(text.replace(old, new), encoding="utf-8")


replace_exact(
    "src/lib/ValueMetric.test.ts",
    "label: '点数'",
    "label: 'credits'",
    expected=2,
)
replace_exact(
    "src/lib/ValueMetric.test.ts",
    "$1.2K · 30K 点数",
    "$1.2K · 30K credits",
)
replace_exact(
    "src/lib/ValueMetric.test.ts",
    "$1,200.00 · 30,000 点数",
    "$1,200.00 · 30,000 credits",
)

replace_exact(
    "src/test/appFixtures.ts",
    "{ label: '点数', url: 'https://openrouter.ai/settings/credits' }",
    "{ label: 'Credits', url: 'https://openrouter.ai/settings/credits' }",
)
replace_exact(
    "src/test/appFixtures.ts",
    "quota('openrouter.credits', '点数', 'credits')",
    "quota('openrouter.credits', 'Credits', 'credits')",
)
replace_exact(
    "src/test/appFixtures.ts",
    "{ number: 821, kind: 'count', label: '点数', estimated: false }",
    "{ number: 821, kind: 'count', label: 'credits', estimated: false }",
)

replace_exact(
    "src-tauri/src/providers/copilot/mod.rs",
    '"copilot.premium",\n                "点数",',
    '"copilot.premium",\n                "Credits",',
)
replace_exact(
    "src-tauri/src/providers/copilot/mod.rs",
    '"copilot.orgCredits",\n                "组织点数",',
    '"copilot.orgCredits",\n                "Org Credits",',
)
replace_exact(
    "src-tauri/src/providers/copilot/mod.rs",
    'Some("点数")',
    'Some("credits")',
)

replace_exact(
    "src-tauri/src/providers/copilot/mapper.rs",
    'snapshot_quota("premium", "点数", "credits", value, resets_at)',
    'snapshot_quota("premium", "Credits", "credits", value, resets_at)',
)
replace_exact(
    "src-tauri/src/providers/copilot/mapper.rs",
    '"组织点数"',
    '"Org Credits"',
    expected=1,
)
replace_exact(
    "src-tauri/src/providers/copilot/mapper.rs",
    'Some("点数".into())',
    'Some("credits".into())',
    expected=2,
)
replace_exact(
    "src-tauri/src/providers/copilot/mapper.rs",
    '                    "credits" => "点数",\n',
    "",
)
replace_exact(
    "src-tauri/src/providers/copilot/mapper.rs",
    '                "credits" => "点数",\n',
    "",
)
replace_exact(
    "src-tauri/src/providers/copilot/mapper.rs",
    'Some("点数")',
    'Some("credits")',
    expected=3,
)

replace_exact(
    "src-tauri/src/providers/openrouter/mod.rs",
    'ProviderLink::new("点数", "https://openrouter.ai/settings/credits")',
    'ProviderLink::new("Credits", "https://openrouter.ai/settings/credits")',
)
replace_exact(
    "src-tauri/src/providers/openrouter/mod.rs",
    '"openrouter.credits",\n                "点数",',
    '"openrouter.credits",\n                "Credits",',
)
replace_exact(
    "src-tauri/src/providers/openrouter/mapper.rs",
    'dollars_quota("credits", "点数", used, total)',
    'dollars_quota("credits", "Credits", used, total)',
)
replace_exact(
    "src-tauri/src/providers/mod.rs",
    '                    "点数".into(),\n                    "https://openrouter.ai/settings/credits".into()',
    '                    "Credits".into(),\n                    "https://openrouter.ai/settings/credits".into()',
)
replace_exact(
    "src-tauri/src/providers/cursor/mod.rs",
    '"cursor.credits",\n                "点数",',
    '"cursor.credits",\n                "Credits",',
)
replace_exact(
    "src-tauri/src/providers/cursor/mapper.rs",
    'dollar_value("credits", "点数", remaining / 100.0)',
    'dollar_value("credits", "Credits", remaining / 100.0)',
)
replace_exact(
    "src-tauri/src/providers/codex/mapper.rs",
    'label: Some("点数".into()),',
    'label: Some("credits".into()),',
)

print("Restored Credits/credits and Org Credits as product-specific terminology.")
