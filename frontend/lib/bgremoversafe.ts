// react-native-background-remover はネイティブモジュールのため Expo Go では使えない。
// require 自体は Expo Go でも成功し（純JS）、ネイティブ呼び出し時に初めて LINKING_ERROR を
// 投げる作りなので、ネイティブモジュール(NativeModules.BackgroundRemover)の有無で確実に判定する。
// 実体が無い環境（Expo Go）では null にして、呼び出し側でフォールバックさせる。
import { NativeModules } from 'react-native';

let removeBackground: ((imageURI: string) => Promise<string>) | null = null;
try {
  if (NativeModules.BackgroundRemover) {
    removeBackground = require('react-native-background-remover').removeBackground;
  }
} catch {}

export default removeBackground;
