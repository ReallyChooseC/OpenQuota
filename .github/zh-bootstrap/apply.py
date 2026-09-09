"""Apply the remaining test-only localization correction, then remove this helper."""
from pathlib import Path

path = Path('src-tauri/src/providers/copilot/mod.rs')
text = path.read_text(encoding='utf-8')
old = 'assert_eq!(snapshot.quotas[0].unit.as_deref(), Some("credits"));'
new = 'assert_eq!(snapshot.quotas[0].unit.as_deref(), Some("点数"));'
if text.count(old) != 1:
    raise RuntimeError('Expected exactly one untranslated Copilot display-unit assertion')
before_tests, tests = text.split('#[cfg(test)]\nmod tests {', 1)
if old not in tests:
    raise RuntimeError('Refusing to modify non-test code')
updated = before_tests + '#[cfg(test)]\nmod tests {' + tests.replace(old, new, 1)
path.write_text(updated, encoding='utf-8', newline='\n')
print('Updated one test assertion; runtime application code is unchanged.')
