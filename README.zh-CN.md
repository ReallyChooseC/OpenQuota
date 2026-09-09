# OpenQuota 简体中文版

基于 deviffyy/OpenQuota 的个人汉化分支。界面固定使用简体中文，不增加语言选项，不引入运行时翻译框架。Codex、Claude 等名称以及模型名、Token、API 密钥名称保持原样。统计和费用算法不变，美元仍为美元，不能视为订阅账户实际余额。

包括主界面、设置、自定义、托盘菜单、通知、提示与常见错误、时间显示、分享截图以及 Windows NSIS 安装界面的中文化。

## Windows x64 安装包

在本仓库 Actions 的“简体中文 Windows x64”中获取 `OpenQuota-zh-CN-windows-x64` 构建产物，解压后运行 `*-setup.exe`。同时提供 SHA256SUMS.txt 和对应源码提交号。安装包没有开发者代码签名，Windows 可能显示未知发布者提示。仅在确认来源和校验值后运行。

本分支的更新地址指向 ReallyChooseC/OpenQuota，不会从上游下载英文版覆盖汉化。目前未配置自己的签名自动更新发布，请通过本 Fork 的构建产物手动更新。

## 自行构建

Windows 上安装 Node.js 22、pnpm 11.11.0、Rust 稳定版、Visual Studio C++ 构建工具及 WebView2 后，在仓库根目录运行：

```powershell
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm tauri build --target x86_64-pc-windows-msvc --bundles nsis
```

安装包在 `src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/`。

源码使用原项目的 MIT 许可证。上游作者署名与许可保持不变。
