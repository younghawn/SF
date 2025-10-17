import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

// 로고 이미지 (예: /assets/images/app_logo.png)
const appLogo = require('../assets/images/mainLogo.png');

// 화면 크기
const { width, height } = Dimensions.get('window');
const screenWidth = width;
const screenHeight = height;

export default function HomeScreen() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const isLoggedInMemo = useMemo(() => isLoggedIn, [isLoggedIn]); // 리렌더링 최소화

  useEffect(() => {
    async function checkAuth() {
      try {
        const token = await SecureStore.getItemAsync('AUTH_TOKEN');
        setIsLoggedIn(!!token);
      } catch (error) {
        console.log('[HomeScreen] 인증 확인 오류:', error);
        setIsLoggedIn(false);
      }
    }
    checkAuth();
  }, []);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  if (isLoggedInMemo === true) {
    return <Redirect href="/(tabs)/mainUI" />;
  }

  if (isLoggedInMemo === null) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.subtitle}>로딩 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleStart = () => router.push('/login');

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Animated.View style={[styles.logoContainer, { opacity: fadeAnim }]}>
          <Animated.Image source={appLogo} style={styles.logo} />
          <Text style={styles.title}>Real-Farmpany</Text>
          <View style={styles.divider} />
          <Text style={styles.subtitle}>내 손안의 스마트 농장</Text>
        </Animated.View>
        <TouchableOpacity style={styles.startButton} onPress={handleStart}>
          <Text style={styles.startButtonText}>시작하기</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  container: {
    flex: 1,
    marginHorizontal: 0,
    marginVertical: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 0,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: screenHeight * 0.05,
  },
  logo: {
    width: screenWidth * 0.5,
    height: screenHeight * 0.25,
    marginBottom: screenHeight * 0.025,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#2E4A21',
    marginBottom: 10,
    letterSpacing: 1,
  },
  divider: {
    width: 60,
    height: 3,
    backgroundColor: '#7EC87E',
    borderRadius: 2,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 26,
    fontWeight: '500',
  },
  startButton: {
    backgroundColor: '#7EC87E',
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: screenWidth * 0.1,
    alignItems: 'center',
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});