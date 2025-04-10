import React from "react";
import { Text, StyleProp, TextStyle } from "react-native";
import { useUnitDisplay } from "../hooks/useUnitDisplay";

interface PriceDisplayProps {
  standardPrice: number | undefined;
  style?: StyleProp<TextStyle>;
  measurementType?: "measurable" | "count"; // 添加这个参数来区分类型
}

export function PriceDisplay({
  standardPrice,
  style,
  measurementType = "measurable",
}: PriceDisplayProps) {
  const { convertToPreferredUnit } = useUnitDisplay();

  if (standardPrice === undefined) return null;

  // only convert to preferred unit on measurable type
  const displayPrice =
    measurementType === "measurable"
      ? convertToPreferredUnit(standardPrice)
      : standardPrice;

  return <Text style={style}>${displayPrice.toFixed(2)}</Text>;
}
