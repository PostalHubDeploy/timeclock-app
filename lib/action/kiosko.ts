import { api_url } from "./apiWork"; // Asegúrate de que esta es la URL base de tu API

const route = "kiosko_crud";

export const getUserDetails = async (
  token: string | undefined,
  mailboxNumber: string,
  phoneNumber: string
) => {
  try {
    const response = await fetch(
      `${api_url}/${route}/getUserDetails?mailboxNumber=${mailboxNumber}&phoneNumber=${phoneNumber}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response;
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error fetching user details:", error.message);
    } else {
      console.error("Unknown error fetching user details:", error);
    }
    throw error;
  }
};

export const createReceipt = async (
  token: string,
  packages: { id: string; mailboxId: string; storageCuota: number }[],
  letters: { id: string; mailboxId: string; storageCuota: number }[],
  totalAmount: number
) => {
  try {
    const response = await fetch(`${api_url}/${route}/receipts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        packages,
        letters,
        totalAmount,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to create receipt");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error creating receipt:", error.message);
    } else {
      console.error("Unknown error creating receipt:", error);
    }
    throw error;
  }
};