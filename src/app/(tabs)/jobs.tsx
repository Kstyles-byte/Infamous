import React from 'react';
import { StyleSheet, View, FlatList, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

interface Job {
  id: string;
  title: string;
  description: string;
  location: string;
  price: string;
  date: string;
  category: string;
}

// Sample job listings data
const JOBS: Job[] = [
  {
    id: '1',
    title: 'Electrical Wiring Repair',
    description: 'Need help with fixing electrical wiring in my kitchen. The light fixture is not working properly.',
    location: 'Lagos, Nigeria',
    price: '₦15,000',
    date: '1 day ago',
    category: 'Electrical',
  },
  {
    id: '2',
    title: 'Bathroom Plumbing',
    description: 'Looking for a plumber to fix a leaking faucet and install a new shower head in my bathroom.',
    location: 'Abuja, Nigeria',
    price: '₦8,500',
    date: '2 days ago',
    category: 'Plumbing',
  },
  {
    id: '3',
    title: 'Kitchen Cabinet Installation',
    description: 'I need a skilled carpenter to install new kitchen cabinets in my apartment.',
    location: 'Port Harcourt, Nigeria',
    price: '₦25,000',
    date: '3 days ago',
    category: 'Carpentry',
  },
  {
    id: '4',
    title: 'House Painting',
    description: 'Looking for a professional painter to paint the interior of my 3-bedroom house.',
    location: 'Enugu, Nigeria',
    price: '₦45,000',
    date: '4 days ago',
    category: 'Painting',
  },
  {
    id: '5',
    title: 'Garden Maintenance',
    description: 'Need someone to trim trees, mow the lawn, and maintain the garden on a monthly basis.',
    location: 'Ibadan, Nigeria',
    price: '₦12,000/mo',
    date: '5 days ago',
    category: 'Gardening',
  },
];

export default function JobsScreen() {
  const [searchQuery, setSearchQuery] = React.useState('');
  
  const renderJobItem = ({ item }: { item: Job }) => (
    <TouchableOpacity style={styles.jobCard}>
      <View style={styles.jobHeader}>
        <ThemedText style={styles.jobTitle}>{item.title}</ThemedText>
        <View style={styles.categoryPill}>
          <ThemedText style={styles.categoryText}>{item.category}</ThemedText>
        </View>
      </View>
      
      <ThemedText style={styles.jobDescription} numberOfLines={2}>
        {item.description}
      </ThemedText>
      
      <View style={styles.jobFooter}>
        <View style={styles.jobDetails}>
          <View style={styles.jobLocation}>
            <MaterialIcons name="location-on" size={16} color="#666" />
            <ThemedText style={styles.jobLocationText}>{item.location}</ThemedText>
          </View>
          <ThemedText style={styles.jobDate}>{item.date}</ThemedText>
        </View>
        <ThemedText style={styles.jobPrice}>{item.price}</ThemedText>
      </View>
      
      <TouchableOpacity style={styles.applyButton}>
        <ThemedText style={styles.applyButtonText}>Apply</ThemedText>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ 
        title: 'Jobs',
        headerShown: true
      }} />
      
      {/* Search bar */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={24} color="#888" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search jobs..."
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
      
      {/* Filter chips */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          <TouchableOpacity style={[styles.filterChip, styles.filterChipActive]}>
            <ThemedText style={styles.filterChipTextActive}>All</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterChip}>
            <ThemedText style={styles.filterChipText}>Electrical</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterChip}>
            <ThemedText style={styles.filterChipText}>Plumbing</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterChip}>
            <ThemedText style={styles.filterChipText}>Carpentry</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterChip}>
            <ThemedText style={styles.filterChipText}>Painting</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterChip}>
            <ThemedText style={styles.filterChipText}>Gardening</ThemedText>
          </TouchableOpacity>
        </ScrollView>
      </View>
      
      {/* Job listings */}
      <FlatList
        data={JOBS}
        renderItem={renderJobItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
      />
      
      {/* Floating action button for posting a new job */}
      <TouchableOpacity style={styles.fabButton}>
        <MaterialIcons name="add" size={24} color="#fff" />
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
  filterContainer: {
    marginBottom: 12,
  },
  filterScroll: {
    paddingHorizontal: 16,
  },
  filterChip: {
    backgroundColor: 'white',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  filterChipActive: {
    backgroundColor: '#146383',
    borderColor: '#146383',
  },
  filterChipText: {
    fontSize: 14,
    color: '#333',
  },
  filterChipTextActive: {
    fontSize: 14,
    color: 'white',
    fontWeight: 'bold',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  jobCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  categoryPill: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    color: '#666',
  },
  jobDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  jobDetails: {
    flex: 1,
  },
  jobLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  jobLocationText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  jobDate: {
    fontSize: 12,
    color: '#999',
  },
  jobPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#146383',
  },
  applyButton: {
    backgroundColor: '#eb7334',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
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