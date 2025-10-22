import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput, Modal, ActivityIndicator } from 'react-native';
import { useWindowDimensions } from 'react-native';
import House from '~/assets/images/house.svg';
import { Button } from '~/components/ui/button';
import BranchSelect from '~/app/(components)/BranchSelect';
import { router } from 'expo-router';
import EmployeeSelect from './EmployeeSelect';
import { Keypad } from './Keypad';
import { obtenerInformacionEmpleado } from '../../lib/services/timeclockStorage';
import {
  obtenerInformacionSucursal,
  reconstruirBranchConIcono,
} from '../../lib/services/timeclockStorage';
import {
  fetchBranchAPI,
  fetchBranches,
  fetchEmployeesByBranch,
  fetchEmployeesAPI,
  validateBranchExists,
  validateBranchApiExists,
  validateEmployeeInBranch,
  validateEmployeeApiInBranch,
  type Branch as ApiBranch,
  type Employee as ApiEmployee,
  type BranchApi,
  type EmployeeApi,
  loginWorker,
} from '../../lib/services/branchService';
import BranchList from './BranchList';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Branch {
  id: string;
  name: string;
  icon?: React.ReactNode;
}

interface UserEmployee {
  id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  email?: string;
  position?: string;
  branchId?: string;
  active?: boolean;
}

// Estados de loading para diferentes fases
interface LoadingStates {
  branches: boolean;
  employees: boolean;
  validation: boolean;
}

