import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useWindowDimensions } from 'react-native';
import House from '~/assets/images/house.svg';
import { Button } from '~/components/ui/button';
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

// ---------------------- smart loader (no micro-flicker) ----------------------
function useSmartLoading(active: boolean, delay = 180, minVisible = 380) {
  const [visible, setVisible] = useState(false);
  const shownAtRef = useRef<number | null>(null);
  const showT = useRef<NodeJS.Timeout | null>(null);
  const hideT = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (active) {
      if (!visible && !showT.current) {
        showT.current = setTimeout(() => {
          shownAtRef.current = Date.now();
          setVisible(true);
          showT.current = null;
        }, delay);
      }
      if (hideT.current) {
        clearTimeout(hideT.current);
        hideT.current = null;
      }
    } else {
      if (showT.current) {
        clearTimeout(showT.current);
        showT.current = null;
      }
      if (!visible) return;
      const shownFor = shownAtRef.current ? Date.now() - shownAtRef.current : 0;
      const wait = Math.max(0, minVisible - shownFor);
      if (!hideT.current) {
        hideT.current = setTimeout(() => {
          setVisible(false);
          shownAtRef.current = null;
          hideT.current = null;
        }, wait);
      }
    }
    return () => {
      if (showT.current) clearTimeout(showT.current);
      if (hideT.current) clearTimeout(hideT.current);
      showT.current = null;
      hideT.current = null;
    };
  }, [active, delay, minVisible, visible]);

  return visible;
}

// ------------------------------- types ---------------------------------------
type TimeclockActionType = 'checkin' | 'clockout' | 'start_break' | 'end_break';

interface TimeclockAction {
  id: string;
  label: string;
  description: string;
  icon: string;
  enabled: boolean;
}

