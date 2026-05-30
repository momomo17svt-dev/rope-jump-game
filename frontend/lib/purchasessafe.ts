let Purchases: any = null;
try {
  Purchases = require('react-native-purchases').default;
} catch {}
export default Purchases as typeof import('react-native-purchases').default | null;
