import React from 'react';
import {
  createDocumentRequirement,
  deleteDocumentRequirement,
  DocumentRequirement,
  DocumentWorkflow,
  listDocumentRequirements,
  reorderDocumentRequirements,
  updateDocumentRequirement,
} from '../api';
import { useAuth } from '../auth';

const WORKFLOW_OPTIONS: { value: DocumentWorkflow; label: string }[] = [
  { value: 'offer', label: 'Offers' },
  { value: 'property_application', label: 'Property Applications' },
  { value: 'account_opening', label: 'Account Openings' },
  { value: 'loan_application', label: 'Loan Applications' },
];

const DocumentRequirementsPage: React.FC = () => {
  const { auth } = useAuth();
  const [workflow, setWorkflow] = React.useState<DocumentWorkflow>('offer');
  const [requirements, setRequirements] = React.useState<DocumentRequirement[]>([]);
  const [draftNames, setDraftNames] = React.useState<Record<number, string>>({});
  const [newName, setNewName] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  const token = auth?.token;

  const refreshRequirements = React.useCallback(() => {
    if (!token) {
      setRequirements([]);
      setDraftNames({});
      return;
    }
    listDocumentRequirements(token, workflow)
      .then(items => {
        setRequirements(items);
        setDraftNames(Object.fromEntries(items.map(item => [item.id, item.name])));
      })
      .catch(() => setError('Unable to load document requirements.'));
  }, [token, workflow]);

  React.useEffect(() => {
    refreshRequirements();
  }, [refreshRequirements]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;
    const name = newName.trim();
    if (!name) return;
    try {
      setIsSaving(true);
      const created = await createDocumentRequirement(token, {
        name,
        applies_to: workflow,
      });
      setRequirements(prev => [...prev, created].sort((a, b) => a.order - b.order));
      setDraftNames(prev => ({ ...prev, [created.id]: created.name }));
      setNewName('');
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to create document requirement.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleNameChange = (id: number, value: string) => {
    setDraftNames(prev => ({ ...prev, [id]: value }));
  };

  const handleSaveName = async (requirement: DocumentRequirement) => {
    if (!token) return;
    const trimmed = draftNames[requirement.id]?.trim();
    if (!trimmed || trimmed === requirement.name) return;
    try {
      setIsSaving(true);
      const updated = await updateDocumentRequirement(token, requirement.id, {
        name: trimmed,
      });
      setRequirements(prev =>
        prev.map(item => (item.id === updated.id ? updated : item)),
      );
      setDraftNames(prev => ({ ...prev, [updated.id]: updated.name }));
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to update requirement.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!token) return;
    try {
      setIsSaving(true);
      await deleteDocumentRequirement(token, id);
      setRequirements(prev => prev.filter(item => item.id !== id));
      setDraftNames(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to delete requirement.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleMove = async (index: number, offset: number) => {
    if (!token) return;
    const targetIndex = index + offset;
    if (targetIndex < 0 || targetIndex >= requirements.length) return;
    const reordered = [...requirements];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    setRequirements(reordered);
    try {
      setIsSaving(true);
      await reorderDocumentRequirements(
        token,
        workflow,
        reordered.map(item => item.id),
      );
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to update order.');
      refreshRequirements();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <h2>Document Requirements</h2>
      <section className="form-section">
        <div className="form-card">
          <div className="form-fields">
            <label htmlFor="workflow-select">
              Workflow
              <select
                id="workflow-select"
                value={workflow}
                onChange={event => setWorkflow(event.target.value as DocumentWorkflow)}
              >
                {WORKFLOW_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p>
            Configure the documents agents must upload before submitting{' '}
            {WORKFLOW_OPTIONS.find(option => option.value === workflow)?.label.toLowerCase()}.
          </p>
          {error && <p className="form-error" role="alert">{error}</p>}
        </div>
      </section>

      <section className="form-section">
        <form className="form-card" onSubmit={handleCreate}>
          <h3 className="form-title">Add Requirement</h3>
          <div className="form-fields">
            <label htmlFor="requirement-name">
              Name
              <input
                id="requirement-name"
                value={newName}
                onChange={event => setNewName(event.target.value)}
                placeholder="e.g. Signed offer letter"
                required
              />
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" disabled={isSaving}>
              Add Requirement
            </button>
          </div>
        </form>
      </section>

      <section className="form-section">
        <div className="form-card">
          {requirements.length === 0 ? (
            <p>No requirements configured for this workflow.</p>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead className="data-table__header">
                  <tr>
                    <th scope="col">Order</th>
                    <th scope="col">Name</th>
                    <th scope="col" className="data-table__actions">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {requirements.map((requirement, index) => (
                    <tr key={requirement.id}>
                      <td>{index + 1}</td>
                      <td>
                        <div className="inline-field">
                          <input
                            value={draftNames[requirement.id] ?? ''}
                            onChange={event =>
                              handleNameChange(requirement.id, event.target.value)
                            }
                            onBlur={() => handleSaveName(requirement)}
                            disabled={isSaving}
                          />
                        </div>
                      </td>
                      <td>
                        <div className="table-actions">
                          <button
                            type="button"
                            onClick={() => handleMove(index, -1)}
                            disabled={isSaving || index === 0}
                            aria-label="Move up"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMove(index, 1)}
                            disabled={isSaving || index === requirements.length - 1}
                            aria-label="Move down"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(requirement.id)}
                            disabled={isSaving}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default DocumentRequirementsPage;
