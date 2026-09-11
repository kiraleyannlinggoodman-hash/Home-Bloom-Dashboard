declare module '@expo-google-fonts/poppins' {
  export const Poppins_400Regular: string;
  export const Poppins_500Medium: string;
  export const Poppins_600SemiBold: string;
  export const Poppins_700Bold: string;
  export function useFonts(fonts: Record<string, string>): [boolean, Error | null];
}