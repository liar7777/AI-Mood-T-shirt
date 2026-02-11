
const express = require('express');
const path = require('path');
const app = express();

// 静态文件目录
const distPath = path.join(__dirname, 'dist');

// 优先提供构建后的文件服务
app.use(express.static(distPath));

// API 示例接口
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok', version: '1.2.5' });
});

// 支持 SPA 路由重定向
app.get('*', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      // 本地开发环境且未构建时，回退到根目录
      res.sendFile(path.join(__dirname, 'index.html'));
    }
  });
});

if (require.main === module) {
  const port = process.env.PORT || 8080;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on port ${port}`);
  });
}

module.exports = app;
