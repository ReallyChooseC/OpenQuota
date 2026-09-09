"""One-time exact source edits for proxy routing and the final generic UI label."""
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


# Remote provider requests follow the environment/Windows system proxy. The
# Antigravity language server is a localhost service and must never be routed
# through that proxy.
replace_exact(
    "src-tauri/src/providers/antigravity/client.rs",
    "            local: Client::builder()\n                .danger_accept_invalid_certs(true)",
    "            local: Client::builder()\n                .no_proxy()\n                .danger_accept_invalid_certs(true)",
)

# Monthly is a generic period label, not a product or protocol term.
replace_exact(
    "src-tauri/src/providers/opencode/mod.rs",
    '                "Monthly",\n                "monthly",',
    '                "本月额度",\n                "monthly",',
)
replace_exact(
    "src-tauri/src/providers/opencode/mapper.rs",
    '        quota(usage.get("monthly"), "monthly", "Monthly", 0),',
    '        quota(usage.get("monthly"), "monthly", "本月额度", 0),',
)

readme = ROOT / "README.zh-CN.md"
text = readme.read_text(encoding="utf-8")
old = "环境变量优先于系统代理。修改代理设置后请完全退出并重新启动 OpenQuota。"
new = "环境变量优先于系统代理；访问 `127.0.0.1` 的本地服务请求会显式绕过代理。修改代理设置后请完全退出并重新启动 OpenQuota。"
if old in text:
    readme.write_text(text.replace(old, new, 1), encoding="utf-8")
elif new not in text:
    raise RuntimeError("README proxy paragraph not found")

print("Kept remote system-proxy routing, bypassed localhost, and translated Monthly.")