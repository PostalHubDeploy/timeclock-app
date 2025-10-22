import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useWindowDimensions } from 'react-native';
import { UserCircle } from '../../lib/icons/UserCircle';
import House from '~/assets/images/house.svg';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { router } from 'expo-router';
import CheckingOptions from './CheckinOptions';
import {
  obtenerInformacionEmpleado,
  obtenerInformacionSucursal,
  limpiarDatosEmpleado,
  obtenerWorkerLogueado,
} from '../../lib/services/timeclockStorage';
import {
  getEmployeeClock,
  clockIn,
  clockOut,
  startBreak,
  endBreak,
} from '../../lib/services/employeeService';

// Tipos de acciones disponibles
type TimeclockActionType = 'checkin' | 'clockout' | 'start_break' | 'end_break';

// Tipo para el componente CheckinOptions (mantener compatibilidad)
interface TimeclockAction {
  id: string;
  label: string;
  description: string;
  icon: string;
  enabled: boolean;
}

// Convertir tipos simples a objetos para CheckinOptions
const convertActionsToObjects = (actions: TimeclockActionType[]): TimeclockAction[] => {
  return actions.map((action) => {
    switch (action) {
      case 'checkin':
        return {
          id: 'check_in',
          label: 'Clock In',
          description: 'Start your workday',
          icon: 'clock-arrow-up',
          enabled: true,
        };
      case 'clockout':
        return {
          id: 'check_out',
          label: 'Clock Out',
          description: 'End your workday',
          icon: 'clock-arrow-down',
          enabled: true,
        };
      case 'start_break':
        return {
          id: 'break_start',
          label: 'Start Break',
          description: 'Take a break',
          icon: 'coffee',
          enabled: true,
        };
      case 'end_break':
        return {
          id: 'break_end',
          label: 'End Break',
          description: 'Return from break',
          icon: 'clock-arrow-up',
          enabled: true,
        };
      default:
        throw new Error(`Unknown action type: ${action}`);
    }
  });
};

// Estados de loading para diferentes operaciones
interface LoadingStates {
  initializing: boolean;
  fetchingStatus: boolean;
  submittingAction: boolean;
  fetchingTimeclock: boolean;
}

// Interface para la información del timeclock del día
interface Break {
  id: number;
  groupId: number;
  timeStart: string; // DateTime como string
  timeEnd: string; // DateTime como string
  editable: boolean;
}

interface DayTimeclock {
  id: number;
  userId: string;
  date: string; // DateTime como string
  clockIn?: string; // DateTime como string o null
  clockOut?: string; // DateTime como string o null
  breaks: Break[]; // Array de breaks
}

