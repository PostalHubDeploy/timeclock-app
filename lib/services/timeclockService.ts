// lib/services/timeclockService.ts
import employeeStatusData from '../data/mockEmployeeStatus.json';
import checkinResponseData from '../data/mockCheckinResponse.json';

export interface EmployeeStatus {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  position: string;
  employeeId: string;
  branchId: string;
  branchName: string;
  active: boolean;
  currentStatus: 'checked_in' | 'checked_out' | 'on_break' | 'unknown';
  lastAction?: {
    type: string;
    timestamp: string;
    location: string;
  };
}

export interface TimeclockAction {
  id: string;
  label: string;
  description: string;
  icon: string;
  enabled: boolean;
}

export interface CheckinRequest {
  employeeId: string;
  branchId: string;
  actionType: 'check_in' | 'check_out' | 'break_start' | 'break_end';
  timestamp: string;
  pin?: string;
  notes?: string;
}

export interface CheckinResponse {
  success: boolean;
  message: string;
  data: {
    actionId: string;
    employeeId: string;
    branchId: string;
    actionType: string;
    timestamp: string;
    location: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
    deviceInfo?: {
      kioskId: string;
      ipAddress: string;
    };
    notes?: string;
  };
}

// Simular delay de red
const simulateNetworkDelay = (ms: number = 1500) => 
  new Promise(resolve => setTimeout(resolve, ms));

// Obtener estado actual del empleado
export const fetchEmployeeStatus = async (employeeId: string, branchId: string): Promise<EmployeeStatus> => {
  try {
    // console.log(`Fetching status for employee ${employeeId} at branch ${branchId}...`);
    
    await simulateNetworkDelay(1200);
    
    // En una app real: fetch(`/api/employees/${employeeId}/status?branchId=${branchId}`)
    const response = employeeStatusData;
    
    if (!response.success) {
      throw new Error('Failed to fetch employee status');
    }
    
    // Simular diferentes estados basados en el ID del empleado
    const baseEmployee = response.data.employee;
    const currentTime = new Date().toISOString();
    
    // Variar el estado según el ID para pruebas
    let currentStatus: EmployeeStatus['currentStatus'] = 'checked_out';
    let availableActions = response.data.availableActions;
    
    switch (employeeId) {
      case '101':
        currentStatus = 'checked_out';
        availableActions = availableActions.map(action => ({
          ...action,
          enabled: action.id === 'check_in'
        }));
        break;
      case '102':
        currentStatus = 'checked_in';
        availableActions = availableActions.map(action => ({
          ...action,
          enabled: action.id === 'break_start' || action.id === 'check_out'
        }));
        break;
      case '103':
        currentStatus = 'on_break';
        availableActions = availableActions.map(action => ({
          ...action,
          enabled: action.id === 'break_end'
        }));
        break;
      default:
        currentStatus = 'checked_out';
    }
    
    const employeeStatus: EmployeeStatus = {
      ...baseEmployee,
      id: employeeId,
      currentStatus,
      lastAction: {
        type: currentStatus === 'checked_in' ? 'check_in' : 'check_out',
        timestamp: currentTime,
        location: baseEmployee.branchName
      }
    };
    
    // console.log('Employee status fetched:', employeeStatus);
    return employeeStatus;
  } catch (error) {
    console.error('Error fetching employee status:', error);
    throw error;
  }
};

// Obtener acciones disponibles basadas en el estado actual
export const fetchAvailableActions = async (employeeId: string, currentStatus: string): Promise<TimeclockAction[]> => {
  try {
    // console.log(`Fetching available actions for employee ${employeeId} with status ${currentStatus}...`);
    
    await simulateNetworkDelay(800);
    
    const response = employeeStatusData;
    let actions = response.data.availableActions;
    
    // Habilitar acciones basadas en el estado actual
    switch (currentStatus) {
      case 'checked_out':
        actions = actions.map(action => ({
          ...action,
          enabled: action.id === 'check_in'
        }));
        break;
      case 'checked_in':
        actions = actions.map(action => ({
          ...action,
          enabled: action.id === 'break_start' || action.id === 'check_out'
        }));
        break;
      case 'on_break':
        actions = actions.map(action => ({
          ...action,
          enabled: action.id === 'break_end'
        }));
        break;
      default:
        actions = actions.map(action => ({ ...action, enabled: false }));
    }
    
    // console.log('Available actions fetched:', actions);
    return actions;
  } catch (error) {
    console.error('Error fetching available actions:', error);
    throw error;
  }
};

// Enviar acción de checkin
export const submitTimeclockAction = async (request: CheckinRequest): Promise<CheckinResponse> => {
  try {
    // console.log('Submitting timeclock action:', request);
    
    await simulateNetworkDelay(2000); // Simular procesamiento más lento
    
    // En una app real: fetch('/api/timeclock/actions', { method: 'POST', body: JSON.stringify(request) })
    const response = checkinResponseData;
    
    if (!response.success) {
      throw new Error('Failed to submit timeclock action');
    }
    
    // Personalizar respuesta basada en la solicitud
    const customResponse: CheckinResponse = {
      ...response,
      data: {
        ...response.data,
        actionId: `tcr_${Date.now()}_${request.employeeId}`,
        employeeId: request.employeeId,
        branchId: request.branchId,
        actionType: request.actionType,
        timestamp: request.timestamp,
        notes: request.notes || `Automatic ${request.actionType.replace('_', ' ')} via kiosk`
      }
    };
    
    // console.log('Timeclock action submitted successfully:', customResponse);
    return customResponse;
  } catch (error) {
    console.error('Error submitting timeclock action:', error);
    throw error;
  }
};
