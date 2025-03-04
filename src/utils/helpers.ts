// src/utils/helpers.ts
export function deepCopy<T>(obj: T): T {
    if (obj === null || typeof obj !== "object") {
        return obj;
    }

    if (obj instanceof Date) {
        return new Date(obj.getTime()) as any; // Cast is safe because we know it's a Date
    }

    if (Array.isArray(obj)) {
        const arrCopy: any[] = [];
        for (const item of obj) {
            arrCopy.push(deepCopy(item));
        }
        return arrCopy as any; // Cast is safe because we know it's an array
    }

    const objCopy: { [key: string]: any } = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            objCopy[key] = deepCopy(obj[key]);
        }
    }
    return objCopy as any; // Cast is safe
}
