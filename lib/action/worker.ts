import { api_url } from "./apiWork"; // Asegúrate de que esta es la URL base de tu API

const route = "auth_crud";

export const workerLogin = async (email: string, password: string) => {
  try {
    const response = await fetch(`${api_url}/${route}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });
    return response; // Retorna el token y los detalles del trabajador
  } catch (error) {
    // Manejo de errores
    if (error instanceof Error) {
      console.error("Error during worker login:", error.message);
    } else {
      console.error("Unknown error during worker login:", error);
    }
    throw error; // Vuelve a lanzar el error para manejarlo en otro lugar si es necesario
  }
};