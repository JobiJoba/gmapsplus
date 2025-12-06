/**
 * Mapping of filter values to human-readable display names
 */
export const FILTER_LABELS: Record<string, Record<string | number, string>> = {
  accessibilityOptions: {
    wheelchairAccessibleEntrance: "Wheelchair Accessible Entrance",
    wheelchairAccessibleRestroom: "Wheelchair Accessible Restroom",
    wheelchairAccessibleParking: "Wheelchair Accessible Parking",
    wheelchairAccessibleSeating: "Wheelchair Accessible Seating",
  },
  paymentOptions: {
    cash: "Cash",
    creditCard: "Credit Card",
    debitCard: "Debit Card",
    contactlessPayment: "Contactless Payment",
    digitalWallet: "Digital Wallet",
    googlePay: "Google Pay",
    applePay: "Apple Pay",
    samsungPay: "Samsung Pay",
  },
  parkingOptions: {
    paidParkingLot: "Paid Parking Lot",
    paidStreetParking: "Paid Street Parking",
    valetParking: "Valet Parking",
    freeParkingLot: "Free Parking Lot",
    freeStreetParking: "Free Street Parking",
    parkingGarage: "Parking Garage",
  },
  fuelOptions: {
    diesel: "Diesel",
    electric: "Electric",
    biodiesel: "Biodiesel",
    ethanol: "Ethanol",
    lpg: "LPG",
    naturalGas: "Natural Gas",
    unleaded: "Unleaded",
  },
  evChargeOptions: {
    teslaConnector: "Tesla Connector",
    j1772Connector: "J1772 Connector",
    type2Connector: "Type 2 Connector",
    ccsConnector: "CCS Connector",
    chademoConnector: "CHAdeMO Connector",
  },
  businessStatus: {
    OPERATIONAL: "Operational",
    CLOSED_TEMPORARILY: "Closed Temporarily",
    CLOSED_PERMANENTLY: "Closed Permanently",
  },
};

/**
 * Format a filter value to a human-readable label
 */
export function formatFilterLabel(
  key: string,
  value: string | number
): string {
  // Check if we have a specific mapping for this key-value pair
  if (FILTER_LABELS[key] && FILTER_LABELS[key][value]) {
    return FILTER_LABELS[key][value];
  }

  // Special handling for specific filter types
  switch (key) {
    case "priceLevel":
      return "$".repeat(value as number);
    case "rating":
      return `${value}+ stars`;
    case "types":
      return String(value).replace(/_/g, " ");
    case "openingDays":
      return String(value);
    default:
      // For camelCase values, insert spaces before capital letters
      const str = String(value);
      // Replace underscores with spaces first
      const withSpaces = str.replace(/_/g, " ");
      // Insert spaces before capital letters (but not at the start)
      const formatted = withSpaces.replace(/([a-z])([A-Z])/g, "$1 $2");
      // Capitalize first letter
      return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }
}

