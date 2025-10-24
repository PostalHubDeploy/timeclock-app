import React, { useState, useEffect } from 'react';
import { View, Text, useWindowDimensions } from 'react-native';
import LogoNegative from '~/assets/images/postalhubnegativelogo.svg';

export default function Datetime() {
  const { width } = useWindowDimensions();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Cleanup function to clear the interval when component unmounts
    return () => clearInterval(timer);
  }, []);
  return (
    <View className="w-full ">
      <View className="w-full flex-row items-stretch justify-between p-4">
        {/* Left: Date */}
        <View className=" justify-end">
          <Text className="text-3xl text-gray-50 md:text-base">
            {new Date().toLocaleDateString('en-US')}
          </Text>
        </View>

        {/* Center: Logo */}
        <View className=" items-center justify-center">
          <LogoNegative width={width * 0.4} height={width * 0.3} />
        </View>

        {/* Right: Time */}
        <View className=" items-end justify-end">
          <Text className="text-3xl text-gray-50 md:text-4xl">
            {currentTime.toLocaleTimeString('en-US')}
          </Text>
        </View>
      </View>
    </View>
  );
}