export default function UserCheckin() {
  // --- Timer de inactividad y modal ---
  const [showMessage, setShowMessage] = useState(false);
  const INACTIVITY_SECONDS = 5;
  const MODAL_SECONDS = 10;
  const [inactivityCountdown, setInactivityCountdown] = useState(INACTIVITY_SECONDS);
  const [modalCountdown, setModalCountdown] = useState(MODAL_SECONDS);
  const inactivityTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const modalTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Reinicia el timer de inactividad
  const resetInactivityTimer = () => {
    setInactivityCountdown(INACTIVITY_SECONDS);
    if (inactivityTimerRef.current) clearInterval(inactivityTimerRef.current);
    inactivityTimerRef.current = setInterval(() => {
      setInactivityCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(inactivityTimerRef.current!);
          setShowMessage(true);
          setModalCountdown(MODAL_SECONDS);
          return INACTIVITY_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Reinicia el timer del modal
  const resetModalTimer = () => {
    setModalCountdown(MODAL_SECONDS);
    if (modalTimerRef.current) clearInterval(modalTimerRef.current);
    modalTimerRef.current = setInterval(() => {
      setModalCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(modalTimerRef.current!);
          handleLogout();
          return MODAL_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Iniciar timer de inactividad al montar
  useEffect(() => {
    resetInactivityTimer();
    return () => {
      if (inactivityTimerRef.current) clearInterval(inactivityTimerRef.current);
      if (modalTimerRef.current) clearInterval(modalTimerRef.current);
    };
  }, []);

  // Cuando se muestra el modal, iniciar timer de modal
  useEffect(() => {
    if (showMessage) {
      resetModalTimer();
    } else {
      if (modalTimerRef.current) clearInterval(modalTimerRef.current);
      setModalCountdown(MODAL_SECONDS);
    }
  }, [showMessage]);

  // Función para envolver handlers de botones y reiniciar timer (soporta async)
  function withInactivityReset<T extends any[]>(fn: (...args: T) => Promise<void>): (...args: T) => Promise<void> {
    return async (...args: T) => {
      if (!showMessage) resetInactivityTimer();
      await fn(...args);
    };
  }
  const { width } = useWindowDimensions();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedBranch, setSelectedBranch] = useState<any>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [availableActions, setAvailableActions] = useState<TimeclockActionType[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dayTimeclock, setDayTimeclock] = useState<DayTimeclock | null>(null);
  const [allDaySessions, setAllDaySessions] = useState<DayTimeclock[]>([]);

  // Estados de loading
  const [loadingStates, setLoadingStates] = useState<LoadingStates>({
    initializing: true,
    fetchingStatus: false,
    submittingAction: false,
    fetchingTimeclock: false,
  });

  // Estado de acción seleccionada
  const [selectedAction, setSelectedAction] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 500);

    // Inicializar datos al cargar el componente
    const initializeUserCheckin = async () => {
      const hasUser = await loadStoredData();
      if (!hasUser) {
        router.replace('/');
      }
    };

    initializeUserCheckin();

    // Cleanup function to clear the interval when component unmounts
    return () => clearInterval(timer);
  }, []);

  // Timer para cuenta regresiva de timeout
 
  // Cargar datos guardados del empleado y sucursal
  const loadStoredData = async () => {
    try {
      setLoadingStates((prev) => ({ ...prev, initializing: true }));

      // Intentar cargar el worker logueado primero
      const loggedWorker = await obtenerWorkerLogueado();
      let employee = null;
      let branch = null;

      if (loggedWorker) {
        employee = {
          id: loggedWorker.id,
          firstName: loggedWorker.name.split(' ')[0] || loggedWorker.name,
          lastName: loggedWorker.name.split(' ').slice(1).join(' ') || '',
          employeeId: loggedWorker.id,
          email: loggedWorker.email,
        };
        setSelectedEmployee(employee);

        const storedBranch = await obtenerInformacionSucursal();
        if (storedBranch) {
          branch = {
            id: storedBranch.id,
            name: storedBranch.name,
            icon: <House width={20} height={20} />,
          };
          setSelectedBranch(branch);
        }
      } else {
        // Fallback a método anterior
        employee = await obtenerInformacionEmpleado();
        const storedBranch = await obtenerInformacionSucursal();

        if (employee) {
          setSelectedEmployee(employee);
        }

        if (storedBranch) {
          branch = {
            id: storedBranch.id,
            name: storedBranch.name,
            icon: <House width={20} height={20} />,
          };
          setSelectedBranch(branch);
        }
      }

      // Si tenemos empleado, cargar su timeclock del día
      if (employee) {
        await loadEmployeeTimeclock(employee.id);
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Error loading stored data:', error);
      setError('Error loading employee data. Please try again.');
      return false;
    } finally {
      setLoadingStates((prev) => ({ ...prev, initializing: false }));
    }
  };

  // Cargar información del timeclock del día del empleado
  const loadEmployeeTimeclock = async (employeeId: string) => {
    try {
      setLoadingStates((prev) => ({ ...prev, fetchingTimeclock: true }));
      setError(null);

      // console.log('Loading employee timeclock for:', employeeId, 'Type:', typeof employeeId);

      // Validar que el employeeId sea válido
      if (!employeeId || employeeId.trim() === '') {
        throw new Error('Invalid employee ID: empty or null');
      }

      // console.log('Calling getEmployeeClock with:', employeeId);

      const timeclockData = await getEmployeeClock(employeeId);
      // console.log('Raw timeclock response:', timeclockData);

      // La API devuelve un array, necesitamos encontrar la sesión activa o más reciente
      let dayTimeclockData = null;
      if (timeclockData && Array.isArray(timeclockData) && timeclockData.length > 0) {
        // console.log('Processing array of timeclock sessions:', timeclockData);

        // Buscar la sesión activa (sin clockOut) primero
        const activeSession = timeclockData.find((session) => session.clockIn && !session.clockOut);

        if (activeSession) {
          // console.log('Found active session (no clockOut):', activeSession);
          dayTimeclockData = activeSession;
        } else {
          // Si no hay sesión activa, tomar la más reciente (último elemento del array)
          dayTimeclockData = timeclockData[timeclockData.length - 1];
          // console.log('No active session found, using most recent:', dayTimeclockData);
        }
      } else if (timeclockData && !Array.isArray(timeclockData)) {
        // En caso de que la API cambie y devuelva un objeto directo
        dayTimeclockData = timeclockData;
        // console.log('Single timeclock object received:', dayTimeclockData);
      }

      if (dayTimeclockData) {
        setDayTimeclock(dayTimeclockData);

        // Guardar todas las sesiones del día si hay múltiples
        if (Array.isArray(timeclockData)) {
          setAllDaySessions(timeclockData);
          // console.log('All day sessions saved:', timeclockData);
        } else {
          setAllDaySessions([dayTimeclockData]);
        }

        // console.log('=== TIMECLOCK DATA PROCESSED ===');
        // console.log('Active/Current session:', JSON.stringify(dayTimeclockData, null, 2));
        // console.log('clockIn value:', dayTimeclockData.clockIn);
        // console.log('clockOut value:', dayTimeclockData.clockOut);
        // console.log('breaks array:', dayTimeclockData.breaks);
        // console.log('Total sessions today:', Array.isArray(timeclockData) ? timeclockData.length : 1);
        // console.log('================================');

        // Determinar acciones disponibles basado en el estado del timeclock
        await determineAvailableActions(dayTimeclockData);
      } else {
        // No hay datos de timeclock para hoy, permitir clock in
        // console.log('No timeclock data found, setting null and allowing only checkin');
        setDayTimeclock(null);
        setAllDaySessions([]);
        setAvailableActions(['checkin']);
      }
    } catch (error) {
      console.error('Error loading employee timeclock:', error);
      setError('Error loading timeclock data. Please try again.');
      setDayTimeclock(null);

      // En caso de error, permitir solo clock in
      setAvailableActions(['checkin']);
    } finally {
      setLoadingStates((prev) => ({ ...prev, fetchingTimeclock: false }));
    }
  };

  // Determinar acciones disponibles basado en el estado del timeclock
  const determineAvailableActions = async (timeclockData: DayTimeclock) => {
    // console.log('determineAvailableActions called with:', timeclockData);
    // console.log('clockIn status:', timeclockData.clockIn);
    // console.log('clockOut status:', timeclockData.clockOut);
    // console.log('breaks:', timeclockData.breaks);

    const actions: TimeclockActionType[] = [];

    // Verificar si tiene clockIn y NO tiene clockOut (sesión activa)
    const hasActiveSession = timeclockData.clockIn && !timeclockData.clockOut;

    if (hasActiveSession) {
      // Sesión activa - NO permitir clockin para evitar errores de registro
      // console.log('Active session found - clockIn exists, no clockOut. Hiding clockin button.');
      // console.log('All breaks:', timeclockData.breaks);

      // Verificar si está en break actualmente
      // Un break está activo si timeEnd es null, undefined o la fecha epoch (1970-01-01)
      const activeBreak = timeclockData.breaks?.find((b) => {
        // console.log(`Checking break ${b.id}: timeEnd = ${b.timeEnd}`);
        if (!b.timeEnd) {
          // console.log('Break has no timeEnd (null/undefined) - ACTIVE');
          return true; // null o undefined
        }
        const timeEndDate = new Date(b.timeEnd);
        const epochDate = new Date('1970-01-01T00:00:00.000Z');
        const isEpoch = timeEndDate.getTime() === epochDate.getTime();
        // console.log(`Break timeEnd: ${timeEndDate.toISOString()}, isEpoch: ${isEpoch}`);
        return isEpoch; // Fecha epoch indica break activo
      });
      // console.log('Active break found:', activeBreak);

      if (activeBreak) {
        // Está en break, solo permitir terminar break
        // console.log('In active break, allowing only end_break');
        actions.push('end_break');
      } else {
        // No está en break, permitir break y clock out
        // console.log('Not in break, allowing start_break and clockout');
        actions.push('start_break');
        actions.push('clockout');
      }
    } else {
      // No hay sesión activa - permitir clockin
      // console.log('No active session - allowing clockin');
      actions.push('checkin');

      if (timeclockData.clockIn && timeclockData.clockOut) {
        // Ya hizo clock in y clock out - sesión completada
        // console.log('Session completed - both clockIn and clockOut exist');
      }
    }

    // console.log('Final available actions:', actions);
    setAvailableActions(actions);
  };

  // Manejar acción de checkin/checkout
  const handleTimeclockAction = async (actionType: string) => {
    if (!selectedEmployee || !selectedBranch) {
      setError('Missing employee or branch information');
      return;
    }

    try {
      setLoadingStates((prev) => ({ ...prev, submittingAction: true }));
      setSelectedAction(actionType);
      setError(null);

      let result;

      switch (actionType) {
        case 'check_in':
          result = await clockIn(selectedEmployee.id);
          // console.log('Clock in successful:', result);
          break;

        case 'check_out':
          result = await clockOut(selectedEmployee.id);
          // console.log('Clock out successful:', result);
          break;

        case 'break_start':
          result = await startBreak(selectedEmployee.id);
          // console.log('Break start successful:', result);
          break;

        case 'break_end':
          result = await endBreak(selectedEmployee.id);
          // console.log('Break end successful:', result);
          break;

        default:
          throw new Error(`Unknown action type: ${actionType}`);
      }

      // Recargar datos del timeclock después del éxito
      await loadEmployeeTimeclock(selectedEmployee.id);

      // Forzar una actualización adicional después de un breve delay para asegurar sincronización
      setTimeout(async () => {
        // console.log('Performing delayed refresh after action:', actionType);
        await loadEmployeeTimeclock(selectedEmployee.id);
      }, 1000);

      setSelectedAction(null);
    } catch (error) {
      console.error('Error submitting timeclock action:', error);
      setError(`Error recording ${actionType.replace('_', ' ')}. Please try again.`);
      setSelectedAction(null);
    } finally {
      setLoadingStates((prev) => ({ ...prev, submittingAction: false }));
    }
  };

  // Manejar cierre y regreso
  const handleClose = () => {
    router.back();
  };

  // Manejar logout
  const handleLogout = async () => {
    // Limpiar solo los datos del empleado, mantener la sucursal guardada
    await limpiarDatosEmpleado();
    setSelectedEmployee(null);
    setAvailableActions([]);
    setShowMessage(false);
    router.push('/');
  };

  // Obtener mensaje de estado
  const getStatusMessage = () => {
    if (loadingStates.initializing) return 'Initializing...';
    if (loadingStates.fetchingTimeclock) return 'Loading timeclock data...';
    if (loadingStates.submittingAction) return `Processing ${selectedAction?.replace('_', ' ')}...`;

    if (dayTimeclock) {
      if (!dayTimeclock.clockIn) {
        return 'Ready to start your workday';
      } else if (dayTimeclock.clockOut) {
        return 'Workday completed - Ready for new clock in';
      } else {
        // Verificar si está en break (mismo lógica que en determineAvailableActions)
        const activeBreak = dayTimeclock.breaks?.find((b) => {
          if (!b.timeEnd) return true; // null o undefined
          const timeEndDate = new Date(b.timeEnd);
          const epochDate = new Date('1970-01-01T00:00:00.000Z');
          return timeEndDate.getTime() === epochDate.getTime(); // Fecha epoch indica break activo
        });
        if (activeBreak) {
          return 'Currently on break';
        } else {
          return 'Currently clocked in - Active session';
        }
      }
    }

    return 'Ready to clock in';
  };

  return (
    <View className="relative h-full w-full flex-1 items-center justify-start gap-1">
      <Text className="text-postal-red rounded-[10px] bg-gray-200 p-2 text-4xl font-bold">
        Time Clock
      </Text>

      {/* Información del empleado */}
      <View className="w-full flex-col items-center justify-center gap-4 p-2">
        <View className="flex flex-row items-center justify-center gap-4">
          <View>
            <UserCircle width={40} height={40} />
          </View>
          <View className="flex flex-col items-start justify-center">
            <Text className="text-xl  font-bold text-zinc-600 md:text-2xl">
              Hi,{' '}
              {selectedEmployee
                ? `${selectedEmployee.firstName} ${selectedEmployee.lastName}`
                : 'User'}
            </Text>
            <Text className="text-wrap text-gray-500 md:text-2xl">
              {selectedBranch ? `Working at ${selectedBranch.name} branch` : 'No branch selected'}
            </Text>
          </View>
        </View>

        <View className="mt-4 rounded-lg bg-blue-100 p-3">
          <Text className="text-center text-lg text-gray-600">{getStatusMessage()}</Text>
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
              if (selectedEmployee) {
                loadEmployeeTimeclock(selectedEmployee.id);
              }
            }}>
            <Text className="text-white">Retry</Text>
          </Button>
        </View>
      )}

      {/* Indicador de loading */}
      {/* {(loadingStates.initializing ||
          loadingStates.fetchingTimeclock ||
          loadingStates.submittingAction) && (
          <View className="flex-row items-center gap-2 rounded-lg bg-blue-100 p-4">
            <ActivityIndicator size="small" color="#3b82f6" />
            <Text className="text-blue-700">
              {loadingStates.initializing
                ? 'Loading...'
                : loadingStates.fetchingTimeclock
                  ? 'Loading timeclock...'
                  : loadingStates.submittingAction
                    ? 'Processing...'
                    : 'Working...'}
            </Text>
          </View>
        )} */}

      {/* Botones de acción de checkin */}
      {!loadingStates.initializing && availableActions.length > 0 && (
        <View className="flex flex-row flex-wrap items-center justify-center gap-4 px-4">
          <CheckingOptions
            actions={convertActionsToObjects(availableActions)}
            onActionPress={withInactivityReset(handleTimeclockAction)}
            disabled={loadingStates.submittingAction}
            selectedAction={selectedAction}
          />
        </View>
      )}

      {/* Información del timeclock del día */}
      {dayTimeclock && (
        <View className="mx-4 rounded-lg bg-gray-100 p-4">
          <Text className="mb-2 text-center text-sm font-semibold text-gray-800">
            Today's Timeclock
            {allDaySessions.length > 1 && (
              <Text className="text-xs text-green-600"> • {allDaySessions.length} sessions</Text>
            )}
          </Text>

          {/* Horas trabajadas */}
          {/* {dayTimeclock.clockIn && (
            <View className="mb-2 p-2 bg-blue-50 rounded-lg">
              <Text className="text-center text-sm font-medium text-blue-800">
                Current Session: {calculateWorkedHours(dayTimeclock)}
              </Text>
              {allDaySessions.length > 1 && (
                <Text className="text-center text-sm font-medium text-green-800 mt-1">
                  Total Today: {calculateTotalDayHours(allDaySessions)}
                </Text>
              )}
              {!dayTimeclock.clockOut && (
                <Text className="text-center text-xs text-blue-600 mt-1">
                  (In progress)
                </Text>
              )}
            </View>
          )} */}

          {dayTimeclock.clockIn && (
            <Text className="text-md text-center text-gray-600">
              Clock In: {new Date(dayTimeclock.clockIn).toLocaleTimeString()}
            </Text>
          )}

          {dayTimeclock.clockOut && (
            <Text className="text-center text-xs text-gray-600">
              Clock Out: {new Date(dayTimeclock.clockOut).toLocaleTimeString()}
            </Text>
          )}

          {dayTimeclock.breaks && dayTimeclock.breaks.length > 0 && (
            <View className="mt-2">
              <Text className="text-center text-xs font-medium text-gray-700">
                Breaks: {dayTimeclock.breaks.length}
              </Text>
              {/* {dayTimeclock.breaks.map((breakItem, index) => {
                  // Verificar si el break está activo (mismo lógica)
                  const isActiveBreak =
                    !breakItem.timeEnd ||
                    new Date(breakItem.timeEnd).getTime() ===
                      new Date('1970-01-01T00:00:00.000Z').getTime();

                  return (
                    <Text key={breakItem.id} className="text-center text-xs text-gray-500">
                      {new Date(breakItem.timeStart).toLocaleTimeString()} -{' '}
                      {isActiveBreak ? 'Active' : new Date(breakItem.timeEnd).toLocaleTimeString()}
                    </Text>
                  );
                })} */}
            </View>
          )}
        </View>
      )}

      {/* Botón de cierre */}

      <View className=" w-full flex-row items-center justify-between  p-4">
        <Button
          className="flex w-full flex-row items-center justify-center bg-red-600 p-8 shadow-xl"
          onPress={withInactivityReset(handleLogout)}>
          <Text className="text-2xl text-gray-50">Close</Text>
        </Button>
      </View>
      {/* Modal de advertencia de timeout */}
      {showMessage && (
        <View className="absolute bottom-0 left-0 right-0 top-0 z-30 flex h-full w-full items-center justify-center">
          <View className="absolute h-full w-full bg-black opacity-70" />
          <View className="z-40 w-[80%] items-center justify-center gap-6 rounded-lg bg-white p-8 shadow-lg">
            <Text className="text-2xl font-bold text-red-600">⏰ Session Expiring</Text>

            <Text className="text-center text-xl text-zinc-600">Your session will expire in:</Text>

            <View className="flex items-center justify-center rounded-full bg-red-100 p-6">
              <Text className="text-4xl font-bold text-red-600">{modalCountdown}</Text>
              <Text className="text-lg text-red-600">seconds</Text>
            </View>

            <Text className="text-center text-lg text-zinc-500">
              Do you want to continue using the kiosk?
            </Text>

            <View className="flex w-full flex-row items-center justify-center gap-4">
              <Button
                className="w-1/2 rounded-2xl border border-red-300 bg-red-500 p-6"
                onPress={() => {
                  setShowMessage(false);
                  if (modalTimerRef.current) clearInterval(modalTimerRef.current);
                  setModalCountdown(MODAL_SECONDS);
                  resetInactivityTimer();
                }}>
                <Text className="text-xl text-white">Back</Text>
              </Button>
              <Button
                className="w-1/2 rounded-2xl border border-green-300 bg-green-500 p-6"
                onPress={handleLogout}>
                <Text className="text-xl text-white">Logout</Text>
              </Button>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
