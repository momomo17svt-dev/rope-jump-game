const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo config plugin: fmt の consteval コンパイルエラー対策。
 *
 * React Native 0.81 が同梱する fmt ライブラリは、新しい Xcode/Clang
 * (Xcode 16.3+ / Xcode 26) の厳格な consteval 評価で
 * 「call to consteval function ... is not a constant expression」エラーになる。
 * GCC_PREPROCESSOR_DEFINITIONS に FMT_USE_CONSTEVAL=0 を追加して
 * fmt の consteval 使用を無効化し、全 Pod ターゲットでビルドできるようにする。
 *
 * CNG (prebuild で ios/ を生成する) 構成のため、生成された Podfile の
 * post_install ブロックへ build settings の上書きを注入する。
 */
const MARKER = 'FMT_USE_CONSTEVAL=0';

const SNIPPET = `
    # withFmtConsteval: fix fmt consteval build error on newer Xcode/Clang
    installer.pods_project.targets.each do |fmt_target|
      fmt_target.build_configurations.each do |fmt_config|
        defs = fmt_config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] || ['$(inherited)']
        defs = [defs] unless defs.is_a?(Array)
        defs << '${MARKER}' unless defs.include?('${MARKER}')
        fmt_config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] = defs
      end
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

      if (contents.includes(MARKER)) {
        return config;
      }

      const anchor = 'post_install do |installer|';
      if (contents.includes(anchor)) {
        contents = contents.replace(anchor, `${anchor}\n${SNIPPET}`);
      } else {
        // post_install が無い場合は target の直前/末尾に追加
        contents += `\npost_install do |installer|\n${SNIPPET}\nend\n`;
      }

      fs.writeFileSync(podfilePath, contents);
      return config;
    },
  ]);
};
