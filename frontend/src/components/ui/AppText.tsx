import React from 'react';
import { Text, TextProps } from 'react-native';
import { useFontFamily } from '../../hooks/useFontFamily';

/**
 * Language-aware Text component.
 * Automatically uses Outfit (Latin) or Tajawal (Arabic) based on current language.
 * Preserves any fontFamily already set in the style prop.
 */
export function AppText({ style, children, ...props }: TextProps) {
  const fonts = useFontFamily();

  // Extract fontFamily from incoming style to map Outfit- → Tajawal-
  const flatStyle = Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style || {};
  const currentFont: string = (flatStyle as any).fontFamily || fonts.regular;

  // Remap latin font names to arabic equivalents when needed
  const resolvedFont = currentFont
    .replace('Outfit-Regular', fonts.regular)
    .replace('Outfit-Medium', fonts.medium)
    .replace('Outfit-SemiBold', fonts.semiBold)
    .replace('Outfit-Bold', fonts.bold);

  return (
    <Text style={[style, { fontFamily: resolvedFont }]} {...props}>
      {children}
    </Text>
  );
}
