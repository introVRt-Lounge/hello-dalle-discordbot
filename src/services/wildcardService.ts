let wildcard = 1; // Default wildcard chance

// Getter for wildcard value
export const getWildcard = (): number => {
    return wildcard;
};

// Setter for wildcard value
export const setWildcard = (value: number): void => {
    if (value >= 0 && value <= 99) {
        wildcard = value;
    } else {
        throw new Error("Wildcard value must be between 0 and 99.");
    }
};
