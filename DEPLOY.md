# Hylink Finance Tracker — 从零到上线完整部署手册

> 适用场景：全新环境部署，或迁移到新 Supabase/Vercel 项目。
> 预计总耗时：30–45 分钟。

---

## 前置条件

| 工具 | 要求 | 检查命令 |
|------|------|----------|
| Node.js | ≥ 18 | `node --version` |
| npm | ≥ 9 | `npm --version` |
| Git | 任意版本 | `git --version` |
| Supabase 账号 | 免费版即可 | supabase.com |
| Vercel 账号 | 免费版即可 | vercel.com |

---

## 第一步：准备代码

### 1.1 克隆仓库（如果是新机器）

```bash
git clone <你的仓库地址>
cd hylink-finance-tracker
npm install
```

### 1.2 确认项目能本地跑起来

```bash
npm run build   # 先确认编译无错误
```

---

## 第二步：创建 Supabase 项目

### 2.1 新建项目

1. 登录 [supabase.com/dashboard](https://supabase.com/dashboard)
2. 点击 **New project**
3. 填写：
   - **Name**：`hylink-finance`（随意）
   - **Database Password**：设一个强密码并**保存好**（后面用不到，但丢了麻烦）
   - **Region**：选 `Southeast Asia (Singapore)` — 对澳洲业务延迟较低
4. 点击 **Create new project**，等待 1–2 分钟初始化完成

### 2.2 获取 API Keys

项目初始化完成后，进入 **Project Settings → API**：

| 变量名 | 位置 | 说明 |
|--------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL | 形如 `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` `public` | 以 `eyJ` 开头的长字符串 |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` | 以 `eyJ` 开头，**绝对不能暴露给前端** |

把这三个值复制备用。

---

## 第三步：执行数据库 Migration

进入 **SQL Editor → New query**，依次执行以下三个文件的内容。

> ⚠️ 必须按顺序执行，001 → 002 → 003。每次执行前确认上一条成功（右下角显示 "Success"）。

### 3.1 执行 001_initial_schema.sql

复制 `supabase/migrations/001_initial_schema.sql` 的全部内容，粘贴到 SQL Editor，点击 **Run**。

执行成功后会创建：
- 5 张表：`brands`、`projects`、`revenues`、`expenses`、`profiles`
- 4 个枚举类型
- 触发器：新用户注册时自动创建 profile（默认 Staff 角色）
- RLS 策略
- 种子数据：Zeekr、Chery、OJ 三个品牌

**验证**：进入 **Table Editor**，确认能看到这 5 张表，`brands` 表有 3 条记录。

### 3.2 执行 002_phase4_schema.sql

```sql
ALTER TYPE project_status ADD VALUE IF NOT EXISTS 'Rejected';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
```

### 3.3 执行 003_expense_approval.sql

```sql
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
```

---

## 第四步：配置 Supabase Storage

### 4.1 创建 invoices bucket

1. 进入 **Storage → New bucket**
2. 填写：
   - **Bucket name**：`invoices`
   - **Public bucket**：✅ 开启（允许公开访问附件 URL）
3. 点击 **Save**

### 4.2 设置 Storage 上传权限

进入 **Storage → Policies → invoices bucket**，点击 **New policy → For full customization**：

**Policy 1：允许登录用户上传**

```sql
-- Policy name: Allow authenticated uploads
-- Allowed operation: INSERT
-- Target roles: authenticated

(bucket_id = 'invoices')
```

**Policy 2：允许所有人读取（因为是 public bucket，可以跳过，或者明确添加）**

如果上传后附件 URL 无法访问，在 SQL Editor 执行：

```sql
CREATE POLICY "Public read invoices"
ON storage.objects FOR SELECT
USING (bucket_id = 'invoices');

CREATE POLICY "Authenticated upload invoices"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'invoices');
```

---

## 第五步：配置 Supabase Auth

### 5.1 关闭邮箱确认（内部系统推荐）

进入 **Authentication → Settings → Email**：

- **Confirm email**：关闭 ✅（否则邀请用户还需要额外点确认链接）

> 如果需要保留邮件确认，则邀请用户后需要在 SQL Editor 手动确认：
> ```sql
> UPDATE auth.users SET email_confirmed_at = NOW()
> WHERE email = 'user@example.com';
> ```

### 5.2 配置 Site URL（重要！）

进入 **Authentication → URL Configuration**：

- **Site URL**：填写你的 Vercel 域名，例如 `https://hylink-finance.vercel.app`
- **Redirect URLs**：添加同一个域名

> ⚠️ 如果 Site URL 不正确，邀请邮件中的链接会跳转到错误地址，用户无法设置密码。
> 先填 `http://localhost:3000` 用于本地测试，上线后改成 Vercel 域名。

---

## 第六步：本地环境变量配置

在项目根目录创建 `.env.local`：

```bash
# Supabase — 从 Project Settings → API 获取
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...（anon key）
SUPABASE_SERVICE_ROLE_KEY=eyJ...（service_role key，绝不提交到 git）
```

> `.env.local` 已在 `.gitignore` 中，不会被提交。

### 6.1 本地测试

```bash
npm run dev
```

打开 `http://localhost:3000`，应该跳转到 `/login` 页面。

---

## 第七步：创建第一个 Controller 账号

### 7.1 在 Supabase 创建用户

进入 **Authentication → Users → Invite user**：

- 填写管理员邮箱（如 `controller@hylink.com.au`）
- 点击 **Send invitation**

用户会收到一封邮件，点击链接后设置密码。

### 7.2 提升为 Controller 角色

用户设置密码后，在 **SQL Editor** 执行：

