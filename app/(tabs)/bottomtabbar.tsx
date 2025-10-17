import React, { useState, useRef, ReactNode, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// 화면 크기/높이
const { width, height } = Dimensions.get('window');
const screenWidth = width;
const screenHeight = height;
// 플랫폼별 기본 높이 설정
const BASE_TAB_BAR_HEIGHT = Platform.OS === 'android' 
  ? Math.max(screenHeight * 0.06, 56)
  : Math.max(screenHeight * 0.04, 40);
const DRAWER_WIDTH = screenWidth * 0.65;

// 탭 아이콘/텍스트 색상 함수
function getTabColor(activeTab: string, tabName: string) {
  return activeTab === tabName ? '#78c87e' : '#6B7280';
}

// 시간대별 날씨 데이터 타입
type HourlyWeather = {
  time: string;
  temperature: number;
  condition: string;
  humidity: number;
};

// 추가: 지역 데이터 타입
type City = {
  name: string;
  lat: number;
  lon: number;
};

// 추가: 한국 주요 도시 데이터
const cities: City[] = [
  { name: '서울', lat: 37.5665, lon: 126.9780 },
  { name: '원주', lat: 37.3422, lon: 127.9200 },
  { name: '천안', lat: 36.8151, lon: 127.1139 },
  { name: '부산', lat: 35.1796, lon: 129.0756 },
  { name: '대전', lat: 36.3504, lon: 127.3845 },
  { name: '광주', lat: 35.1595, lon: 126.8526 },
];

// 컴포넌트 속성
type LayoutProps = {
  children: ReactNode;
  initialTab?: string;
};

export default function BottomTabBarLayout({
  children,
  initialTab = 'main',
}: LayoutProps) {
  const insets = useSafeAreaInsets();
  const [farmName, setFarmName] = useState('');

  useEffect(() => {
    async function loadFarmData() {
      try {
        const storedFarmId = await AsyncStorage.getItem('SELECTED_FARM_ID');
        console.log('[BottomTabBar] AsyncStorage에서 가져온 SELECTED_FARM_ID:', storedFarmId);
        if (storedFarmId) {
          // farmId로 서버에서 농장 정보 가져오기
          const response = await axios.get(
            `https://port-0-server-m7tucm4sab201860.sel4.cloudtype.app/get-farm-status/${storedFarmId}` // API 경로를 get-farm-status로 수정
          );
          console.log('[BottomTabBar] 서버 응답:', response.data);
          // 응답에서 농장 이름 추출
          if (response.data && typeof response.data.farmName === 'string') { // farmName 필드로 가정
            const farmNameFromServer = response.data.farmName;
            setFarmName(farmNameFromServer);
            console.log('[BottomTabBar] 서버에서 가져온 농장 이름:', farmNameFromServer);
            // AsyncStorage에 SELECTED_FARM_NAME 저장
            await AsyncStorage.setItem('SELECTED_FARM_NAME', farmNameFromServer);
            console.log('[BottomTabBar] AsyncStorage에 저장된 SELECTED_FARM_NAME:', farmNameFromServer);
          } else {
            console.log('[BottomTabBar] 서버 응답에서 농장 이름이 없거나 형식이 맞지 않음:', response.data);
            // 서버 응답에 이름이 없으면 AsyncStorage에서 SELECTED_FARM_NAME 가져오기
            const storedFarmName = await AsyncStorage.getItem('SELECTED_FARM_NAME');
            if (storedFarmName) {
              setFarmName(storedFarmName);
              console.log('[BottomTabBar] AsyncStorage에서 가져온 SELECTED_FARM_NAME:', storedFarmName);
            } else {
              setFarmName('');
              console.log('[BottomTabBar] farmName 없음');
            }
          }
        } else {
          console.log('[BottomTabBar] farmId 없음');
          // farmId가 없으면 AsyncStorage에서 SELECTED_FARM_NAME 가져오기
          const storedFarmName = await AsyncStorage.getItem('SELECTED_FARM_NAME');
          if (storedFarmName) {
            setFarmName(storedFarmName);
            console.log('[BottomTabBar] AsyncStorage에서 가져온 SELECTED_FARM_NAME:', storedFarmName);
          } else {
            setFarmName('');
            console.log('[BottomTabBar] farmName 없음');
          }
        }
      } catch (err) {
        console.log('[BottomTabBar] 농장 이름 로드 오류:', (err as any).response ? (err as any).response.data : (err as any).message);
        // 서버 요청 실패 시 AsyncStorage에서 SELECTED_FARM_NAME 가져오기
        const storedFarmName = await AsyncStorage.getItem('SELECTED_FARM_NAME');
        if (storedFarmName) {
          setFarmName(storedFarmName);
          console.log('[BottomTabBar] AsyncStorage에서 가져온 SELECTED_FARM_NAME:', storedFarmName);
        } else {
          setFarmName('');
          console.log('[BottomTabBar] farmName 없음');
        }
      }
    }
    loadFarmData();
  }, []);

  const [activeTab, setActiveTab] = useState(initialTab);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerAnim = useRef(new Animated.Value(0)).current;
  const [weatherModalOpen, setWeatherModalOpen] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [hourlyWeatherData, setHourlyWeatherData] = useState<HourlyWeather[]>([]);
  const [selectedCity, setSelectedCity] = useState<City>(cities[0]);

  useEffect(() => {
    if (activeTab === 'stats' || activeTab === 'cctv') {
      fadeAnim.setValue(1);
    } else {
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }).start();
    }
  }, [activeTab]);

  useEffect(() => {
    async function fetchWeatherData() {
      try {
        const apiKey = Constants.expoConfig?.extra?.weatherApiKey;
        if (!apiKey) {
          throw new Error('weatherApiKey가 app.json에 정의되지 않았습니다.');
        }

        const lat = selectedCity.lat;
        const lon = selectedCity.lon;
        const response = await axios.get(
          `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`
        );

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        const rawWeatherList = response.data.list
          .filter((item: any) => {
            const itemDate = new Date(item.dt * 1000);
            return itemDate >= today && itemDate < tomorrow;
          })
          .map((item: any) => ({
            time: new Date(item.dt * 1000),
            temperature: Math.round(item.main.temp),
            condition: item.weather[0].description,
            humidity: item.main.humidity,
          }));

        const timeSlots = Array.from({ length: 8 }, (_, i) => {
          const slotTime = new Date(today);
          slotTime.setHours(i * 3, 0, 0, 0);
          return slotTime;
        });

        const weatherList = timeSlots.map((slotTime) => {
          const closestData = rawWeatherList.reduce(
            (closest: any, current: any) => {
              const currentDiff = Math.abs(current.time.getTime() - slotTime.getTime());
              const closestDiff = closest
                ? Math.abs(closest.time.getTime() - slotTime.getTime())
                : Infinity;
              return currentDiff < closestDiff ? current : closest;
            },
            null
          );

          if (closestData) {
            return {
              time: slotTime.toLocaleTimeString('ko-KR', {
                hour: '2-digit',
                minute: '2-digit',
              }),
              temperature: closestData.temperature,
              condition: closestData.condition,
              humidity: closestData.humidity,
            };
          } else {
            return {
              time: slotTime.toLocaleTimeString('ko-KR', {
                hour: '2-digit',
                minute: '2-digit',
              }),
              temperature: 0,
              condition: '데이터 없음',
              humidity: 0,
            };
          }
        });

        setHourlyWeatherData(weatherList);
      } catch (error) {
        console.error('날씨 데이터 fetch 오류:', error);
      }
    }

    fetchWeatherData();
  }, [selectedCity]);

  const toggleDrawer = () => {
    const toValue = drawerOpen ? 0 : 1;
    setDrawerOpen(!drawerOpen);
    Animated.timing(drawerAnim, {
      toValue,
      duration: 400,
      useNativeDriver: true,
    }).start();
  };

  const translateX = drawerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [DRAWER_WIDTH, 0],
  });
  const overlayOpacity = drawerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
  });

  const handleLogout = () => {
    alert('로그아웃 되었습니다');
    router.push('/login');
    toggleDrawer();
  };
  const handleFarmChange = () => {
    router.push('/listfarm');
    toggleDrawer();
  };

  const handleWeatherInfo = () => {
    toggleDrawer();
    setTimeout(() => {
      setWeatherModalOpen(true);
    }, 300);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Animated.View style={[styles.mainContainer, { opacity: fadeAnim }]}>
        {children}
      </Animated.View>

      <View style={[styles.tabBar, { height: BASE_TAB_BAR_HEIGHT + insets.bottom }]}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'main' && styles.tabItemActive]}
          onPress={() => {
            setActiveTab('main');
            router.push('/(tabs)/mainUI');
          }}
        >
          <Ionicons
            name="home-outline"
            size={screenWidth * 0.06}
            color={getTabColor(activeTab, 'main')}
          />
          <Text style={[styles.tabLabel, { color: getTabColor(activeTab, 'main') }]}>
            메인
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'stats' && styles.tabItemActive]}
          onPress={() => {
            setActiveTab('stats');
            router.push('/(tabs)/stats');
          }}
        >
          <Ionicons
            name="stats-chart-outline"
            size={screenWidth * 0.06}
            color={getTabColor(activeTab, 'stats')}
          />
          <Text style={[styles.tabLabel, { color: getTabColor(activeTab, 'stats') }]}>
            통계
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'cctv' && styles.tabItemActive]}
          onPress={() => {
            setActiveTab('cctv');
            router.push('/(tabs)/cctv');
          }}
        >
          <Ionicons
            name="videocam-outline"
            size={screenWidth * 0.06}
            color={getTabColor(activeTab, 'cctv')}
          />
          <Text style={[styles.tabLabel, { color: getTabColor(activeTab, 'cctv') }]}>
            CCTV
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'control' && styles.tabItemActive]}
          onPress={() => {
            setActiveTab('control');
            router.push('/(tabs)/control');
          }}
        >
          <Ionicons
            name="settings-outline"
            size={screenWidth * 0.06}
            color={getTabColor(activeTab, 'control')}
          />
          <Text style={[styles.tabLabel, { color: getTabColor(activeTab, 'control') }]}>
            제어
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'menu' && styles.tabItemActive]}
          onPress={() => {
            setActiveTab('menu');
            toggleDrawer();
          }}
        >
          <Ionicons
            name="menu-outline"
            size={screenWidth * 0.06}
            color={getTabColor(activeTab, 'menu')}
          />
          <Text style={[styles.tabLabel, { color: getTabColor(activeTab, 'menu') }]}>
            메뉴
          </Text>
        </TouchableOpacity>
      </View>

      <Animated.View
        pointerEvents={drawerOpen ? 'auto' : 'none'}
        style={[
          styles.overlay,
          { opacity: overlayOpacity, zIndex: drawerOpen ? 99 : -1 },
        ]}
      />

      <Animated.View
        style={[
          styles.drawerContainer,
          {
            transform: [{ translateX }],
            zIndex: 100,
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          },
        ]}
      >
        <View style={styles.drawerHeader}>
          <Text style={styles.headerText}>
            {farmName
              ? `${farmName} 안녕하세요!!`
              : '농장 이름을 선택해주세요!!'}
          </Text>
        </View>

        <View style={styles.drawerContent}>
          <TouchableOpacity style={styles.menuButton} onPress={handleLogout}>
            <Ionicons
              name="exit-outline"
              size={screenWidth * 0.05}
              color="#333"
              style={{ marginRight: screenWidth * 0.02 }}
            />
            <Text style={styles.menuButtonText}>로그아웃</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuButton} onPress={handleFarmChange}>
            <Ionicons
              name="leaf-outline"
              size={screenWidth * 0.05}
              color="#333"
              style={{ marginRight: screenWidth * 0.02 }}
            />
            <Text style={styles.menuButtonText}>농장변경</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuButton} onPress={handleWeatherInfo}>
            <Ionicons
              name="cloud-outline"
              size={screenWidth * 0.05}
              color="#333"
              style={{ marginRight: screenWidth * 0.02 }}
            />
            <Text style={styles.menuButtonText}>날씨 정보</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.closeButton} onPress={toggleDrawer}>
          <Ionicons name="close-circle-outline" size={screenWidth * 0.06} color="#666" />
        </TouchableOpacity>
      </Animated.View>

      <Modal visible={weatherModalOpen} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                오늘의 날씨 (한국, {selectedCity.name}) - 24시간
              </Text>
              <Text style={styles.modalDate}>
                {new Date().toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            </View>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cityScroll}>
              {cities.map((city) => (
                <TouchableOpacity
                  key={city.name}
                  style={[
                    styles.cityButton,
                    selectedCity.name === city.name && styles.cityButtonSelected,
                  ]}
                  onPress={() => setSelectedCity(city)}
                >
                  <Text
                    style={[
                      styles.cityButtonText,
                      selectedCity.name === city.name && styles.cityButtonTextSelected,
                    ]}
                  >
                    {city.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <ScrollView style={styles.weatherList}>
              {hourlyWeatherData.length > 0 ? (
                hourlyWeatherData.map((weather, index) => (
                  <View key={index} style={styles.weatherItem}>
                    <Text style={styles.weatherTime}>{weather.time}</Text>
                    <Text style={styles.weatherTemp}>{weather.temperature}°C</Text>
                    <Text style={styles.weatherCondition}>{weather.condition}</Text>
                    <Text style={styles.weatherHumidity}>습도: {weather.humidity}%</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.noDataText}>오늘의 날씨 데이터가 없습니다.</Text>
              )}
            </ScrollView>
            <TouchableOpacity
              style={[styles.modalOption, { marginTop: screenHeight * 0.025 }]}
              onPress={() => setWeatherModalOpen(false)}
            >
              <Text style={[styles.modalOptionText, { color: 'red' }]}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  mainContainer: {
    flex: 1,
    padding: 0,
    marginHorizontal: 0,
  },
  tabBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    borderTopWidth: 0,
    backgroundColor: '#FFFFFF',
    zIndex: 50,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
    paddingHorizontal: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    marginHorizontal: 8,
  },
  tabItemActive: {
    backgroundColor: '#F5F7FA',
  },
  tabLabel: {
    fontSize: screenWidth * 0.03,
    fontWeight: '700',
    marginTop: screenHeight * 0.0025,
    letterSpacing: 0.5,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#000',
  },
  drawerContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: DRAWER_WIDTH,
    backgroundColor: '#FFFFFF',
  },
  drawerHeader: {
    backgroundColor: '#7EC87E',
    paddingVertical: screenHeight * 0.015,
    paddingHorizontal: screenWidth * 0.04,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    fontSize: screenWidth * 0.045,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  drawerContent: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: screenWidth * 0.04,
    paddingTop: screenHeight * 0.01,
  },
  menuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: screenHeight * 0.02,
    borderBottomWidth: 1,
    borderBottomColor: '#D3E0D3',
    borderRadius: 12,
    marginVertical: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
    backgroundColor: '#F5F7FA',
  },
  menuButtonText: {
    fontSize: screenWidth * 0.04,
    fontWeight: '500',
    color: '#333',
    letterSpacing: 0.5,
  },
  closeButton: {
    position: 'absolute',
    bottom: screenHeight * 0.03,
    right: screenWidth * 0.05,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 30,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  modalHeader: {
    marginBottom: screenHeight * 0.015,
  },
  modalTitle: {
    fontSize: screenWidth * 0.05,
    fontWeight: '800',
    color: '#2E4A21',
    letterSpacing: 1,
  },
  modalDate: {
    fontSize: screenWidth * 0.035,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: screenHeight * 0.005,
  },
  weatherList: {
    marginBottom: screenHeight * 0.015,
  },
  weatherItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: screenHeight * 0.0125,
    borderBottomWidth: 1,
    borderBottomColor: '#D3E0D3',
  },
  weatherTime: {
    fontSize: screenWidth * 0.035,
    fontWeight: '600',
    color: '#1F2937',
  },
  weatherTemp: {
    fontSize: screenWidth * 0.035,
    color: '#059669',
  },
  weatherCondition: {
    fontSize: screenWidth * 0.035,
    color: '#1F2937',
  },
  weatherHumidity: {
    fontSize: screenWidth * 0.035,
    fontWeight: '500',
    color: '#6B7280',
  },
  modalOption: {
    paddingVertical: screenHeight * 0.015,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#F5F7FA',
    marginVertical: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  modalOptionText: {
    fontSize: screenWidth * 0.04,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  noDataText: {
    fontSize: screenWidth * 0.035,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
    paddingVertical: screenHeight * 0.02,
  },
  cityScroll: {
    marginBottom: screenHeight * 0.015,
  },
  cityButton: {
    backgroundColor: '#F5F7FA',
    paddingHorizontal: screenWidth * 0.03,
    paddingVertical: screenHeight * 0.01,
    borderRadius: 20,
    marginRight: screenWidth * 0.02,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  cityButtonSelected: {
    backgroundColor: '#7EC87E',
  },
  cityButtonText: {
    fontSize: screenWidth * 0.035,
    fontWeight: '500',
    color: '#1F2937',
  },
  cityButtonTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});