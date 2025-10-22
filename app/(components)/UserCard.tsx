import { View, Text, FlatList, Pressable } from 'react-native';
import React, { useState } from 'react';
import { useWindowDimensions } from 'react-native';
// import { UserCircle } from '../../lib/icons/UserCircle';

// Mock data para empleados - reemplaza con tus datos reales
const employees = [
  {
    id: '1',
    firstName: 'Juan',
    lastName: 'Pérez',
    email: 'juan.perez@postalhub.com',
    position: 'Operador',
    employeeId: 'EMP001'
  },
  {
    id: '2',
    firstName: 'María',
    lastName: 'González',
    email: 'maria.gonzalez@postalhub.com',
    position: 'Supervisor',
    employeeId: 'EMP002'
  },
  {
    id: '3',
    firstName: 'Carlos',
    lastName: 'Rodríguez',
    email: 'carlos.rodriguez@postalhub.com',
    position: 'Operador',
    employeeId: 'EMP003'
  },
  {
    id: '4',
    firstName: 'Ana',
    lastName: 'Martínez',
    email: 'ana.martinez@postalhub.com',
    position: 'Gerente',
    employeeId: 'EMP004'
  },
];

export default function UserCard() {
  const { width } = useWindowDimensions();
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);

  return (
      <FlatList
        data={employees}
        numColumns={2}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        columnWrapperStyle={{ justifyContent: 'space-between', gap: 2 }}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable
            style={{ marginHorizontal: 1, marginBottom: 12 }}
            className={`w-1/2 items-center justify-center rounded-xl bg-white p-4 shadow-md active:scale-95 ${
              selectedEmployee === item.id ? 'bg-blue-300' : ''
            }`}
            onPress={() => {
              setSelectedEmployee(selectedEmployee === item.id ? null : item.id);
              // console.log('Selected employee:', item);
            }}>
            <View className="relative flex w-full flex-col items-center justify-center">
              
              {/* Avatar Section */}
              <View className="mt-4 mb-4">
                {/* <UserCircle 
                  width={width * 0.15} 
                  height={width * 0.15} 
                  className="text-gray-600"
                /> */}
              </View>

              {/* Employee Info */}
              <View className="flex flex-col items-center justify-center mb-4 gap-2 w-full">
                <View className="flex flex-col items-center justify-center">
                  <Text className="text-center text-2xl font-bold">
                    {item.firstName}
                  </Text>
                  <Text className="text-center text-2xl font-bold">
                    {item.lastName}
                  </Text>
                </View>
                
                <View className="flex flex-col items-center justify-center">
                  <Text className="text-center text-lg font-semibold text-gray-600">
                    {item.position}
                  </Text>
                  <Text className="text-center text-sm text-gray-500">
                    {item.email}
                  </Text>
                </View>
              </View>

              {/* Employee ID at top */}
              <View className="absolute top-2 flex flex-col items-center justify-center">
                <View className="flex flex-col items-center justify-center">
                  <Text className="text-center text-xl font-bold">
                    {item.employeeId}
                  </Text>
                  <Text className="text-center text-sm text-gray-500">
                    Employee ID
                  </Text>
                </View>
              </View>

              {/* Selection indicator */}
              {selectedEmployee === item.id && (
                <View className="absolute top-2 right-2">
                  <View className="bg-blue-500 rounded-full w-6 h-6 flex items-center justify-center">
                    <Text className="text-white text-xs font-bold">✓</Text>
                  </View>
                </View>
              )}
            </View>
          </Pressable>
        )}
      />
   );
}