// src/utils/user.ts (Add logging)
export const getDefaultProfileImage = (name: string | undefined | null): string => {
  // Handle null or undefined name
  const initial = name ? name.charAt(0).toUpperCase() : '?'; // Use '?' as default
  const svg = `
    <svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#3b82f6" />
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="20" fill="#ffffff">
        ${initial}
      </text>
    </svg>
  `;
  const dataURL = `data:image/svg+xml;base64,${btoa(svg)}`;
    console.log("getDefaultProfileImage - dataURL:", dataURL); // Log the generated data URL
  return dataURL
};
