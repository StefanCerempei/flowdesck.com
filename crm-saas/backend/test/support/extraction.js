// Provider wire fixtures for tests. Production code never imports this module.
export function extraction(fields) {
  return JSON.stringify({
    isRental: true,
    pickupText: null,
    returnText: null,
    preferredBrand: null,
    preferredModel: null,
    category: null,
    transmission: null,
    maxTotalBudget: null,
    currency: null,
    pickupLocation: null,
    ...fields,
  });
}
