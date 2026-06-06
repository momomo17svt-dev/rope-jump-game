// ランキングに表示する立ち絵アバターのサムネ生成。
// ローカルの画像URIを 64x64・PNG に圧縮し、base64 文字列を返す。
// 背景削除した画像の透過を保つため PNG を使う（JPEG だと透過部分が黒く潰れる）。
// サーバの avatar 列に格納して全端末で表示できるようにするためのもの。
// デフォルト絵（標準キャラ）の場合は null を返し、各端末が同梱画像で描画する。
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';

const THUMB_SIZE = 64;

// アバター画像は documentDirectory 配下の avatars/ に保存する。
// iOS の documentDirectory はアプリ更新/復元でコンテナ UUID 部分が変わり得るため、
// 絶対パスをDBに保存すると参照できなくなる。そこで保存は相対パス（avatars/xxx）にし、
// 読み出し時に現在の documentDirectory を前置して絶対URIを再構築する。
// 旧バージョンで絶対パスを保存していた場合も 'avatars/' 以降を取り出して復元する。

// DBの保存値（相対 or 旧絶対）→ 現在のコンテナの絶対URI
export function resolveAvatarUri(stored: string | null | undefined): string | null {
  if (!stored) return null;
  const i = stored.indexOf('avatars/');
  let rel = stored;
  if (i >= 0) {
    rel = stored.slice(i);
  } else {
    // avatars/ が含まれない場合（ファイル名のみ、あるいは古い絶対パスなど）、
    // 末尾のファイル名部分のみを切り出して 'avatars/' を付与する
    const parts = stored.split('/');
    const filename = parts[parts.length - 1];
    if (filename) {
      rel = 'avatars/' + filename;
    }
  }
  return (FileSystem.documentDirectory ?? '') + rel;
}

// 保存用：絶対URI → 相対パス（avatars/xxx）。UUID 部分を含めない。
export function toRelativeAvatarPath(uri: string | null | undefined): string | null {
  if (!uri) return null;
  const i = uri.indexOf('avatars/');
  if (i >= 0) {
    return uri.slice(i);
  }
  // avatars/ が含まれない場合もファイル名から相対パスを作成
  const parts = uri.split('/');
  const filename = parts[parts.length - 1];
  return filename ? 'avatars/' + filename : null;
}

// 画像を中央の正方形にクロップして新しいURIを返す。
// 横画面を保つため allowsEditing（iPhoneでは縦専用のクロップUI）を使わず、
// 選択後にこの関数でアプリ側から正方形に切り抜く用途。
export async function cropCenterSquare(
  uri: string,
  width?: number,
  height?: number
): Promise<string> {
  // 寸法が取れない場合はクロップせずそのまま返す（アプリ動作を止めない）
  if (!width || !height) return uri;
  try {
    const size = Math.min(width, height);
    const originX = Math.round((width - size) / 2);
    const originY = Math.round((height - size) / 2);
    const ctx = ImageManipulator.manipulate(uri);
    ctx.crop({ originX, originY, width: size, height: size });
    const image = await ctx.renderAsync();
    const result = await image.saveAsync({ compress: 0.9, format: SaveFormat.JPEG });
    return result.uri;
  } catch {
    return uri;
  }
}

export async function makeAvatarThumb(uri: string | null): Promise<string | null> {
  if (!uri) return null;
  try {
    const ctx = ImageManipulator.manipulate(uri);
    ctx.resize({ width: THUMB_SIZE, height: THUMB_SIZE });
    const image = await ctx.renderAsync();
    const result = await image.saveAsync({
      compress: 0.5,
      format: SaveFormat.PNG,
      base64: true,
    });
    return result.base64 ?? null;
  } catch {
    // 生成に失敗してもアプリ動作は止めない（デフォルト絵で表示される）
    return null;
  }
}
