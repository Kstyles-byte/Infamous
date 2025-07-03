import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../src/lib/authContext';

export default function SignupSuccessScreen() {
  const { session } = useAuth();

  // Redirect to profile page if already authenticated
  useEffect(() => {
    if (session) {
      const timer = setTimeout(() => {
        router.replace('/(tabs)/profile');
      }, 2000); // Auto-redirect after 2 seconds
      
      return () => clearTimeout(timer);
    }
  }, [session]);

  const handleContinue = () => {
    router.replace('/(tabs)/profile');
  };

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/images/logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      
      <View style={styles.content}>
        <Text style={styles.title}>Registration Successful!</Text>
        <Text style={styles.message}>
          Your account has been created successfully. You can now start using the app.
        </Text>
        
        <TouchableOpacity style={styles.button} onPress={handleContinue}>
          <Text style={styles.buttonText}>Continue to Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 200,
    height: 80,
    marginBottom: 40,
  },
  content: {
    width: '100%',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#146383',
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    marginBottom: 30,
    textAlign: 'center',
    color: '#666',
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#eb7334',
    width: '100%',
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 