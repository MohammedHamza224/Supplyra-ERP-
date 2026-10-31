import { supabase } from './supabase';

export type StorageBucket = 'public-assets' | 'documents';

export interface UploadOptions {
  upsert?: boolean;
  contentType?: string;
}

export interface UploadResult {
  path: string;
  publicUrl?: string;
  error: Error | null;
}

/**
 * Upload a file to a designated Supabase storage bucket
 */
export async function uploadFile(
  bucket: StorageBucket,
  path: string,
  file: File | Blob,
  options?: UploadOptions
): Promise<UploadResult> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        upsert: options?.upsert ?? true,
        contentType: options?.contentType ?? file.type,
      });

    if (error) {
      console.error(`Storage upload error (${bucket}/${path}):`, error);
      return { path: '', error };
    }

    let publicUrl: string | undefined;
    if (bucket === 'public-assets') {
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
      publicUrl = urlData.publicUrl;
    }

    return { path: data.path, publicUrl, error: null };
  } catch (err: any) {
    console.error(`Unexpected storage upload error (${bucket}/${path}):`, err);
    return { path: '', error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Get public URL for an asset in public-assets bucket
 */
export function getPublicAssetUrl(path: string): string {
  const { data } = supabase.storage.from('public-assets').getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Create a signed temporary download URL for private documents
 */
export async function getDocumentSignedUrl(
  path: string, 
  expiresInSeconds: number = 3600
): Promise<{ signedUrl: string | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(path, expiresInSeconds);

    if (error) {
      return { signedUrl: null, error };
    }
    return { signedUrl: data.signedUrl, error: null };
  } catch (err: any) {
    return { signedUrl: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Delete a file from storage
 */
export async function deleteStorageFile(
  bucket: StorageBucket, 
  paths: string[]
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.storage.from(bucket).remove(paths);
    return { error: error ?? null };
  } catch (err: any) {
    return { error: err instanceof Error ? err : new Error(String(err)) };
  }
}
