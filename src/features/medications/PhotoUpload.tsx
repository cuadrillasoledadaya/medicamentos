// PhotoUpload — file input that uploads to Supabase Storage.

import { useRef, useState } from 'react';
import { useUploadPhoto } from './hooks';

interface PhotoUploadProps {
  medicationId: string;
  onUploaded?: (photoPath: string) => void;
}

export function PhotoUpload({ medicationId, onUploaded }: PhotoUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useUploadPhoto();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Solo se permiten imágenes JPEG, PNG o WebP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen no debe superar 5 MB.');
      return;
    }

    setError(null);

    // Preview
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);

    // Upload
    const result = await uploadMutation.mutateAsync({ medicationId, file });
    if (result.error) {
      setError(result.error.message);
    } else if (result.data) {
      onUploaded?.(result.data.path);
    }
  };

  return (
    <div style={styles.container}>
      <label style={styles.label}>Foto</label>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFile}
        style={styles.input}
        disabled={uploadMutation.isPending}
      />
      {uploadMutation.isPending && <span style={styles.pending}>Subiendo...</span>}
      {error && <span style={styles.error}>{error}</span>}
      {preview && (
        <img src={preview} alt="Preview" style={styles.preview} />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  label: { fontSize: '0.875rem', fontWeight: 600, color: '#374151' },
  input: { fontSize: '0.875rem' },
  pending: { fontSize: '0.75rem', color: '#0ea5e9' },
  error: { fontSize: '0.75rem', color: '#dc2626' },
  preview: { maxWidth: '200px', borderRadius: '4px', marginTop: '0.5rem' },
};
