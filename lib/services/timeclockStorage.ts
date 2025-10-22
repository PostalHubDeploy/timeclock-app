// services/timeclockStorage.ts
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { LoginWorker } from './branchService';

// Tipos para mayor consistencia
export interface UserEmployee {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  position?: string;
  employeeId: string;
}

export interface Branch {
  id: string;
  name: string;
  icon?: React.ReactNode;
}

// Versión serializable de Branch (sin el componente icon)
export interface SerializableBranch {
  id: string;
  name: string;
}

// Guardar información del empleado completa (objeto completo)
export async function informacionEmpleado(info: UserEmployee) {
  await AsyncStorage.setItem('infoEmpleado', JSON.stringify(info))
}

export async function obtenerInformacionEmpleado(): Promise<UserEmployee | null> {
  const data = await AsyncStorage.getItem('infoEmpleado')
  return data ? JSON.parse(data) : null
}
export async function limpiarInformacionEmpleado() {
  await AsyncStorage.removeItem('infoEmpleado')
}

// Guardar información de la sucursal seleccionada (solo datos serializables)
export async function informacionSucursal(branch: Branch) {
  // Extraer solo los datos serializables del objeto branch
  const serializableBranch: SerializableBranch = {
    id: branch.id,
    name: branch.name
  };
  await AsyncStorage.setItem('infoSucursal', JSON.stringify(serializableBranch))
}

export async function obtenerInformacionSucursal(): Promise<SerializableBranch | null> {
  const data = await AsyncStorage.getItem('infoSucursal')
  return data ? JSON.parse(data) : null
}

export async function limpiarInformacionSucursal() {
  await AsyncStorage.removeItem('infoSucursal')
}

// Función utilitaria para reconstruir el objeto Branch completo con el icono
export function reconstruirBranchConIcono(serializableBranch: SerializableBranch): Branch {
  // Aquí puedes importar dinámicamente el componente House o manejarlo según tu lógica
  return {
    id: serializableBranch.id,
    name: serializableBranch.name,
    // El icono se añadirá en el componente que use esta función
    icon: undefined
  };
}

// Función para limpiar todos los datos almacenados (útil para logout completo)
export async function limpiarTodosLosDatos() {
  await Promise.all([
    limpiarInformacionEmpleado(),
    limpiarInformacionSucursal(),
    limpiarWorkerLogueado()
  ])
}

// Función para limpiar solo los datos del empleado (mantener sucursal)
export async function limpiarDatosEmpleado() {
  await limpiarInformacionEmpleado()
}

// Funciones para manejar información del worker logueado
export async function guardarWorkerLogueado(worker: LoginWorker) {
  await AsyncStorage.setItem('workerLogueado', JSON.stringify(worker))
}

export async function obtenerWorkerLogueado(): Promise<LoginWorker | null> {
  const data = await AsyncStorage.getItem('workerLogueado')
  return data ? JSON.parse(data) : null
}

export async function limpiarWorkerLogueado() {
  await AsyncStorage.removeItem('workerLogueado')
}

// Función para convertir LoginWorker a UserEmployee para compatibilidad
export function convertirWorkerAUserEmployee(worker: LoginWorker): UserEmployee {
  return {
    id: worker.id,
    firstName: worker.name.split(' ')[0] || worker.name,
    lastName: worker.name.split(' ').slice(1).join(' ') || '',
    email: worker.email,
    position: worker.role,
    employeeId: worker.id
  };
}
