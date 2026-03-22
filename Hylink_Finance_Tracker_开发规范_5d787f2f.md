# Hylink Finance Tracker — 全面开发规范

> 本文档整合了 UI/UX 改进建议（参考 Orb 平台设计）、新功能开发（付款邮件 + 报销系统）、
> 以及现有系统优化方案。请交给 Claude Code 按优先级依次实施。

---

## 目录

1. [全局 UI/UX 改进（参考 Orb 设计）](#1-全局-uiux-改进参考-orb-设计)
2. [Dashboard 重建](#2-dashboard-重建)
3. [项目管理增强](#3-项目管理增强)
4. [支出管理与付款邮件系统](#4-支出管理与付款邮件系统)
5. [报销系统（Reimbursement）](#5-报销系统reimbursement)
6. [报表中心增强](#6-报表中心增强)
7. [管理后台增强](#7-管理后台增强)
8. [导航栏重构](#8-导航栏重构)
9. [数据库变更汇总](#9-数据库变更汇总)
10. [实施计划](#10-实施计划)

---

## 1. 全局 UI/UX 改进（参考 Orb 设计）

### 1.1 侧边栏导航（替换顶部导航）

**现状问题：** 当前使用顶部导航栏，菜单项挤在一行，"管理后台"需要下拉展开，层级不清晰。

**改进方案：** 参考 Orb 的深色侧边栏导航设计。

```
实现要求：
- 左侧固定侧边栏，宽度 220px，深色背景（#1a202c 或 #1e293b）
- 顶部显示 Hylink Finance Logo（白色）
- 导航项带图标 + 文字，选中态有高亮背景色
- 支持折叠子菜单（如"管理后台"下的子项）
- 底部显示当前用户头像 + 姓名 + 角色标签
- 响应式：移动端变为汉堡菜单抽屉
- 导航项之间用分隔线区分功能区域

导航结构：
├── 🏠 Dashboard
├── 📁 项目管理
├── 💰 支出管理          ← 新增独立菜单
├── 📧 付款管理          ← 新增（付款邮件功能）
├── 🧾 报销管理          ← 新增（报销系统）
├── 📊 报表中心
├── ─────────────
├── 👥 用户管理          ← 仅 Admin/Controller 可见
├── 🏷️ 品牌管理          ← 仅 Admin/Controller 可见
├── ⚙️ 系统设置          ← 仅 Admin/Controller 可见
├── ─────────────
└── 👤 Yan Zhuang [Super Admin]
```

### 1.2 表格设计统一升级

**参考 Orb 的表格设计：** 简洁、信息密度高、行间距适中。

```
实现要求：
- 表头：大写字母、灰色小字、无背景色（参考 Orb 的 INVOICE DATE / AMOUNT / STATUS 风格）
- 行高：48-52px，不需要斑马纹，hover 时浅灰背景
- 状态标签：使用圆角 pill 样式
  - Draft: 灰色边框标签
  - Active/进行中: 绿色填充标签
  - Pending: 黄色/橙色标签
  - Approved: 蓝色标签
  - Paid: 绿色标签
  - Overdue: 红色标签
  - Rejected: 红色边框标签
- 每行末尾可加 ⋮ 更多操作按钮（三点菜单）
- 表格支持列排序（点击表头切换升降序）
- Checkbox 列用于批量操作
- 分页信息：底部显示 "Showing 1 to 20 of 156"
```

### 1.3 筛选器设计

**参考 Orb 的筛选器：** 简洁的下拉选择 + Filter 按钮带数字角标。

```
实现要求：
- 筛选区域在表格上方，一行排列
- 下拉选择器：白色背景、灰色边框、右侧有 ⌄ 箭头
- "Filters" 按钮：点击展开高级筛选面板，带角标显示活跃筛选数量（如 "Filters 2"）
- 搜索框：右侧放置，placeholder 如 "Search by project or supplier..."
- 所有筛选器变化即时生效（不需要点"搜索"按钮）
- URL 参数同步（筛选状态可分享/书签）
```

### 1.4 页面标题与操作按钮

```
实现要求：
- 页面标题：左上角，大字号（24px），加粗
- 主操作按钮：右上角，深色填充（如 Orb 的 "+ New invoice" 按钮风格）
  - 主按钮深蓝/深色背景 + 白色文字
  - 可带下拉箭头（▾）展示更多操作
- 返回按钮：详情页左上角 "< 返回" 链接
- 面包屑：复杂层级时使用（如 项目 > Zeekr > 支出详情）
```

### 1.5 详情页布局

**参考 Orb 的发票详情页：** 左右分栏、信息层次清晰。

```
实现要求：
- 顶部：返回按钮 + 标题 + 状态标签 + 操作按钮
- 左侧主区域（约 60%）：核心数据、图表、明细列表
- 右侧信息卡片（约 40%）：元数据信息（日期、关联方、金额等）
- 信息卡片内用 label: value 格式，label 灰色小字，value 黑色正常字
- Tab 切换：用于同一页面不同视图（如 Usage | Timeline）
```

### 1.6 卡片组件

```
实现要求：
- KPI 卡片：白色背景、细边框或阴影、圆角 8px
  - 标题灰色小字（如"预估总收入"）
  - 数值大字号加粗（如 "A$30,814"）
  - 可选：趋势箭头、百分比变化、迷你折线图
- 信息卡片：与 KPI 卡片样式一致，用于分组展示信息
```

### 1.7 颜色体系统一

```
色板定义：
- Primary: #1e40af (深蓝) → 主按钮、链接、选中态
- Secondary: #475569 → 次要文字、图标
- Success: #16a34a → Paid、Active、已完成
- Warning: #f59e0b → Pending、即将到期
- Danger: #dc2626 → Rejected、Overdue、负利润
- Info: #2563eb → Approved、信息提示
- Background: #f8fafc → 页面背景
- Card: #ffffff → 卡片背景
- Border: #e2e8f0 → 边框、分隔线
- Text Primary: #0f172a
- Text Secondary: #64748b
- Text Muted: #94a3b8
```

### 1.8 Toast 通知与确认对话框

```
实现要求：
- Toast: 右上角弹出，3秒自动消失
  - 成功：绿色左边框
  - 错误：红色左边框
  - 信息：蓝色左边框
- 确认对话框：居中模态框
  - 标题 + 描述 + 取消/确认按钮
  - 危险操作用红色确认按钮
```

---

## 2. Dashboard 重建

**现状问题：** Dashboard 当前直接跳转到项目列表，没有独立的 Dashboard 页面。

**改进方案：** 参考 Orb 的 Home 页面，创建信息密集的 Dashboard。

### 2.1 顶部 KPI 卡片区（4列）

```
布局：4 个等宽 KPI 卡片，一行排列

卡片 1: 本月收入
- 标题: "本月实际收入"
- 数值: A$XX,XXX（绿色）
- 副标题: 较上月 +XX% ↑ / -XX% ↓

卡片 2: 本月支出
- 标题: "本月实际支出"
- 数值: A$XX,XXX（红色）
- 副标题: 较上月 +XX% ↑ / -XX% ↓

卡片 3: 本月利润
- 标题: "本月利润"
- 数值: A$XX,XXX
- 副标题: 毛利率 XX.X%

卡片 4: 待处理事项
- 标题: "待处理"
- 数值: X 项
- 副标题: X 待审批 | X 待付款
```

### 2.2 中部图表区

```
左侧（60%）：月度收入/支出趋势图
- 折线图或柱状图
- X 轴: 最近 6-12 个月
- Y 轴: 金额
- 双线: 收入（绿色）+ 支出（红色）
- 右上角时间范围选择器: "Last 6 months" / "This year" / "Last year"
- 使用 Recharts 或 Chart.js 实现

右侧（40%）：品牌收入占比
- 环形图 或 水平条形图
- 显示各品牌收入占比
- 点击可跳转到该品牌的项目筛选
```

### 2.3 底部信息列表区（3列，参考 Orb Dashboard 布局）

```
左侧卡片: "按品牌收入"
- 类似 Orb 的 "Billings by plan"
- 列表显示各品牌本月收入
- 每项带水平进度条
- 点击跳转品牌筛选

中间卡片: "最近项目动态"
- 最近 5 条项目变动
- 如: "Zeekr Social Retainer 新增支出 A$500"
- 带时间戳

右侧卡片: "待处理事项"（参考 Orb 的 Invoices 区域）
- 分组显示:
  - 待审批 (X): 列表显示待审批的支出/报销
  - 待付款 - 已过期 (X): 红色，显示 overdue 天数
  - 待付款 - 即将到期 (X): 橙色
- 每项可点击直接跳转
- 底部 "See all X >" 链接
```

### 2.4 Dashboard 数据查询

```sql
-- KPI 数据
SELECT
  SUM(CASE WHEN type = 'income' THEN amount END) as monthly_income,
  SUM(CASE WHEN type = 'expense' THEN amount END) as monthly_expense
FROM transactions
WHERE date_trunc('month', date) = date_trunc('month', CURRENT_DATE);

-- 待处理事项
SELECT status, COUNT(*)
FROM expenses
WHERE status IN ('pending_approval', 'approved')
GROUP BY status;

SELECT status, COUNT(*)
FROM reimbursements
WHERE status IN ('pending')
GROUP BY status;
```

---

## 3. 项目管理增强

### 3.1 项目详情页重构

**现状：** 项目详情页信息布局简单，缺少可视化。

```
改进方案：
- 顶部：项目名称 + 状态标签 + 品牌 + 项目代码
- 左右分栏：
  - 左侧：项目基本信息卡片（类型、日期范围、负责人）
  - 右侧：财务汇总卡片（预估收入、实际收入、实际支出、利润、利润率）
- 中间 Tab 切换：
  - "收入" Tab: 收入明细列表
  - "支出" Tab: 支出明细列表（带付款状态、Due Date）
  - "时间线" Tab: 项目操作日志（创建、审批、付款等事件）
- 底部：备注区域
```

### 3.2 项目列表页优化

```
改进要求：
- 顶部 Tab: "全部 | 进行中 | 已完成 | 已归档"
- KPI 卡片保留但样式升级（参考 1.6）
- 表格样式升级（参考 1.2）
- 新增列: "利润率" 显示为进度条样式（绿色=正、红色=负）
- 支持行点击进入详情页
```

---

## 4. 支出管理与付款邮件系统

### 4.1 业务背景

```
核心规则：
- 公司付款日为每月 15 号和 30 号
- PM 提交支出 → Controller 审批 → Approved 后进入待付款队列
- Controller 根据 Supplier 的 Payment Terms（付款周期）判断到期时间
- 每个付款日前，Controller 手动筛选到期/即将到期的支出
- 批量选择后发送付款邮件给会计
- 会计收到邮件（含发票附件）完成付款后在系统标记 Paid
- 不需要审批通过后自动发送邮件
```

### 4.2 支出列表页（独立页面 /expenses）

```
页面结构：
- 标题: "支出管理"
- 右上角: "+ 新增支出" 按钮
- Tab 切换: "全部 | 待审批 | 待付款 | 已付款"

"待付款" Tab 特殊功能：
- 仅显示 status = 'approved' 的支出
- 默认按 Due Date 升序排列（最紧急的在最上面）
- 表格左侧有 Checkbox 列
- 表格列:
  | ☐ | 项目 | 品牌 | Supplier | 发票号 | 金额 | Due Date | 到期状态 | 邮件状态 | 操作 |
- "到期状态" 列:
  - 红色 pill "Overdue X天": Due Date < 今天
  - 橙色 pill "X天后到期": Due Date 在 7 天内
  - 无标签: Due Date > 7 天后
  - 灰色 "未设置": 无 Due Date
- "邮件状态" 列:
  - 未发送: 无标签
  - 已发送: ✉ 图标 + 日期（如 "已发送 3/15"）
- 顶部浮动操作栏（选中 Checkbox 后出现）:
  - "已选 X 项 | 总金额 A$XX,XXX | [📧 发送付款邮件]"

筛选器:
- 品牌（下拉）
- Supplier（下拉）
- 到期状态: "全部 | 已过期 | 即将到期 | 正常"
- 月份范围
```

### 4.3 Supplier 付款周期（Payment Terms）

```
Supplier 管理页增加字段：
- "默认付款周期" 下拉选择:
  - Due on Receipt (即时)
  - Net 7 (7天)
  - Net 14 (14天)
  - Net 30 (30天) ← 默认
  - Net 60 (60天)
  - EOM + 30 (月结30天)
  - Custom (自定义天数)
- "自定义天数" 输入框（仅 Custom 时显示）

支出创建时：
- 选择 Supplier 后自动带入 Payment Terms
- 根据发票日期 + Payment Terms 自动计算 Due Date
- Due Date 可手动覆盖修改

Due Date 计算逻辑：
  if payment_terms == 'due_on_receipt':
    due_date = invoice_date
  elif payment_terms == 'eom_30':
    due_date = end_of_month(invoice_date) + 30 days
  elif payment_terms == 'custom':
    due_date = invoice_date + custom_days
  else:
    due_date = invoice_date + terms_days  # net_7=7, net_14=14, net_30=30, net_60=60
```

### 4.4 批量付款邮件

```
发送流程：
1. Controller 在"待付款"Tab 勾选需要付款的支出
2. 点击"发送付款邮件"按钮
3. 弹出邮件确认弹窗 (Dialog):
   ┌─────────────────────────────────────────────────┐
   │ 发送付款通知邮件                              ✕ │
   │                                                 │
   │ 已选 3 项，总计 A$12,500.00                     │
   │                                                 │
   │ ┌─── 已选支出 ────────────────────────────┐    │
   │ │ 1. Zeekr Social - ABC Media - A$5,000   │    │
   │ │    Due: Mar 30, 2026 (即将到期)          │    │
   │ │ 2. OJ Event - XYZ Print - A$3,500       │    │
   │ │    Due: Mar 25, 2026 (Overdue 2天)       │    │
   │ │ 3. Zeekr Social - DEF Photo - A$4,000   │    │
   │ │    Due: Apr 5, 2026                      │    │
   │ └────────────────────────────────────────────┘  │
   │                                                 │
   │ 收件人 (To): [acc@hylink.com.au] [+]            │
   │ 抄送 (CC):   [yan.zhuang@hylink.com] [+]        │
   │ 备注:        [可选填备注...]                     │
   │                                                 │
   │              [取消]  [📧 确认发送 3 项]          │
   └─────────────────────────────────────────────────┘

4. 确认后调用 Edge Function 发送邮件
5. 发送成功: 绿色 Toast "邮件发送成功"
6. 发送失败: 红色 Toast + 显示重试按钮

单条发送：
- 支出表格操作列的 "📧" 按钮
- 弹出简化版确认弹窗（只显示单条支出信息）
- 已发送过的显示"重新发送"
```

### 4.5 邮件收件人配置

```
位置: 系统设置 (/settings) → "付款邮件" Tab

配置项:
- 默认收件人 (To): Tag Input，支持添加多个邮箱
- 默认抄送 (CC): Tag Input，支持添加多个邮箱
- 发件人显示名称: 文本输入框，默认 "Hylink Finance Tracker"
- 付款完成后发确认邮件: 开关（默认关闭）

说明:
- 发送时弹窗中预填这些默认值，Controller 可临时修改
- 全局配置，所有品牌共用
```

### 4.6 邮件内容模板

```
批量付款邮件:
主题: [Hylink] Payment Request - {date} - {count} items - Total A${total}

正文 (HTML):
- 蓝色主题 header，Hylink logo
- 标题: "Payment Request"
- 表格:
  | # | Project | Supplier | Invoice No. | Amount | Due Date |
  | 1 | ...     | ...      | ...         | ...    | ...      |
  总计: A$XX,XXX
- 附件说明: "Please find {count} invoice attachments."
- 按钮: "View in System" (链接到支出列表)
- Footer: Hylink Australia | Automated message from Hylink Finance Tracker

单条付款邮件:
主题: [Hylink] Payment Request - {project} - {supplier} - A${amount}
正文: 单条支出详细信息

报销打款邮件:
主题: [Hylink] Reimbursement Request - {count} items - Total A${total}
正文: 报销明细表格 + 收款账户信息
```

### 4.7 后端实现

```
技术栈: Supabase Edge Function + Resend API

Edge Function: send-payment-email
路径: supabase/functions/send-payment-email/index.ts

请求参数:
{
  "expense_ids": ["uuid1", "uuid2", ...],  // 或 reimbursement_ids
  "type": "payment" | "reimbursement",
  "to_emails": ["acc@hylink.com.au"],
  "cc_emails": ["yan.zhuang@hylink.com"],
  "note": "可选备注"
}

逻辑:
1. 验证调用者权限（必须是 Controller 或 Super Admin）
2. 查询所有选中的 expense/reimbursement 记录 + 关联信息
3. 从 Supabase Storage 下载所有发票/凭证文件
4. 使用 HTML 模板生成邮件正文
5. 调用 Resend API 发送邮件（带附件）
6. 为每条记录写入 email_logs
7. 更新每条记录的 last_email_sent_at 和 email_sent_count
8. 返回发送结果

环境变量:
- RESEND_API_KEY: Resend API 密钥
- SENDER_EMAIL: 发件邮箱（如 finance@hylink.com.au）

依赖: npm install resend
```

---

## 5. 报销系统（Reimbursement）

### 5.1 业务流程

```
完整流程:
员工提交报销申请（填写表单 + 上传凭证）
    ↓
主管/Controller 审批（批准 / 驳回 / 要求补充材料）
    ↓
审批通过 → 状态变为 Approved，进入"待打款"队列
    ↓
Controller 手动选择已批准的报销 → 批量发送邮件给会计
    ↓
会计完成打款 → 在系统中标记 Paid → 通知申请人

报销状态:
- Draft (草稿): 员工尚未提交
- Pending (待审批): 已提交，等待主管审批
- Needs Info (需补充): 审批人要求补充材料或信息
- Approved (已批准): 审批通过，等待会计打款
- Paid (已报销): 会计已完成打款
- Rejected (已驳回): 审批未通过
```

### 5.2 报销列表页 (/reimbursements)

```
页面结构:
- 标题: "报销管理"
- 右上角: "+ 新建报销" 按钮（所有员工可见）
- Tab 切换: "全部 | 待审批 | 已批准(待打款) | 已报销 | 已驳回"

"已批准(待打款)" Tab:
- 仅 Controller/Admin 可见此 Tab
- 类似支出管理的"待付款"Tab，支持 Checkbox 批量选择
- 顶部浮动操作栏: "已选 X 项 | 总金额 A$XX,XXX | [📧 发送报销邮件]"
- 发送邮件复用付款邮件弹窗组件

表格列:
| ☐ | 报销编号 | 申请人 | 标题 | 类型 | 关联项目 | 金额 | 状态 | 申请日期 | 操作 |

筛选器:
- 状态（下拉）
- 类型（下拉）
- 申请人（下拉，仅 Controller/Admin 显示）
- 日期范围

权限:
- 普通员工（PM/Viewer）: 只能看到自己提交的报销
- Controller: 可看到所有报销，可审批
- Super Admin: 全部权限
```

### 5.3 新建报销表单 (Dialog)

```
表单字段:
┌───────────────────────────────────────────────────┐
│ 新建报销申请                                    ✕ │
│                                                   │
│ 报销标题 *        [3月客户招待餐费              ] │
│                                                   │
│ 报销类型 *        [▼ 餐饮招待                   ] │
│   选项: 差旅 / 交通 / 餐饮招待 / 办公用品 / 其他 │
│                                                   │
│ 关联项目          [▼ 可选择（也可不关联）        ] │
│                                                   │
│ 报销金额 (AUD) *  [          150.00              ] │
│                                                   │
│ 发生日期 *        [  03/15/2026                  ] │
│                                                   │
│ 凭证附件 *        [📎 点击上传或拖拽文件]         │
│                   支持 PDF/JPG/PNG, 单文件 ≤10MB  │
│                   最多 5 个文件                    │
│                   [receipt1.jpg ✕] [receipt2.pdf ✕]│
│                                                   │
│ 备注说明          [                               ] │
│                   [                               ] │
│                                                   │
│ 收款账户信息 *                                    │
│   BSB:            [   062-000                    ] │
│   Account Number: [   1234 5678                  ] │
│   Account Name:   [   Yan Zhuang                 ] │
│   (💡 可在个人资料页预先保存，自动带入)           │
│                                                   │
│        [保存草稿]  [取消]  [提交报销申请]         │
└───────────────────────────────────────────────────┘

文件上传:
- 使用 Supabase Storage
- Bucket: receipts
- 路径: receipts/{user_id}/{reimbursement_id}/{filename}
- 上传后预览缩略图（图片）或文件名（PDF）
```

### 5.4 报销详情页 (/reimbursements/[id])

```
页面结构:

顶部:
- "< 返回报销列表" 链接
- 报销编号 (如 RB-2026-015) + 状态标签

左侧主区域:
- 报销信息卡片:
  - 标题、类型、金额、发生日期、关联项目
  - 备注说明
- 凭证附件展示:
  - 图片: 缩略图网格，可点击放大 (Lightbox)
  - PDF: 内嵌预览或下载链接
- 审批记录时间线:
  - 📝 2026-03-15 10:30 Yan Zhuang 提交了报销申请
  - ✅ 2026-03-16 14:20 Controller 审批通过
  - 📧 2026-03-16 14:21 付款邮件已发送给 acc@hylink.com.au
  - 💰 2026-03-17 09:00 会计已完成打款

右侧信息卡片:
- 申请人: 姓名 + 邮箱
- 金额: A$150.00
- 收款账户: BSB 062-000 / Acc ****5678 (部分脱敏)
- 审批人: Controller 姓名
- 审批意见: "通过"

审批操作区（仅审批人可见，仅 Pending/Needs Info 状态）:
┌─────────────────────────────────────┐
│  [✅ 批准]  [❌ 驳回]  [📋 补充材料]  │
│                                     │
│  审批意见: [                       ] │
│  (驳回/补充材料时必填)              │
└─────────────────────────────────────┘
```

### 5.5 个人资料页扩展

```
在 /profile 页面增加"收款账户信息"区域:
- BSB
- Account Number
- Account Name
- 保存后，新建报销时自动带入
```

---

## 6. 报表中心增强

**参考 Orb 的 Reports 页面：** 多种报表类型 + 图表 + 导出。

### 6.1 报表页面重构

```
页面结构:
- 标题: "报表中心"
- Tab: "概览 | 收入报表 | 支出报表 | 利润报表 | 导出历史"

"概览" Tab (参考 Orb Reports):
- 顶部 2 个图表卡片并排:
  - 左: "月度收入" 柱状图 + 时间范围选择
  - 右: "月度支出" 柱状图 + 时间范围选择
- 下方: "全部报表" 列表
  - 每行: 报表名称(蓝色链接) + 描述
  - 如:
    - 品牌收入报表 - 按品牌统计收入、支出、利润
    - 项目利润报表 - 按项目统计利润率
    - Supplier 支出报表 - 按 Supplier 统计支出
    - 月度对比报表 - 月度收支对比
    - 报销统计报表 - 按类型、员工统计报销

"导出历史" Tab (参考 Orb Export history):
- 记录每次报表导出操作
- 列: 报表名称 | 时间范围 | 导出格式 | 导出时间 | 下载链接
```

---

## 7. 管理后台增强

### 7.1 系统设置页重构

**参考 Orb Settings 页面：** 使用 Tab 分组。

```
页面结构:
- 标题: "系统设置"
- Tab: "常规 | 付款邮件 | 审批流程 | 品牌管理 | 用户管理"

"常规" Tab:
- 公司信息: 公司名称、地址
- 默认币种: AUD
- 时区设置: 默认 Australia/Sydney

"付款邮件" Tab:
- 默认收件人 (会计邮箱): Tag Input
- 默认抄送: Tag Input
- 发件人显示名称: 默认 "Hylink Finance Tracker"
- 邮件发送日志: 最近 20 条发送记录
  | 时间 | 类型 | 收件人 | 主题 | 状态 | 操作 |

"审批流程" Tab:
- 支出审批: 金额阈值设置（如 > A$5000 需要额外审批）
- 报销审批: 自动分配审批人规则

"品牌管理" Tab:
- 品牌列表（移到设置里）

"用户管理" Tab:
- 用户列表（移到设置里）
```

---

## 8. 导航栏重构

### 最终导航结构

```jsx
// 侧边栏导航组件结构
const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: '项目管理', href: '/projects', icon: FolderIcon },
  { name: '支出管理', href: '/expenses', icon: CreditCardIcon },
  { name: '付款管理', href: '/payments', icon: MailIcon,
    badge: overdueCount > 0 ? overdueCount : null },  // 显示过期数量角标
  { name: '报销管理', href: '/reimbursements', icon: ReceiptIcon,
    badge: pendingReimbursementCount > 0 ? pendingReimbursementCount : null },
  { name: '报表中心', href: '/reports', icon: ChartBarIcon },
  // 分隔线
  { type: 'separator' },
  // 以下仅 Controller/Admin 可见
  { name: '系统设置', href: '/settings', icon: CogIcon, adminOnly: true },
];
```

---

## 9. 数据库变更汇总

### 9.1 新增表

```sql
-- 邮件配置表
CREATE TABLE email_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  -- 例: 'default_to', 'default_cc', 'sender_name'
  setting_value JSONB NOT NULL,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 邮件发送日志表
CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID REFERENCES expenses(id),          -- 可为 null
  reimbursement_id UUID REFERENCES reimbursements(id), -- 可为 null
  email_type TEXT NOT NULL,
  -- 'payment_batch' | 'payment_single' | 'reimbursement_batch' | 'payment_paid'
  to_emails TEXT[] NOT NULL,
  cc_emails TEXT[],
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  -- 'pending' | 'sent' | 'failed'
  error_message TEXT,
  sent_by UUID REFERENCES users(id) NOT NULL,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 报销申请表
CREATE TABLE reimbursements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reimbursement_no TEXT UNIQUE NOT NULL,
  -- 自动生成: RB-2026-001
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  -- 'travel' | 'transport' | 'dining' | 'office' | 'other'
  project_id UUID REFERENCES projects(id),  -- nullable
  amount NUMERIC(12,2) NOT NULL,
  expense_date DATE NOT NULL,
  description TEXT,
  receipt_urls TEXT[] NOT NULL DEFAULT '{}',
  bank_bsb TEXT NOT NULL,
  bank_account TEXT NOT NULL,
  bank_account_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  -- 'draft' | 'pending' | 'needs_info' | 'approved' | 'paid' | 'rejected'
  submitted_by UUID REFERENCES users(id) NOT NULL,
  submitted_at TIMESTAMPTZ,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  approval_comment TEXT,
  paid_at TIMESTAMPTZ,
  paid_by UUID REFERENCES users(id),
  last_email_sent_at TIMESTAMPTZ,
  email_sent_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS 策略
ALTER TABLE reimbursements ENABLE ROW LEVEL SECURITY;

-- 员工只能看到自己的报销
CREATE POLICY "Users can view own reimbursements"
  ON reimbursements FOR SELECT
  USING (submitted_by = auth.uid() OR
         EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('controller', 'super_admin')));

-- 员工只能编辑自己的草稿/需补充状态的报销
CREATE POLICY "Users can update own draft reimbursements"
  ON reimbursements FOR UPDATE
  USING (submitted_by = auth.uid() AND status IN ('draft', 'needs_info'));

-- 报销编号生成函数
CREATE OR REPLACE FUNCTION generate_reimbursement_no()
RETURNS TRIGGER AS $$
DECLARE
  year_str TEXT;
  next_num INTEGER;
BEGIN
  year_str := to_char(CURRENT_DATE, 'YYYY');
  SELECT COALESCE(MAX(
    CAST(SPLIT_PART(reimbursement_no, '-', 3) AS INTEGER)
  ), 0) + 1 INTO next_num
  FROM reimbursements
  WHERE reimbursement_no LIKE 'RB-' || year_str || '-%';

  NEW.reimbursement_no := 'RB-' || year_str || '-' || LPAD(next_num::TEXT, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_reimbursement_no
  BEFORE INSERT ON reimbursements
  FOR EACH ROW
  WHEN (NEW.reimbursement_no IS NULL)
  EXECUTE FUNCTION generate_reimbursement_no();
```

### 9.2 修改现有表

```sql
-- expenses 表增加字段
ALTER TABLE expenses ADD COLUMN payment_terms TEXT;
-- 'due_on_receipt' | 'net_7' | 'net_14' | 'net_30' | 'net_60' | 'eom_30' | 'custom'
ALTER TABLE expenses ADD COLUMN payment_terms_days INTEGER;
-- 自定义天数（payment_terms = 'custom' 时使用）
ALTER TABLE expenses ADD COLUMN due_date DATE;
ALTER TABLE expenses ADD COLUMN last_email_sent_at TIMESTAMPTZ;
ALTER TABLE expenses ADD COLUMN email_sent_count INTEGER DEFAULT 0;

-- suppliers 表增加字段
ALTER TABLE suppliers ADD COLUMN default_payment_terms TEXT DEFAULT 'net_30';
ALTER TABLE suppliers ADD COLUMN default_payment_terms_days INTEGER;

-- users 表增加字段（收款账户）
ALTER TABLE users ADD COLUMN bank_bsb TEXT;
ALTER TABLE users ADD COLUMN bank_account TEXT;
ALTER TABLE users ADD COLUMN bank_account_name TEXT;

-- Supabase Storage bucket
-- 创建 receipts bucket（通过 Supabase Dashboard 或 API）
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', false);
```

---

## 10. 实施计划

### Phase 1: UI 基础与导航重构
```
优先级: P0（最先实施）
工作内容:
1. 实现深色侧边栏导航（替换顶部导航）
2. 统一颜色体系和 Tailwind 配置
3. 升级表格组件（统一表头、行样式、状态标签）
4. 升级筛选器组件
5. 升级卡片组件（KPI 卡片、信息卡片）
6. Toast 通知组件
```

### Phase 2: Dashboard
```
优先级: P0
工作内容:
1. 创建独立 Dashboard 页面（/dashboard 或 /）
2. KPI 卡片区（4列）
3. 月度收支趋势图（Recharts）
4. 品牌收入占比图
5. 待处理事项列表（待审批 + 过期付款）
```

### Phase 3: 支出管理与付款邮件
```
优先级: P0
工作内容:
1. 数据库变更: expenses 表增加字段、suppliers 表增加字段
2. Supplier 管理增加 Payment Terms
3. 支出管理独立页面（/expenses）+ Tab 切换
4. 支出列表 Checkbox 批量选择功能
5. Due Date 自动计算 + 到期状态标签
6. 配置 Resend API + 创建 Edge Function
7. 邮件确认弹窗组件
8. 邮件发送 + 日志记录
9. 系统设置增加"付款邮件"配置 Tab
```

### Phase 4: 报销系统
```
优先级: P1
工作内容:
1. 数据库: 创建 reimbursements 表 + RLS + 触发器
2. Storage: 创建 receipts bucket
3. 报销列表页（/reimbursements）+ Tab 切换
4. 新建报销表单（Dialog + 文件上传）
5. 报销详情页（信息展示 + 凭证预览 + 审批操作 + 时间线）
6. 报销审批流程（批准/驳回/补充材料）
7. 报销邮件发送（复用付款邮件组件）
8. 个人资料页增加收款账户信息
```

### Phase 5: 报表与收尾
```
优先级: P2
工作内容:
1. 报表中心页面重构（Tab + 图表 + 报表列表）
2. Dashboard 集成报销数据
3. 项目详情页重构（左右分栏 + Tab）
4. 系统设置页 Tab 化重构
5. 响应式适配（移动端侧边栏）
```

---

## 技术要求

```
前端技术栈: Next.js + TypeScript + Tailwind CSS + shadcn/ui
图表库: Recharts (已安装) 或安装 @tremor/react
后端: Supabase (Auth + Database + Storage + Edge Functions)
邮件服务: Resend (npm install resend)
  - 免费额度: 100 封/天，3000 封/月
  - 注册: https://resend.com
  - 配置发件域名: hylink.com.au
图标: Lucide React (已安装) 或 Heroicons
文件上传限制: 单文件 10MB，最多 5 个文件
Edge Function 超时: 60 秒
报销编号格式: RB-{YYYY}-{NNN}（年度内递增）
收款账户: 显示时部分脱敏（如 ****5678）
```

---

> **注意事项:**
> - 所有新增页面需要权限控制（RLS + 前端路由守卫）
> - 邮件发送必须记录日志，失败时提供重试机制
> - 文件上传使用 Supabase Storage，路径规范：`receipts/{user_id}/{reimbursement_id}/{filename}`
> - 付款日为每月 15 号和 30 号，这是业务规则，不需要在系统中硬编码限制
> - Due Date 自动计算但可以手动覆盖
> - 所有金额使用 AUD，保留 2 位小数
