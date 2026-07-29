# PeaceEdu

小马哥的从容教育网站。项目保留原有教育方向、文章内容与 Mint 主题色，站点底层使用 Ruby 4、Jekyll 4.4、Node.js 24 和基于 Minimal Mistakes 4.28 的定制主题。

站点坚持静态优先和渐进增强：文章、分类、标签与 RSS 不依赖 JavaScript；搜索优先使用 Algolia，失败时读取随站点发布的本地文章索引；AI 助手只有在用户主动点击后才加载第三方服务。

## 本地开发

推荐环境：

- Ruby 4.0（见 `.ruby-version`）
- Bundler 4
- Node.js 24（见 `.node-version` / `.nvmrc`）

安装并验证：

```bash
bundle install
npm ci
npm run site:verify
```

本地预览：

```bash
npm run site:serve
```

`site:verify` 会：

1. 重新生成浏览器脚本和 Jekyll 站点；
2. 检查内部页面与锚点链接；
3. 审计标题、主标题、canonical、sitemap、可访问名称、图片尺寸与加载策略；
4. 阻止备份、工程文档、源码脚本和遗留业务页面进入发布物；
5. 审计 npm 生产依赖的高危漏洞。

## 主要目录

- `docs/_posts`：正式文章；
- `docs/_pages`：站点级页面；
- `_most_popular`：精选内容 collection；
- `_includes` / `_layouts` / `_sass`：主题视图与样式；
- `assets/js`：浏览器端渐进增强；
- `assets/scripts` / `scripts`：构建期校验与发布工具；
- `docs/engineering`：不随站点发布的审计和实施记录。

## 第三方服务

- Google Analytics：生产环境访问统计；
- Disqus：部分文章评论；
- Algolia：远程搜索，失败时自动使用本地索引；
- Coze：用户点击后加载的可选 AI 助手；
- jsDelivr 与 YouTube：字体图标、部分图片与嵌入媒体。

涉及服务和用户选择的说明见站点的 `/terms/` 页面。部署时可通过 `ALGOLIA_SEARCH_API_KEY` 注入公开的搜索专用 key；上传索引必须使用 `ALGOLIA_ADMIN_API_KEY`，管理 key 不得进入浏览器配置。

## 本次升级边界

升级参考 [kewtgh/facereader](https://github.com/kewtgh/facereader) 的工程化和交互改进，但不引入 LEADERS 评分、DARWIN 内容、FaceReader 的视觉色系、业务定位或文章。

本轮审计和实施计划分别保存在：

- `docs/engineering/audit-2026-07-29.md`
- `docs/engineering/implementation-plan-2026-07-29.md`
