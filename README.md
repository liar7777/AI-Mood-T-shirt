基于最新的 PRD 文档和我们确认的架构方向，我已经将“下一步更新计划（Phase 4.0 核心重构）”完整地补充到了项目的 `README.md` 文件中。以下是更新后的完整 README 代码，你可以直接复制并替换原有文件：

```markdown
# TRIE - AI Emotion Design H5 (v1.2.6 -> Target v2.0)

**"Emotion is Design" —— 让情绪成为潮流的唯一指令。**

TRIE 是一款面向 Gen Z 的 AI Agent 驱动型潮流定制平台。通过将复杂的设计语言简化为情绪对话，为用户提供从“灵感捕捉”到“工业级渲染”的全链路定制体验。

---

## 🚀 当前版本核心功能

### 1. 潮流趋势灵感流 (Inspiration Flow)
* **今日爆梗 (#Trending):** 实时同步社交媒体热门情绪标签。
* **一键获取 (Get This Vibe):** 点击灵感卡片，Agent 自动提取该风格的视觉波段。

### 2. AI 情绪化创作 (AI Agent Chat)
* **多维意图理解:** 基于 **Gemini 3 Pro Image (Banana Pro)** 模型，深度解析用户的情绪描述。
* **四格灵感草图:** 每次生成提供 4 张不同维度的设计草图，支持用户在多样性中快速筛选最佳创意。

### 3. 专业级模特预览 (Pro Mockup Lab)
* **真实质感渲染:** 将生成的图案动态贴图至真实模特身上。
* **东亚模特适配:** 采用东亚中等身材男性模特原型，提供干净的白底时装摄影效果。
* **三大版型切换:** [圆领T]、[卫衣]、[冲锋衣]。

---

## 📅 下一步研发计划 (Roadmap to v2.0 - Phase 4.0)

基于最新的研发级 PRD (v2026-Phase4.0)，项目即将进行以下核心架构与功能重构，以实现完全的商业闭环和国内免 VPN 极速访问：

### 1. 底层架构云原生化 (Serverless & Cloud)
* **后端 API 安全隔离:** 全面转向 Vercel Serverless Functions (`/api` 路由)，前端严禁直连海外大模型 API，解决国内网络访问限制。
* **数据与存储上云:** 引入 **Supabase** (PostgreSQL + Auth) 进行用户分级鉴权与设计资产持久化；接入腾讯云 COS / 阿里云 OSS 存储 AI 高清原图并开启国内 CDN 加速。
* **防超时机制 (SSE):** 针对 Gemini 较长的生成时间，后端将采用 Server-Sent Events (SSE) 流式响应与异步状态轮询，彻底解决 Vercel 504 超时问题。

### 2. UI/UX 视觉重构 (Clean Fit 研报风)
* **明亮极简风:** 全局背景切换为宣纸白/米灰 (`#F8F9FA`)，主视觉强调色采用克莱因蓝 (`#0057FF`)，全面废弃大面积阴影与暗黑模式，采用极细黑线边框。
* **字体与素材净化红线:** 严格限制全站仅使用 3 款西文字体 (如 Space Grotesk) 及 2 款无衬线中文字体；严禁引入传统土味字体（如行书、毛笔字）及冗余滤镜贴纸库。

### 3. Pro Mockup Lab 复合渲染器升级 (降本增效)
* **2D/3D 渲染彻底解耦:** 默认状态下采用纯前端 Canvas + CSS `mix-blend-mode: multiply` (正片叠底) 实现秒级 2D 贴图预览（0 AI 算力成本）。仅在用户主动点击“生成上身大片”时，才调用后端 API 消耗算力生成 3D 效果图。
* **印刷安全区 (Bounding Box) 防错:** 新增可视化虚线边界限制（对应工厂真实机器 30x40cm 台板），并提供 `[垂直/水平居中]` 辅助对齐功能，强制防止用户将印花拖拽越界。

### 4. 柔性供应链与结算矩阵重构 (Checkout)
* **B 端批量加购矩阵:** 废弃单件下拉单选，新增适用社团定制的“平铺尺码计数器”与专业的《亚洲体型身高体重二维参考表》。
* **纯前端双生产单导出:** 订单支付完成后，利用 `jspdf` + `html2canvas` 在浏览器端纯前端抓取隐藏 DOM，生成两份不可篡改的 PDF 生产单据，减轻服务器压力：
    * `Garment_Order` (底衫工厂拣货单)：含 SKU 代码、尺码汇总矩阵及收件地址。
    * `Print_Order` (印花工厂作业单)：含印花胸前/后背/袖口位置、物理尺寸参考图，以及供工人扫码下载 300DPI 透明底原图的二维码。

### 5. 用户权限分层与私域打通 (RBAC)
* **小白模式 (Normal User):** 隐藏复杂输入框，仅暴露首页趋势词盲盒生成与极简快捷支付路径。
* **极客模式 (Pro User):** 开放自定义 Prompt、本地传图与 AI 二次指令精细微调 (`/api/edit`) 功能。
* **社团隐蔽通道:** 首页新增克莱因蓝色的 B 端专属入口，收集负责人信息直推企业微信/飞书，走大单打样流转。

---

## 📂 项目文件结构说明

### 核心逻辑
- `App.tsx`: 应用的主入口组件。负责管理全局视图状态。
- `geminiService.ts`: AI 服务封装类。直接调用 `@google/genai` SDK，包含草图生成及模特贴图逻辑。

### 交互组件 (`components/`)
- `ChatInterface.tsx`: AI 对话中心。
- `MockupLab.tsx`: 效果预览实验室。支持版型切换、缩放预览与二次微调。
- `InspirationFlow.tsx`: 落地页趋势流。
- `Checkout.tsx`: 模拟结算页面。展示 300DPI 无损生产规格等工业参数。

### 部署与适配 (Vercel / Cloud Run)
- `vercel.json`: Vercel 路由配置文件，处理 SPA 路由重写。
- `api/index.js`: Vercel Serverless Function 入口，导出 Express 实例。
- `server.js`: 核心 Express 应用逻辑。支持本地开发、Google Cloud Run (监听 8080 端口) 以及 Vercel 引用。
- `package.json`: 定义依赖与启动脚本。

---

## 📦 部署指南

### Vercel 部署 (推荐)
1.  **代码提交**: 将项目推送到 GitHub/GitLab 仓库。
2.  **导入项目**: 在 Vercel 仪表盘中点击 "Add New" -> "Project"，导入该仓库。
3.  **环境变量**: 在 **Settings -> Environment Variables** 中添加 `GEMINI_API_KEY` 等必要的服务密钥。
4.  **自动识别**: Vercel 会自动识别 `vercel.json` 和 `api/` 目录，并完成 Serverless 适配。

### Google Cloud Run 部署
1.  应用默认监听 `PORT: 8080`。
2.  通过 `npm start` (即 `node server.js`) 即可在容器中运行。

---

## 🛠 现有技术架构
* **Frontend:** React 19 + Tailwind CSS + Space Grotesk Typography。
* **AI Engine:** Google Gemini API (gemini-3-pro-image-preview)。
* **Hosting:** Node.js (Express) / Vercel Edge / Cloud Run。

```