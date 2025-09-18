import React, { useState } from 'react';
import { importProperties, ImportPropertiesResult } from '../api/projects';

type Status = 'idle' | 'uploading' | 'success' | 'error';

export interface PropertyImportFormProps {
  onImported?: (result: ImportPropertiesResult) => void;
  className?: string;
}

const PropertyImportForm: React.FC<PropertyImportFormProps> = ({
  onImported,
  className,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const resetFeedback = () => {
    setStatus('idle');
    setMessage('');
    setError('');
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

    setStatus('uploading');
    setMessage('');
    setError('');

    try {
      const result = await importProperties(file);
      setStatus('success');
      const successMessage =
        result.message ?? 'Property data imported successfully.';
      setMessage(successMessage);
      onImported?.(result);
    } catch (err) {
      setStatus('error');
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to import properties.';
      setError(errorMessage);
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
      {status === 'success' && message && <p>{message}</p>}
      {status === 'error' && error && <p>{error}</p>}
    </form>
  );
};

export default PropertyImportForm;
