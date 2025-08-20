const fs = require('fs');
const path = require('path');

// 创建一个简单的16x16 ICO文件
// ICO文件格式的基本结构
function createFavicon() {
  // ICO文件头 (6字节)
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);      // 保留字段，必须为0
  header.writeUInt16LE(1, 2);      // 图像类型，1=ICO
  header.writeUInt16LE(1, 4);      // 图像数量

  // 图像目录条目 (16字节)
  const dirEntry = Buffer.alloc(16);
  dirEntry.writeUInt8(16, 0);      // 图像宽度 (16px)
  dirEntry.writeUInt8(16, 1);      // 图像高度 (16px)
  dirEntry.writeUInt8(0, 2);       // 调色板颜色数 (0=不使用调色板)
  dirEntry.writeUInt8(0, 3);       // 保留字段
  dirEntry.writeUInt16LE(1, 4);    // 颜色平面数
  dirEntry.writeUInt16LE(32, 6);   // 每像素位数 (32位RGBA)
  dirEntry.writeUInt32LE(1128, 8); // 图像数据大小
  dirEntry.writeUInt32LE(22, 12);  // 图像数据偏移

  // 创建16x16的RGBA图像数据
  // 简单的蓝色圆形图标
  const imageData = Buffer.alloc(1128);
  
  // BMP信息头 (40字节)
  imageData.writeUInt32LE(40, 0);      // 信息头大小
  imageData.writeInt32LE(16, 4);       // 图像宽度
  imageData.writeInt32LE(32, 8);       // 图像高度 (包含AND掩码，所以是32)
  imageData.writeUInt16LE(1, 12);      // 颜色平面数
  imageData.writeUInt16LE(32, 14);     // 每像素位数
  imageData.writeUInt32LE(0, 16);      // 压缩方式 (0=不压缩)
  imageData.writeUInt32LE(1024, 20);   // 图像数据大小
  imageData.writeInt32LE(0, 24);       // 水平分辨率
  imageData.writeInt32LE(0, 28);       // 垂直分辨率
  imageData.writeUInt32LE(0, 32);      // 调色板颜色数
  imageData.writeUInt32LE(0, 36);      // 重要颜色数

  // 像素数据 (从底部开始，每行4字节对齐)
  let offset = 40;
  
  // 创建一个简单的管理系统图标 - 蓝色背景，白色"M"字母
  for (let y = 15; y >= 0; y--) {
    for (let x = 0; x < 16; x++) {
      let r, g, b, a;
      
      // 创建一个圆形背景
      const centerX = 8, centerY = 8;
      const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
      
      if (distance <= 7) {
        // 在圆形内 - 蓝色背景
        r = 0x2E; g = 0x86; b = 0xDE; a = 0xFF;
        
        // 添加白色"M"字母
        if (y >= 4 && y <= 12) {
          if ((x === 4 || x === 11) || // 左右竖线
              (y === 12 && x >= 4 && x <= 11) || // 顶部横线
              (y === 8 && x >= 6 && x <= 9)) { // 中间连接
            r = 0xFF; g = 0xFF; b = 0xFF; a = 0xFF;
          }
        }
      } else {
        // 圆形外 - 透明
        r = 0; g = 0; b = 0; a = 0;
      }
      
      // BGRA格式
      imageData.writeUInt8(b, offset++);
      imageData.writeUInt8(g, offset++);
      imageData.writeUInt8(r, offset++);
      imageData.writeUInt8(a, offset++);
    }
  }
  
  // AND掩码 (每行2字节，16行)
  for (let y = 0; y < 16; y++) {
    imageData.writeUInt16LE(0x0000, offset); // 全部不透明
    offset += 2;
  }

  // 合并所有数据
  const favicon = Buffer.concat([header, dirEntry, imageData]);
  
  return favicon;
}

// 生成favicon.ico文件
try {
  const faviconData = createFavicon();
  const publicDir = path.join(__dirname, '..', 'public');
  
  // 确保public目录存在
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  
  const faviconPath = path.join(publicDir, 'favicon.ico');
  fs.writeFileSync(faviconPath, faviconData);
  
  console.log('✅ favicon.ico 生成成功！');
  console.log(`📁 文件位置: ${faviconPath}`);
  console.log(`📊 文件大小: ${faviconData.length} 字节`);
} catch (error) {
  console.error('❌ 生成favicon.ico失败:', error);
}
