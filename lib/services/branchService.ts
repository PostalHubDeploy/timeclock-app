// lib/services/branchService.ts

import branchesData from '../data/mockBranches.json';
import employeesData from '../data/mockEmployees.json';
import Constants from 'expo-constants';

const API_KEY = Constants.expoConfig?.extra?.API_KEY;

const API_URL = 'http://192.168.1.127:4500/timeclock_mobile'; // Replace with actual API URL
// const API_URL = 'https://postalhub-postages.vercel.app/api/timeclock';

export interface Branch {
  id: string;
  name: string;
  address?: string;
  active: boolean;
}

export interface BranchApi {
  sucursalId: string;
  name: string;
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  position: string;
  employeeId: string;
  branchId: string;
  active: boolean;
}

export interface EmployeeApi {
  id: string;
  name: string;
}

export interface LoginRequest {
  workerId: string;
  branch: string;
  nip: string;
}

export interface LoginWorker {
  id: string;
  name: string;
  nip: string;
  role: string;
  sucursalId: string;
  email: string;
}

export interface LoginResponse {
  message: string;
  worker: LoginWorker;
}

// Simular delay de red
const simulateNetworkDelay = (ms: number = 1000) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const fetchBranches = async (): Promise<Branch[]> => {
  try {
    // // console.log('Fetching branches...');
    await simulateNetworkDelay(800); // Simular delay de red

    // En una app real, aquí harías: fetch('/api/branches')
    const response = branchesData;

    if (!response.success) {
      throw new Error('Failed to fetch branches');
    }

    // Filtrar solo sucursales activas
    const activeBranches = response.data.filter((branch) => branch.active);

    // // console.log('Branches fetched successfully:', activeBranches);
    return activeBranches;
  } catch (error) {
    console.error('Error fetching branches:', error);
    throw error;
  }
};

export const fetchEmployeesByBranch = async (branchId: string): Promise<Employee[]> => {
  try {
    // console.log(`Fetching employees for branch ${branchId}...`);
    await simulateNetworkDelay(600); // Simular delay de red

    // En una app real, aquí harías: fetch(`/api/branches/${branchId}/employees`)
    const response = employeesData;

    if (!response.success) {
      throw new Error('Failed to fetch employees');
    }

    // Obtener empleados de la sucursal específica
    const branchEmployees: Employee[] = (response.data as any)[branchId] || [];

    // Filtrar solo empleados activos
    const activeEmployees = branchEmployees.filter((employee: Employee) => employee.active);

    // console.log(`Employees fetched for branch ${branchId}:`, activeEmployees);
    return activeEmployees;
  } catch (error) {
    console.error(`Error fetching employees for branch ${branchId}:`, error);
    throw error;
  }
};

export const validateBranchExists = (branches: Branch[], branchId: string): Branch | null => {
  const foundBranch = branches.find((branch) => branch.id === branchId);
  // console.log(`Validating branch ${branchId}:`, foundBranch ? 'Found' : 'Not found');
  return foundBranch || null;
};

export const validateBranchApiExists = (
  branches: BranchApi[],
  branchId: string
): BranchApi | null => {
  const foundBranch = branches.find((branch) => branch.sucursalId === branchId);
  // console.log(`Validating branch ${branchId}:`, foundBranch ? 'Found' : 'Not found');
  return foundBranch || null;
};

export const validateEmployeeInBranch = (
  employees: Employee[],
  employeeId: string
): Employee | null => {
  const foundEmployee = employees.find((employee) => employee.id === employeeId);
  // console.log(`Validating employee ${employeeId}:`, foundEmployee ? 'Found' : 'Not found');
  return foundEmployee || null;
};

export const validateEmployeeApiInBranch = (
  employees: EmployeeApi[],
  employeeId: string
): EmployeeApi | null => {
  const foundEmployee = employees.find((employee) => employee.id === employeeId);
  // console.log(`Validating employee ${employeeId}:`, foundEmployee ? 'Found' : 'Not found');
  return foundEmployee || null;
};

export const fetchBranchAPI = async (): Promise<BranchApi[]> => {
  try {
    // console.log('Fetching branches from API...');
    const response = await fetch(`${API_URL}/sucursal`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch branches');
    }

    const data = await response.json();
    // console.log('Branches fetched from API:', data);

    // Respuesta de la API viene con sucusarles activas ya filtradas no es necesario filtrar
    const activeBranches = data;
    console.log('Branches fetched successfully:', activeBranches);
    // console.log('Branches fetched successfully:', activeBranches);
    return activeBranches;
  } catch (error) {
    console.error('Error fetching branches:', error);
    throw error;
  }
};

export const fetchEmployeesAPI = async (branchId: string): Promise<EmployeeApi[]> => {
  try {
    // console.log('Fetching employees from API...');
    const response = await fetch(`${API_URL}/workers?branch=${branchId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch employees');
    }

    const data = await response.json();
    console.log('Employees fetched from API:', data);

    // Respuesta de la API viene con empleados activos ya filtrados no es necesario filtrar
    const activeEmployees = data;

    // console.log('Employees fetched successfully:', activeEmployees);
    return activeEmployees;
  } catch (error) {
    console.error('Error fetching employees:', error);
    throw error;
  }
};

export const loginWorker = async (loginData: LoginRequest): Promise<LoginResponse> => {
  try {
    // console.log('Attempting worker login...', { workerId: loginData.workerId, branch: loginData.branch });

    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify(loginData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Login failed');
    }

    const data = await response.json();
    // console.log('Login successful:', data);
    // console.log('Worker data:', data.worker);
    // console.log('Worker ID:', data.worker?.id, 'Type:', typeof data.worker?.id);

    // Validar que la respuesta tenga la estructura esperada
    if (!data.worker || !data.message) {
      throw new Error('Invalid login response format');
    }

    return data as LoginResponse;
  } catch (error) {
    throw error;
  }
};

export const loginAndSaveWorker = async (loginData: LoginRequest): Promise<LoginWorker> => {
  try {
    const loginResponse = await loginWorker(loginData);
    // console.log('About to save worker:', loginResponse.worker);

    // Importar dinámicamente las funciones de storage para evitar dependencias circulares
    const { guardarWorkerLogueado } = await import('./timeclockStorage');

    // Guardar el worker logueado en el storage
    await guardarWorkerLogueado(loginResponse.worker);

    // console.log('Worker logged in and saved successfully:', loginResponse.worker.name);
    // console.log('Worker ID saved:', loginResponse.worker.id, 'Type:', typeof loginResponse.worker.id);
    return loginResponse.worker;
  } catch (error) {
    console.error('Error during login and save process:', error);
    throw error;
  }
};

// Función de utilidad para validar employee + PIN
export const validateEmployeeLogin = async (
  employeeId: string,
  branchId: string,
  pin: string
): Promise<{ success: boolean; worker?: LoginWorker; error?: string }> => {
  try {
    const loginData: LoginRequest = {
      workerId: employeeId,
      branch: branchId,
      nip: pin,
    };

    const worker = await loginAndSaveWorker(loginData);

    return {
      success: true,
      worker: worker,
    };
  } catch (error) {
    console.error('Login validation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Login failed',
    };
  }
};
