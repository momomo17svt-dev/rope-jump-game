// アプリアイコン生成スクリプト（大縄跳びサバイバル）
// SVG を組み立てて 1024x1024 / 不透明RGB の PNG として書き出す。
// デザインを変えたいときはこの SVG を編集して `node scripts/make_icon.js` を再実行するだけ。
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const S = 1024;

// ゲームの世界観に合わせたアイコン:
//  ・元気なグラデーション背景（空〜地面）
//  ・大きく回る「なわ（ロープ）」の弧
//  ・中央でジャンプする棒人間キャラ（figure_jump と同じテイスト）
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${S}" height="${S}" viewBox="0 0 ${S} ${S}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"  stop-color="#5EC8F2"/>
      <stop offset="55%" stop-color="#3AA6E8"/>
      <stop offset="100%" stop-color="#2D7FD6"/>
    </linearGradient>
    <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"  stop-color="#9BE06B"/>
      <stop offset="100%" stop-color="#5FB23A"/>
    </linearGradient>
  </defs>

  <!-- 背景（角はOSが丸めるので全面塗り） -->
  <rect x="0" y="0" width="${S}" height="${S}" fill="url(#bg)"/>

  <!-- 地面 -->
  <path d="M0 800 Q512 720 1024 800 L1024 1024 L0 1024 Z" fill="url(#ground)"/>

  <!-- なわ（回転するロープ）の弧。手前と奥の二重で“回っている”感を出す -->
  <path d="M150 470 C 330 940, 694 940, 874 470" fill="none"
        stroke="#FFD23F" stroke-width="34" stroke-linecap="round" opacity="0.55"/>
  <path d="M150 470 C 330 130, 694 130, 874 470" fill="none"
        stroke="#FFB000" stroke-width="40" stroke-linecap="round"/>

  <!-- ジャンプ中のキャラ（白い棒人間・縁取りグレー） -->
  <g stroke="#5b5b5b" stroke-width="20" stroke-linejoin="round" stroke-linecap="round" fill="#ffffff">
    <!-- 頭 -->
    <circle cx="512" cy="372" r="98"/>
    <!-- 胴体 + 上げた両腕（万歳ジャンプ） -->
    <path d="M512 470
             L512 660
             M512 510 C 470 470, 410 430, 372 392
             M512 510 C 554 470, 614 430, 652 392"/>
    <!-- 折りたたんだ両脚（ジャンプ） -->
    <path d="M512 640 C 452 690, 430 740, 470 770
             M512 640 C 572 690, 594 740, 554 770"/>
  </g>
</svg>`;

// iOS アプリアイコンはアルファ無しの不透明画像が必須。resvg の背景を不透明色に
// 指定して、透明ピクセルが一切無い RGBA を作る（実質不透明）。
const png = new Resvg(svg, {
  fitTo: { mode: 'width', value: S },
  background: '#3AA6E8',
}).render().asPng();

const outDir = path.join(__dirname, '..', 'assets');
const iconPath = path.join(outDir, 'icon.png');

// pngjs でアルファ無し（colorType 2 = truecolor RGB）の PNG として書き出す。
// pngjs の内部バッファは常に RGBA。colorType:2 を指定すると pack 時に
// アルファを落とした RGB ストリームを書く。
const { PNG } = require('pngjs');
const src = PNG.sync.read(png); // resvg 出力(RGBA, 不透明)を読む
const out = new PNG({ width: src.width, height: src.height, colorType: 2 });
src.data.copy(out.data); // RGBA をそのままコピー（α は書き出し時に捨てられる）
fs.writeFileSync(iconPath, PNG.sync.write(out, { colorType: 2 }));
console.log('wrote', iconPath);
