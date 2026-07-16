# 绿森林 / 动态书影站

一个带公开浏览页面与私人内容后台的 Node.js 网站。数据保存在 `data/records.json`，无需额外安装数据库，适合 1GB 内存 VPS 的个人站点。

## 本地运行

PowerShell：

```powershell
$env:ADMIN_PASSWORD = "换成一段足够长的后台密码"
$env:PORT = "3000"
npm start
```

打开首页 `http://127.0.0.1:3000`，后台地址是 `http://127.0.0.1:3000/admin`。

## 内容管理

后台支持：

- 新增、编辑与删除电影、书籍、随笔
- 填写标题、署名、评分、封面 URL、标签和正文
- 以“公开发布”开关控制是否显示在首页；关闭即为草稿

公开页始终从 `/api/records` 获取最新已发布记录，不需要改动前端代码。

## 部署到 VPS

服务器需要 Node.js 20 或更高版本，以及 Caddy。上传整个项目目录后：

```bash
cd /var/www/afterimage
export ADMIN_PASSWORD='替换为强密码'
export PORT=3000
npm start
```

生产环境建议用 systemd 让服务常驻。创建 `/etc/systemd/system/afterimage.service`：

```ini
[Unit]
Description=Afterimage personal media archive
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/afterimage
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=ADMIN_PASSWORD=替换为强密码
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

启用服务：

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now afterimage
```

在 `/etc/caddy/Caddyfile` 中加入：

```caddy
your-domain.com {
  reverse_proxy 127.0.0.1:3000
}
```

然后执行 `sudo systemctl reload caddy`。Caddy 会自动申请和续期 HTTPS 证书。

## 备份

你的所有内容都在 `data/records.json`。定期备份这个文件即可；例如每日复制到 VPS 的备份目录或对象存储。
