import React from 'react';
import type { ObjectItemCardProps } from '../ObjectItemCard';
import { ObjectItemCard } from '../ObjectItemCard';

export const LostItemCard: React.FC<ObjectItemCardProps> = (props) => (
  <ObjectItemCard {...props} itemType="perdido" />
);
