import React from 'react';
import {
  ContactSettingsPayload,
  ContactSettingsResponse,
  createDepositContactSettings,
  deleteDepositContactSettings,
  getDepositContactSettings,
  updateDepositContactSettings,
} from '../api';
import { useAuth } from '../auth';

const parseRecipients = (value: string): string[] => {
  const seen = new Set<string>();
  return value
    .split(/[,\n]+/)
    .map((part) => part.trim())
    .filter((part) => {
      if (!part) return false;
      const key = part.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const formatRecipients = (recipients: string[]) => recipients.join('\n');

const ContactSettingsPage: React.FC = () => {
  const { auth } = useAuth();
  const token = auth?.token;
  const [configured, setConfigured] = React.useState(false);
  const [recipientsText, setRecipientsText] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [isBusy, setIsBusy] = React.useState(false);

  const loadSettings = React.useCallback(async () => {
    if (!token) {
      setConfigured(false);
      setRecipientsText('');
      return;
    }
    try {
      setIsBusy(true);
      const response = await getDepositContactSettings(token);
      setConfigured(response.configured);
      setRecipientsText(formatRecipients(response.recipients));
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Unable to load contact settings.');
    } finally {
      setIsBusy(false);
    }
  }, [token]);

  React.useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const saveSettings = async (payload: ContactSettingsPayload) => {
    if (!token) return;
    try {
      setIsBusy(true);
      const request = configured
        ? updateDepositContactSettings
        : createDepositContactSettings;
      const response: ContactSettingsResponse = await request(token, payload);
      setConfigured(response.configured);
      setRecipientsText(formatRecipients(response.recipients));
      setSuccess('Contact settings saved.');
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Unable to save contact settings.');
      setSuccess(null);
    } finally {
      setIsBusy(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const recipients = parseRecipients(recipientsText);
    await saveSettings({ recipients });
  };

  const handleClear = async () => {
    if (!token) return;
    try {
      setIsBusy(true);
      await deleteDepositContactSettings(token);
      setSuccess('Custom recipients cleared.');
      setError(null);
      await loadSettings();
    } catch (err) {
      console.error(err);
      setError('Unable to clear contact settings.');
      setSuccess(null);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div>
      <h2>Admin Settings</h2>

      <section className="form-section">
        <div className="form-card">
          <h3 className="form-title">Deposit Notifications</h3>
          <p>
            Configure the email addresses that should receive deposit submission
            notifications.
          </p>
          {configured ? (
            <p className="form-message form-message--info">
              Custom recipients are in use. Update the list below to change who will
              receive emails.
            </p>
          ) : (
            <p className="form-message form-message--info">
              No custom recipients are configured. The system will use the default
              addresses from the environment settings until you save changes.
            </p>
          )}
          {error && (
            <p className="form-message form-message--error" role="alert">
              {error}
            </p>
          )}
          {success && (
            <p className="form-message form-message--success" role="status">
              {success}
            </p>
          )}
        </div>
      </section>

      <section className="form-section">
        <form className="form-card" onSubmit={handleSubmit}>
          <div className="form-fields">
            <label htmlFor="deposit-recipients">
              Recipient Emails
              <textarea
                id="deposit-recipients"
                value={recipientsText}
                onChange={(event) => setRecipientsText(event.target.value)}
                rows={6}
                placeholder="one@example.com\nother@example.com"
                aria-describedby="deposit-recipients-help"
              />
            </label>
            <small id="deposit-recipients-help">
              Enter one email address per line or separate them with commas.
            </small>
          </div>
          <div className="form-actions">
            <button type="submit" disabled={isBusy}>
              Save Changes
            </button>
            <button
              type="button"
              onClick={handleClear}
              disabled={isBusy || (!configured && !recipientsText.trim())}
            >
              Clear Custom Recipients
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default ContactSettingsPage;
