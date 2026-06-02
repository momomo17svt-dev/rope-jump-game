// @six33/react-native-bg-removal はネイティブモジュールのため Expo Go では使えない。
// iOS17+ は VNGenerateForegroundInstanceMask（汎用被写体抽出＝「被写体をコピー」相当）、
// iOS15.1〜16 は REQUIRES_API_FALLBACK を投げる。Android は ML Kit Subject Segmentation。
// require 自体は Expo Go でも成功し（純JS）、ネイティブ呼び出し時に初めて LINKING_ERROR を
// 投げる作りなので、ネイティブモジュール(NativeModules.BackgroundRemover)の有無で確実に判定する。
import { NativeModules } from 'react-native';

type RemovalOptions = { trim?: boolean };

let removeBackground:
  | ((imageURI: string, options?: RemovalOptions) => Promise<string>)
  | null = null;
try {
  if (NativeModules.BackgroundRemover) {
    removeBackground = require('@six33/react-native-bg-removal').removeBackground;
  }
} catch {}

export default removeBackground;
