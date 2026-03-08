import { Logger } from '@/services/LoggerService';

/**
 * Fallback Image Compression Utility.
 * Note: Since expo-image-manipulator has native build issues with the current SDK,
 * we rely on ExpoImagePicker's built-in quality setting or this passthrough.
 */
export const compressImage = async (
  uri: string,
  _maxWidth: number = 1080,
  _quality: number = 0.5
): Promise<string> => {
  // ImagePicker quality setting already handles the heavy lifting.
  // This function remains as a placeholder to avoid breaking existing imports.
  Logger.log(`Image passed through: ${uri}`);
  return uri;
};
