// const API_URL = 'https://postalhub-postages.vercel.app/api/timeclock'; // Replace with actual API URL

const API_URL = 'http://192.168.1.128:4500/timeclock_mobile'; // Replace with actual API URL
import Constants from 'expo-constants';
const API_KEY = Constants.expoConfig?.extra?.API_KEY;

export const getEmployeeClock = async (id: string | number) => {
  try {
    // Convertir a string para la URL, manejar tanto string como number
    const workerId = typeof id === 'string' ? id : id.toString();

    // console.log('getEmployeeClock called with ID:', id, 'Type:', typeof id);
    // console.log('Using workerId for API:', workerId);

    const response = await fetch(`${API_URL}/employee-stats?workerId=${workerId}`, {
      headers: {
        'x-api-key': API_KEY,
      },
    });
    // console.log('Request URL:', `${API_URL}/employee-stats?workerId=${workerId}`);

    if (!response.ok) {
      console.error('Response not ok:', response.status, response.statusText);
      throw new Error('Failed to fetch employee');
    }

    const result = await response.json();
    // console.log('getEmployeeClock response:', result);
    return result;
  } catch (error) {
    console.error('Error in getEmployeeClock:', error);
    throw error;
  }
};

// Registrar clock in (crear nuevo timeclock group)
export const clockIn = async (workerId: string) => {
  try {
    const response = await fetch(`${API_URL}/update-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify({
        status: 'clockin',
        workerId,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to clock in');
    }

    return await response.json();
  } catch (error) {
    console.error('Error clocking in:', error);
    throw error;
  }
};

// Registrar clock out
export const clockOut = async (workerId: string) => {
  try {
    const response = await fetch(`${API_URL}/update-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify({
        status: 'clockout',
        workerId,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to clock out');
    }

    return await response.json();
  } catch (error) {
    console.error('Error clocking out:', error);
    throw error;
  }
};

// Iniciar break
export const startBreak = async (workerId: string) => {
  try {
    const response = await fetch(`${API_URL}/update-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify({
        status: 'break',
        workerId,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to start break');
    }

    return await response.json();
  } catch (error) {
    console.error('Error starting break:', error);
    throw error;
  }
};

// Terminar break
export const endBreak = async (workerId: string) => {
  try {
    const response = await fetch(`${API_URL}/update-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify({
        status: 'breakoff',
        workerId,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to end break');
    }

    return await response.json();
  } catch (error) {
    console.error('Error ending break:', error);
    throw error;
  }
};
