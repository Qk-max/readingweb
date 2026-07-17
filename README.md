# 绿森林 / 动态书影站

一个带公开浏览页面与私人内容后台的 Node.js 网站。数据保存在 `data/records.json`，无需额外安装数据库。

## 内容管理

后台支持：

- 新增、编辑与删除电影、书籍、随笔
- 填写标题、署名、评分、封面 URL、标签和正文
- 以“公开发布”开关控制是否显示在首页；关闭即为草稿

公开页始终从 `/api/records` 获取最新已发布记录，不需要改动前端代码。

## GitHub 自动备份

在服务器 `.env` 中设置 `GITHUB_TOKEN` 后，每次从后台新增、修改或删除记录，服务器会先保存本地 `data/records.json`，再自动提交同一文件到 `Qk-max/readingweb` 的 `main` 分支。Token 应使用 fine-grained personal access token，并仅授予该仓库 `Contents: Read and write` 权限。

## 部署到 VPS

服务器需要 Node.js 20 或更高版本，以及 Caddy。上传整个项目目录后：

启用服务：

## 备份

你的所有内容都在 `data/records.json`。定期备份这个文件即可；例如每日复制到 VPS 的备份目录或对象存储。
