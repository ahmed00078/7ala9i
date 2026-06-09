import React from 'react';
import { Text, TextProps } from 'react-native';
import { useFontFamily } from '../../hooks/useFontFamily';

interface AppTextProps extends TextProps {
  /**
   * Editorial Arabic serif (Noto Naskh Arabic). Only takes effect when the app
   * is in AR — on Latin it falls back to Outfit. Use sparingly per §2.4:
   * salon names on detail screens, hero brand wordmark on welcome.
   */
  serif?: boolean;
}

/**
 * Language-aware Text component.
 * Maps incoming `Outfit-*` font names to their Tajawal / Noto Naskh equivalents
 * when the active language is Arabic, so screens can keep writing Latin font
 * names in their StyleSheets while AR still looks native.
 */
export function AppText({ style, children, serif, ...props }: AppTextProps) {
  const fonts = useFontFamily();

  const flatStyle = Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style || {};
  const currentFont: string = (flatStyle as any).fontFamily || fonts.regular;

  let resolvedFont = currentFont
    .replace('Outfit-Regular', fonts.regular)
    .replace('Outfit-Medium', fonts.medium)
    .replace('Outfit-SemiBold', fonts.semiBold)
    .replace('Outfit-Bold', fonts.bold)
    .replace('Outfit-Black', (fonts as any).black ?? fonts.bold);

  // Editorial serif (AR only) — opt-in via prop to keep Latin renders untouched.
  if (serif && 'serif' in fonts) {
    const isBoldWeight = currentFont.includes('Bold') || currentFont.includes('Black');
    resolvedFont = isBoldWeight ? (fonts as any).serifBold : (fonts as any).serif;
  }

  return (
    <Text style={[style, { fontFamily: resolvedFont }]} {...props}>
      {children}
    </Text>
  );
}
