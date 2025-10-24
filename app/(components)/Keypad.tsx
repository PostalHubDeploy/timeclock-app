// Keypad.tsx — big round buttons, stable grid, INVISIBLE OK placeholder
import React, { memo, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Svg, Circle, Path } from 'react-native-svg';

interface KeypadProps {
  onButtonClick: (button: string) => void;
  okButton?: boolean; // when false, OK cell is an invisible spacer
}

const BUTTON_SIZE = 112; // adjust as needed
const GAP = 24;
const COLS = 3;

const COLORS = {
  digitFill: '#e5e7eb', // gray-200
  deleteFill: '#64748b', // slate-500
  okFill: '#dc2626', // brand red
  text: '#0b0f19', // near black
  ripple: 'rgba(255,255,255,0.25)',
};

const Keypad = memo(function Keypad({ onButtonClick, okButton = true }: KeypadProps) {
  // Always 12 cells; last one is OK or Placeholder (invisible)
  const buttons = useMemo(
    () => [
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      'Delete',
      '0',
      okButton ? 'OK' : 'Placeholder',
    ],
    [okButton]
  );

  const onPress = (label: string) => {
    if (label === 'Placeholder') return;
    onButtonClick(label);
  };

  const fillFor = (label: string) => {
    if (label === 'OK') return COLORS.okFill;
    if (label === 'Delete') return COLORS.deleteFill;
    return COLORS.digitFill; // numbers
  };

  const renderContent = (label: string) => {
    if (label === 'Delete') {
      return (
        <Svg width={56} height={56} viewBox="0 0 24 24" fill="none" pointerEvents="none">
          <Path
            d="M12 9.75 14.25 12m0 0 2.25 2.25M14.25 12l2.25-2.25M14.25 12 12 14.25m-2.58 4.92-6.374-6.375a1.125 1.125 0 0 1 0-1.59L9.42 4.83c.21-.211.497-.33.795-.33H19.5a2.25 2.25 0 0 1 2.25 2.25v10.5a2.25 2.25 0 0 1-2.25 2.25h-9.284c-.298 0-.585-.119-.795-.33Z"
            stroke="#fff"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    }
    if (label === 'OK') {
      return (
        <Svg width={56} height={56} viewBox="0 0 24 24" fill="none" pointerEvents="none">
          <Path
            d="m4.5 12.75 6 6 9-13.5"
            stroke="#fff"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    }
    return (
      <Text style={styles.digit} pointerEvents="none" allowFontScaling={false}>
        {label}
      </Text>
    );
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.grid}>
        {buttons.map((label, idx) => {
          const isLastInRow = idx % COLS === COLS - 1;
          const isLastRow = idx >= buttons.length - COLS;
          const cellStyle = [
            styles.cell,
            { marginRight: isLastInRow ? 0 : GAP, marginBottom: isLastRow ? 0 : GAP },
          ];

          if (label === 'Placeholder') {
            // Invisible spacer: NO pressable, NO svg, NO shadow/elevation
            return <View key={`${label}-${idx}`} style={cellStyle} />;
          }

          return (
            <View key={`${label}-${idx}`} style={cellStyle}>
              <Pressable
                onPressIn={() => onPress(label)}
                android_ripple={{ color: COLORS.ripple, foreground: true, borderless: false }}
                hitSlop={10}
                style={styles.hit} // full-circle touch area
              >
                {/* Solid circle background via SVG (always visible) */}
                <Svg width={BUTTON_SIZE} height={BUTTON_SIZE} pointerEvents="none">
                  <Circle
                    cx={BUTTON_SIZE / 2}
                    cy={BUTTON_SIZE / 2}
                    r={BUTTON_SIZE / 2}
                    fill={fillFor(label)}
                  />
                </Svg>

                {/* Centered label/icon */}
                <View style={styles.overlay} pointerEvents="none">
                  {renderContent(label)}
                </View>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    width: 500,
    height: 500,
    maxWidth: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'center',
    justifyContent: 'center',
  },
  cell: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hit: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2, // true circle
    overflow: 'hidden', // ripple clipped to circle (Android)
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    // Soft shadow even with SVG fill
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digit: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    textAlignVertical: 'center' as any,
    includeFontPadding: false as any,
    lineHeight: 34,
  },
});

export default Keypad;