const convertActionsToObjects = (actions: TimeclockActionType[]): TimeclockAction[] =>
  actions.map((action) => {
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

interface LoadingStates {
  initializing: boolean;
  fetchingStatus: boolean;
  submittingAction: boolean;
  fetchingTimeclock: boolean;
}

interface Break {
  id: number;
  groupId: number;
  timeStart: string;
  timeEnd: string;
  editable: boolean;
}

interface DayTimeclock {
  id: number;
  userId: string;
  date: string;
  clockIn?: string;
  clockOut?: string;
  breaks: Break[];
}

// -------------------------------- component ----------------------------------
export default function UserCheckin() {
  // inactivity + modal
  const [showMessage, setShowMessage] = useState(false);
  const INACTIVITY_SECONDS = 30;
  const MODAL_SECONDS = 30;
  const [inactivityCountdown, setInactivityCountdown] = useState(INACTIVITY_SECONDS);
  const [modalCountdown, setModalCountdown] = useState(MODAL_SECONDS);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const modalTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  useEffect(() => {
    resetInactivityTimer();
    return () => {
      if (inactivityTimerRef.current) clearInterval(inactivityTimerRef.current);
      if (modalTimerRef.current) clearInterval(modalTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (showMessage) resetModalTimer();
    else {
      if (modalTimerRef.current) clearInterval(modalTimerRef.current);
      setModalCountdown(MODAL_SECONDS);
    }
  }, [showMessage]);

  function withInactivityReset<T extends any[]>(
    fn: (...args: T) => Promise<void>
  ): (...args: T) => Promise<void> {
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
  const [loadingStates, setLoadingStates] = useState<LoadingStates>({
    initializing: true,
    fetchingStatus: false,
    submittingAction: false,
    fetchingTimeclock: false,
  });
  const [selectedAction, setSelectedAction] = useState<string | null>(null);

  // delayed loaders => no flash
  const initLoadingVisible = useSmartLoading(loadingStates.initializing);
  const fetchLoadingVisible = useSmartLoading(loadingStates.fetchingTimeclock);

  // reduce churn: tick current time every 1s
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    const initializeUserCheckin = async () => {
      const hasUser = await loadStoredData();
      if (!hasUser) router.replace('/');
    };
    initializeUserCheckin();
    return () => clearInterval(timer);
  }, []);

  const loadStoredData = async () => {
    try {
      setLoadingStates((p) => ({ ...p, initializing: true }));
      const loggedWorker = await obtenerWorkerLogueado();
      let employee: any = null;
      let branch: any = null;

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
        employee = await obtenerInformacionEmpleado();
        const storedBranch = await obtenerInformacionSucursal();
        if (employee) setSelectedEmployee(employee);
        if (storedBranch)
          setSelectedBranch({
            id: storedBranch.id,
            name: storedBranch.name,
            icon: <House width={20} height={20} />,
          });
      }

      if (employee) {
        await loadEmployeeTimeclock(employee.id);
        return true;
      }
      return false;
    } catch (e) {
      console.error('Error loading stored data:', e);
      setError('Error loading employee data. Please try again.');
      return false;
    } finally {
      setLoadingStates((p) => ({ ...p, initializing: false }));
    }
  };

  // NOTE: keep previous content while fetching (no clearing), use {silent:true} for background revalidations
  const loadEmployeeTimeclock = async (employeeId: string, opts?: { silent?: boolean }) => {
    try {
      if (!opts?.silent) setLoadingStates((p) => ({ ...p, fetchingTimeclock: true }));
      setError(null);
      if (!employeeId || employeeId.trim() === '') throw new Error('Invalid employee ID');

      const timeclockData = await getEmployeeClock(employeeId);

      let dayTimeclockData: DayTimeclock | null = null;
      if (Array.isArray(timeclockData) && timeclockData.length > 0) {
        const active = timeclockData.find((s) => s.clockIn && !s.clockOut);
        dayTimeclockData = active || timeclockData[timeclockData.length - 1];
      } else if (timeclockData && !Array.isArray(timeclockData)) {
        dayTimeclockData = timeclockData;
      }

      if (dayTimeclockData) {
        setDayTimeclock(dayTimeclockData);
        setAllDaySessions(Array.isArray(timeclockData) ? timeclockData : [dayTimeclockData]);
        await determineAvailableActions(dayTimeclockData);
      } else {
        setDayTimeclock(null);
        setAllDaySessions([]);
        setAvailableActions(['checkin']);
      }
    } catch (e) {
      console.error('Error loading employee timeclock:', e);
      setError('Error loading timeclock data. Please try again.');
      // keep previous content to avoid flicker
    } finally {
      if (!opts?.silent) setLoadingStates((p) => ({ ...p, fetchingTimeclock: false }));
    }
  };

  const determineAvailableActions = async (timeclockData: DayTimeclock) => {
    const actions: TimeclockActionType[] = [];
    const hasActiveSession = timeclockData.clockIn && !timeclockData.clockOut;

    if (hasActiveSession) {
      const activeBreak = timeclockData.breaks?.find((b) => {
        if (!b.timeEnd) return true;
        const timeEndDate = new Date(b.timeEnd);
        const epochDate = new Date('1970-01-01T00:00:00.000Z');
        return timeEndDate.getTime() === epochDate.getTime();
      });
      if (activeBreak) actions.push('end_break');
      else actions.push('start_break', 'clockout');
    } else {
      actions.push('checkin');
    }

    setAvailableActions(actions);
  };

  const handleTimeclockAction = async (actionType: string) => {
    if (!selectedEmployee || !selectedBranch) {
      setError('Missing employee or branch information');
      return;
    }

    try {
      setLoadingStates((p) => ({ ...p, submittingAction: true }));
      setSelectedAction(actionType);
      setError(null);

      switch (actionType) {
        case 'check_in':
          await clockIn(selectedEmployee.id);
          break;
        case 'check_out':
          await clockOut(selectedEmployee.id);
          break;
        case 'break_start':
          await startBreak(selectedEmployee.id);
          break;
        case 'break_end':
          await endBreak(selectedEmployee.id);
          break;
        default:
          throw new Error(`Unknown action type: ${actionType}`);
      }

      // show result instantly
      await loadEmployeeTimeclock(selectedEmployee.id);
      // silent revalidate after 1s (no loader flicker)
      setTimeout(() => {
        loadEmployeeTimeclock(selectedEmployee.id, { silent: true });
      }, 1000);

      setSelectedAction(null);
    } catch (e) {
      console.error('Error submitting timeclock action:', e);
      setError(`Error recording ${actionType.replace('_', ' ')}. Please try again.`);
      setSelectedAction(null);
    } finally {
      setLoadingStates((p) => ({ ...p, submittingAction: false }));
    }
  };

  const handleLogout = async () => {
    await limpiarDatosEmpleado();
    setSelectedEmployee(null);
    setAvailableActions([]);
    setShowMessage(false);
    router.push('/');
  };

  // subtle dim while background fetching (no layout shift)
  const dimDuringFetch = fetchLoadingVisible ? { opacity: 0.88 } : null;
  return (
    <View className="flex w-full flex-1 flex-col items-center justify-start gap-3 rounded-2xl bg-gray-50 p-4">
      {/* Loader banner (delayed/min duration) */}
      {(initLoadingVisible || fetchLoadingVisible) && (
        <View className="w-full px-2">
          <View className="flex-row items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
            <ActivityIndicator size="small" color="#ea092b" />
            <Text className="font-medium text-zinc-700">
              {initLoadingVisible ? 'Preparing your session…' : 'Refreshing timeclock…'}
            </Text>
          </View>
        </View>
      )}

      {/* Header card */}
      <View className="w-full px-2" style={dimDuringFetch}>
        <View className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <View className="flex-row items-center gap-3">
            <View className="h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <Text className="text-lg font-bold text-red-700">
                {selectedEmployee
                  ? `${selectedEmployee.firstName?.[0] ?? ''}${selectedEmployee.lastName?.[0] ?? ''}`.toUpperCase()
                  : '•'}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-lg font-semibold text-zinc-900" numberOfLines={1}>
                {selectedEmployee
                  ? `${selectedEmployee.firstName} ${selectedEmployee.lastName}`
                  : 'User'}
              </Text>
              <Text className="text-xs text-zinc-500" numberOfLines={1}>
                {selectedBranch ? `Working at ${selectedBranch.name}` : 'No branch selected'}
              </Text>
            </View>
            <View className="max-w-[45%] items-end">
              <Text className="text-xs font-semibold text-zinc-800" numberOfLines={1}>
                {selectedEmployee?.email ?? 'No email on file'}
              </Text>
              <Text className="text-[10px] text-zinc-500" numberOfLines={1}>
                {selectedEmployee?.position ?? 'Employee'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Error banner */}
      {error && (
        <View className="w-full px-2">
          <View className="rounded-2xl border border-rose-300 bg-rose-50 p-3 shadow-sm">
            <Text className="text-center text-sm font-medium text-rose-700">{error}</Text>
            <View className="mt-2 flex-row justify-center">
              <Button
                className="rounded-xl bg-rose-600 px-4 py-2"
                onPress={() => {
                  setError(null);
                  if (selectedEmployee) loadEmployeeTimeclock(selectedEmployee.id);
                }}>
                <Text className="text-white">Retry</Text>
              </Button>
            </View>
          </View>
        </View>
      )}

      {/* Actions */}
      {availableActions.length > 0 && (
        <View className="w-full px-2" style={dimDuringFetch}>
          <View className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <Text className="mb-2 text-base font-semibold text-zinc-800">Choose an action</Text>
            <CheckingOptions
              actions={convertActionsToObjects(availableActions)}
              onActionPress={withInactivityReset(handleTimeclockAction)}
              disabled={loadingStates.submittingAction}
              selectedAction={selectedAction}
            />
          </View>
        </View>
      )}

      {/* Today's timeclock */}
      {dayTimeclock && (
        <View className="w-full px-2" style={dimDuringFetch}>
          <View className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <Text className="mb-3 text-center text-sm font-semibold text-zinc-800">
              Today’s Timeclock
              {allDaySessions.length > 1 && (
                <Text className="text-xs text-emerald-600">
                  {' '}
                  • {allDaySessions.length} sessions
                </Text>
              )}
            </Text>

            <View className="flex-row flex-wrap justify-center gap-2">
              {dayTimeclock.clockIn && (
                <View className="rounded-full bg-emerald-50 px-3 py-1">
                  <Text className="text-xs font-semibold text-emerald-700">
                    In • {new Date(dayTimeclock.clockIn).toLocaleTimeString()}
                  </Text>
                </View>
              )}
              {dayTimeclock.clockOut && (
                <View className="rounded-full bg-zinc-100 px-3 py-1">
                  <Text className="text-xs font-semibold text-zinc-700">
                    Out • {new Date(dayTimeclock.clockOut).toLocaleTimeString()}
                  </Text>
                </View>
              )}
              {!!dayTimeclock.breaks?.length && (
                <View className="rounded-full bg-amber-50 px-3 py-1">
                  <Text className="text-xs font-semibold text-amber-700">
                    Breaks • {dayTimeclock.breaks.length}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Footer button */}
      <View className="w-full px-2 pt-2">
        <Button
          className="w-full rounded-md bg-red-600 p-4 shadow-md"
          onPress={withInactivityReset(handleLogout)}>
          <Text className="text-center text-lg font-semibold text-white">Close</Text>
        </Button>
      </View>

      {/* Timeout modal */}
      {showMessage && (
        <View className="absolute inset-0 z-30 items-center justify-center">
          <View className="absolute inset-0 rounded-2xl bg-black/20" />
          <View className="z-40 w-[88%] max-w-xl rounded-md border border-zinc-50 bg-white p-6 shadow-2xl">
            <Text className="mb-2 text-center text-2xl font-bold text-red-600">
              ⏰ Session Expiring
            </Text>
            <Text className="mb-4 text-center text-base text-zinc-600">
              You’ll be logged out automatically in
            </Text>

            <View className="mb-4 items-center justify-center">
              <View className="shadow-inner h-28 w-28 items-center justify-center rounded-full bg-red-100">
                <Text className="text-4xl font-extrabold text-red-600">{modalCountdown}</Text>
              </View>
              <Text className="mt-2 text-xs text-red-600">seconds</Text>
            </View>

            <Text className="mb-4 text-center text-sm text-zinc-500">
              Do you want to continue using the kiosk?
            </Text>

            <View className="flex-row gap-3">
              <Button
                className="flex-1 rounded-md border border-zinc-200 bg-white p-4"
                onPress={() => {
                  setShowMessage(false);
                  if (modalTimerRef.current) clearInterval(modalTimerRef.current);
                  setModalCountdown(MODAL_SECONDS);
                  resetInactivityTimer();
                }}>
                <Text className="text-center font-semibold text-zinc-800">Stay</Text>
              </Button>
              <Button className="flex-1 rounded-md bg-red-600 p-4" onPress={handleLogout}>
                <Text className="text-center font-semibold text-white">Logout</Text>
              </Button>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
