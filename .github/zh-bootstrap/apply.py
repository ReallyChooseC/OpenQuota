"""One-time source edit: enable reqwest Windows/macOS system proxy support."""
from pathlib import Path
import subprocess

root = Path.cwd()
cargo_toml = root / "src-tauri" / "Cargo.toml"
text = cargo_toml.read_text(encoding="utf-8")
old = 'reqwest = { version = "0.13", default-features = false, features = ["blocking", "form", "json", "rustls"] }'
new = 'reqwest = { version = "0.13", default-features = false, features = ["blocking", "form", "json", "rustls", "system-proxy"] }'
if text.count(old) != 1:
    raise RuntimeError("Expected the reqwest dependency declaration exactly once")
cargo_toml.write_text(text.replace(old, new), encoding="utf-8")

readme = root / "README.zh-CN.md"
readme_text = readme.read_text(encoding="utf-8")
marker = "\n## 自行构建\n"
proxy_section = """
## 网络与代理

Windows 版会自动读取当前用户在“设置 → 网络和 Internet → 代理”中启用的手动 HTTP/HTTPS 代理，并继续支持 `HTTP_PROXY`、`HTTPS_PROXY`、`ALL_PROXY` 和 `NO_PROXY` 环境变量。环境变量优先于系统代理。修改代理设置后请完全退出并重新启动 OpenQuota。

目前底层库只读取 Windows 的手动代理地址和绕过列表，不解析 PAC 自动配置脚本或 WPAD。使用 Clash、Mihomo、V2Ray 等工具时，请启用其“系统代理”，并确保系统代理指向 HTTP 或混合端口。
"""
if proxy_section.strip() not in readme_text:
    if marker not in readme_text:
        raise RuntimeError("README build section marker not found")
    readme.write_text(readme_text.replace(marker, "\n" + proxy_section + marker), encoding="utf-8")

# Resolve the newly enabled optional feature now so Cargo.lock is committed with the source change.
subprocess.run(
    [
        "cargo",
        "metadata",
        "--manifest-path",
        "src-tauri/Cargo.toml",
        "--format-version",
        "1",
    ],
    cwd=root,
    stdout=subprocess.DEVNULL,
    check=True,
)

print("Enabled reqwest system-proxy and refreshed Cargo.lock.")
