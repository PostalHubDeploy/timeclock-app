import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useWindowDimensions } from 'react-native';
import { ClockArrowUp } from '../../lib/icons/ClockArrowUp';
import { ClockArrowDown } from '../../lib/icons/ClockArrowDown';
import { ClockAlert } from '../../lib/icons/ClockAlert';
import { Coffee } from '../../lib/icons/Coffee';
import Toast from 'react-native-toast-message';

// Tipos de acciones disponibles
type TimeclockActionType = 'checkin' | 'checkout' | 'start_break' | 'end_break';

// Tipo para el componente CheckinOptions
interface TimeclockAction {
  id: string;
  label: string;
  description: string;
  icon: string;
  enabled: boolean;
}

interface CheckinOptionsProps {
  actions: TimeclockAction[];
  onActionPress: (actionType: string) => Promise<void>;
  disabled?: boolean;
  selectedAction?: string | null;
}

const getIconComponent = (iconName: string, color: string = 'white') => {
  const size = 28;
  switch (iconName) {
    case 'clock-in':
    case 'clock-arrow-up':
      return <ClockArrowUp width={size} height={size} color={color} />;
    case 'clock-out':
    case 'clock-arrow-down':
      return <ClockArrowDown width={size} height={size} color={color} />;
    case 'coffee':
      return <Coffee width={size} height={size} color={color} />;
    case 'clock-alert':
      return <ClockAlert width={size} height={size} color={color} />;
    default:
      return <ClockAlert width={size} height={size} color={color} />;
  }
};

const getButtonColor = (actionId: string) => {
  switch (actionId) {
    case 'check_in':
      return 'bg-green-600';
    case 'check_out':
      return 'bg-red-600';
    case 'break_start':
      return 'bg-amber-600';
    case 'break_end':
      return 'bg-blue-600';
    default:
      return 'bg-gray-600';
  }
};

export default function CheckinOptions({ 
  actions, 
  onActionPress, 
  disabled = false, 
  selectedAction 
}: CheckinOptionsProps) {
  const { height } = useWindowDimensions();

  const handleActionPress = async (action: TimeclockAction) => {
    if (disabled || !action.enabled) return;

    try {
      await onActionPress(action.id);
      
      // // Mostrar toast de confirmación
      // Toast.show({
      //   type: 'success',
      //   text1: `✅ ${action.label} successful`,
      //   text2: `Recorded at ${new Date().toLocaleTimeString()}`,
      //   position: 'top',
      //   autoHide: true,
      //   visibilityTime: 300,
      // });
    } catch (error) {
      // Toast.show({
      //   type: 'error',
      //   text1: `❌ ${action.label} failed`,
      //   text2: 'Please try again',
      //   position: 'top',
      //   autoHide: true,
      //   visibilityTime: 300,
      // });
    }
  };

    const getButtonOpacity = (action: TimeclockAction) => {
    if (disabled) return 0.3;
    if (!action.enabled) return 0.5;
    if (selectedAction === action.id) return 0.7; // Acción siendo procesada
    return 1;
  };

  if (actions.length === 0) {
    return (
      <View className="flex items-center justify-center p-8">
        <Text className="text-gray-500 text-lg">No actions available</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 }}>
      <View style={{ width: '100%', gap: 16 }}>
        {/* Primera fila: Check In y Check Out */}
        <View style={{ flexDirection: 'row', gap: 16, width: '100%' }}>
          {actions
            .filter(action => ['check_in', 'check_out'].includes(action.id))
            .map((action) => (
              <Pressable
                key={action.id}
                style={{
                  opacity: getButtonOpacity(action),
                  flex: 1,
                  height: height * 0.12,
                }}
                onPress={() => handleActionPress(action)}
                disabled={disabled || !action.enabled || selectedAction === action.id}
                className={`flex-row items-center justify-center gap-2 rounded-lg p-6 ${getButtonColor(action.id)}`}>
                {getIconComponent(action.icon)}
                <View className="flex-col items-center">
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: height * 0.035 }}>
                    {action.label}
                  </Text>
                  <Text style={{ color: '#fff', fontSize: height * 0.02, opacity: 0.8 }}>
                    {action.description}
                  </Text>
                </View>
              </Pressable>
            ))}
        </View>

        {/* Segunda fila: Break y Break Off */}
        <View style={{ flexDirection: 'row', gap: 16, width: '100%' }}>
          {actions
            .filter(action => ['break_start', 'break_end'].includes(action.id))
            .map((action) => (
              <Pressable
                key={action.id}
                style={{
                  opacity: getButtonOpacity(action),
                  flex: 1,
                  height: height * 0.12,
                }}
                onPress={() => handleActionPress(action)}
                disabled={disabled || !action.enabled || selectedAction === action.id}
                className={`flex-row items-center justify-center gap-2 rounded-lg p-6 ${getButtonColor(action.id)}`}>
                {getIconComponent(action.icon)}
                <View className="flex-col items-center">
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: height * 0.035 }}>
                    {action.label}
                  </Text>
                  <Text style={{ color: '#fff', fontSize: height * 0.02, opacity: 0.8 }}>
                    {action.description}
                  </Text>
                </View>
              </Pressable>
            ))}
        </View>
      </View>

      {/* Indicador de acción siendo procesada */}
      {/* {selectedAction && (
        <View className="mt-4 rounded-lg bg-blue-100 p-3">
          <Text className="text-center text-blue-700">
            Processing {actions.find(a => a.id === selectedAction)?.label}...
          </Text>
        </View>
      )} */}
    </View>
  );
}
