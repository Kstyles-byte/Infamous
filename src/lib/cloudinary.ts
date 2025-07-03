import { Platform } from 'react-native';
import * as Network from 'expo-network';
import { v4 as uuidv4 } from 'uuid';

// Cloudinary configuration
const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dnciovhw0/image/upload';
const UPLOAD_PRESET = 'ml_default';

// Function to check if a URL is from Cloudinary
export const isCloudinaryUrl = (url: string): boolean => {
  return !!url && typeof url === 'string' && url.includes('cloudinary.com');
};

/**
 * Simple validation for a URI
 * @param uri - The URI to validate
 * @returns boolean indicating if URI appears valid
 */
export const isValidUri = (uri: string): boolean => {
  // If it's a remote URL, assume it's valid
  if (uri.startsWith('http://') || uri.startsWith('https://')) {
    return true;
  }
  
  // For file URIs, do a basic check that it has the right format
  if (uri.startsWith('file://')) {
    return uri.length > 7; // "file://" plus at least one character
  }
  
  // For other types of URIs, just check they're not empty
  return uri.length > 0;
};

/**
 * Uploads an image to Cloudinary
 * @param imageUri - The URI of the image to upload
 * @returns Promise with upload result
 */
export const uploadImage = async (imageUri: string) => {
  // If this is already a Cloudinary URL, return it as is
  if (isCloudinaryUrl(imageUri)) {
    return {
      success: true,
      url: imageUri,
      publicId: imageUri.split('/').pop()?.split('.')[0] || '',
      format: imageUri.split('.').pop() || 'jpg',
    };
  }

  try {
    // Basic validation
    if (!isValidUri(imageUri)) {
      throw new Error(`Invalid URI: ${imageUri}`);
    }

    // Check for internet connection
    const networkState = await Network.getNetworkStateAsync();
    if (!networkState.isConnected || !networkState.isInternetReachable) {
      throw new Error('No internet connection');
    }

    // Prepare the file for upload
    let localUri = imageUri;
    let filename = localUri.split('/').pop() || `image_${uuidv4()}`;
    
    // Infer the type of the image
    let match = /\.(\w+)$/.exec(filename);
    let type = match ? `image/${match[1]}` : 'image/jpeg';
    
    if (Platform.OS === 'ios') {
      // iOS requires special handling for file paths
      if (localUri.startsWith('file://')) {
        localUri = localUri.replace('file://', '');
      }
    }

    // Create form data for the upload
    const formData = new FormData();
    formData.append('file', {
      uri: localUri,
      name: filename,
      type,
    } as any);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', 'infamous_app'); // Store in a specific folder
    
    // Send to Cloudinary
    const response = await fetch(CLOUDINARY_URL, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'multipart/form-data',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to upload image');
    }

    const data = await response.json();
    
    return {
      success: true,
      url: data.secure_url,
      publicId: data.public_id,
      format: data.format,
    };
  } catch (error) {
    console.error('Error uploading image to Cloudinary:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Deletes an image from Cloudinary
 * @param publicId - The public ID of the image to delete
 */
export const deleteImage = async (publicId: string) => {
  // In a real implementation, you would typically
  // make an authenticated request to your server,
  // which would then use Cloudinary's Admin API to delete the image
  // For security reasons, this should not be done directly from the client
  
  // Sample implementation to connect to your backend
  try {
    const response = await fetch('YOUR_BACKEND_ENDPOINT/delete-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ publicId }),
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error deleting image:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}; 