import React, { useState, useEffect } from 'react';
import { View, Text ,useWindowDimensions} from 'react-native';
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
    <View className="relative flex w-full flex-row items-center justify-center p-8 ">
      <Text className="absolute bottom-2 left-8 text-3xl md:text-4xl text-gray-50">
        {new Date().toLocaleDateString('en-US')}
      </Text>
      <LogoNegative width={width * 0.3} height={width * 0.2} />

      <View className="absolute bottom-2 right-8 flex flex-row items-end justify-end gap-2">
        <Text className=" text-gray-50  text-3xl md:text-4xl">
          {currentTime.toLocaleTimeString('en-US')}
        </Text>
      </View>
    </View>
  );
}
