# Hylink Finance Tracker — Claude Code Guide

内部财务管理系统，用于管理营销项目的收入、支出和对账。

**Stack:** Next.js 16 App Router · TypeScript · Tailwind CSS v4 · shadcn/ui · Supabase (Postgres + Auth + Storage) · Recharts · Vercel

**Supabase Project:** `https://tqxrjuvdnlxobuqluvqd.supabase.co`

---

## CRITICAL: Next.js 16 路由保护

Next.js 16 已废弃 `middleware.ts`，本项目使用 `src/proxy.ts`（导出 `proxy` 函数，不是 `middleware`）。

```typescript
// src/proxy.ts — 正确写法
export async function proxy(request: NextRequest) { ... }
// ❌ 不要用 export { proxy as middleware }
```

---

## CRITICAL: Supabase 客户端使用规则

| 场景 | 客户端 | 原因 |
|------|--------|------|
| Server Component / Route Handler / Server Action 的 DB 查询 | `createAdmin()` (service role) | 绕过 RLS，auth.uid() 在 server-side 不可靠 |
| 获取当前登录用户 (`auth.getUser()`) | `createClient()` from `@/lib/supabase/server` | 读取 cookie session |
| Client Component | `createClient()` from `@/lib/supabase/client` | 浏览器端 |

```typescript
// ✅ 标准模式（Server Component / Action）
const supabase = await createClient()                     // auth only
const { data: { user } } = await supabase.auth.getUser()
if (!user) return { error: '未登录' }

const db = createAdmin(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
// 所有 DB 查询用 db
```

---

## CRITICAL: useActionState 签名

Server Action 必须接受 `(prevState, formData)` 两个参数：

```typescript
// ✅ 正确
export async function myAction(_prev: State, formData: FormData): Promise<State> { ... }

// ❌ 错误 — 会导致 TypeScript 编译错误
export async function myAction(formData: FormData): Promise<State> { ... }
```

---

## 用户角色

- **Controller**：完整权限（Dashboard、项目审批、付款审批、对账、品牌/用户管理）
- **Staff**：只能查看项目列表和提交付款请求，无法访问 `/admin/*` 和 `/dashboard`

路由保护在 `src/proxy.ts`，AppHeader 导航按角色显示/隐藏。

---

## 数据库表结构

### brands
`id · name · created_at`
种子数据：Zeekr、Chery、OJ

### profiles（auth.users 触发器自动创建）
`id (FK auth.users) · full_name · role (Staff|Controller) · created_at`

### projects
`id · brand_id (FK) · created_by (FK profiles) · name · type · status · estimated_revenue · project_code · notes · rejection_reason · created_at`

**status 枚举：** `Pending Approval` → `Active` → `Completed` → `Reconciled` | `Rejected`

**project_code 生成规则：** `BrandName-YYYY-MM`，重复时加 `-2`、`-3` 后缀（见 `actions/approval.ts`）

### revenues
`id · project_id (FK) · description · invoice_number · amount · status (Unpaid|Paid) · issue_date · received_date`

### expenses
`id · project_id (FK) · payee · description · invoice_number · amount · status · attachment_url · approver_id (FK profiles) · approved_at · rejection_reason · payment_date · created_at`

**expense status 枚举：** `Pending Approval` | `Approved` | `Rejected` | `Paid`

**自动审批逻辑：** amount ≤ 5000 → 直接 `Approved`；amount > 5000 → `Pending Approval`（需 Controller 审批）

---

## Supabase Storage

Bucket：`invoices`（public）

文件命名：`${projectCode || projectId}_${Date.now()}_${safeName}`

文件上传方式：Server Action 内用 `file.arrayBuffer()` → `adminClient.storage.from('invoices').upload()`

⚠️ 文件上传的 expense 表单**不能用** `useActionState`，必须用 `useTransition` + 手动 `onSubmit` 处理（见 `expense-section.tsx`）

---

## 项目结构

