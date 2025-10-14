/**
 * Brand File Upload Service
 * 
 * Handles file uploads for brand assets (logos, favicons, etc.)
 * using Supabase storage with proper validation and error handling.
 */

import { supabase } from './supabase';
import { logger } from './logger';

export interface FileUploadResult {
  success: boolean;
  filePath?: string;
  publicUrl?: string;
  error?: string;
}

export interface FileUploadOptions {
  maxSizeBytes?: number;
  allowedTypes?: string[];
  generateThumbnail?: boolean;
}

const DEFAULT_OPTIONS: FileUploadOptions = {
  maxSizeBytes: 5 * 1024 * 1024, // 5MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'],
  generateThumbnail: false,
};

/**
 * Upload a brand asset file to Supabase storage
 */
export const uploadBrandAsset = async (
  file: File,
  assetType: 'logo' | 'favicon' | 'background',
  options: FileUploadOptions = {}
): Promise<FileUploadResult> => {
  try {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    
    // Validate file
    if (!file) {
      return { success: false, error: 'No file provided' };
    }

    if (file.size > opts.maxSizeBytes!) {
      return { 
        success: false, 
        error: `File too large. Maximum size is ${Math.round(opts.maxSizeBytes! / 1024 / 1024)}MB` 
      };
    }

    if (!opts.allowedTypes!.includes(file.type)) {
      return { 
        success: false, 
        error: `Invalid file type. Allowed types: ${opts.allowedTypes!.join(', ')}` 
      };
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const fileName = `${assetType}-${timestamp}.${fileExtension}`;
    const filePath = `brand-assets/${fileName}`;

    logger.debug(`🎨 Uploading brand asset: ${assetType}`, { fileName, fileSize: file.size, fileType: file.type });

    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from('brand-assets')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      logger.error('❌ Error uploading brand asset:', error);
      return { success: false, error: error.message };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('brand-assets')
      .getPublicUrl(filePath);

    logger.info(`✅ Brand asset uploaded successfully: ${assetType}`, { filePath, publicUrl: urlData.publicUrl });

    return {
      success: true,
      filePath,
      publicUrl: urlData.publicUrl,
    };

  } catch (error) {
    logger.error('❌ Error in uploadBrandAsset:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
};

/**
 * Delete a brand asset from Supabase storage
 */
export const deleteBrandAsset = async (filePath: string): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!filePath) {
      return { success: false, error: 'No file path provided' };
    }

    logger.debug(`🗑️ Deleting brand asset: ${filePath}`);

    const { error } = await supabase.storage
      .from('brand-assets')
      .remove([filePath]);

    if (error) {
      logger.error('❌ Error deleting brand asset:', error);
      return { success: false, error: error.message };
    }

    logger.info(`✅ Brand asset deleted successfully: ${filePath}`);
    return { success: true };

  } catch (error) {
    logger.error('❌ Error in deleteBrandAsset:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
};

/**
 * Get the public URL for a brand asset
 */
export const getBrandAssetUrl = (filePath: string): string => {
  if (!filePath) return '';
  
  const { data } = supabase.storage
    .from('brand-assets')
    .getPublicUrl(filePath);
    
  return data.publicUrl;
};

/**
 * Validate file before upload
 */
export const validateBrandAsset = (file: File, options: FileUploadOptions = {}): { valid: boolean; error?: string } => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  if (file.size > opts.maxSizeBytes!) {
    return { 
      valid: false, 
      error: `File too large. Maximum size is ${Math.round(opts.maxSizeBytes! / 1024 / 1024)}MB` 
    };
  }

  if (!opts.allowedTypes!.includes(file.type)) {
    return { 
      valid: false, 
      error: `Invalid file type. Allowed types: ${opts.allowedTypes!.join(', ')}` 
    };
  }

  return { valid: true };
};
