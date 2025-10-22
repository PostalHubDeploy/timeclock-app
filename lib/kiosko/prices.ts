export const getSizeValue = (size: string, date: string): string => {
  const sizeMap: { [key: string]: number } = {
    XS: 0.75,
    S: 1.5,
    M: 2.0,
    L: 3.0,
    XL: 5.0,
    XXL: 10.0,
  };

  const baseValue = sizeMap[size] || 0; // Return 0 if the size is not found
  let totalValue = baseValue;

  const currentDate = new Date();
  const givenDate = new Date(date);
  const timeDifference = currentDate.getTime() - givenDate.getTime();
  const totalDaysDifference = Math.floor(timeDifference / (1000 * 3600 * 24));

  let businessDaysDifference = 0;
  for (let i = 0; i <= totalDaysDifference; i++) {
    const tempDate = new Date(givenDate);
    tempDate.setDate(givenDate.getDate() + i);
    if (tempDate.getDay() !== 6) {
      // Exclude Sundays (0 is Sunday)
      businessDaysDifference++;
    }
  }

  if (businessDaysDifference > 4) {
    const additionalDays = businessDaysDifference - 4;
    const additionalCost = (baseValue / 2) * additionalDays;
    totalValue += additionalCost;
  }

  return totalValue.toFixed(2); // Format the number to two decimal places
};
