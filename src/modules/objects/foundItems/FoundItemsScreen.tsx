import React from 'react';
import { ObjectItemsScreen } from '../ObjectItemsScreen';

export const FoundItemsScreen: React.FC<{
  onOpenRequests: () => void;
  onRefreshReady: (refresh: (() => Promise<void>) | null) => void;
}> = ({ onOpenRequests, onRefreshReady }) => (
  <ObjectItemsScreen kind="found" onOpenRequests={onOpenRequests} onRefreshReady={onRefreshReady} />
);
