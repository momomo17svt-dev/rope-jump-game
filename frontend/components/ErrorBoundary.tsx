import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { subscribeGlobalError, getGlobalError } from '@/lib/installErrorHandler';

type Props = { children: React.ReactNode };
type State = { error: string | null };

function format(error: any): string {
  const name = error?.name ?? 'Error';
  const message = error?.message ?? String(error);
  const stack = error?.stack ?? '';
  return `${name}: ${message}\n\n${stack}`;
}

export class ErrorBoundary extends React.Component<Props, State> {
  private unsub?: () => void;

  constructor(props: Props) {
    super(props);
    this.state = { error: getGlobalError() };
  }

  static getDerivedStateFromError(error: any): State {
    return { error: format(error) };
  }

  componentDidMount() {
    // レンダー外（useEffect / 非同期）で起きた未捕捉エラーも表示する。
    this.unsub = subscribeGlobalError((message) => this.setState({ error: message }));
  }

  componentWillUnmount() {
    this.unsub?.();
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>起動エラー（診断用）</Text>
          <ScrollView style={styles.scroll}>
            <Text style={styles.message} selectable>
              {this.state.error}
            </Text>
          </ScrollView>
        </View>
      );
    }
    return this.props.children as React.ReactElement;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    color: '#ff6b6b',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  scroll: { flex: 1 },
  message: { color: '#ffffff', fontSize: 12, lineHeight: 18 },
});
