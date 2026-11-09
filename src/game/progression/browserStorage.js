const reportStorageFailure = () => {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('space-survivor:storage-error'));
    }
};

export const readStoredValue = (key) => {
    try {
        return window.localStorage.getItem(key);
    } catch {
        reportStorageFailure();
        return null;
    }
};

export const readStoredNumber = (key, fallback = 0) => {
    const value = readStoredValue(key);
    if (value === null) return fallback;
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
};

export const writeStoredValue = (key, value) => {
    try {
        window.localStorage.setItem(key, value);
        return true;
    } catch {
        reportStorageFailure();
        return false;
    }
};
