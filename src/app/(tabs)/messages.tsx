import React from 'react';
import { StyleSheet, View, FlatList, TouchableOpacity, Image, TextInput } from 'react-native';
import { Stack } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

interface Message {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unread: boolean;
  avatar: string | null;
}

// Sample messages data
const MESSAGES: Message[] = [
  {
    id: '1',
    name: 'John Smith',
    lastMessage: 'I can come by tomorrow at 2pm to look at the electrical issue.',
    time: '10:30 AM',
    unread: true,
    avatar: null,
  },
  {
    id: '2',
    name: 'Jane Doe',
    lastMessage: 'The price is ₦8,500 for the plumbing work. Does that work for you?',
    time: 'Yesterday',
    unread: false,
    avatar: null,
  },
  {
    id: '3',
    name: 'Mike Johnson',
    lastMessage: 'I\'ve completed the cabinet installation. Please check if everything is to your satisfaction.',
    time: 'Yesterday',
    unread: false,
    avatar: null,
  },
  {
    id: '4',
    name: 'Sarah Williams',
    lastMessage: 'Thanks for your payment. I\'ll be available for any follow-up work if needed.',
    time: 'Monday',
    unread: false,
    avatar: null,
  },
  {
    id: '5',
    name: 'David Brown',
    lastMessage: 'I\'m sorry, I won\'t be able to make it today. Can we reschedule to next week?',
    time: 'Monday',
    unread: true,
    avatar: null,
  },
];

export default function MessagesScreen() {
  const [searchQuery, setSearchQuery] = React.useState('');
  
  const renderMessageItem = ({ item }: { item: Message }) => (
    <TouchableOpacity style={styles.messageCard}>
      <Image
        source={item.avatar ? { uri: item.avatar } : require('../../../assets/images/icon.png')}
        style={styles.avatar}
      />
      
      <View style={styles.messageContent}>
        <View style={styles.messageHeader}>
          <ThemedText style={[styles.name, item.unread && styles.unreadName]}>
            {item.name}
          </ThemedText>
          <ThemedText style={styles.time}>{item.time}</ThemedText>
        </View>
        
        <ThemedText 
          numberOfLines={1} 
          style={[styles.lastMessage, item.unread && styles.unreadMessage]}
        >
          {item.lastMessage}
        </ThemedText>
      </View>
      
      {item.unread && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ 
        title: 'Messages',
        headerShown: true
      }} />
      
      {/* Search bar */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={24} color="#888" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search messages..."
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <MaterialIcons name="clear" size={24} color="#888" />
          </TouchableOpacity>
        ) : null}
      </View>
      
      {/* Message list */}
      <FlatList
        data={MESSAGES}
        renderItem={renderMessageItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
      />
      
      {/* Floating action button for new message */}
      <TouchableOpacity style={styles.fabButton}>
        <MaterialIcons name="chat" size={24} color="#fff" />
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  messageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
  },
  messageContent: {
    flex: 1,
    marginLeft: 12,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
  },
  unreadName: {
    fontWeight: 'bold',
  },
  time: {
    fontSize: 12,
    color: '#999',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
  },
  unreadMessage: {
    color: '#333',
    fontWeight: '500',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#146383',
    marginLeft: 8,
  },
  fabButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#eb7334',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
}); 