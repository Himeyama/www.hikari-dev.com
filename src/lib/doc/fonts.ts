export type FontCategory = 'serif' | 'sans-serif' | 'serif-sans';

export interface FontOption {
  id: string;
  label: string;
  family: string;
  category: FontCategory;
  // 太字の日本語文字だけ別ファミリーで描画したいフォント用 (通常ファミリーに実体のある Bold がないため)
  boldEastAsia?: string;
  // 太字の英数字だけ別ファミリーで描画したいフォント用
  boldLatin?: string;
}

export const FONT_CATEGORY_LABELS: Record<FontCategory, string> = {
  serif: 'セリフ',
  'sans-serif': 'サンセリフ',
  'serif-sans': 'セリフ + サンセリフ',
};

export const FONT_OPTIONS: FontOption[] = [
  {id: 'yu-mincho', label: '游明朝', family: 'Yu Mincho', category: 'serif'},
  {id: 'ms-mincho', label: 'MS 明朝', family: 'MS Mincho', category: 'serif'},
  {id: 'ms-pmincho', label: 'MS P明朝', family: 'MS PMincho', category: 'serif'},
  {id: 'ms-gothic', label: 'MS ゴシック', family: 'MS Gothic', category: 'sans-serif'},
  {id: 'ms-pgothic', label: 'MS Pゴシック', family: 'MS PGothic', category: 'sans-serif'},
  {id: 'meiryo', label: 'メイリオ', family: 'Meiryo', category: 'sans-serif'},
  {id: 'noto-sans-jp', label: 'Noto Sans JP', family: 'Noto Sans JP', category: 'sans-serif'},
  {id: 'biz-ud-gothic', label: 'BIZ UDGothic', family: 'BIZ UDGothic', category: 'sans-serif'},
  {
    id: 'biz-ud-pgothic',
    label: 'BIZ UDPGothic',
    family: 'BIZ UDPGothic',
    category: 'sans-serif',
    boldEastAsia: 'BIZ UDGothic',
  },
  {
    id: 'noto-serif-jp',
    label: 'Noto Serif JP / Noto Sans JP',
    family: 'Noto Serif JP',
    category: 'serif-sans',
    // 太字の日本語だけサンセリフ (Noto Sans JP) に切り替える。英数字の太字は明示的にセリフ (Noto Serif JP) のままにする
    boldEastAsia: 'Noto Sans JP',
    boldLatin: 'Noto Serif JP',
  },
];

export const DEFAULT_FONT_ID = 'yu-mincho';

export function getFontOption(id: string): FontOption {
  return FONT_OPTIONS.find((f) => f.id === id) ?? FONT_OPTIONS[0];
}
