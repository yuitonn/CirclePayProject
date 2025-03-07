// src/styles/theme.ts
import { DefaultTheme } from 'react-native-paper';

export const theme = {
    ...DefaultTheme,
    colors: {
        ...DefaultTheme.colors,
        primary: '#9BC53D',      // メインカラー（モックアップの緑色）
        accent: '#f39c12',       // アクセントカラー（オレンジ）
        background: '#f0f3f4',   // 背景色
        surface: '#ffffff',      // サーフェス（カード等）の色
        text: '#333333',         // テキスト基本色
        placeholder: '#aaaaaa',  // プレースホルダー色
        disabled: '#dddddd',     // 無効時の色
        // 支払い関連
        success: '#2ecc71',      // 成功（支払い完了など）
        error: '#e74c3c',        // エラー/警告（期限切れなど）
        warning: '#f39c12',      // 警告（期限近くなど）
        info: '#3498db',         // 情報（銀行振込など）
    },
    roundness: 12,             // 角丸の半径
    fontSizes: {
        small: 12,
        medium: 14,
        large: 16,
        xlarge: 18,
        xxlarge: 24,
    },
    spacing: {
        xs: 4,
        s: 8,
        m: 16,
        l: 24,
        xl: 32,
        xxl: 48,
    }
};
