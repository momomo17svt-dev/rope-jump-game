// ランキングに表示する立ち絵アバターのサムネ生成。
// ローカルの画像URIを 64x64・JPEG(品質0.5) に圧縮し、base64 文字列を返す。
// サーバの avatar 列に格納して全端末で表示できるようにするためのもの。
// デフォルト絵（標準キャラ）の場合は null を返し、各端末が同梱画像で描画する。
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

const THUMB_SIZE = 64;

export async function makeAvatarThumb(uri: string | null): Promise<string | null> {
  if (!uri) return null;
  try {
    const ctx = ImageManipulator.manipulate(uri);
    ctx.resize({ width: THUMB_SIZE, height: THUMB_SIZE });
    const image = await ctx.renderAsync();
    const result = await image.saveAsync({
      compress: 0.5,
      format: SaveFormat.JPEG,
      base64: true,
    });
    return result.base64 ?? null;
  } catch {
    // 生成に失敗してもアプリ動作は止めない（デフォルト絵で表示される）
    return null;
  }
}
