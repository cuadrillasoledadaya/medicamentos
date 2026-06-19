// Medications API layer — CRUD + photo upload for medications table.

import { supabase } from '../../lib/supabase';
import type { Medication } from '../../lib/database.types';

const client = supabase as any;

const PHOTO_BUCKET = 'medication-photos';

export async function listMedications(
  pacienteId: string,
): Promise<{ data: Medication[] | null; error: Error | null }> {
  const { data, error } = await client
    .from('medications')
    .select('*')
    .eq('paciente_id', pacienteId)
    .order('created_at', { ascending: false });
  return { data: data as Medication[] | null, error: error ? new Error(error.message) : null };
}

export async function getMedication(id: string): Promise<{ data: Medication | null; error: Error | null }> {
  const { data, error } = await client
    .from('medications')
    .select('*')
    .eq('id', id)
    .single();
  return { data: data as Medication | null, error: error ? new Error(error.message) : null };
}

export async function createMedication(
  input: {
    paciente_id: string;
    name: string;
    dose_value: number;
    dose_unit: string;
    dose_unit_other?: string | null;
    route: string;
    frequency_hint?: string | null;
    notes?: string | null;
    stock_estimate?: number;
    low_stock_threshold?: number;
  },
): Promise<{ data: Medication | null; error: Error | null }> {
  const { data, error } = await client
    .from('medications')
    .insert([{ ...input }])
    .select()
    .single();
  return { data: data as Medication | null, error: error ? new Error(error.message) : null };
}

export async function updateMedication(
  id: string,
  patch: {
    name?: string;
    dose_value?: number;
    dose_unit?: string;
    dose_unit_other?: string | null;
    route?: string;
    frequency_hint?: string | null;
    notes?: string | null;
    photo_url?: string | null;
    stock_estimate?: number;
    low_stock_threshold?: number;
    active?: boolean;
  },
): Promise<{ data: Medication | null; error: Error | null }> {
  const { data, error } = await client
    .from('medications')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  return { data: data as Medication | null, error: error ? new Error(error.message) : null };
}

export async function archiveMedication(id: string): Promise<{ data: Medication | null; error: Error | null }> {
  const { data, error } = await client
    .from('medications')
    .update({ active: false })
    .eq('id', id)
    .select()
    .single();
  return { data: data as Medication | null, error: error ? new Error(error.message) : null };
}

export async function uploadPhoto(
  medicationId: string,
  file: File,
): Promise<{ data: { path: string; url: string } | null; error: Error | null }> {
  try {
    // Ensure bucket exists (runtime check)
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some((b: any) => b.name === PHOTO_BUCKET);
    if (!bucketExists) {
      await supabase.storage.createBucket(PHOTO_BUCKET, {
        public: false,
        fileSizeLimit: 5 * 1024 * 1024, // 5 MB
      });
    }

    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${medicationId}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(path, file, { upsert: true });

    if (uploadError) {
      return { data: null, error: new Error(uploadError.message) };
    }

    // Get signed URL
    const { data: urlData } = await supabase.storage
      .from(PHOTO_BUCKET)
      .createSignedUrl(path, 3600);

    return {
      data: { path, url: urlData?.signedUrl ?? '' },
      error: null,
    };
  } catch (e: any) {
    return { data: null, error: new Error(e.message) };
  }
}

export async function getPhotoUrl(
  photoPath: string | null,
): Promise<string | null> {
  if (!photoPath) return null;
  try {
    const { data } = await supabase.storage
      .from(PHOTO_BUCKET)
      .createSignedUrl(photoPath, 3600);
    return data?.signedUrl ?? null;
  } catch {
    return null;
  }
}
