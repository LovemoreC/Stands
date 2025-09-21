import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi } from 'vitest';
import SearchPanel, { SearchSuggestion } from '../SearchPanel';

describe('SearchPanel', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounces suggestions and triggers search actions', async () => {
    vi.useFakeTimers();
    const performSearch = vi.fn().mockResolvedValue([]);
    const fetchSuggestions = vi
      .fn<(query: string) => Promise<SearchSuggestion[]>>()
      .mockResolvedValue([
        {
          value: '123',
          label: 'Loan 123',
        },
      ]);

    render(
      <SearchPanel
        placeholder="Search"
        performSearch={performSearch}
        fetchSuggestions={fetchSuggestions}
        renderResult={() => <div>Result</div>}
      />,
    );

    await act(async () => {
      await Promise.resolve();
    });
    expect(performSearch).toHaveBeenCalledWith('');

    const input = screen.getByRole('searchbox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '12' } });

    expect(fetchSuggestions).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(320);
    });
    expect(fetchSuggestions).toHaveBeenCalledWith('12');

    await act(async () => {
      await Promise.resolve();
    });
    const suggestion = screen.getByRole('option', { name: /loan 123/i });
    fireEvent.click(suggestion);

    await act(async () => {
      await Promise.resolve();
    });
    expect(performSearch).toHaveBeenCalledWith('123');

    fireEvent.change(input, { target: { value: '' } });

    await act(async () => {
      await Promise.resolve();
    });
    expect(performSearch).toHaveBeenCalledWith('');

    fireEvent.change(input, { target: { value: '45' } });
    await act(async () => {
      vi.advanceTimersByTime(320);
    });
    expect(fetchSuggestions).toHaveBeenLastCalledWith('45');

    const button = screen.getByRole('button', { name: /search/i });
    fireEvent.click(button);

    await act(async () => {
      await Promise.resolve();
    });
    expect(performSearch).toHaveBeenCalledWith('45');
  });
});
