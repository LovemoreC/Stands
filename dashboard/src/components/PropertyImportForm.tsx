import React, { useMemo, useState } from 'react';
import { importProperties, ImportPropertiesResult } from '../api';
import { useAuth } from '../auth';

type Status = 'idle' | 'uploading' | 'success' | 'error';

export interface PropertyImportFormProps {
  onImported?: (result: ImportPropertiesResult) => void;
  className?: string;
  fieldsClassName?: string;
  actionsClassName?: string;
  children?: React.ReactNode;
}

const PropertyImportForm: React.FC<PropertyImportFormProps> = ({
  onImported,
  className,
  fieldsClassName,
  actionsClassName,
  children,
}) => {
  const { auth } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  const formClassName = useMemo(
    () => ['form-card', className].filter(Boolean).join(' '),
    [className],
  );
  const mergedFieldsClassName = useMemo(
    () => ['form-fields', fieldsClassName].filter(Boolean).join(' '),
    [fieldsClassName],
  );
  const mergedActionsClassName = useMemo(
    () => ['form-actions', actionsClassName].filter(Boolean).join(' '),
    [actionsClassName],
  );

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
    <form onSubmit={handleSubmit} className={formClassName}>
      {children}
      <div className={mergedFieldsClassName}>
        <label htmlFor="property-import-file">
          Upload property data
          <input
            id="property-import-file"
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={onFileChange}
            disabled={status === 'uploading'}
          />
        </label>
      </div>
      {message && (
        <p
          className={['form-message', status === 'success' ? 'form-message--success' : 'form-message--info']
            .filter(Boolean)
            .join(' ')}
        >
          {message}
        </p>
      )}
      {status === 'error' && error && (
        <p className="form-message form-message--error">{error}</p>
      )}
      {errors.length > 0 && (
        <ul className="form-message form-message--error">
          {errors.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      )}
      <div className={mergedActionsClassName}>
        <button type="submit" disabled={status === 'uploading'}>
          {status === 'uploading' ? 'Importing…' : 'Import Properties'}
        </button>
      </div>
    </form>
  );
};

export default PropertyImportForm;

