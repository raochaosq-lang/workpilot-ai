# 腾讯云开发 CloudBase 初始化说明

当前主云端方案使用腾讯云开发 CloudBase。前端只保存环境 ID、地域和 Web 安全客户端 key，不要填写腾讯云 SecretId / SecretKey。

## 需要创建的集合

可以直接复制以下列表到控制台逐个创建：

```text
profiles
interviews
history_records
transcripts
ai_summaries
uploaded_files
user_settings
```

每条业务数据都会包含：

- `id`
- `user_id`
- `created_at`
- `updated_at`

字段清单可参考 `cloudbase/collections.json`。CloudBase 是文档型数据库，不需要提前建字段，但建议按该文件保持数据结构一致，后续迁移到云函数或正式后端会更稳。

## 前端配置

普通用户的“登录 / 注册”弹窗不展示 CloudBase 技术配置。开发者本地调试时访问：

```text
http://localhost:8001/?devCloud=1
```

页面右上角会出现“开发者配置”，可填写：

- CloudBase 环境 ID，例如 `prod-xxxx` 或 `xxx-123456`，不是 `https://...` URL
- 地域，例如 `ap-shanghai`
- Web 安全客户端 key / accessKey

也可以参考根目录 `.env.example` 和 `assets/env.example.js`，用于后续接入 Vite 或线上托管。

> 注意：这里不要填写腾讯云访问密钥 SecretId / SecretKey。前端只能使用 CloudBase Web 安全客户端 key。

## 登录方式

第一版使用邮箱 + 密码登录。请在 CloudBase 控制台确认：

- 身份认证已开启
- 邮箱密码登录已开启
- Web 安全域名包含当前访问地址，例如 `http://localhost:8001`
- 邮箱密码建议 8-32 位，并同时包含字母和数字
- 注册后通常会发送验证邮件，请先完成邮箱确认再登录

## 安全规则

数据库安全规则必须保证：

- 已登录用户只能读取自己的 `user_id` 数据
- 已登录用户只能新增自己的 `user_id` 数据
- 已登录用户只能更新自己的 `user_id` 数据
- 已登录用户只能删除自己的 `user_id` 数据

CloudBase 控制台不同版本的规则编辑器语法略有差异，请按控制台当前模板配置。核心原则是：不要开放全库读写，也不要只依赖前端过滤。

可以先按以下原则配置，再用应用里的“测试云端连接”验证：

```text
CloudBase 数据库安全规则要点：
1. 只允许登录用户访问数据。
2. profiles / interviews / history_records / transcripts / ai_summaries / uploaded_files / user_settings 都必须按 user_id 隔离。
3. 新增、读取、更新、删除时，记录的 user_id 必须等于当前登录用户 ID。
4. 不要开放全库 read/write，不要依赖前端过滤。
5. Web 安全域名需要包含：http://localhost:8001。
```

如果你的控制台支持按集合配置规则，建议每个业务集合都遵循同一条权限原则：

```text
read:  登录用户存在，且记录 user_id 等于当前用户 ID
create: 登录用户存在，且写入数据 user_id 等于当前用户 ID
update: 登录用户存在，且记录 user_id 等于当前用户 ID
delete: 登录用户存在，且记录 user_id 等于当前用户 ID
```

`profiles` 集合也要隔离到本人，不要开放全部用户资料读取。

## 验证流程

更完整的本地验收清单见 `cloudbase/VERIFY.md`。

1. 创建 CloudBase 环境。
2. 启用邮箱密码登录。
3. 创建上述集合。
4. 配置安全规则。
5. 通过 `assets/env.js` 注入 CloudBase 配置；本地调试时可用 `?devCloud=1` 打开隐藏开发者配置。
6. 在“开发者配置”中依次测试初始化、Auth、邮箱登录能力和数据库权限。
7. 普通入口点击“登录 / 注册”，注册账号并完成必要的邮箱验证。
8. 登录成功后确认顶部显示“云端模式”，账号菜单展示真实邮箱和真实 User ID，不出现 `anon`。
9. 新增一条面试记录。
10. 刷新页面确认记录还在。
11. 换另一个浏览器登录同一账号，确认可以看到同一条记录。
12. 注册第二个账号，确认看不到第一个账号的数据。

## 当前同步边界

- 已同步：面试记录、转写文本、AI 复盘报告、历史记录、上传文件 metadata、非密钥模型配置。
- 仅本机保存：LLM/ASR API Key、音频原文件 Blob。
- 如果云端同步失败，本地数据会继续保留，修复配置后可重新同步或导入本地数据。
