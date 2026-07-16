import React from 'react';
import Card from './Card';
import Badge from './Badge';
import PlatformBadge from './PlatformBadge';
import ErrorState from './ErrorState';
import Button from './Button';

const STATUS_TONES = {
  connected: 'success',
  disconnected: 'neutral',
  error: 'risk',
  pending: 'neutral',
};

const STATUS_LABELS = {
  connected: 'Connected',
  disconnected: 'Disconnected',
  error: 'Error',
  pending: 'Pending',
};

export default function PlatformConnectionCard({
  platform,
  status = 'disconnected',
  title,
  description,
  errorMessage,
  primaryAction,
  secondaryActions = [],
  stepGuide,
}) {
  const isError = status === 'error';
  const badgeTone = STATUS_TONES[status] || 'neutral';
  const statusLabel = STATUS_LABELS[status] || 'Unknown';

  const cardVariant = isError ? 'error' : 'solid';

  // ID for aria-labelledby
  const titleId = `platform-connection-card-title-${platform}`;

  return (
    <Card variant={cardVariant} aria-labelledby={titleId}>
      <Card.Header
        title={
          <div className="flex items-center gap-3" id={titleId}>
            <PlatformBadge platform={platform} size="md" showLabel={false} />
            <span>{title}</span>
          </div>
        }
        trailing={
          <div aria-live="polite" aria-atomic="true">
            <Badge tone={badgeTone}>{statusLabel}</Badge>
          </div>
        }
      />
      <Card.Body>
        {description && (
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {description}
          </p>
        )}

        {isError && errorMessage && (
          <div className="mt-4">
            <ErrorState title="Connection Error" message={errorMessage} />
          </div>
        )}

        {stepGuide && <div className="mt-4">{stepGuide}</div>}
      </Card.Body>
      {(primaryAction || secondaryActions.length > 0) && (
        <Card.Footer>
          <div className="flex flex-wrap gap-3">
            {primaryAction}
            {secondaryActions.map((action, index) => (
              <React.Fragment key={index}>{action}</React.Fragment>
            ))}
          </div>
        </Card.Footer>
      )}
    </Card>
  );
}
