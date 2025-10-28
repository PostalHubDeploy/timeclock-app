import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput, Modal, ActivityIndicator } from 'react-native';
import { useWindowDimensions } from 'react-native';
import House from '~/assets/images/house.svg';
import { Button } from '~/components/ui/button';
import BranchSelect from '~/app/(components)/BranchSelect';
import { router } from 'expo-router';
import EmployeeSelect from './EmployeeSelect';
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
import Keypad from './Keypad';

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

export function PinDots({
  value,
  length = 4,
  error = false,
}: {
  value: string;
  length?: number;
  error?: boolean;
}) {
  const chars = value.split('');
  return (
    <View className="flex-row items-center justify-center gap-2">
      {Array.from({ length }).map((_, i) => {
        const filled = !!chars[i];
        return (
          <View
            key={i}
            className={`h-16 w-16 items-center justify-center rounded-xl border
              ${error ? 'border-rose-500 bg-rose-50' : 'border-zinc-300 bg-white'}`}>
            <Text className="text-7xl text-gray-800">{filled ? '•' : ' '}</Text>
          </View>
        );
      })}
    </View>
  );
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
  const [pinSubmitting, setPinSubmitting] = useState(false);

  const closeAllDropdowns = () => {
    setOpenDropdown(null);
  };
  const handleEmployeePicked = (emp: UserEmployee) => {
    setSelectedEmployee(emp);
    setInputValue(''); // hard reset stored PIN
    setTempInputValue(''); // modal input starts empty
    setErrorWarning(false);
    setShowPinModal(true); // open keypad immediately
    closeAllDropdowns?.();
  };
  const handleInputClick = async (button: string) => {
    if (errorWarning) setErrorWarning(false);

    if (button === 'Delete') {
      setTempInputValue((prev) => prev.slice(0, -1));
      return;
    }

    if (button === 'OK') {
      // Guard: need 4 digits + selections + not already submitting
      if (tempInputValue.length !== 4 || !selectedEmployee || !selectedBranch || pinSubmitting) {
        return;
      }

      try {
        setPinSubmitting(true);

        // Validate PIN against your API
        const ok = await loginWorker({
          workerId: selectedEmployee.employeeId,
          branch: selectedBranch.id,
          nip: tempInputValue,
        });

        if (ok) {
          // success → close modal and go to check-in
          setInputValue(''); // don’t persist PIN
          setTempInputValue('');
          setShowPinModal(false);
          router.push('/usercheckin');
        } else {
          // bad PIN → show inline error, keep modal open
          setErrorWarning(true);
        }
      } catch (e) {
        setErrorWarning(true);
      } finally {
        setPinSubmitting(false);
      }
      return;
    }

    // Digits
    setTempInputValue((prev) => (prev.length < 4 ? prev + button : prev));
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
  const handleNavigation = async () => {
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
    const response = await loginWorker({
      workerId: selectedEmployee?.employeeId || '',
      branch: selectedBranch?.id || '',
      nip: inputValue,
    });

    if (!response) {
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
      console.log('Fetched branches from API:', branches);
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
      console.log('employees', employees);
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
    <View className=" flex  w-full flex-1  flex-col items-center justify-start  gap-2 rounded-2xl bg-gray-50 p-4">
      {/* Overlay to close dropdowns when clicking outside */}
      {openDropdown && (
        <Pressable
          onPress={closeAllDropdowns}
          className="absolute inset-0 z-30"
          style={{ backgroundColor: 'transparent' }}
        />
      )}
      {/* Header */}
      <View className="flex items-center justify-center  ">
        <View className="flex flex-col items-center justify-center gap-2 ">
          <House width={50} height={50} />
          <View className="flex items-center justify-center ">
            <Text className="text-xl font-bold  ">Welcome to the Time Clock</Text>
            <Text className=" text-xs  ">
              Tap to choose the branch, employee and enter your PIN
            </Text>
          </View>
        </View>
      </View>
      {/* Error Alert */}
      {/* {error && (
        <View className="mx-4 mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 shadow-sm md:mx-auto md:max-w-3xl">
          <Text className="text-center font-medium text-rose-700">{error}</Text>
          <Button
            className="mt-3 rounded-xl bg-rose-600 p-3"
            onPress={() => {
              setError(null);
              loadBranches();
            }}>
            <Text className="text-center font-semibold text-white">Retry</Text>
          </Button>
        </View>
      )} */}
      {/* Global Loading Indicator */}
      {(loadingStates.branches || loadingStates.validation) && (
        <View className="mx-4 mt-4 flex-row items-center gap-3 rounded-2xl border border-red-500 bg-red-100 p-4 shadow-sm md:mx-auto md:max-w-3xl">
          <ActivityIndicator size="small" color="#ea092b" />
          <Text className="font-medium ">
            {loadingStates.branches ? 'Loading branches...' : 'Validating data...'}
          </Text>
        </View>
      )}
      {/* Form Sections */}
      <View className="flex w-full flex-col items-center justify-center gap-2">
        <BranchList
          selectedBranch={selectedBranch}
          onSelectBranch={handleBranchSelect}
          availableBranches={availableBranches}
          placeholder="Select Branch"
          isOpen={openDropdown === 'branch'}
          onToggle={(isOpen) => setOpenDropdown(isOpen ? 'branch' : null)}
          disabled={loadingStates.branches || !initializationComplete}
        />

        <View className="flex w-full flex-col items-center justify-center gap-2">
          <EmployeeSelect
            selectedEmployee={selectedEmployee}
            onSelectedEmployee={handleEmployeePicked} // <-- was setSelectedEmployee
            availableEmployees={availableEmployees}
            placeholder="Select Employee"
            isOpen={openDropdown === 'employee'}
            onToggle={(isOpen) => setOpenDropdown(isOpen ? 'employee' : null)}
            disabled={!selectedBranch || loadingStates.employees || availableEmployees.length === 0}
          />
        </View>

        {/* <View className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm md:p-6">
          <Text className="mb-2 text-lg font-semibold text-zinc-800 md:text-xl">Employee PIN</Text>
          <Pressable onPress={openPinModal} disabled={!selectedEmployee}>
            <TextInput
              placeholder="Enter your Employee PIN"
              value={inputValue}
              readOnly
              editable={false}
              className={`h-14 w-full rounded-xl border text-center text-xl md:h-16 md:text-2xl ${
                !selectedEmployee
                  ? 'border-zinc-200 bg-zinc-100 text-zinc-400'
                  : 'border-zinc-300 bg-white text-zinc-800'
              }`}
            />
          </Pressable>
        </View> */}
      </View>
      {/* Bottom Action */}
      {/* <View className="z-0 w-full px-4 pb-6 md:px-8">
        <View className="mx-auto w-full max-w-4xl">
          <Button
            className={`rounded-2xl p-4 shadow-md md:p-5 ${
              canProceed ? 'bg-red-500' : 'bg-zinc-300'
            }`}
            disabled={!canProceed}
            onPress={() => {
              if (canProceed) {
                handleNavigation();
              }
            }}>
            <Text className="text-center text-lg font-semibold text-white md:text-2xl">
              Proceed
            </Text>
          </Button>
        </View>
      </View> */}
      {showPinModal && (
        <Modal visible transparent animationType="fade" onRequestClose={closePinModal}>
          <View className=" flex-1 items-center justify-center bg-[rgba(0,0,0,0.15)]">
            <View className="w-[92%] max-w-xl rounded-xl border border-gray-200 bg-white p-6 ">
              {/* Header */}
              <View className="mb-5 flex-row items-center justify-between">
                <View className="flex-row items-center gap-3">
                  {/* Avatar initials */}
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-red-100">
                    <Text className="text-base font-bold text-red-700">
                      {selectedEmployee
                        ? `${selectedEmployee.firstName?.[0] ?? ''}${selectedEmployee.lastName?.[0] ?? ''}`.toUpperCase()
                        : '•'}
                    </Text>
                  </View>
                  <View>
                    <Text className="text-xl font-bold text-zinc-900">
                      {selectedEmployee
                        ? `${selectedEmployee.firstName} ${selectedEmployee.lastName}`
                        : 'Enter Employee PIN'}
                    </Text>
                    <Text className="text-xs text-zinc-500">Secure entry • PIN requiredss</Text>
                  </View>
                </View>
                <Pressable onPress={closePinModal} hitSlop={8}>
                  <Text className="mt-[-25px] text-2xl text-zinc-400">✕</Text>
                </Pressable>
              </View>

              {/* PIN display */}
              <View className="mb-8 items-center">
                <PinDots value={tempInputValue} length={4} error={errorWarning} />
                {errorWarning ? (
                  <Text className="mt-2 text-xs text-rose-600">
                    PIN is incorrect. Please try again.
                  </Text>
                ) : (
                  <Text className="mt-2 text-xs text-zinc-500">Tap numbers to enter your PIN</Text>
                )}
              </View>

              {/* Keypad (now fits modal width) */}
              <View className="items-center justify-center py-2">
                <Keypad
                  onButtonClick={handleInputClick}
                  okButton={tempInputValue.length === 4 && !pinSubmitting}
                />
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}
