/**
 * Converts Western numerals (0-9) to Persian/Arabic-Indic numerals (۰-۹)
 * @param {string|number} input - The input string or number to convert
 * @returns {string} - The string with Persian numerals
 */
export const toPersianNumbers = (input) => {
  if (input === null || input === undefined) {
    return input;
  }

  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const westernDigits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

  // Convert to string first
  const str = String(input);

  // Replace each Western digit with its Persian equivalent
  return str.replace(/\d/g, (digit) => {
    const index = westernDigits.indexOf(digit);
    return index !== -1 ? persianDigits[index] : digit;
  });
};

/**
 * Converts Persian/Arabic-Indic numerals (۰-۹) back to Western numerals (0-9)
 * @param {string} input - The input string with Persian numerals
 * @returns {string} - The string with Western numerals
 */
export const fromPersianNumbers = (input) => {
  if (input === null || input === undefined) {
    return input;
  }

  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const westernDigits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

  const str = String(input);
  let result = str;

  persianDigits.forEach((persianDigit, index) => {
    result = result.replace(new RegExp(persianDigit, 'g'), westernDigits[index]);
  });

  return result;
};