export default function KioskoLayout() {
  const { width } = useWindowDimensions();
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<UserEmployee | null>(null);
  const [openDropdown, setOpenDropdown] = useState<'branch' | 'employee' | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [tempInputValue, setTempInputValue] = useState('');
  const [errorWarning, setErrorWarning] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);

  // Estados de loading y datos
  const [loadingStates, setLoadingStates] = useState<LoadingStates>({
    branches: true,
    employees: false,
    validation: false,
  });
  const [availableBranches, setAvailableBranches] = useState<BranchApi[]>([]);
  const [availableEmployees, setAvailableEmployees] = useState<EmployeeApi[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [initializationComplete, setInitializationComplete] = useState(false);

  const closeAllDropdowns = () => {
    setOpenDropdown(null);
  };

  const handleInputClick = (button: string) => {
    // Dismiss error if active
    if (errorWarning) setErrorWarning(false);

    if (button === 'Delete') {
      setTempInputValue((prev) => prev.slice(0, -1));
    } else if (button === 'OK') {
      // Validar que tenga al menos 3 caracteres
      if (tempInputValue.length >= 3) {
        setInputValue(tempInputValue);
        setShowPinModal(false);
        setTempInputValue('');
        // console.log('Employee PIN entered:', tempInputValue);
      } else {
        setErrorWarning(true);
      }
    } else {
      setTempInputValue((prev) => (prev.length < 15 ? prev + button : prev));
    }
  };

  const openPinModal = () => {
    setTempInputValue(inputValue);
    setErrorWarning(false);
    setShowPinModal(true);
    closeAllDropdowns();
  };

  const closePinModal = () => {
    setShowPinModal(false);
    setTempInputValue('');
    setErrorWarning(false);
  };

  // Función para limpiar el PIN cuando se navega de vuelta
  const handleNavigation =async () => {
    // Validar que todos los datos están completos antes de navegar
    if (
      !canProceed ||
      loadingStates.branches ||
      loadingStates.employees ||
      loadingStates.validation
    ) {
      console.warn('Cannot proceed: data not ready or loading in progress');
      return;
    }
    const response=await loginWorker({
      workerId: selectedEmployee?.employeeId || '',
      branch: selectedBranch?.id || '',
      nip: inputValue
    });

    if(!response){
      setError('Login failed. Please check your PIN and try again.');
      return;
    }

    setInputValue(''); // Limpiar el PIN por seguridad
    router.push('/usercheckin');
  };

  // Funciones de fetch con manejo de estados
  const loadBranches = async () => {
    try {
      setLoadingStates((prev) => ({ ...prev, branches: true }));
      setError(null);

      // const branches = await fetchBranches();
      const branches = await fetchBranchAPI();
      setAvailableBranches(branches);

      // console.log('Branches loaded successfully:', branches.length);
    } catch (error) {
      // console.error('Error loading branches:', error);
      setError('Error loading branches. Please try again.');
    } finally {
      setLoadingStates((prev) => ({ ...prev, branches: false }));
    }
  };

  const loadEmployeesForBranch = async (branchId: string) => {
    try {
      setLoadingStates((prev) => ({ ...prev, employees: true }));
      setError(null);

      const employees = await fetchEmployeesAPI(branchId);
      setAvailableEmployees(employees);

      // console.log(`Employees loaded for branch ${branchId}:`, employees.length);
    } catch (error) {
      // console.error(`Error loading employees for branch ${branchId}:`, error);
      setError('Error loading employees. Please try again.');
      setAvailableEmployees([]);
    } finally {
      setLoadingStates((prev) => ({ ...prev, employees: false }));
    }
  };

  const validateAndRestoreStoredData = async () => {
    try {
      setLoadingStates((prev) => ({ ...prev, validation: true }));

      // Recuperar datos guardados
      const storedBranch = await obtenerInformacionSucursal();
      const storedEmployee = await obtenerInformacionEmpleado();

      if (storedBranch && availableBranches.length > 0) {
        // Validar que la sucursal guardada aún existe
        const validBranch = validateBranchApiExists(availableBranches, storedBranch.id);

        if (validBranch) {
          // Reconstruir objeto Branch con icono
          const branchWithIcon: Branch = {
            id: validBranch.sucursalId,
            name: validBranch.name,
            icon: <House width={60} height={60} />,
          };
          setSelectedBranch(branchWithIcon);

          // Cargar empleados de la sucursal validada
          await loadEmployeesForBranch(validBranch.sucursalId);

          // console.log('Stored branch validated and restored:', validBranch.name);
        } else {
          // console.warn('Stored branch no longer exists, clearing stored data');
          // La sucursal guardada ya no existe, limpiar datos
        }
      }

      if (storedEmployee && availableEmployees.length > 0) {
        // Validar que el empleado guardado aún existe en la sucursal actual
        const validEmployee = validateEmployeeApiInBranch(availableEmployees, storedEmployee.id);

        if (validEmployee) {
          // Convertir EmployeeApi a UserEmployee
          const userEmployee: UserEmployee = {
            id: validEmployee.id,
            firstName: validEmployee.name.split(' ')[0] || validEmployee.name,
            lastName: validEmployee.name.split(' ').slice(1).join(' ') || '',
            employeeId: validEmployee.id,
          };
          setSelectedEmployee(userEmployee);
          // console.log('Stored employee validated and restored:', validEmployee.name);
        } else {
          // console.warn('Stored employee no longer exists in current branch, clearing stored data');
          // El empleado guardado ya no existe en esta sucursal
        }
      }
    } catch (error) {
      console.error('Error validating stored data:', error);
      setError('Error validating stored data.');
    } finally {
      setLoadingStates((prev) => ({ ...prev, validation: false }));
    }
  };

  // Manejar selección de sucursal
  const handleBranchSelect = (branch: Branch) => {
    setSelectedBranch(branch);
    setSelectedEmployee(null); // Limpiar empleado seleccionado
    setAvailableEmployees([]); // Limpiar lista de empleados

    // Cargar empleados de la nueva sucursal
    // Nota: branch.id ahora contiene sucursalId del servidor
    if (branch.id) {
      loadEmployeesForBranch(branch.id);
    }
  };

  const canProceed =
    selectedBranch &&
    selectedEmployee &&
    inputValue.length >= 3 &&
    !loadingStates.branches &&
    !loadingStates.employees &&
    !loadingStates.validation &&
    initializationComplete;

  // useEffect principal para inicialización
  useEffect(() => {
    const initializeData = async () => {
      // console.log('Initializing KioskoLayout...');

      // Fase 1: Cargar sucursales
      await loadBranches();

      setInitializationComplete(true);
      // console.log('KioskoLayout initialization complete');
    };

    initializeData();
  }, []);

  // useEffect para validar datos guardados cuando las sucursales estén disponibles
  useEffect(() => {
    if (availableBranches.length > 0 && initializationComplete) {
      validateAndRestoreStoredData();
    }
  }, [availableBranches, initializationComplete]);

  // useEffect para validar empleado guardado cuando los empleados estén disponibles
  useEffect(() => {
    if (availableEmployees.length > 0) {
      // Si hay un empleado guardado, validarlo
      const validateStoredEmployee = async () => {
        const storedEmployee = await obtenerInformacionEmpleado();
        if (storedEmployee) {
          const validEmployee = validateEmployeeApiInBranch(availableEmployees, storedEmployee.id);
          if (validEmployee) {
            // Convertir EmployeeApi a UserEmployee
            const userEmployee: UserEmployee = {
              id: validEmployee.id,
              firstName: validEmployee.name.split(' ')[0] || validEmployee.name,
              lastName: validEmployee.name.split(' ').slice(1).join(' ') || '',
              employeeId: validEmployee.id,
            };
            setSelectedEmployee(userEmployee);
          }
        }
      };

      validateStoredEmployee();
    }
  }, [availableEmployees]);

  return (
    <SafeAreaView className="relative w-full flex-1 items-center justify-start gap-4">
      {/* Overlay invisible para cerrar dropdowns cuando se hace clic fuera */}
      {openDropdown && (
        <Pressable
          onPress={closeAllDropdowns}
          className="absolute inset-0 z-30"
          style={{
            backgroundColor: 'transparent',
          }}
        />
      )}

      <Text className="text-postal-red rounded-3xl bg-gray-200 p-2 text-center text-4xl font-bold">
        Time Clock
      </Text>

      <View className="flex flex-row items-center justify-center gap-4">
        <House width={40} height={40} />
        <View className="flex flex-col">
          <Text className="text-xl font-bold text-zinc-600 md:text-4xl">
            Welcome to the Time Clock
          </Text>
          <Text className="text-wrap text-sm text-gray-500 md:text-4xl">
            {loadingStates.branches
              ? 'Loading branches...'
              : loadingStates.employees
                ? 'Loading employees...'
                : loadingStates.validation
                  ? 'Validating data...'
                  : 'Tap to choose the branch, employee and enter your PIN'}
          </Text>
        </View>
      </View>

      {/* Mostrar error si existe */}
      {error && (
        <View className="mx-4 rounded-lg bg-red-100 p-4">
          <Text className="text-center text-red-700">{error}</Text>
          <Button
            className="mt-2 bg-red-500 p-2"
            onPress={() => {
              setError(null);
              loadBranches();
            }}>
            <Text className="text-white">Retry</Text>
          </Button>
        </View>
      )}

      {/* Mostrar indicador de loading general */}
      {(loadingStates.branches || loadingStates.validation) && (
        <View className="flex-row items-center gap-2 rounded-lg bg-blue-100 p-4">
          <ActivityIndicator size="small" color="#3b82f6" />
          <Text className="text-blue-700">
            {loadingStates.branches ? 'Loading branches...' : 'Validating data...'}
          </Text>
        </View>
      )}

      <View className="z-40 w-full flex-col  p-4">
        {/* Componente de selección de sucursal */}
        <View className="mb-4 w-full">
          <Text className="p-1 text-center text-xl font-bold">Branch </Text>
          <BranchList
            selectedBranch={selectedBranch}
            onSelectBranch={handleBranchSelect}
            availableBranches={availableBranches}
            placeholder="Select Branch"
            isOpen={openDropdown === 'branch'}
            onToggle={(isOpen) => setOpenDropdown(isOpen ? 'branch' : null)}
            disabled={loadingStates.branches || !initializationComplete}
          />
        </View>

        {/* Componente de selección de empleado */}
        <View className="mb-4 w-full">
          {loadingStates.employees ? (
            <View className="flex-row items-center gap-2 rounded-lg bg-blue-50 p-4">
              <ActivityIndicator size="small" color="#3b82f6" />
              <Text className="text-blue-700">Loading employees...</Text>
            </View>
          ) : (
            <View>
                          <Text className="p-1 text-xl font-bold text-center">Employee</Text>

            <EmployeeSelect
              selectedEmployee={selectedEmployee}
              onSelectedEmployee={setSelectedEmployee}
              availableEmployees={availableEmployees}
              placeholder="Select Employee"
              isOpen={openDropdown === 'employee'}
              onToggle={(isOpen) => setOpenDropdown(isOpen ? 'employee' : null)}
              disabled={
                !selectedBranch || loadingStates.employees || availableEmployees.length === 0
              }
            />
            </View>
          )}
        </View>

        {/* Campo de PIN del empleado */}
        <View className="mb-4 w-full">
          <Text className="p-1 text-xl font-bold">Employee PIN</Text>
          <Pressable onPress={openPinModal} disabled={!selectedEmployee}>
            <TextInput
              placeholder="Enter your Employee PIN"
              value={inputValue}
              readOnly
              editable={false}
              className={`h-16 w-full items-center justify-center rounded-xl border text-center text-2xl ${
                !selectedEmployee
                  ? 'border-gray-200 bg-gray-100 text-gray-400'
                  : 'border-gray-300 bg-white'
              }`}
            />
          </Pressable>
        </View>
      </View>
      <View className=" z-0 w-full flex-row items-center justify-between rounded-3xl  p-4">
        {/* <Button
          className="flex w-2/6 flex-row items-center justify-center bg-red-600 p-8 shadow-xl"
        >
          <Text className="text-3xl text-gray-50">Exit</Text>
        </Button> */}
        <Button
          className={`flex w-full flex-row items-center justify-center   ${
            canProceed ? 'bg-red-500' : 'bg-gray-400'
          }`}
          disabled={!canProceed}
          onPress={() => {
            if (canProceed) {
              handleNavigation();
            }
          }}>
          <Text className="me-4 text-2xl text-gray-50">Proceed</Text>
        </Button>
      </View>

      {/* Modal para ingresar PIN */}
      {showPinModal && (
        <Modal
          visible={showPinModal}
          transparent={true}
          animationType="fade"
          onRequestClose={closePinModal}>
          <View
            className="flex-1 items-center justify-center "
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <View className="w-[90%] max-w-xl rounded-2xl bg-white p-6 shadow-lg">
              <View className="mb-4 flex-row items-center justify-between">
                <Text className="text-2xl font-bold text-gray-800">Enter Employee PIN</Text>
                <Pressable onPress={closePinModal}>
                  <Text className="text-2xl text-gray-500">✕</Text>
                </Pressable>
              </View>

              <TextInput
                placeholder="Employee PIN"
                value={tempInputValue}
                readOnly
                className={`mb-4 h-16 w-full items-center justify-center rounded-xl border text-center text-2xl ${
                  errorWarning ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white'
                }`}
              />

              {errorWarning && (
                <Text className="mb-4 text-center text-red-500">
                  PIN must be at least 3 characters
                </Text>
              )}

              <View className="items-center justify-center">
                <Keypad onButtonClick={handleInputClick} okButton={tempInputValue.length >= 3} />
              </View>

              <View className="mt-4 flex-row gap-4">
                {/* <Button className="flex-1 bg-gray-500 p-4" onPress={closePinModal}>
                  <Text className="text-center text-lg text-white">Cancel</Text>
                </Button> */}
                {/* <Button
                  className={`flex-1 p-4 ${
                    tempInputValue.length >= 3 ? 'bg-green-500' : 'bg-gray-400'
                  }`}
                  disabled={tempInputValue.length < 3}
                  onPress={() => handleInputClick('OK')}>
                  <Text className="text-center text-lg text-white">Confirm</Text>
                </Button> */}
              </View>
            </View>
          </View>
        </Modal>
      )}

     
    </SafeAreaView>
  );
}
