import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    Pressable,
    FlatList,
    ActivityIndicator,
    TouchableWithoutFeedback,
    Keyboard,
} from 'react-native';
import House from '~/assets/images/house.svg';
import { ArrowLeft } from '~/lib/icons/ArrowLeft';
import { UserCircle } from '../../lib/icons/UserCircle';
import { informacionEmpleado, obtenerInformacionEmpleado } from '~/lib/services/timeclockStorage';
import { EmployeeApi } from '~/lib/services/branchService';
import { useWindowDimensions } from 'react-native';

interface UserEmployee {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
}

interface EmployeeSelectProps {
    selectedEmployee: UserEmployee | null;
    onSelectedEmployee: (employee: UserEmployee) => void;
    availableEmployees: EmployeeApi[];
    placeholder?: string;
    isOpen?: boolean;
    onToggle?: (isOpen: boolean) => void;
    disabled?: boolean;
}

export default function EmployeeSelect({
    selectedEmployee,
    onSelectedEmployee,
    availableEmployees,
    placeholder = 'Select Employee',
    isOpen: controlledIsOpen,
    onToggle,
    disabled = false,
}: EmployeeSelectProps) {
    const [internalIsOpen, setInternalIsOpen] = useState(false);
    const {height, width} = useWindowDimensions();
    console.log('Window dimensions:', {height, width});
    const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

    const setOpenState = (newState: boolean) => {
        if (onToggle) {
            onToggle(newState);
        } else {
            setInternalIsOpen(newState);
        }
    };

    const toggleOpen = () => setOpenState(!isOpen);

    // Convertir EmployeeApi[] a UserEmployee[] para el renderizado
    const convertedEmployees: UserEmployee[] = availableEmployees.map(emp => ({
        id: emp.id,
        firstName: emp.name.split(' ')[0] || emp.name,
        lastName: emp.name.split(' ').slice(1).join(' ') || '',
        employeeId: emp.id,
    }));

    const handleSelectEmployee = (employee: UserEmployee) => {
        onSelectedEmployee(employee);
        informacionEmpleado(employee); // Guardar la información completa del empleado seleccionado en el almacenamiento local
        setOpenState(false);
        Keyboard.dismiss();
    };

    const renderEmployeeItem = useCallback(
        ({ item }: { item: UserEmployee }) => (
            <Pressable
                className={`m-2  flex-col justify-center items-center  h-40 rounded-2xl border-b border-gray-200 p-4 ${
                    selectedEmployee?.id === item.id ? 'bg-blue-50' : 'bg-gray-100'
                }`}
                onPress={() => {
                    handleSelectEmployee(item);
                    // console.log('Selected employee:', item);
                }}
                accessibilityRole="button"
                style={{width: width * 0.3}}
                accessibilityState={{ selected: selectedEmployee?.id === item.id }}>
                <View className="flex w-full flex-col items-center justify-center">
                    {/* Avatar Section */}
                    <View className="mb-4 mt-4">
                        <UserCircle width={40} height={40} color={selectedEmployee?.id === item.id ? '#2563EB' : '#6B7280'}/>
                    </View>

                    {/* Employee Info */}
                    <View className="mb-4 flex w-full flex-col items-center justify-center gap-2">
                        <View className="flex flex-col items-center justify-center">
                            <Text className={`text-center text-2xl font-bold text-wrap ${selectedEmployee?.id === item.id ? 'text-blue-700' : 'text-gray-900'}`}>
                                {item.firstName} {item.lastName}
                            </Text>
                        </View>
                    </View>

                    {/* Employee ID at top */}
                    {/* <View className="absolute top-2 flex flex-col items-center justify-center">
                        <View className="flex flex-col items-center justify-center">
                            <Text className="text-center text-xl font-bold">{item.employeeId}</Text>
                            <Text className="text-center text-sm text-gray-500">Employee ID</Text>
                        </View>
                    </View> */}

                    {/* Selection indicator */}
                    {selectedEmployee?.id === item.id && (
                        <View className="absolute right-2 top-2">
                            <View className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500">
                                <Text className="text-xs font-bold text-white">✓</Text>
                            </View>
                        </View>
                    )}
                </View>
            </Pressable>
        ),
        [selectedEmployee]
    );

    return (
    <View className="w-full shadow-inner rounded-lg border border-gray-300 bg-white ">

{/* 
            <Pressable
                onPress={toggleOpen}
                disabled={disabled}
                className={`flex-row items-center justify-between border border-gray-300 p-4 shadow-sm ${
                    disabled ? 'bg-gray-100 opacity-50' : 'bg-white'
                }`}
                style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.1,
                    shadowRadius: 2,
                    elevation: 2,
                }}
                accessibilityRole="button"
                accessibilityLabel="Seleccionar empleado">
                <View className="flex-1 flex-row items-center gap-3">
                    <UserCircle width={20} height={20} />
                    <Text className={`text-lg ${selectedEmployee ? 'text-gray-900' : 'text-gray-500'} ${disabled ? 'text-gray-400' : ''}`}>
                        {selectedEmployee
                            ? `${selectedEmployee.firstName} ${selectedEmployee.lastName}`.trim()
                            : placeholder}
                    </Text>
                </View>

                <View
                    style={{
                        transform: [{ rotate: isOpen ? '90deg' : '-90deg' }],
                    }}>
                    <ArrowLeft width={20} height={20} />
                </View>
            </Pressable>
            {isOpen && !disabled && ( */}
                <FlatList
                    data={convertedEmployees}
                    renderItem={renderEmployeeItem}
                    keyExtractor={(item) => item.id}
                    horizontal={true}
                    style={{ paddingVertical: 10}}  
                    ListEmptyComponent={
                        <View className="w-full items-center py-6">
                            <Text>No se encontraron empleados.</Text>
                        </View>
                    }
                />
            {/* )} */}
    
        </View>
    );
}