```
src/
  proxy.ts                          → 路由保护（Next.js 16，替代 middleware.ts）
  app/
    layout.tsx                      → Inter + Noto Sans SC 字体，metadata
    globals.css                     → Tailwind v4，品牌色彩变量
    page.tsx                        → 重定向到 /dashboard 或 /projects
    login/page.tsx                  → 邮箱+密码登录
    dashboard/
      page.tsx                      → KPI卡片 + 品牌盈利表 + 趋势图 + 待办事项
      action-items.tsx              → 待审批项目列表（Client）
      pending-expenses.tsx          → 待审批付款列表（Client）
      trend-chart.tsx               → Recharts 月度折线图（Client）
      export-button.tsx             → 导出CSV按钮（Client，调用 /api/export-projects）
    projects/
      page.tsx                      → 项目列表（Server，查询所有项目+财务汇总）
      projects-table.tsx            → 项目表格+筛选+CSV导出（Client）
      [id]/
        page.tsx                    → 项目详情（Server，查用户角色）
        revenue-section.tsx         → 收入模块（Client）
        expense-section.tsx         → 支出模块+确认付款（Client，isController prop）
        reconcile-panel.tsx         → 对账面板（Client，Controller专属）
    admin/
      users/page.tsx                → 用户列表+邀请
      brands/page.tsx               → 品牌CRUD
    api/
      export-projects/route.ts      → CSV导出 API（Controller only）
    actions/
      auth.ts                       → login, logout, inviteUser
      projects.ts                   → createProject, reconcileProject
      approval.ts                   → approveProject, rejectProject
      revenues.ts                   → addRevenue
      expenses.ts                   → createExpense, confirmPayment
      expense-approval.ts           → approveExpense, rejectExpense
      brands.ts                     → addBrand, deleteBrand
  components/
    app-header.tsx                  → 顶部导航（Server，含 NewProjectDialog）
    new-project-dialog.tsx          → 新建项目弹窗（Client，useActionState）
    ui/                             → shadcn/ui 组件
  lib/
    supabase/
      server.ts                     → createClient()（cookie-aware）
      client.ts                     → createClient()（浏览器）
  types/
    database.ts                     → Supabase 类型定义
```

---

## 品牌色彩系统

定义在 `globals.css` `:root` 中：

```css
--brand-primary: #2A4A6B;   /* 靛蓝 — 按钮、链接、主色 */
--brand-green:   #3A7D44;   /* 绿 — 收入、利润、成功 */
--brand-red:     #C0392B;   /* 红 — 支出、亏损、错误 */
--brand-amber:   #D48E00;   /* 琥珀 — 待处理状态 */
--brand-wood:    #B9A284;   /* 木色 — 装饰 */
```

Tailwind `--primary` 映射到 `#2A4A6B`（oklch格式），shadcn Button 默认样式自动跟随。

状态徽章颜色规则（所有文件统一）：
- Active → `bg-[#3A7D44]/10 text-[#3A7D44] border-[#3A7D44]/25`
- Pending Approval → `bg-[#D48E00]/10 text-[#D48E00] border-[#D48E00]/25`
- Completed → `bg-[#2A4A6B]/10 text-[#2A4A6B] border-[#2A4A6B]/25`
- Rejected → `bg-[#C0392B]/10 text-[#C0392B] border-[#C0392B]/25`
- Reconciled → `bg-gray-100 text-gray-500 border-gray-200`

---

## 已知问题和注意事项

### DB 连接
`db.tqxrjuvdnlxobuqluvqd.supabase.co` 的直连 DNS 曾出现无法解析的情况。所有 DDL migration 需在 Supabase SQL Editor 手动执行，不要依赖程序自动执行。

### Migrations 手动执行清单
1. `supabase/migrations/001_initial_schema.sql` — 初始表结构（已执行）
2. `supabase/migrations/002_phase4_schema.sql` — 添加 `Rejected` 状态 + `rejection_reason` 字段
3. `supabase/migrations/003_expense_approval.sql` — 添加 `approved_at` + `rejection_reason` 字段（expenses）

### TypeScript 注意
- Supabase `.single()` 需要显式泛型避免 `never` 类型：`.single<{ role: string }>()`
- Shadcn Select `onValueChange` 返回 `string | null`，要用 `v && setXxx(v)` 处理

---

## 部署

- **Host**: Vercel（项目根目录有 `vercel.json`）
- **DB**: Supabase `tqxrjuvdnlxobuqluvqd`
- **Env vars**（Vercel Dashboard → Settings → Environment Variables）:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`

### 创建第一个 Controller 账号
1. Supabase Dashboard → Authentication → Users → Invite user
2. 用户设置密码后，在 SQL Editor 执行：
```sql
UPDATE profiles SET role = 'Controller'
WHERE id = (SELECT id FROM auth.users WHERE email = 'your@email.com');
```

---

## 功能完成状态

| 功能 | 状态 |
|------|------|
| 邮箱登录 + 路由保护 | ✅ 完成 |
| 用户邀请 + 角色管理 | ✅ 完成 |
| 品牌 CRUD | ✅ 完成 |
| 新建项目申请 | ✅ 完成 |
| Controller 审批项目（生成项目代码）| ✅ 完成 |
| 项目列表 + 筛选 | ✅ 完成 |
| 项目详情页 | ✅ 完成 |
| 收入模块 | ✅ 完成 |
| 支出/付款请求（含文件上传）| ✅ 完成 |
| 大额支出审批（>$5000）| ✅ 完成 |
| 付款确认（Controller）| ✅ 完成 |
| 对账面板（Controller）| ✅ 完成 |
| Dashboard KPI 卡片 | ✅ 完成 |
| 品牌盈利概览表 | ✅ 完成 |
| 月度收支趋势图（Recharts）| ✅ 完成 |
| CSV 导出 | ✅ 完成 |
| 日式简约 UI 设计规范 | ✅ 完成 |
