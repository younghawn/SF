import React, { useState, useRef, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

const MAIN_GREEN = '#7EC87E';
const SUB_GREEN = '#81C784';

export default function EcoFriendlyLoginScreen() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [userId, setUserId] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [autoLoginData, setAutoLoginData] = useState<{ userId: string; userPassword: string } | null>(null);
  const [isAutoFilled, setIsAutoFilled] = useState(false);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handleLogin = async () => {
    if (!userId || !userPassword) {
      Alert.alert('로그인 실패', '아이디와 비밀번호를 입력해주세요.');
      return;
    }

    try {
      console.log('[Login] 서버에 로그인 요청:', userId, userPassword);

      const response = await fetch('https://port-0-server-m7tucm4sab201860.sel4.cloudtype.app/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, password: userPassword }),
      });
      console.log('[Login] 응답 status:', response.status);

      const data = await response.json();
      console.log('[Login] 응답 data:', data);

      if (response.ok) {
        Alert.alert('로그인 성공', `${userId}님 환영합니다!`);
        await AsyncStorage.setItem('LOGGED_IN_USER', userId);
        const farmId = data.farmId || '2';
        await AsyncStorage.setItem('SELECTED_FARM_ID', farmId);
        if (data.token) {
          await AsyncStorage.setItem('AUTH_TOKEN', data.token);
          console.log('로그인 후 AsyncStorage 저장 - AUTH_TOKEN:', data.token);
        }
        await AsyncStorage.setItem('AUTO_LOGIN_DATA', JSON.stringify({ userId, userPassword }));
        const storedUserId = await AsyncStorage.getItem('LOGGED_IN_USER');
        const storedFarmId = await AsyncStorage.getItem('SELECTED_FARM_ID');
        console.log('로그인 후 AsyncStorage 저장 확인 - LOGGED_IN_USER:', storedUserId, 'SELECTED_FARM_ID:', storedFarmId);
        router.replace('/listfarm');
      } else {
        Alert.alert('로그인 실패', data.message || '로그인에 실패했습니다.');
      }
    } catch (error) {
      console.error('[Login] 오류:', error);
      Alert.alert('오류', '서버 요청에 실패했습니다.');
    }
  };

  const handleAutoLogin = async () => {
    if (!isAutoFilled && !autoLoginData) {
      const savedData = await AsyncStorage.getItem('AUTO_LOGIN_DATA');
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        setAutoLoginData(parsedData);
        setUserId(parsedData.userId);
        setUserPassword(parsedData.userPassword);
        setIsAutoFilled(true);
        Alert.alert('알림', '최근 로그인 정보가 자동으로 채워졌습니다.');
      } else {
        Alert.alert('알림', '저장된 로그인 정보가 없습니다.');
      }
    } else if (!isAutoFilled && autoLoginData) {
      setUserId(autoLoginData.userId);
      setUserPassword(autoLoginData.userPassword);
      setIsAutoFilled(true);
      Alert.alert('알림', '최근 로그인 정보가 자동으로 채워졌습니다.');
    } else {
      handleLogin();
    }
  };

  const handleSignup = () => {
    router.push('/signup');
  };

  const handleNext = () => {
    router.replace('/listfarm');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
          <View style={styles.header}>
            <Text style={styles.title}>Real-FarmPany</Text>
            <View style={styles.divider} />
            <Text style={styles.subtitle}>내 손안의 스마트 농장</Text>
          </View>
          <View style={styles.inputZone}>
            <TextInput
              style={styles.input}
              placeholder="아이디"
              placeholderTextColor="#A0A0A0"
              value={userId}
              onChangeText={setUserId}
            />
            <TextInput
              style={styles.input}
              placeholder="비밀번호"
              placeholderTextColor="#A0A0A0"
              secureTextEntry
              value={userPassword}
              onChangeText={setUserPassword}
            />

            <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
              <Text style={styles.loginButtonText}>로그인</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.skipButton} onPress={handleAutoLogin}>
              <Text style={styles.skipButtonText}>자동 로그인</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.signupButton} onPress={handleSignup}>
              <Text style={styles.signupButtonText}>회원가입</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
              <Text style={styles.nextButtonText}>다음</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
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
    marginHorizontal: 0, // 여백 제거
    marginVertical: 0, // 여백 제거
    backgroundColor: '#FFFFFF',
    borderRadius: 0, // 둥근 모서리 제거
    padding: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 }, // 그림자 제거
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 50,
    alignItems: 'center',
  },
  title: {
    fontSize: 34,
    color: '#2E4A21',
    fontWeight: '800',
    marginBottom: 10,
    letterSpacing: 1,
  },
  divider: {
    width: 60,
    height: 3,
    backgroundColor: MAIN_GREEN,
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
  inputZone: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: 'transparent',
    borderBottomWidth: 1.5,
    borderBottomColor: '#D3E0D3',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 20,
    borderRadius: 0,
  },
  loginButton: {
    backgroundColor: MAIN_GREEN,
    borderRadius: 12,
    paddingVertical: 18,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: MAIN_GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  skipButton: {
    backgroundColor: '#FF9500',
    borderRadius: 12,
    paddingVertical: 18,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#FF9500',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  skipButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  signupButton: {
    backgroundColor: SUB_GREEN,
    borderRadius: 12,
    paddingVertical: 18,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: SUB_GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  signupButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  nextButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});