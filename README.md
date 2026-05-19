# Secret Blocks — WordPress 插件

提供两个 Gutenberg 编辑器功能区块，用于隐藏或加密内容。

---

## 功能

### 1. 隐形遮罩文本（Rich Text 格式）

在任意段落、标题等富文本区块中选中文字，点击工具栏中的**隐形遮罩**按钮（黑色方块图标），即可将选中文字变为遮罩状态：

- **默认**：文字显示为黑色条纹（深色模式下为白色条纹），内容不可见
- **Hover 时**：遮罩渐变为半透明，文字从模糊逐渐清晰显示
- **点击后**：文字固定显示，再次点击重新遮罩
- **键盘支持**：Tab 聚焦后按 Enter 或空格可切换

也支持 `[h]...[/h]` 短代码格式（通过 Rich Text Format 实现）。

---

### 2. 加密区块（Block）

在 Gutenberg 编辑器中插入"**加密区块**"：

1. 在区块内写入要保护的内容（支持嵌套任意区块）
2. 在右侧面板的"加密设置"中输入密码（至少4位）和确认密码
3. 点击"🔒 加密此区块"按钮

加密后：
- 编辑器中显示锁定预览，内容不可见
- 前端读者看到输入框，需输入正确密码才能解密查看
- 使用 **AES-GCM + PBKDF2** 加密，浏览器原生 Web Crypto API，无第三方依赖

如需重新编辑：在右侧面板输入原密码，点击"🔓 解锁区块"。

---

## 安装

1. 将整个 `wp-secret-blocks` 文件夹上传至 WordPress 的 `wp-content/plugins/` 目录
2. 在 WordPress 后台"插件"页面中启用"**Secret Blocks**"

**目录结构：**
```
wp-secret-blocks/
├── wp-secret-blocks.php          ← 主插件文件
├── build/
│   ├── frontend.js               ← 前端解密/交互脚本
│   ├── frontend.css              ← 前端样式
│   ├── editor.css                ← 编辑器样式
│   ├── hidden-text/
│   │   └── index.js              ← 隐形文本格式注册
│   └── encrypted-block/
│       └── index.js              ← 加密区块注册
└── src/                          ← 源码（可选，供开发参考）
```

---

## 安全说明

- 加密使用 AES-256-GCM + PBKDF2（100,000 次迭代）
- 密码不以任何明文形式存储，只保存 SHA-256 哈希（加盐）用于前端验证
- 加密内容存储在 WordPress 数据库的 post_content 中（base64 编码）
- **注意**：此插件提供的是**前端访客保护**，不是服务器级别的安全加密。有数据库访问权限的用户可以看到加密数据。

---

## 要求

- WordPress 5.8+
- PHP 7.4+
- 现代浏览器（支持 Web Crypto API）

---

## 许可

GPL-2.0-or-later
