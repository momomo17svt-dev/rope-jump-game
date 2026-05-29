const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo config plugin: fmt の consteval コンパイルエラー対策。
 *
 * React Native 0.81 が同梱する fmt 11.0.2 は、新しい Xcode/Clang
 * (Xcode 26) の consteval で
 * 「call to consteval function ... is not a constant expression」エラーになる。
 *
 * fmt 11.0.2 は base.h で FMT_USE_CONSTEVAL / FMT_CONSTEVAL を #ifndef ガード無しで
 * 無条件に #define するため、-DFMT_USE_CONSTEVAL=0 等のコンパイラ定義では上書きできない
 * (fmt 側の #define が勝つ)。そこで Pods 取得後 (post_install) に base.h を直接パッチして
 * `#define FMT_CONSTEVAL consteval` を空マクロに置換し、consteval を無効化する。
 *
 * CNG 構成のため Podfile の post_install ブロックへこの処理を注入する。
 * pod install 時に実行され、ログに [withFmtConsteval] を出力する。
 */
const ANCHOR = 'post_install do |installer|';

const SNIPPET = `
    # withFmtConsteval: disable fmt consteval (broken under Xcode 26 Clang)
    fmt_base = File.join(installer.sandbox.root.to_s, 'fmt', 'include', 'fmt', 'base.h')
    if File.exist?(fmt_base)
      fmt_original = File.read(fmt_base)
      fmt_patched = fmt_original.gsub('define FMT_CONSTEVAL consteval', 'define FMT_CONSTEVAL')
      if fmt_patched != fmt_original
        File.write(fmt_base, fmt_patched)
        puts '[withFmtConsteval] patched fmt base.h: FMT_CONSTEVAL -> (empty)'
      else
        puts '[withFmtConsteval] fmt base.h already patched or pattern not found'
      end
    else
      puts "[withFmtConsteval] fmt base.h not found: #{fmt_base}"
    end
`;

module.exports = function withFmtConsteval(config) {
  return withDangerousMod(config, [
    'ios',
    (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        'Podfile'
      );
      let contents = fs.readFileSync(podfilePath, 'utf8');

      if (contents.includes('withFmtConsteval')) {
        console.log('[withFmtConsteval] Podfile already patched, skipping');
        return config;
      }

      if (contents.includes(ANCHOR)) {
        contents = contents.replace(ANCHOR, `${ANCHOR}\n${SNIPPET}`);
        console.log('[withFmtConsteval] injected fmt patch into existing post_install');
      } else {
        contents += `\npost_install do |installer|\n${SNIPPET}\nend\n`;
        console.log('[withFmtConsteval] appended new post_install with fmt patch');
      }

      fs.writeFileSync(podfilePath, contents);
      return config;
    },
  ]);
};
