# 内部 API 使用手册（SSE）

本接口仅供后端或 OpenClaw 等可信调用方使用，**前端不可直接访问**。

## 基础地址

线上地址：[https://www.tire-design.top/](https://www.tire-design.top/)

## 接口说明

### 1. 生成接口（SSE 流式）

**URL**

`POST /api/internal/stream`

**鉴权 Header**

`x-internal-token: <INTERNAL_TOKEN>`

**Content-Type**

`application/json`

**请求体**

```json
{
  "input": {
    "type": "topic",
    "topic_text": "我真的会谢"
  },
  "options": {
    "light_mode": true,
    "generate_pdf": true,
    "generate_print": false,
    "custom_prompt": ""
  }
}
```

#### input 字段

1. `type: "topic"`
- `topic_text`: 热梗/话题文案（字符串）

2. `type: "image"`
- `image_base64`: 参考图（Data URI base64）

#### options 字段

- `light_mode`（布尔值）
  - `true`：跳过印花资产提取，**先返回 mockup**，再生成 PDF（更快）
  - `false`：完整链路（更慢）
- `generate_pdf`（布尔值，默认 `true`）
  - `false` 则不生成生产单 PDF
- `generate_print`（布尔值，默认 `true` 但在 light_mode 下会被跳过）
  - `false` 则不生成印花资产
- `custom_prompt`（字符串，可选）
  - 追加到印花草图的提示词

## SSE 事件流格式

接口返回 SSE 流，一行一条事件：

```
data: {"step":"start","message":"收到指令，初始化中..."}

data: {"step":"analyze","message":"生成风格结构中（本地）..."}

data: {"step":"render","message":"生成印花图（轻量）..."}

data: {"step":"render","message":"生成模特效果图（图生图/轻量）..."}

data: {"step":"mockup_ready","result":{"images":{"mockup":"data:image/png;base64,..."}}}

data: {"step":"pdf","message":"生成生产单 PDF..."}

data: {"step":"completed","result":{"images":{"mockup":"...","print_asset":"..."},"pdfs":{"garment_order":"...","print_order":"..."}}}
```

### 关键说明

- `mockup_ready`：**mockup 先返回**（适合快速预览）
- `completed`：最终结果，包含
  - `images.mockup`
  - `images.print_asset`（light mode 下可能复用 mockup）
  - `pdfs.garment_order`
  - `pdfs.print_order`

## 示例（curl）

```bash
curl -N -X POST https://www.tire-design.top/api/internal/stream \
  -H "Content-Type: application/json" \
  -H "x-internal-token: YOUR_INTERNAL_TOKEN" \
  -d '{
    "input": {
      "type": "topic",
      "topic_text": "我真的会谢"
    },
    "options": {
      "light_mode": true,
      "generate_pdf": true
    }
  }'
```

## 输出字段

- **Mockup 图片**：`result.images.mockup`
- **印花资产**：`result.images.print_asset`
- **Garment_Order PDF**：`result.pdfs.garment_order`
- **Print_Order PDF**：`result.pdfs.print_order`

全部返回值均为 Data URI，可直接保存为文件。

## OpenClaw 流式解析示例（伪代码）

以下示例演示如何逐行读取 SSE，并在收到 `mockup_ready` / `completed` 时处理结果：

```pseudo
function callInternalStream(input, options):
  resp = http.post(
    url = "https://www.tire-design.top/api/internal/stream",
    headers = {
      "Content-Type": "application/json",
      "x-internal-token": INTERNAL_TOKEN
    },
    body = { input, options },
    stream = true
  )

  for each line in resp.stream_lines():
    if not line.startsWith("data:"):
      continue
    payload = json.parse(line.replace("data:", "").trim())

    if payload.step == "mockup_ready":
      mockup = payload.result.images.mockup
      saveDataUriToFile(mockup, "mockup.png")
      print("Mockup ready")

    if payload.step == "completed":
      images = payload.result.images
      pdfs = payload.result.pdfs

      saveDataUriToFile(images.mockup, "mockup.png")
      saveDataUriToFile(images.print_asset, "print_asset.png")
      saveDataUriToFile(pdfs.garment_order, "Garment_Order.pdf")
      saveDataUriToFile(pdfs.print_order, "Print_Order.pdf")
      print("All assets ready")
      break
```

Data URI 保存示例（伪代码）：

```pseudo
function saveDataUriToFile(dataUri, filename):
  # "data:image/png;base64,AAA..."
  base64 = dataUri.split(",")[1]
  bytes = base64_decode(base64)
  write_file(filename, bytes)
```
