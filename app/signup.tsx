import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  Platform,
  ScrollView,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';

// ---------------------------
// 서버 API로 중복확인 (이메일)
// ---------------------------
async function checkEmailDuplicateOnServer(user_id: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://port-0-server-m7tucm4sab201860.sel4.cloudtype.app/check-userid?user_id=${user_id}`
    );
    const data = await response.json();
    return data.duplicate === true;
  } catch (err) {
    console.error(err);
    return false;
  }
}

// ---------------------------
// 비밀번호 유효성 검사
// ---------------------------
function checkPasswordValid(password: string): boolean {
  const passwordRegex = /^(?=.*[!@#$%^&*])(?=.{8,})/;
  return passwordRegex.test(password);
}

// ---------------------------
// 실제 서버에 회원가입 요청
// ---------------------------
async function signupOnServer(user_id: string, password: string, username: string): Promise<boolean> {
  try {
    const response = await fetch('https://port-0-server-m7tucm4sab201860.sel4.cloudtype.app/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id, password, username }),
    });
    const data = await response.json();
    return data.message === '회원가입 성공'; 
  } catch (err) {
    console.error(err);
    return false;
  }
}

export default function AnimatedSignupScreen() {
  const router = useRouter();

  // 화면 전체 페이드인 애니메이션
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // ---------------------------
  // 상태값들
  // ---------------------------
  const [userEmail, setUserEmail] = useState('');
  const [isEmailChecked, setIsEmailChecked] = useState(false);

  // 닉네임 (중복확인 기능 제거)
  const [nickname, setNickname] = useState('');

  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  // ---------------------------
  // 이메일(아이디) 중복확인
  // ---------------------------
  const handleCheckEmail = async () => {
    if (!userEmail) {
      Alert.alert('오류', '아이디(이메일)를 입력해주세요.');
      return;
    }
    const emailFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; 
    if (!emailFormat.test(userEmail)) {
      Alert.alert('오류', '이메일 형식이 아닙니다. 다시 입력해주세요.');
      setIsEmailChecked(false);
      return;
    }

    const isDuplicate = await checkEmailDuplicateOnServer(userEmail);
    if (isDuplicate) {
      Alert.alert('중복', '이미 사용 중인 이메일(아이디)입니다.');
      setIsEmailChecked(false);
    } else {
      Alert.alert('확인', '사용 가능한 이메일(아이디)입니다.');
      setIsEmailChecked(true);
    }
  };

  // ---------------------------
  // 회원가입 버튼 클릭
  // ---------------------------
  const handleSignup = async () => {
    if (!isEmailChecked) {
      Alert.alert('오류', '아이디(이메일) 중복확인을 해주세요.');
      return;
    }

    if (!nickname) {
      Alert.alert('오류', '닉네임을 입력해주세요.');
      return;
    }

    if (!checkPasswordValid(password)) {
      Alert.alert('오류', '비밀번호는 8자 이상, 특수문자를 포함해야 합니다.');
      return;
    }
    if (password !== passwordConfirm) {
      Alert.alert('오류', '비밀번호가 일치하지 않습니다.');
      return;
    }

    const result = await signupOnServer(userEmail, password, nickname);

    if (result) {
      Alert.alert('회원가입 완료', '가입이 완료되었습니다!');
      router.replace('/login');
    } else {
      Alert.alert('오류', '회원가입에 실패했습니다. 잠시 후 다시 시도해주세요.');
    }
  };

  // ---------------------------
  // 회원가입 버튼 활성화 조건
  // ---------------------------
  const isPasswordValid = checkPasswordValid(password);
  const isPasswordMatch = password === passwordConfirm;

  const isSignupEnabled =
    isEmailChecked &&
    !!nickname &&
    isPasswordValid &&
    isPasswordMatch;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={{ alignItems: 'center' }} style={{ width: '100%' }}>
        {/* 페이드인 컨테이너 */}
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
          <Image
            source={{
              uri: 'https://images.unsplash.com/photo-1535909339361-7a8b5f9ea761?crop=entropy&cs=tinysrgb&fit=max&fm=jpg',
            }}
            style={styles.logo}
            resizeMode="cover"
          />
          <Text style={styles.title}>회원가입</Text>
          <View style={styles.divider} />

          {/* 아이디(이메일) + [중복확인] */}
          <View style={styles.rowContainer}>
            <View style={[styles.inputContainer, { flex: 1, marginRight: 16 }]}>
              <TextInput
                style={styles.input}
                placeholder="아이디(이메일 형식)"
                placeholderTextColor="#A0A0A0"
                value={userEmail}
                onChangeText={(text) => {
                  setUserEmail(text);
                  setIsEmailChecked(false);
                }}
              />
            </View>
            <TouchableOpacity style={styles.checkButton} onPress={handleCheckEmail}>
              <Text style={styles.checkButtonText}>중복확인</Text>
            </TouchableOpacity>
          </View>

          {/* 비밀번호 */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="비밀번호 (8자 이상 + 특수문자)"
              placeholderTextColor="#A0A0A0"
              secureTextEntry
              value={password}
              onChangeText={(text) => setPassword(text)}
            />
          </View>
          {/* 비밀번호 확인 */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="비밀번호 확인"
              placeholderTextColor="#A0A0A0"
              secureTextEntry
              value={passwordConfirm}
              onChangeText={(text) => setPasswordConfirm(text)}
            />
          </View>

          {/* 닉네임 (중복확인 버튼 제거) */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="닉네임"
              placeholderTextColor="#A0A0A0"
              value={nickname}
              onChangeText={(text) => {
                setNickname(text);
              }}
            />
          </View>

          {/* 회원가입 버튼: 모든 조건 충족 시에만 활성화 */}
          <TouchableOpacity
            style={[
              styles.signupButton,
              { backgroundColor: isSignupEnabled ? '#7ec87e' : '#ccc' },
            ]}
            onPress={handleSignup}
            disabled={!isSignupEnabled}
          >
            <Text style={styles.signupButtonText}>회원가입</Text>
          </TouchableOpacity>

          {/* 이미 회원일 경우 -> 로그인 이동 */}
          <TouchableOpacity onPress={() => router.replace('/login')}>
            <Text style={styles.loginLinkText}>이미 회원이신가요? 로그인</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

// --------------------- styles ---------------------
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    width: '100%',
    marginVertical: 0, // 여백 제거
    backgroundColor: '#FFFFFF',
    borderRadius: 0, // 둥근 모서리 제거
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 }, // 그림자 제거
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  logo: {
    width: '100%',
    height: 180,
    marginBottom: 24,
    borderRadius: 8,
  },
  title: {
    fontSize: 34,
    color: '#2E4A21',
    fontWeight: '800',
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: 1,
  },
  divider: {
    width: 60,
    height: 3,
    backgroundColor: '#7EC87E',
    borderRadius: 2,
    marginBottom: 20,
  },
  rowContainer: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 20,
  },
  inputContainer: {
    width: '100%',
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
    borderRadius: 0,
  },
  checkButton: {
    backgroundColor: '#7ec87e',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7EC87E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  checkButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  signupButton: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 16,
    shadowColor: '#7EC87E',
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
  loginLinkText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '500',
    textDecorationLine: 'underline',
    marginBottom: 24,
    textAlign: 'center',
  },
});