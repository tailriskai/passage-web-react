import { useState, useEffect } from "react";
import {
  createIntentTokenLink,
  initialize,
  configure
} from "@getpassage/react-js";

function ShortcodeExample() {
  const [integrationId, setIntegrationId] = useState<string>('passage-test');
  const [publishableKey, setPublishableKey] = useState<string>('pk-live-0d017c4c-307e-441c-8b72-cb60f64f77f8');
  const [resources, setResources] = useState<{ [key: string]: { read?: boolean; write?: boolean } }>({
    balance: { read: true }
  });
  const [createdShortCode, setCreatedShortCode] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string>('');

  // Initialize SDK when component mounts
  useEffect(() => {
    configure({
      apiUrl: 'https://api.getpassage.ai',
      debug: true
    });

    if (publishableKey) {
      initialize({
        publishableKey,
        integrationId
      }).catch(err => {
        console.error('Failed to initialize:', err);
      });
    }
  }, [publishableKey, integrationId]);

  const handleCreateShortcode = async () => {
    setIsCreating(true);
    setError('');

    try {
      // Build resources object based on checkboxes
      const requestResources: Record<string, Record<string, unknown>> = {};

      Object.entries(resources).forEach(([key, permissions]) => {
        requestResources[key] = {};
        if (permissions.read) {
          requestResources[key].read = {};
        }
        if (permissions.write) {
          requestResources[key].write = {};
        }
      });

      const result = await createIntentTokenLink({
        integrationId,
        requestPayload: {
          resources: requestResources,
          returnUrl: window.location.origin
        },
        notes: 'Created from example app',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      }, publishableKey);

      setCreatedShortCode(result.shortToken);
      console.log('Created shortcode:', result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create shortcode');
      console.error('Error:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenShortcode = () => {
    if (createdShortCode) {
      const url = `${window.location.origin}?shortCode=${createdShortCode}`;
      window.open(url, '_blank');
    }
  };

  const toggleResource = (resource: string, permission: 'read' | 'write') => {
    setResources(prev => ({
      ...prev,
      [resource]: {
        ...prev[resource],
        [permission]: !prev[resource]?.[permission]
      }
    }));
  };

  const addResource = (resource: string) => {
    if (resource && !resources[resource]) {
      setResources(prev => ({
        ...prev,
        [resource]: { read: true }
      }));
    }
  };

  return (
    <section className="example-section">
      <h2>Shortcode Creation</h2>

      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#555' }}>Configuration</h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#666' }}>
              Integration ID
            </label>
            <input
              type="text"
              value={integrationId}
              onChange={(e) => setIntegrationId(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '1rem'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#666' }}>
              Publishable Key
            </label>
            <input
              type="text"
              value={publishableKey}
              onChange={(e) => setPublishableKey(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '1rem'
              }}
            />
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#555' }}>Resources</h3>

          <div style={{ marginBottom: '1rem' }}>
            {Object.entries(resources).map(([resource, permissions]) => (
              <div key={resource} style={{
                padding: '1rem',
                backgroundColor: '#f8f9fa',
                borderRadius: '6px',
                marginBottom: '0.5rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ color: '#333' }}>{resource}</strong>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={permissions.read || false}
                        onChange={() => toggleResource(resource, 'read')}
                        style={{ marginRight: '0.5rem' }}
                      />
                      Read
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={permissions.write || false}
                        onChange={() => toggleResource(resource, 'write')}
                        style={{ marginRight: '0.5rem' }}
                      />
                      Write
                    </label>
                    <button
                      onClick={() => {
                        const newResources = { ...resources };
                        delete newResources[resource];
                        setResources(newResources);
                      }}
                      style={{
                        background: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '0.25rem 0.5rem',
                        cursor: 'pointer',
                        fontSize: '0.875rem'
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => addResource('transactions')}
              style={{
                background: '#f8f9fa',
                border: '1px solid #ddd',
                borderRadius: '4px',
                padding: '0.5rem 1rem',
                cursor: 'pointer'
              }}
            >
              + Transactions
            </button>
            <button
              onClick={() => addResource('payment_method')}
              style={{
                background: '#f8f9fa',
                border: '1px solid #ddd',
                borderRadius: '4px',
                padding: '0.5rem 1rem',
                cursor: 'pointer'
              }}
            >
              + Payment Method
            </button>
            <button
              onClick={() => addResource('profile')}
              style={{
                background: '#f8f9fa',
                border: '1px solid #ddd',
                borderRadius: '4px',
                padding: '0.5rem 1rem',
                cursor: 'pointer'
              }}
            >
              + Profile
            </button>
          </div>
        </div>
      </div>

      <div style={{
        display: 'flex',
        gap: '1rem',
        borderTop: '1px solid #e0e0e0',
        paddingTop: '1.5rem'
      }}>
        <button
          onClick={handleCreateShortcode}
          disabled={isCreating || !publishableKey || !integrationId}
          style={{
            background: isCreating ? '#6c757d' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '0.75rem 1.5rem',
            cursor: isCreating ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
            fontWeight: '500'
          }}
        >
          {isCreating ? 'Creating...' : 'Create Shortcode'}
        </button>

        {createdShortCode && (
          <button
            onClick={handleOpenShortcode}
            style={{
              background: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '0.75rem 1.5rem',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '500'
            }}
          >
            Open Shortcode Link →
          </button>
        )}
      </div>

      {error && (
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          background: '#f8d7da',
          color: '#721c24',
          borderRadius: '6px',
          border: '1px solid #f5c6cb'
        }}>
          {error}
        </div>
      )}

      {createdShortCode && (
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          background: '#d4edda',
          color: '#155724',
          borderRadius: '6px',
          border: '1px solid #c3e6cb'
        }}>
          <strong>Shortcode Created!</strong>
          <div style={{ marginTop: '0.5rem' }}>
            <code style={{
              background: '#fff',
              padding: '0.25rem 0.5rem',
              borderRadius: '3px',
              fontSize: '0.9rem'
            }}>
              {createdShortCode}
            </code>
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
            URL: <code style={{
              background: '#fff',
              padding: '0.25rem 0.5rem',
              borderRadius: '3px'
            }}>
              {window.location.origin}?shortCode={createdShortCode}
            </code>
          </div>
        </div>
      )}
    </section>
  );
}

export default ShortcodeExample;