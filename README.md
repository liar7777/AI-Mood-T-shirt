
# TRIE - AI Emotion Design H5 (v1.2.5)

**"Emotion is Design" —— 让情绪成为潮流的唯一指令。**

TRIE 是一款面向 Gen Z 的 AI Agent 驱动型潮流定制平台。通过将复杂的设计语言简化为情绪对话，为用户提供从“灵感捕捉”到“工业级渲染”的全链路定制体验。

---

## 🚀 当前版本核心功能

### 1. 潮流趋势灵感流 (Inspiration Flow)
*   **今日爆梗 (#Trending):** 实时同步社交媒体热门情绪标签。
*   **一键获取 (Get This Vibe):** 点击灵感卡片，Agent 自动提取该风格的视觉波段。

### 2. AI 情绪化创作 (AI Agent Chat)
*   **多维意图理解:** 基于 **Gemini 3 Pro Image (Banana Pro)** 模型，深度解析用户的情绪描述。
*   **四格灵感草图:** 每次生成提供 4 张不同维度的设计草图，支持用户在多样性中快速筛选最佳创意。

### 3. 专业级模特预览 (Pro Mockup Lab)
*   **真实质感渲染:** 将生成的图案动态贴图至真实模特身上。
*   **东亚模特适配:** 采用东亚中等身材男性模特原型，提供干净的白底时装摄影效果。
*   **三大版型切换:** [圆领T]、[卫衣]、[冲锋衣]。

---

## 📂 项目文件结构说明

### 核心逻辑
- **`App.tsx`**: 应用的主入口组件。负责管理全局视图状态。
- **`geminiService.ts`**: AI 服务封装类。直接调用 `@google/genai` SDK，包含草图生成及模特贴图逻辑。

### 交互组件 (`components/`)
- **`ChatInterface.tsx`**: AI 对话中心。
- **`MockupLab.tsx`**: 效果预览实验室。支持版型切换、缩放预览与二次微调。
- **`InspirationFlow.tsx`**: 落地页趋势流。
- **`Checkout.tsx`**: 模拟结算页面。展示 300DPI 无损生产规格等工业参数。

### 部署与适配 (Vercel / Cloud Run)
- **`vercel.json`**: Vercel 路由配置文件，处理 SPA 路由重写。
- **`api/index.js`**: Vercel Serverless Function 入口，导出 Express 实例。
- **`server.js`**: 核心 Express 应用逻辑。支持本地开发、Google Cloud Run (监听 8080 端口) 以及 Vercel 引用。
- **`package.json`**: 定义依赖与启动脚本。

---

## 📦 部署指南

### Vercel 部署 (推荐)
1.  **代码提交**: 将项目推送到 GitHub/GitLab 仓库。
2.  **导入项目**: 在 Vercel 仪表盘中点击 "Add New" -> "Project"，导入该仓库。
3.  **环境变量**: 在 **Settings -> Environment Variables** 中添加 `API_KEY` (你的 Gemini API Key)。
4.  **自动识别**: Vercel 会自动识别 `vercel.json` 和 `api/` 目录，并完成 Serverless 适配。

### Google Cloud Run 部署
1.  应用默认监听 `PORT: 8080`。
2.  通过 `npm start` (即 `node server.js`) 即可在容器中运行。

---

## 🛠 技术架构
*   **Frontend:** React 19 + Tailwind CSS + Space Grotesk Typography。
*   **AI Engine:** Google Gemini API (gemini-3-pro-image-preview)。
*   **Hosting:** Node.js (Express) / Vercel Edge / Cloud Run。
