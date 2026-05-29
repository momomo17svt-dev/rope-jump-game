// 起動時の未捕捉 JS エラーを画面に表示するためのグローバルトラップ。
// 本番ビルドでは未捕捉エラーが RCTFatal -> abort() でアプリを即終了させてしまうため、
// 既定ハンドラを呼ばずにエラー内容を保持し、ErrorBoundary 側で表示できるようにする。

let lastError: string | null = null;
let subscribers: ((message: string) => void)[] = [];

export function getGlobalError(): string | null {
  return lastError;
}

export function subscribeGlobalError(cb: (message: string) => void): () => void {
  subscribers.push(cb);
  return () => {
    subscribers = subscribers.filter((s) => s !== cb);
  };
}

function format(error: any): string {
  if (!error) return 'Unknown error';
  const name = error.name ?? 'Error';
  const message = error.message ?? String(error);
  const stack = error.stack ?? '';
  return `${name}: ${message}\n\n${stack}`;
}

const g: any = global as any;

if (g.ErrorUtils && !g.__ropeErrorHandlerInstalled) {
  g.__ropeErrorHandlerInstalled = true;
  g.ErrorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
    try {
      lastError = `${isFatal ? '[FATAL] ' : ''}${format(error)}`;
      console.log('[GlobalError]', lastError);
      subscribers.forEach((s) => {
        try {
          s(lastError as string);
        } catch {}
      });
    } catch {}
    // 既定（致命）ハンドラはあえて呼ばず、abort を避けて画面表示に委ねる。
  });
}
