import React from 'react';

export interface SearchSuggestion {
  value: string;
  label: string;
  description?: string;
}

interface ResultHelpers {
  refresh: () => void;
  query: string;
}

interface SearchPanelProps<TResult> {
  title?: string;
  placeholder?: string;
  searchButtonLabel?: string;
  emptyMessage?: string;
  initialQuery?: string;
  debounceMs?: number;
  performSearch: (query: string) => Promise<TResult[]>;
  fetchSuggestions: (query: string) => Promise<SearchSuggestion[]>;
  renderResult: (result: TResult, helpers: ResultHelpers) => React.ReactNode;
  getResultKey?: (result: TResult, index: number) => React.Key;
}

function SearchPanel<TResult>({
  title,
  placeholder = 'Search…',
  searchButtonLabel = 'Search',
  emptyMessage = 'No results found.',
  initialQuery = '',
  debounceMs = 300,
  performSearch,
  fetchSuggestions,
  renderResult,
  getResultKey,
}: SearchPanelProps<TResult>) {
  const [query, setQuery] = React.useState(initialQuery);
  const [results, setResults] = React.useState<TResult[]>([]);
  const [suggestions, setSuggestions] = React.useState<SearchSuggestion[]>([]);
  const [error, setError] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSuggestionsVisible, setIsSuggestionsVisible] = React.useState(false);
  const suggestionTimer = React.useRef<number>();
  const suggestionRequestRef = React.useRef(0);
  const searchRequestRef = React.useRef(0);
  const lastQueryRef = React.useRef(initialQuery.trim());
  const blurTimeoutRef = React.useRef<number>();
  const inputId = React.useId();

  const runSearch = React.useCallback(
    async (rawQuery: string) => {
      const normalizedQuery = rawQuery.trim();
      lastQueryRef.current = normalizedQuery;
      const requestId = searchRequestRef.current + 1;
      searchRequestRef.current = requestId;
      setIsLoading(true);
      setError('');
      try {
        const data = await performSearch(normalizedQuery);
        if (searchRequestRef.current === requestId) {
          setResults(data);
        }
      } catch (err) {
        if (searchRequestRef.current === requestId) {
          const message = err instanceof Error ? err.message : 'Failed to load results';
          setError(message);
          setResults([]);
        }
      } finally {
        if (searchRequestRef.current === requestId) {
          setIsLoading(false);
        }
      }
    },
    [performSearch],
  );

  const refresh = React.useCallback(() => {
    void runSearch(lastQueryRef.current);
  }, [runSearch]);

  React.useEffect(() => {
    void runSearch(initialQuery);
  }, [initialQuery, runSearch]);

  React.useEffect(() => () => window.clearTimeout(blurTimeoutRef.current), []);

  React.useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      window.clearTimeout(suggestionTimer.current);
      suggestionRequestRef.current += 1;
      setSuggestions([]);
      return;
    }

    window.clearTimeout(suggestionTimer.current);
    suggestionTimer.current = window.setTimeout(() => {
      const requestId = suggestionRequestRef.current + 1;
      suggestionRequestRef.current = requestId;
      fetchSuggestions(trimmed)
        .then(data => {
          if (suggestionRequestRef.current === requestId) {
            setSuggestions(data);
          }
        })
        .catch(() => {
          if (suggestionRequestRef.current === requestId) {
            setSuggestions([]);
          }
        });
    }, debounceMs);

    return () => {
      window.clearTimeout(suggestionTimer.current);
    };
  }, [query, debounceMs, fetchSuggestions]);

  const previousTrimmedQuery = React.useRef(query.trim());
  React.useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed && previousTrimmedQuery.current) {
      void runSearch('');
    }
    previousTrimmedQuery.current = trimmed;
  }, [query, runSearch]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSuggestionsVisible(false);
    void runSearch(query);
  };

  const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.value);
    setIsSuggestionsVisible(false);
    setSuggestions([]);
    void runSearch(suggestion.value);
  };

  const showDropdown = isSuggestionsVisible && suggestions.length > 0;

  return (
    <section className="search-panel">
      {title && <h3 className="search-panel__title">{title}</h3>}
      <form className="search-panel__form" onSubmit={handleSubmit} role="search">
        <label className="search-panel__label" htmlFor={inputId}>
          {title ?? 'Search records'}
        </label>
        <div className="search-panel__controls">
          <input
            id={inputId}
            type="search"
            role="searchbox"
            value={query}
            placeholder={placeholder}
            onChange={event => setQuery(event.target.value)}
            onFocus={() => {
              window.clearTimeout(blurTimeoutRef.current);
              setIsSuggestionsVisible(true);
            }}
            onBlur={() => {
              blurTimeoutRef.current = window.setTimeout(() => {
                setIsSuggestionsVisible(false);
              }, 120);
            }}
            className="search-panel__input"
          />
          <button type="submit" className="search-panel__button">
            {searchButtonLabel}
          </button>
        </div>
        {showDropdown && (
          <ul className="search-panel__suggestions" role="listbox" aria-label="Search suggestions">
            {suggestions.map(suggestion => (
              <li key={suggestion.value} className="search-panel__suggestion-item">
                <button
                  type="button"
                  className="search-panel__suggestion"
                  role="option"
                  onMouseDown={event => event.preventDefault()}
                  onClick={() => handleSuggestionSelect(suggestion)}
                >
                  <span className="search-panel__suggestion-label">{suggestion.label}</span>
                  {suggestion.description && (
                    <span className="search-panel__suggestion-description">{suggestion.description}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </form>
      {error && (
        <p className="search-panel__error" role="alert">
          {error}
        </p>
      )}
      {!error && isLoading && <p className="search-panel__status">Loading results…</p>}
      {!error && !isLoading && results.length === 0 && (
        <p className="search-panel__status">{emptyMessage}</p>
      )}
      {!error && results.length > 0 && (
        <div className="search-panel__results">
          {results.map((result, index) => {
            const key = getResultKey ? getResultKey(result, index) : index;
            return (
              <div key={key} className="search-panel__result">
                {renderResult(result, { refresh, query: lastQueryRef.current })}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default SearchPanel;
