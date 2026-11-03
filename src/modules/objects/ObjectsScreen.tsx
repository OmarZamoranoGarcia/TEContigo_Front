import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { FoundItemsScreen } from './foundItems/FoundItemsScreen';
import { LostItemsScreen } from './lostItems/LostItemsScreen';

export const ObjectsScreen: React.FC<{
  onOpenRequests: () => void;
  onRefreshReady: (refresh: (() => Promise<void>) | null) => void;
}> = ({ onOpenRequests, onRefreshReady }) => {
  const [activeList, setActiveList] = useState<'found' | 'lost'>('found');

  return (
    <View>
      <View className="mb-5 flex-row rounded-xl bg-blue-100 p-1">
        <TouchableOpacity
          className={`flex-1 items-center rounded-lg py-3 ${
            activeList === 'found' ? 'bg-blue-600' : ''
          }`}
          onPress={() => setActiveList('found')}
          accessibilityRole="button"
          accessibilityState={{ selected: activeList === 'found' }}
        >
          <Text
            className={`font-semibold ${
              activeList === 'found' ? 'text-white' : 'text-blue-700'
            }`}
          >
            Encontrados
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-1 items-center rounded-lg py-3 ${
            activeList === 'lost' ? 'bg-blue-600' : ''
          }`}
          onPress={() => setActiveList('lost')}
          accessibilityRole="button"
          accessibilityState={{ selected: activeList === 'lost' }}
        >
          <Text
            className={`font-semibold ${
              activeList === 'lost' ? 'text-white' : 'text-blue-700'
            }`}
          >
            Perdidos
          </Text>
        </TouchableOpacity>
      </View>

      {activeList === 'found'
        ? <FoundItemsScreen onOpenRequests={onOpenRequests} onRefreshReady={onRefreshReady} />
        : <LostItemsScreen onOpenRequests={onOpenRequests} onRefreshReady={onRefreshReady} />}
    </View>
  );
};
