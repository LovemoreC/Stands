import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ContactSettingsPage from '../ContactSettings';
import { AuthContext } from '../../auth';

const authContextValue = {
  auth: { token: 'test-token', role: 'admin', username: 'admin' },
  login: vi.fn(),
  logout: vi.fn(),
};

const renderWithAuth = (ui: React.ReactElement) =>
  render(<AuthContext.Provider value={authContextValue}>{ui}</AuthContext.Provider>);

describe('ContactSettingsPage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('allows administrators to create custom recipients', async () => {
    const fetchMock = vi
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ recipients: ['deposits@example.com'], configured: false }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ recipients: ['custom@example.com'], configured: true }),
      } as Response);

    const user = userEvent.setup();
    renderWithAuth(<ContactSettingsPage />);

    const textarea = await screen.findByLabelText(/Recipient Emails/i);
    expect(textarea).toHaveValue('deposits@example.com');

    await user.clear(textarea);
    await user.type(textarea, 'custom@example.com');
    await user.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const lastCall = fetchMock.mock.calls[1];
    expect(lastCall?.[0]).toContain('/contact-settings/deposit');
    expect((lastCall?.[1] as RequestInit)?.method).toBe('POST');
    expect((lastCall?.[1] as RequestInit)?.body).toBe(
      JSON.stringify({ recipients: ['custom@example.com'] }),
    );

    await screen.findByText(/Contact settings saved/i);
    expect(textarea).toHaveValue('custom@example.com');
  });

  it('clears custom recipients and falls back to defaults', async () => {
    const fetchMock = vi
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ recipients: ['custom@example.com'], configured: true }),
      } as Response)
      .mockResolvedValueOnce({ ok: true } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ recipients: ['deposits@example.com'], configured: false }),
      } as Response);

    const user = userEvent.setup();
    renderWithAuth(<ContactSettingsPage />);

    const textarea = await screen.findByLabelText(/Recipient Emails/i);
    expect(textarea).toHaveValue('custom@example.com');

    await user.click(screen.getByRole('button', { name: /Clear Custom Recipients/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    const deleteCall = fetchMock.mock.calls[1];
    expect((deleteCall?.[1] as RequestInit)?.method).toBe('DELETE');

    await screen.findByText(/Custom recipients cleared/i);
    expect(textarea).toHaveValue('deposits@example.com');
  });
});
