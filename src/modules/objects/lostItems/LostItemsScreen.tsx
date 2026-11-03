import React from 'react';
import { ObjectItemsScreen } from '../ObjectItemsScreen';

export const LostItemsScreen: React.FC<{
  onOpenRequests: () => void;
  onRefreshReady: (refresh: (() => Promise<void>) | null) => void;
}> = ({ onOpenRequests, onRefreshReady }) => (
  <ObjectItemsScreen kind="lost" onOpenRequests={onOpenRequests} onRefreshReady={onRefreshReady} />
);
