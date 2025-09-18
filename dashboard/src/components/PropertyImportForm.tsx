import React, { useState } from 'react';
import { importProperties, ImportPropertiesResult } from '../api';
import { useAuth } from '../auth';

type Status = 'idle' | 'uploading' | 'success' | 'error';

export interface PropertyImportFormProps {
  onImported?: (result: ImportPropertiesResult) => void;
  className?: string;
}

const PropertyImportForm: React.FC<PropertyImportFormProps> = ({
  onImported,
  className,
}) => {
  const { auth } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  const resetFeedback = () => {
    setStatus('idle');
    setMessage('');
    setError('');
    setErrors([]);
  };

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    resetFeedback();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) {
      setStatus('error');
      setError('Please select a CSV or XLSX file to import.');
      return;
    }
    if (!auth?.token) {
      setStatus('error');
      setError('You must be logged in to import properties.');
      return;
    }

    setStatus('uploading');
    setMessage('');
    setError('');
    setErrors([]);

    try {
      const result = await importProperties(auth.token, file);
      const successMessage =
        result.message ?? 'Property data imported successfully.';
      const importErrors = result.errors ?? [];
      setErrors(importErrors);

      if (importErrors.length > 0) {
        setStatus('error');
        setMessage(successMessage);
        setError('Some rows failed to import.');
      } else {
        setStatus('success');
        setMessage(successMessage);
      }
      onImported?.(result);
    } catch (err) {
      setStatus('error');
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to import properties.';
      setError(errorMessage);
      setErrors([]);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={className}>
      <label>
        Upload property data
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={onFileChange}
          disabled={status === 'uploading'}
        />
      </label>
      <button type="submit" disabled={status === 'uploading'}>
        {status === 'uploading' ? 'Importing…' : 'Import Properties'}
      </button>
      {message && <p>{message}</p>}
      {status === 'error' && error && <p>{error}</p>}
      {errors.length > 0 && (
        <ul>
          {errors.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      )}
    </form>
  );
};

export default PropertyImportForm;

