import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Svg, Path } from 'react-native-svg';
import { useWindowDimensions } from 'react-native';



interface KeypadProps {
  onButtonClick: (button: string) => void;
  okButton?: boolean;
}

export function Keypad({ onButtonClick, okButton = true }: KeypadProps) {
  const { width } = useWindowDimensions();
  const buttons = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'Delete', '0', 'OK'];
  const buttonSize = (width * 1) / 3 - 16; // se puede ajustar

  const chunkArray = (arr: string[], size: number) => {
    const result = [];
    for (let i = 0; i < arr.length; i += size) {
      result.push(arr.slice(i, i + size));
    }
    return result;
  };

  const getBg = (button: string) => {
    if (button === 'Delete') return 'bg-gray-400';
    if (button === 'OK') return okButton ? 'bg-red-500' : 'bg-transparent';
    return 'bg-gray-200';
  };

  return (
    <View className="w-[80%]">
      {chunkArray(buttons, 3).map((row, rowIndex) => (
        <View key={rowIndex} className="mb-4 flex-row justify-center gap-4">
          {row.map((button) => (
            <Pressable
              key={button}
              onPress={() => onButtonClick(button)}
              className={`
                ${getBg(button)}
                ${button === 'OK' && !okButton ? 'opacity-0' : 'opacity-100'}
                rounded-full
                justify-center
                items-center
                p-4
              `}
              style={({ pressed }) => [
                {
                  width: buttonSize,
                  height: buttonSize,
                  transform: [{ scale: pressed ? 0.95 : 1 }],
                },
              ]}
            >
              {button === 'Delete' ? (
                <Svg
                  width={buttonSize * 0.4}
                  height={buttonSize * 0.4}
                  strokeWidth={2}
                  stroke="#fff"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <Path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9.75 14.25 12m0 0 2.25 2.25M14.25 12l2.25-2.25M14.25 12 12 14.25m-2.58 4.92-6.374-6.375a1.125 1.125 0 0 1 0-1.59L9.42 4.83c.21-.211.497-.33.795-.33H19.5a2.25 2.25 0 0 1 2.25 2.25v10.5a2.25 2.25 0 0 1-2.25 2.25h-9.284c-.298 0-.585-.119-.795-.33Z"
                  />
                </Svg>
              ) : button === 'OK' ? (
                <Svg
                  width={buttonSize * 0.4}
                  height={buttonSize * 0.4}
                  strokeWidth={2}
                  stroke="#fff"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <Path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </Svg>
              ) : (
                <View
                  style={{
                    width: buttonSize * 0.4,
                    height: buttonSize * 0.4,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Text className="text-black text-center text-4xl font-bold">
                    {button}
                  </Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
}

export default Keypad;
