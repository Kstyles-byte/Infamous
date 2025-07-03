import React, { useState, useEffect } from 'react';
import { 
  View, 
  TextInput, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  ScrollView, 
  Platform, 
  KeyboardAvoidingView, 
  Alert 
} from 'react-native';
import { Link, router } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { supabase } from '../../lib/supabase';
import * as Haptics from 'expo-haptics';

// Import constants
import { STATES, getAreasByStateId } from '../../constants/stateAreas';
import { JOB_CATEGORIES } from '../../constants/jobCategories';

// Enum for user roles
enum UserRole {
  WORKER = 'worker',
  EMPLOYER = 'employer',
  BOTH = 'both'
}

export default function SignupScreen() {
  // Form state
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [areas, setAreas] = useState<{ id: string; name: string; stateId: string }[]>([]);
  const [selectedArea, setSelectedArea] = useState('');
  const [userRole, setUserRole] = useState<UserRole>(UserRole.WORKER);
  const [jobCategory, setJobCategory] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);

  // Update areas when state changes
  useEffect(() => {
    if (selectedState) {
      const stateAreas = getAreasByStateId(selectedState);
      setAreas(stateAreas || []);
      setSelectedArea(''); // Reset selected area when state changes
    }
  }, [selectedState]);

  // Function to convert phone number to fake email for Supabase
  const phoneToEmail = (phone: string) => {
    return `${phone.replace(/\D/g, '')}@infamous.app`;
  };

  const handleSignup = async () => {
    // Basic validation
    if (!fullName.trim()) {
      Alert.alert('Error', 'Please enter your full name');
      return;
    }

    if (!phoneNumber.trim()) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }

    if (pin.length !== 6) {
      Alert.alert('Error', 'PIN must be 6 digits');
      return;
    }

    if (pin !== confirmPin) {
      Alert.alert('Error', 'PINs do not match');
      return;
    }

    if (!selectedState) {
      Alert.alert('Error', 'Please select your state');
      return;
    }

    if (!selectedArea) {
      Alert.alert('Error', 'Please select your area');
      return;
    }

    // Job category and description validation only for workers or both
    if ((userRole === UserRole.WORKER || userRole === UserRole.BOTH) && !jobCategory) {
      Alert.alert('Error', 'Please select a job category');
      return;
    }

    try {
      // Only use haptics on native platforms
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      setLoading(true);
      
      // Convert phone to email for Supabase authentication
      const email = phoneToEmail(phoneNumber);
      
      // Register user with Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: pin,
      });

      if (authError) {
        Alert.alert('Signup Error', authError.message);
        return;
      }

      if (authData.user) {
        // Save additional user details to profiles table
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            full_name: fullName,
            phone_number: phoneNumber,
            state: selectedState,
            area: selectedArea,
            role: userRole,
            job_category: userRole === UserRole.EMPLOYER ? null : jobCategory,
            job_description: userRole === UserRole.EMPLOYER ? null : jobDescription,
            created_at: new Date().toISOString(),
          });

        if (profileError) {
          Alert.alert('Error', 'Failed to create profile: ' + profileError.message);
          return;
        }

        // Success
        Alert.alert(
          'Registration Successful',
          'Your account has been created successfully!',
          [{ text: 'OK', onPress: () => router.push('../signup-success') }]
        );
      }
    } catch (error) {
      console.error('Signup error:', error);
      Alert.alert('Signup Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.logoContainer}>
          <Image 
            source={require('../../../assets/images/logo.png')} 
            style={styles.logo} 
            resizeMode="contain"
          />
        </View>

        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Sign up to get started</Text>

        <View style={styles.formContainer}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your full name"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
          />

          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your phone number"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            autoCapitalize="none"
          />

          <Text style={styles.label}>PIN (6 digits)</Text>
          <TextInput
            style={styles.input}
            placeholder="Create a 6-digit PIN"
            value={pin}
            onChangeText={(text) => setPin(text.replace(/[^0-9]/g, '').slice(0, 6))}
            keyboardType="numeric"
            secureTextEntry
            maxLength={6}
          />

          <Text style={styles.label}>Confirm PIN</Text>
          <TextInput
            style={styles.input}
            placeholder="Confirm your PIN"
            value={confirmPin}
            onChangeText={(text) => setConfirmPin(text.replace(/[^0-9]/g, '').slice(0, 6))}
            keyboardType="numeric"
            secureTextEntry
            maxLength={6}
          />

          <Text style={styles.label}>State</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedState}
              onValueChange={(itemValue) => setSelectedState(itemValue)}
              style={styles.picker}
            >
              <Picker.Item label="Select State" value="" />
              {STATES.map((state) => (
                <Picker.Item key={state.id} label={state.name} value={state.id} />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>Area</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedArea}
              onValueChange={(itemValue) => setSelectedArea(itemValue)}
              style={styles.picker}
              enabled={selectedState !== ''}
            >
              <Picker.Item label="Select Area" value="" />
              {areas.map((area) => (
                <Picker.Item key={area.id} label={area.name} value={area.id} />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>I am a</Text>
          <View style={styles.roleContainer}>
            <TouchableOpacity
              style={[
                styles.roleButton,
                userRole === UserRole.WORKER && styles.roleButtonActive
              ]}
              onPress={() => setUserRole(UserRole.WORKER)}
            >
              <Text style={[
                styles.roleButtonText,
                userRole === UserRole.WORKER && styles.roleButtonTextActive
              ]}>
                Worker
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.roleButton,
                userRole === UserRole.EMPLOYER && styles.roleButtonActive
              ]}
              onPress={() => setUserRole(UserRole.EMPLOYER)}
            >
              <Text style={[
                styles.roleButtonText,
                userRole === UserRole.EMPLOYER && styles.roleButtonTextActive
              ]}>
                Employer
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.roleButton,
                userRole === UserRole.BOTH && styles.roleButtonActive
              ]}
              onPress={() => setUserRole(UserRole.BOTH)}
            >
              <Text style={[
                styles.roleButtonText,
                userRole === UserRole.BOTH && styles.roleButtonTextActive
              ]}>
                Both
              </Text>
            </TouchableOpacity>
          </View>

          {/* Show job category and description only if user is a worker or both */}
          {(userRole === UserRole.WORKER || userRole === UserRole.BOTH) && (
            <>
              <Text style={styles.label}>Job Category</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={jobCategory}
                  onValueChange={(itemValue) => setJobCategory(itemValue)}
                  style={styles.picker}
                >
                  <Picker.Item label="Select Job Category" value="" />
                  {JOB_CATEGORIES.map((category) => (
                    <Picker.Item key={category.id} label={category.name} value={category.id} />
                  ))}
                </Picker>
              </View>

              <Text style={styles.label}>Job Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Briefly describe your skills and experience"
                value={jobDescription}
                onChangeText={setJobDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </>
          )}

          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]} 
            onPress={handleSignup}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Creating Account...' : 'Sign Up'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="../login" asChild>
            <TouchableOpacity>
              <Text style={styles.loginLink}>Login</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  logo: {
    width: 150,
    height: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: '#146383',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    color: '#666',
  },
  formContainer: {
    width: '100%',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  roleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  roleButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  roleButtonActive: {
    backgroundColor: '#eb7334',
    borderColor: '#eb7334',
  },
  roleButtonText: {
    color: '#333',
    fontWeight: '500',
  },
  roleButtonTextActive: {
    color: '#fff',
  },
  button: {
    backgroundColor: '#eb7334',
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#f0a77d',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  footerText: {
    fontSize: 16,
    color: '#666',
  },
  loginLink: {
    fontSize: 16,
    color: '#eb7334',
    fontWeight: 'bold',
  },
}); 