```sql
-- 将指定邮箱的用户提升为 Controller
UPDATE profiles
SET role = 'Controller'
WHERE id = (
  SELECT id FROM auth.users
  WHERE email = 'controller@hylink.com.au'
);

-- 验证
SELECT u.email, p.full_name, p.role
FROM profiles p
JOIN auth.users u ON p.id = u.id;
```

### 7.3 验证登录

用 Controller 邮箱登录，确认能看到 Dashboard、用户管理、品牌管理等菜单。

---

## 第八步：部署到 Vercel

### 8.1 安装 Vercel CLI

```bash
npm install -g vercel
```

### 8.2 登录 Vercel

```bash
vercel login
```

会打开浏览器，选择登录方式（GitHub/邮箱均可）。

### 8.3 首次部署

在项目目录内执行：

```bash
cd /Users/jeffreywang/Documents/Programs/hylink-finance-tracker
vercel
```

交互式配置（第一次会问几个问题）：

```
? Set up and deploy? › Yes
? Which scope? › 选你的账号
? Link to existing project? › No（全新项目选 No）
? What's your project's name? › hylink-finance-tracker
? In which directory is your code located? › ./（直接回车）
? Want to modify these settings? › No
```

### 8.4 配置 Vercel 环境变量

**方法一：命令行（推荐）**

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
# 粘贴值后回车，选择 Production + Preview + Development

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
# 同上

vercel env add SUPABASE_SERVICE_ROLE_KEY
# 同上，这个只选 Production + Preview（不需要开发环境）
```

**方法二：Vercel Dashboard**

进入 [vercel.com/dashboard](https://vercel.com/dashboard) → 你的项目 → **Settings → Environment Variables**，逐个添加三个变量。

### 8.5 正式生产部署

```bash
vercel --prod
```

部署完成后会输出生产 URL，形如：
```
✅ Production: https://hylink-finance-tracker.vercel.app
```

### 8.6 更新 Supabase Site URL

拿到 Vercel 域名后，回到 **Supabase → Authentication → URL Configuration**：

- **Site URL** 改为：`https://hylink-finance-tracker.vercel.app`
- **Redirect URLs** 添加同一地址

---

## 第九步：验证上线

按以下清单逐项验证：

### 基础功能
- [ ] 访问域名自动跳转到 `/login`
- [ ] Controller 账号可以正常登录
- [ ] 登录后看到 Dashboard 页面

### 项目流程
- [ ] Controller 可以在 **品牌管理** 看到 Zeekr/Chery/OJ
- [ ] 点击右上角 **+ 新建项目** 可以提交项目申请
- [ ] Dashboard 的待办事项显示刚才的申请
- [ ] 点击 **批准** 生成项目代码（格式：`品牌-YYYY-MM`）
- [ ] 在 **项目列表** 可以看到已批准的项目

### 支出流程
- [ ] 进入项目详情，点击 **+ 发起付款请求**
- [ ] 上传一个测试 PDF/图片，提交成功
- [ ] 附件 URL 可以正常访问（Storage 配置正确）
- [ ] 金额 ≤ 5000 的支出直接变为 Approved
- [ ] 金额 > 5000 的支出出现在 Dashboard 待审批

### CSV 导出
- [ ] 项目列表页点击 **导出 CSV** 下载文件
- [ ] 用 Excel/Numbers 打开，中文显示正常（有 BOM 头）

---

## 日常运维

### 邀请新员工

1. **Supabase → Authentication → Users → Invite user** 填写邮箱
2. 员工收到邮件，点击链接设置密码
3. 默认角色为 **Staff**；如需 Controller 权限执行 SQL：
   ```sql
   UPDATE profiles SET role = 'Controller'
   WHERE id = (SELECT id FROM auth.users WHERE email = 'new@hylink.com.au');
   ```

### 日常代码更新部署

```bash
# 本地改完代码后
git add .
git commit -m "feat: xxx"
git push

# 方法一：Vercel 已关联 GitHub 时自动部署（推荐）
# 方法二：手动部署
vercel --prod
```

### 查看生产日志

```bash
vercel logs
```

或在 Vercel Dashboard → 项目 → **Deployments → 选最新部署 → Functions** 查看实时日志。

### 数据库备份

Supabase 免费版每天自动备份，保留 7 天。Pro 版保留 30 天。
手动备份：**Project Settings → Database → Backups → Download**

---

## 常见问题排查

### ❌ 登录后跳转到空白页 / 无限跳转
- 检查 Supabase Auth → URL Configuration → Site URL 是否和当前域名一致

### ❌ 附件上传成功但 URL 打不开（403）
- 检查 Storage → invoices bucket → 是否设置为 Public
- 检查 Storage → Policies 是否有读取策略

### ❌ 审批/付款等操作提示"未登录"或"无权限"
- 检查 `SUPABASE_SERVICE_ROLE_KEY` 环境变量是否正确填写（Vercel → Settings → Env Vars）
- service_role key 以 `eyJ` 开头，不是 URL

### ❌ 邀请邮件发出但用户点链接报错
- 检查 Supabase → Auth Settings → Confirm email 是否关闭
- 或手动在 SQL Editor 确认邮箱：
  ```sql
  UPDATE auth.users SET email_confirmed_at = NOW()
  WHERE email = 'user@example.com';
  ```

### ❌ Vercel 构建失败（Build Error）
```bash
# 本地先验证构建
npm run build

# 查看具体报错
vercel logs --since 1h
```

### ❌ 中文字体未生效
- `NEXT_PUBLIC_SUPABASE_URL` 等变量检查是否所有环境都设置了（Production + Preview + Development）
- Vercel 修改环境变量后需要重新部署才生效：`vercel --prod`

---

## 环境变量完整清单

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | anon/public key（`eyJ`开头） |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | service_role key（`eyJ`开头，保密） |

共 3 个，缺一不可。
