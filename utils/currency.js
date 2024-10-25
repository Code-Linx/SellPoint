const getCurrencySymbol = (currencyCode) => {
  const currencySymbols = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    // Add other currency codes and symbols as needed
  };

  return currencySymbols[currencyCode] || currencyCode; // Default to the code if symbol not found
};

module.exports = getCurrencySymbol;
