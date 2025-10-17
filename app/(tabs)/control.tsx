import React, { useEffect, useState, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Switch,
  FlatList,
  Modal,
  ScrollView,
  TouchableOpacity,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BottomTabBarLayout from './bottomtabbar';
import axios from 'axios';

// 화면 크기
const { width, height } = Dimensions.get("window");
const screenWidth = width;
const screenHeight = height;

// ============================
// 1) 기기 아이콘 매핑 (그대로)
// ============================
const deviceIcons: Record<string, React.ComponentProps<typeof Ionicons>["name"]> = {
  fan: 'refresh-outline',
  heater: 'flame',
  ac: 'snow',
  pump: 'water',
  led: 'bulb',
};

// ============================
// 2) 센서 설정 (그대로)
// ============================
const sensorConfigs = [
  { id: 'temp', label: '온도',    valueKey: 'temperature', unit: '°C',  max: 50 },
  { id: 'hum',  label: '습도',    valueKey: 'humidity',    unit: '%',   max: 100 },
  { id: 'soil', label: '토양습도', valueKey: 'soil',       unit: '%',   max: 100 },
  { id: 'co2',  label: 'CO2',     valueKey: 'co2',         unit: 'ppm', max: 1 },
];

// --------------------- (수정 없음) 게이지 계산 함수 ---------------------
function getColorByValue(value: number, max: number) {
  const ratio = value / max;
  if (ratio < 0.33) return '#78c87e';
  if (ratio < 0.66) return '#fbbf24';
  return '#ef4444';
}
function getProgressWidth(value: number, max: number) {
  let ratio = value / max;
  if (ratio > 1) ratio = 1;
  return Math.round(ratio * 100);
}

export default function ControlScreen() {
  // --------------------------------------------------
  // 1) userId, farmId, farmName 로드 (기존 그대로)
  // --------------------------------------------------
  const [userId, setUserId] = useState('');
  const [farmId, setFarmId] = useState('');
  const [farmName, setFarmName] = useState('');

  useEffect(() => {
    async function loadIds() {
      try {
        const uid = await AsyncStorage.getItem('LOGGED_IN_USER');
        const fid = await AsyncStorage.getItem('SELECTED_FARM_ID');
        const fname = await AsyncStorage.getItem('SELECTED_FARM_NAME');
        if (uid) setUserId(uid);
        if (fid) setFarmId(fid);
        if (fname) setFarmName(fname);
      } catch (err) {
        console.log('[ControlScreen] load error:', err);
      }
    }
    loadIds();
  }, []);

  // --------------------------------------------------
  // 2) 화면 상태 (기존 그대로)
  // --------------------------------------------------
  const [fadeAnim] = useState(new Animated.Value(0));
  const [isAuto, setIsAuto] = useState(false);

  const [temperature, setTemperature] = useState(0);
  const [humidity, setHumidity] = useState(0);
  const [soil, setSoil] = useState(0);
  const [co2, setCo2] = useState(0);
  const [updatedTime, setUpdatedTime] = useState('');

  // 연결 기기 목록
  const [devices, setDevices] = useState([
    { id: 'fan', name: '환풍팬', enabled: false },
    { id: 'heater', name: '난방기', enabled: false },
  ]);

  // (+) 모달에서 선택할 기기 목록
  const [availableOptions, setAvailableOptions] = useState([
    { id: 'ac', name: '쿨러', selected: false },
    { id: 'pump', name: '급수장치', selected: false },
    { id: 'led', name: 'LED 조명', selected: false },
    { id: 'heater', name: '난방기', selected: false },
    { id: 'fan', name: '환풍팬', selected: false },
  ]);

  const [isConfigOpen, setIsConfigOpen] = useState(false);

  // 수정: 온도 설정 관련 상태 (최적 수치값만 관리)
  const [optimalSettings, setOptimalSettings] = useState({
    temperature: { min: 18, max: 22 },
    humidity: { min: 50, max: 70 },
    soil: { min: 60, max: 80 },
    co2: { min: 800, max: 1200 },
  });
  const [isTempModalOpen, setIsTempModalOpen] = useState(false);

  // 추가: 저장 상태 관리
  const [isSaved, setIsSaved] = useState(false);

  // 수정: 설정 변경 핸들러
  const handleSettingChange = (
    sensor: keyof typeof optimalSettings,
    type: 'min' | 'max' | 'both',
    operation: 'decrease' | 'increase'
  ) => {
    const step = sensor === 'co2' ? 10 : 1;
    setOptimalSettings(prev => {
      const current = prev[sensor];
      if (type === 'both') {
        let newMin = operation === 'decrease' ? current.min - step : current.min + step;
        let newMax = operation === 'decrease' ? current.max - step : current.max + step;
        newMin = Math.max(0, newMin);
        newMax = Math.max(newMin, newMax);
        return {
          ...prev,
          [sensor]: {
            min: newMin,
            max: newMax,
          },
        };
      } else {
        const newValue = operation === 'decrease' ? current[type] - step : current[type] + step;
        const newMin = type === 'min' ? Math.max(0, newValue) : current.min;
        const newMax = type === 'max' ? Math.max(newMin, newValue) : current.max;
        return {
          ...prev,
          [sensor]: {
            min: newMin,
            max: newMax,
          },
        };
      }
    });
  };

  // 추가: 서버에서 최적 수치 불러오기
  async function fetchOptimalSettings() {
    if (!farmId) {
      console.log('[ControlScreen] fetchOptimalSettings: farmId 없음');
      return;
    }
    try {
      const url = `https://port-0-server-m7tucm4sab201860.sel4.cloudtype.app/getFarmConditions/${farmId}`;
      const res = await fetch(url);
      if (!res.ok) {
        const errText = await res.text();
        console.log('[ControlScreen] 최적 수치 fetch 오류(HTTP):', errText);
        return;
      }
      const data = await res.json();
      console.log('[ControlScreen] 최적 수치:', data);
      setOptimalSettings({
        temperature: { min: data.temperature.optimal_min, max: data.temperature.optimal_max },
        humidity: { min: data.humidity.optimal_min, max: data.humidity.optimal_max },
        soil: { min: data.soil_moisture.optimal_min, max: data.soil_moisture.optimal_max },
        co2: { min: data.co2.optimal_min, max: data.co2.optimal_max },
      });
    } catch (err) {
      console.log('[ControlScreen] 최적 수치 fetch 오류:', err);
    }
  }

  // 수정: 저장 버튼 클릭 핸들러 (서버로 데이터 전송)
  const handleSave = async () => {
    if (!farmId) {
      console.log('[ControlScreen] farmId가 없습니다.');
      return;
    }
    try {
      const response = await axios.post(
        'https://port-0-server-m7tucm4sab201860.sel4.cloudtype.app/updateFarmCondition',
        {
          farm_id: farmId,
          temperature: {
            optimal_min: optimalSettings.temperature.min,
            optimal_max: optimalSettings.temperature.max,
          },
          humidity: {
            optimal_min: optimalSettings.humidity.min,
            optimal_max: optimalSettings.humidity.max,
          },
          soil_moisture: {
            optimal_min: optimalSettings.soil.min,
            optimal_max: optimalSettings.soil.max,
          },
          co2: {
            optimal_min: optimalSettings.co2.min,
            optimal_max: optimalSettings.co2.max,
          },
        }
      );
      console.log('[ControlScreen] 최적 수치 업데이트 성공:', response.data);
      setIsSaved(true);
      setTimeout(() => {
        setIsSaved(false);
      }, 2000); // 2초 후 "저장완료!" 텍스트 사라짐
    } catch (err) {
      console.log('[ControlScreen] 최적 수치 업데이트 오류:', err);
    }
  };

  // --------------------------------------------------
  // 3) 서버에서 센서/기기 데이터 조회 (기존)
  // --------------------------------------------------
  async function fetchSensors() {
    if (!userId || !farmId) {
      console.log('[ControlScreen] fetchSensors: user/farm 없음');
      return;
    }
    try {
      const url = `https://port-0-server-m7tucm4sab201860.sel4.cloudtype.app/sensors/status?user_id=${userId}&farm_id=${farmId}`;
      const res = await fetch(url);
      if (!res.ok) {
        const errText = await res.text();
        console.log('[ControlScreen] 센서 fetch 오류(HTTP):', errText);
        return;
      }
      const contentType = res.headers.get('Content-Type') || '';
      const bodyText = await res.text();
      if (!contentType.includes('application/json')) {
        console.log('[ControlScreen] 센서 fetch 오류(HTML?):', bodyText);
        return;
      }
      if (!bodyText) {
        console.log('[ControlScreen] 센서 fetch: Body 비어있음');
        return;
      }
      let data;
      try {
        data = JSON.parse(bodyText);
      } catch (err) {
        console.log('[ControlScreen] 센서 fetch JSON 파싱 오류:', err);
        return;
      }
      console.log('[ControlScreen] 센서:', data);
      if (data.message && !data.temperature && !data.humidity && !data.soil_moisture && !data.co2) {
        setTemperature(0); setHumidity(0); setSoil(0); setCo2(0); setUpdatedTime('');
        return;
      }
      setTemperature(data.temperature ? parseFloat(data.temperature) : 0);
      setHumidity(data.humidity ? parseFloat(data.humidity) : 0);
      setSoil(data.soil_moisture ? parseFloat(data.soil_moisture) : 0);
      setCo2(data.co2 ?? 0);
      setUpdatedTime(data.created_at ?? '');
    } catch (err) {
      console.log('[ControlScreen] 센서 fetch 오류:', err);
    }
  }

  async function fetchDevices() {
    if (!userId || !farmId) {
      console.log('[ControlScreen] fetchDevices: user/farm 없음');
      return;
    }
    try {
      const url = `https://port-0-server-m7tucm4sab201860.sel4.cloudtype.app/devices/status?user_id=${userId}&farm_id=${farmId}`;
      const res = await fetch(url);
      if (!res.ok) {
        const errText = await res.text();
        console.log('[ControlScreen] 기기 fetch 오류(HTTP):', errText);
        return;
      }
      const contentType = res.headers.get('Content-Type') || '';
      const bodyText = await res.text();
      if (!contentType.includes('application/json')) {
        console.log('[ControlScreen] 기기 fetch 오류(HTML?):', bodyText);
        return;
      }
      if (!bodyText) {
        console.log('[ControlScreen] 기기 fetch: Body 비어있음');
        setDevices([]);
        return;
      }
      let data;
      try {
        data = JSON.parse(bodyText);
      } catch (err) {
        console.log('[ControlScreen] 기기 fetch JSON 파싱 오류:', err);
        return;
      }
      console.log('[ControlScreen] 기기:', data);
      if (!Array.isArray(data)) {
        if (data.message && !data.id) {
          console.log('[ControlScreen] 기기 fetch: 데이터 없음 -> 빈배열');
          setDevices([]);
          return;
        }
        const newDev: { id: string; name: string; enabled: boolean }[] = [];
        if (data.fan === 1) newDev.push({ id: 'fan', name: '환풍팬', enabled: true });
        if (data.heater === 1) newDev.push({ id: 'heater', name: '난방기', enabled: true });
        if (data.cooler === 1) newDev.push({ id: 'ac', name: '쿨러', enabled: true });
        if (data.water === 1) newDev.push({ id: 'pump', name: '급수장치', enabled: true });
        if (data.led === 1) newDev.push({ id: 'led', name: 'LED 조명', enabled: true });
        setDevices(newDev);
        return;
      }
      if (Array.isArray(data)) {
        setDevices(data);
      }
    } catch (err) {
      console.log('[ControlScreen] 기기 fetch 오류:', err);
    }
  }

  // --------------------------------------------------
  // 4) 화면 로드 시 (페이드 애니+서버조회) (최적 수치 불러오기 추가)
  // --------------------------------------------------
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);
  useEffect(() => {
    if (userId && farmId) {
      fetchSensors();
      fetchDevices();
      fetchOptimalSettings();
    }
  }, [userId, farmId]);

  // --------------------------------------------------
  // 5) 나머지 UI/이벤트 로직 (수정 없음)
  // --------------------------------------------------
  const toggleAuto = (val: boolean) => setIsAuto(val);
  const handleDeviceToggle = (id: string) => {
    if (isAuto) return;
    setDevices(prev =>
      prev.map(d => d.id === id ? { ...d, enabled: !d.enabled } : d)
    );
  };

  const openConfig = () => setIsConfigOpen(true);
  const closeConfig = () => setIsConfigOpen(false);

  const toggleConfigItem = (id: string) => {
    setAvailableOptions(prev =>
      prev.map(o => o.id === id ? { ...o, selected: !o.selected } : o)
    );
  };
  const saveConfig = () => {
    const sel = availableOptions.filter(o => o.selected);
    if (sel.length > 0) {
      setDevices(prev => {
        const newList = [...prev];
        sel.forEach(it => {
          if (!newList.find(d => d.id === it.id)) {
            newList.push({ id: it.id, name: it.name, enabled: false });
          }
        });
        return newList;
      });
    }
    setAvailableOptions(prev => prev.map(o => ({ ...o, selected: false })));
    closeConfig();
  };
  const handleDeleteDevice = (id: string) => {
    setDevices(prev => prev.filter(d => d.id !== id));
  };

  // --------------------- 센서 게이지 UI (기존 그대로) ---------------------
  const renderSensorGauges = () => (
    <View style={styles.sensorCard}>
      {sensorConfigs.map(cfg => {
        let sensorValue = 0;
        if (cfg.valueKey === 'temperature') sensorValue = temperature;
        if (cfg.valueKey === 'humidity') sensorValue = humidity;
        if (cfg.valueKey === 'soil') sensorValue = soil;
        if (cfg.valueKey === 'co2') sensorValue = co2;

        const color = getColorByValue(sensorValue, cfg.max);
        const barWidth = getProgressWidth(sensorValue, cfg.max);

        return (
          <View key={cfg.id} style={styles.sensorItem}>
            <View style={styles.sensorLine}>
              <Text style={styles.sensorLabel}>{cfg.label}</Text>
              <Text style={[styles.sensorValue, { color }]}>
                {sensorValue}{cfg.unit}
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={{
                  width: `${barWidth}%`,
                  backgroundColor: color,
                  height: '100%',
                  borderRadius: 3,
                }}
              />
            </View>
          </View>
        );
      })}
      {updatedTime
        ? <Text style={styles.updateTime}>{updatedTime}</Text>
        : <Text style={[styles.updateTime, { color: '#EF4444' }]}>데이터가 없습니다.</Text>
      }
    </View>
  );

  // ================================
  // ★ 기기별 애니메이션용 Subcomponent
  // ================================
  const LedIcon: React.FC = () => {
    // 깜빡임(Opacity)
    const blinkAnim = useRef(new Animated.Value(1)).current;
    useEffect(() => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(blinkAnim, { toValue: 0.3, duration: 600, useNativeDriver: true }),
          Animated.timing(blinkAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop(); // 언마운트 시 정지
    }, []);
    return (
      <Animated.View style={{ opacity: blinkAnim }}>
        <Ionicons name="bulb" size={screenWidth * 0.06} color="#FFD700" style={{ marginBottom: screenHeight * 0.005 }} />
      </Animated.View>
    );
  };

  const AcIcon: React.FC = () => {
    // 회전
    const spinAnim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
      const loop = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      loop.start();
      return () => loop.stop();
    }, []);
    const rotate = spinAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });
    return (
      <Animated.View style={{ transform: [{ rotate }] }}>
        <Ionicons name="snow" size={screenWidth * 0.06} color="#00bfff" style={{ marginBottom: screenHeight * 0.005 }} />
      </Animated.View>
    );
  };

  const PumpIcon: React.FC = () => {
    // 위아래
    const pumpAnim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pumpAnim, { toValue: -5, duration: 500, useNativeDriver: true }),
          Animated.timing(pumpAnim, { toValue: 5, duration: 800, useNativeDriver: true }),
          Animated.timing(pumpAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }, []);
    return (
      <Animated.View style={{ transform: [{ translateY: pumpAnim }] }}>
        <Ionicons name="water" size={screenWidth * 0.06} color="#3498db" style={{ marginBottom: screenHeight * 0.005 }} />
      </Animated.View>
    );
  };

  const HeaterIcon: React.FC = () => {
    // 빨간색 깜빡임
    const colorAnim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(colorAnim, { toValue: 1, duration: 700, useNativeDriver: false }),
          Animated.timing(colorAnim, { toValue: 0, duration: 700, useNativeDriver: false }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }, []);
    const animColor = colorAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['#333', '#ff0000'],
    });
    // Animated.Text로 감싸서 애니메이션 색상 적용
    return (
      <Animated.Text style={{ marginBottom: screenHeight * 0.005, color: animColor }}>
        <Ionicons name="flame" size={screenWidth * 0.06} />
      </Animated.Text>
    );
  };

  // 수정: 환풍팬 ON/OFF에 따라 회전 애니메이션 추가
  const FanIcon: React.FC<{ isOn: boolean }> = ({ isOn }) => {
    const spinAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      if (isOn) {
        Animated.loop(
          Animated.timing(spinAnim, {
            toValue: 1,
            duration: 1200,
            easing: Easing.linear,
            useNativeDriver: true,
          })
        ).start();
      } else {
        spinAnim.stopAnimation();
        spinAnim.setValue(0);
      }
    }, [isOn]);

    const rotate = spinAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });

    return (
      <Animated.View style={isOn ? { transform: [{ rotate }] } : {}}>
        <Ionicons name="refresh-outline" size={screenWidth * 0.06} color="#333" style={{ marginBottom: screenHeight * 0.005 }} />
      </Animated.View>
    );
  };

  // ============================
  // ★ renderDeviceIcon()에서 FanIcon에 isOn 전달
  // ============================
  const renderDeviceIcon = (dev: { id: string; enabled: boolean }) => {
    const isOn = dev.enabled || isAuto;
    if (!isOn) {
      // OFF 상태 → 정적 Ionicons
      return (
        <Ionicons
          key={dev.id + '-off'}
          name={deviceIcons[dev.id] || 'help-outline'}
          size={screenWidth * 0.06}
          color="#333"
          style={{ marginBottom: screenHeight * 0.005 }}
        />
      );
    }
    // ON or auto → 서브컴포넌트 (애니메이션)
    switch (dev.id) {
      case 'led':
        return <LedIcon key={dev.id + '-on'} />;
      case 'ac':
        return <AcIcon key={dev.id + '-on'} />;
      case 'pump':
        return <PumpIcon key={dev.id + '-on'} />;
      case 'heater':
        return <HeaterIcon key={dev.id + '-on'} />;
      case 'fan':
        return <FanIcon key={dev.id + '-on'} isOn={isOn} />;
      default:
        // 없는 아이콘은 fallback
        return (
          <Ionicons
            key={dev.id + '-on'}
            name={deviceIcons[dev.id] || 'help-outline'}
            size={screenWidth * 0.06}
            color="#333"
            style={{ marginBottom: screenHeight * 0.005 }}
          />
        );
    }
  };

  // ------------------- 렌더링 -------------------
  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      <BottomTabBarLayout initialTab="control">
        <SafeAreaView style={styles.safeArea}>
          {/* 상단 바 */}
          <View style={styles.topBar}>
            <Text
              style={[styles.farmName, { flex: 1, flexShrink: 1 }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {farmName}
            </Text>

            {/* 수정: 온도 설정 버튼을 아이콘만으로 변경 */}
            <TouchableOpacity
              onPress={() => setIsTempModalOpen(true)}
              style={styles.tempSettingButton}
            >
              <Ionicons name="thermometer-outline" size={screenWidth * 0.06} color="#FFFFFF" style={styles.tempIcon} />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setIsConfigOpen(true)} style={styles.settingIcon}>
              <Ionicons name="settings-outline" size={screenWidth * 0.06} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: screenHeight * 0.02 }}>
            {renderSensorGauges()}

            <View style={styles.devicesHeader}>
              <Text style={styles.devicesTitle}>연결 센서</Text>
              <View style={styles.toggleRow}>
                <Text style={{ color: '#1F2937', marginRight: screenWidth * 0.02 }}>
                  {isAuto ? '자동' : '수동'}
                </Text>
                <Switch
                  value={isAuto}
                  onValueChange={toggleAuto}
                  thumbColor="#FFFFFF"
                  trackColor={{ false: '#A0A0A0', true: '#4CD964' }}
                />
              </View>
            </View>

            <View style={styles.deviceGrid}>
              {devices.map(dev => (
                <View key={dev.id} style={styles.deviceItem}>
                  {renderDeviceIcon(dev)}

                  <Text style={styles.deviceName}>{dev.name}</Text>
                  <Switch
                    value={dev.enabled}
                    onValueChange={() => handleDeviceToggle(dev.id)}
                    disabled={isAuto}
                  />
                  <Text style={styles.deviceStatus}>
                    {dev.enabled ? 'ON' : 'OFF'}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>

          <Modal
            visible={isConfigOpen}
            animationType="slide"
            transparent={false}
          >
            <SafeAreaView style={styles.modalContainer}>
              <Text style={styles.modalTitle}>센서/기기 추가</Text>

              <Text style={styles.sectionSubtitle}>추가 가능한 목록</Text>
              <FlatList
                data={availableOptions}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.optionItem,
                      item.selected && styles.optionItemSelected
                    ]}
                    onPress={() => {
                      setAvailableOptions(prev =>
                        prev.map(opt =>
                          opt.id === item.id
                            ? { ...opt, selected: !opt.selected }
                            : opt
                        )
                      );
                    }}
                  >
                    <Text style={{ fontSize: screenWidth * 0.04 }}>{item.name}</Text>
                    {item.selected && (
                      <Ionicons name="checkmark" size={screenWidth * 0.05} color="#1F2937" />
                    )}
                  </TouchableOpacity>
                )}
              />

              <Text style={styles.sectionSubtitle}>이미 추가된 센서/기기</Text>
              <FlatList
                data={devices}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <View style={styles.addedItemRow}>
                    <Text style={{ fontSize: screenWidth * 0.04 }}>{item.name}</Text>
                    <TouchableOpacity
                      style={{ padding: screenWidth * 0.015 }}
                      onPress={() => {
                        setDevices(prev => prev.filter(d => d.id !== item.id));
                      }}
                    >
                      <Ionicons name="trash-outline" size={screenWidth * 0.05} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                )}
              />

              <View style={styles.modalButtonRow}>
                <TouchableOpacity onPress={saveConfig} style={styles.saveBtn}>
                  <Text style={styles.saveBtnText}>저장</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setIsConfigOpen(false)}
                  style={[styles.saveBtn, { backgroundColor: '#A0A0A0' }]}
                >
                  <Text style={styles.saveBtnText}>취소</Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </Modal>

          {/* 수정: 온도 설정 모달 */}
          <Modal
            visible={isTempModalOpen}
            animationType="slide"
            transparent={false}
          >
            <SafeAreaView style={styles.modalContainer}>
              <Text style={styles.modalTitle}>최적 수치 설정</Text>
              <ScrollView>
                {['temperature', 'humidity', 'soil', 'co2'].map(sensor => {
                  const sensorLabel = {
                    temperature: '온도',
                    humidity: '습도',
                    soil: '토양습도',
                    co2: 'CO2',
                  }[sensor];
                  const sensorIcon = ({
                    temperature: 'thermometer-outline',
                    humidity: 'water-outline',
                    soil: 'leaf-outline',
                    co2: 'cloud-outline',
                  } as const)[sensor];
                  const sensorUnit = {
                    temperature: '°C',
                    humidity: '%',
                    soil: '%',
                    co2: 'ppm',
                  }[sensor];
                  const typedSensor = sensor as keyof typeof optimalSettings;
                  const minValue = optimalSettings[typedSensor].min;
                  const maxValue = optimalSettings[typedSensor].max;

                  return (
                    <View key={sensor} style={styles.sensorSetting}>
                      <View style={styles.sensorLabelContainer}>
                        <Ionicons name={sensorIcon || 'alert'} size={screenWidth * 0.05} color="#1F2937" style={styles.sensorIcon} />
                        <Text style={styles.sensorLabelText}>{sensorLabel} 최적수치</Text>
                      </View>
                      <View style={styles.valueContainer}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          {/* 최소값과 그 조절 버튼 */}
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: screenWidth * 0.05 }}>
                            <Text style={{ fontSize: screenWidth * 0.04, color: '#1F2937', fontWeight: '500' }}>{minValue.toFixed(0)}</Text>
                            <View style={[styles.buttonContainer, { marginLeft: screenWidth * 0.0125 }]}>
                              <TouchableOpacity
                                onPress={() => handleSettingChange(typedSensor, 'min', 'decrease')}
                                style={styles.decreaseButton}
                              >
                                <Ionicons name="remove" size={screenWidth * 0.05} color="#FFFFFF" />
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => handleSettingChange(typedSensor, 'min', 'increase')}
                                style={styles.increaseButton}
                              >
                                <Ionicons name="add" size={screenWidth * 0.05} color="#FFFFFF" />
                              </TouchableOpacity>
                            </View>
                          </View>
                          <Text style={{ fontSize: screenWidth * 0.04, color: '#1F2937', fontWeight: '500' }}>~</Text>
                          {/* 최대값과 그 조절 버튼 */}
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: screenWidth * 0.05 }}>
                            <Text style={{ fontSize: screenWidth * 0.04, color: '#1F2937', fontWeight: '500' }}>{maxValue.toFixed(0)}</Text>
                            <View style={[styles.buttonContainer, { marginLeft: screenWidth * 0.0125 }]}>
                              <TouchableOpacity
                                onPress={() => handleSettingChange(typedSensor, 'max', 'decrease')}
                                style={styles.decreaseButton}
                              >
                                <Ionicons name="remove" size={screenWidth * 0.05} color="#FFFFFF" />
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => handleSettingChange(typedSensor, 'max', 'increase')}
                                style={styles.increaseButton}
                              >
                                <Ionicons name="add" size={screenWidth * 0.05} color="#FFFFFF" />
                              </TouchableOpacity>
                            </View>
                          </View>
                          <Text style={{ fontSize: screenWidth * 0.04, color: '#1F2937', fontWeight: '500' }}>{sensorUnit}</Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
              <View style={styles.modalButtonRow}>
                <TouchableOpacity
                  onPress={handleSave}
                  style={styles.saveBtn}
                >
                  <Text style={styles.saveBtnText}>저장</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setIsTempModalOpen(false)}
                  style={[styles.closeBtn, { backgroundColor: '#A0A0A0' }]}
                >
                  <Text style={styles.saveBtnText}>닫기</Text>
                </TouchableOpacity>
              </View>
              {isSaved && <Text style={styles.savedText}>저장완료!</Text>}
            </SafeAreaView>
          </Modal>
        </SafeAreaView>
      </BottomTabBarLayout>
    </Animated.View>
  );
}

// ---------------- Styles (반응형으로 수정) ----------------
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7FA', // login.tsx와 동일
  },
  topBar: {
    height: screenHeight * 0.075,
    backgroundColor: '#7EC87E', // login.tsx와 동일 (MAIN_GREEN)
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: screenWidth * 0.03,
    justifyContent: 'space-between',
    borderBottomWidth: 0,
  },
  farmName: {
    fontSize: screenWidth * 0.05,
    color: '#FFFFFF', // login.tsx와 동일
    fontWeight: '800', // login.tsx와 동일
    maxWidth: '70%',
    letterSpacing: 1, // login.tsx와 동일
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: screenWidth * 0.03,
  },
  settingIcon: {
    marginLeft: 'auto',
    padding: screenWidth * 0.015,
    backgroundColor: '#FFFFFF44', // login.tsx의 tempSettingButton과 유사
    borderRadius: 8,
  },
  sensorCard: {
    margin: screenWidth * 0.04,
    backgroundColor: '#FFFFFF',
    borderRadius: 12, // login.tsx와 동일
    padding: screenWidth * 0.04,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 }, // login.tsx와 동일
    shadowOpacity: 0.1, // login.tsx와 동일
    shadowRadius: 5, // login.tsx와 동일
    elevation: 5, // login.tsx와 동일
  },
  sensorItem: {
    marginBottom: screenHeight * 0.015,
  },
  sensorLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sensorLabel: {
    fontSize: screenWidth * 0.04,
    fontWeight: '500', // login.tsx의 subtitle와 동일
    color: '#1F2937',
    letterSpacing: 0.5, // login.tsx와 동일
  },
  sensorValue: {
    fontSize: screenWidth * 0.0425,
    fontWeight: '700', // login.tsx의 버튼 텍스트와 유사
    letterSpacing: 0.5, // login.tsx와 동일
  },
  progressBar: {
    marginTop: screenHeight * 0.005,
    height: screenHeight * 0.0075,
    borderRadius: 3,
    backgroundColor: '#D3E0D3', // login.tsx의 input 테두리와 유사
    overflow: 'hidden',
  },
  updateTime: {
    fontSize: screenWidth * 0.035,
    fontWeight: '500', // login.tsx의 subtitle와 동일
    color: '#6B7280', // login.tsx와 동일
    marginTop: screenHeight * 0.01,
    textAlign: 'center',
    letterSpacing: 0.5, // login.tsx와 동일
  },
  devicesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: screenWidth * 0.04,
    marginBottom: screenHeight * 0.01,
  },
  devicesTitle: {
    fontSize: screenWidth * 0.045,
    fontWeight: '800', // login.tsx와 동일
    color: '#2E4A21', // login.tsx와 동일
    letterSpacing: 1, // login.tsx와 동일
  },
  deviceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: screenWidth * 0.04,
    justifyContent: 'space-between',
  },
  deviceItem: {
    width: '48%',
    marginBottom: screenHeight * 0.015,
    backgroundColor: '#FFFFFF',
    borderRadius: 12, // login.tsx와 동일
    padding: screenWidth * 0.03,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 }, // login.tsx와 동일
    shadowOpacity: 0.1, // login.tsx와 동일
    shadowRadius: 5, // login.tsx와 동일
    elevation: 5, // login.tsx와 동일
    alignItems: 'center',
  },
  deviceName: {
    fontSize: screenWidth * 0.0375,
    fontWeight: '500', // login.tsx의 subtitle와 동일
    color: '#1F2937',
    marginVertical: screenHeight * 0.005,
    letterSpacing: 0.5, // login.tsx와 동일
  },
  deviceStatus: {
    fontSize: screenWidth * 0.0325,
    fontWeight: '500', // login.tsx의 subtitle와 동일
    color: '#6B7280', // login.tsx와 동일
    letterSpacing: 0.5, // login.tsx와 동일
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F5F7FA', // login.tsx와 동일
    padding: screenWidth * 0.04,
  },
  modalTitle: {
    fontSize: screenWidth * 0.05,
    fontWeight: '800', // login.tsx와 동일
    marginBottom: screenHeight * 0.015,
    color: '#2E4A21', // login.tsx와 동일
    letterSpacing: 1, // login.tsx와 동일
  },
  sectionSubtitle: {
    fontSize: screenWidth * 0.04,
    fontWeight: '700', // login.tsx의 버튼 텍스트와 유사
    marginBottom: screenHeight * 0.01,
    marginTop: screenHeight * 0.015,
    color: '#2E4A21', // login.tsx와 동일
    letterSpacing: 0.5, // login.tsx와 동일
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: screenWidth * 0.0125,
    marginBottom: screenHeight * 0.01,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 }, // login.tsx와 동일
    shadowOpacity: 0.1, // login.tsx와 동일
    shadowRadius: 5, // login.tsx와 동일
    elevation: 5, // login.tsx와 동일
  },
  optionItemSelected: {
    backgroundColor: '#D1FAE5',
  },
  addedItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: screenWidth * 0.03,
    marginBottom: screenHeight * 0.01,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 }, // login.tsx와 동일
    shadowOpacity: 0.1, // login.tsx와 동일
    shadowRadius: 5, // login.tsx와 동일
    elevation: 5, // login.tsx와 동일
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: screenHeight * 0.005,
    paddingHorizontal: screenWidth * 0.04,
  },
  saveBtn: {
    backgroundColor: '#7EC87E', // login.tsx와 동일 (MAIN_GREEN)
    paddingVertical: screenHeight * 0.0125,
    paddingHorizontal: screenWidth * 0.1,
    borderRadius: 12, // login.tsx와 동일
    alignItems: 'center',
    shadowColor: '#7EC87E', // login.tsx와 동일
    shadowOffset: { width: 0, height: 4 }, // login.tsx와 동일
    shadowOpacity: 0.3, // login.tsx와 동일
    shadowRadius: 5, // login.tsx와 동일
    elevation: 5, // login.tsx와 동일
  },
  saveBtnText: {
    color: '#FFFFFF', // login.tsx와 동일
    fontWeight: '700', // login.tsx와 동일
    fontSize: screenWidth * 0.04,
    letterSpacing: 0.5, // login.tsx와 동일
  },
  // 수정: 온도 설정 버튼 스타일 (아이콘만 표시하도록 변경)
  tempSettingButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF44', // login.tsx의 tempSettingButton과 유사
    padding: screenWidth * 0.015,
    borderRadius: 8,
    marginLeft: screenWidth * 0.02,
    marginRight: 0,
  },
  tempIcon: {},
  tempButtonText: {
    color: '#FFFFFF',
    fontSize: screenWidth * 0.04,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  deviceSettingSection: {
    marginBottom: screenHeight * 0.025,
  },
  deviceSettingTitle: {
    fontSize: screenWidth * 0.045,
    fontWeight: '800',
    marginBottom: screenHeight * 0.0125,
    color: '#2E4A21',
    letterSpacing: 1,
  },
  sliderItem: {
    marginBottom: screenHeight * 0.01875,
  },
  closeBtn: {
    backgroundColor: '#7EC87E',
    paddingVertical: screenHeight * 0.0125,
    paddingHorizontal: screenWidth * 0.1,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#7EC87E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  savedText: {
    textAlign: 'center',
    color: '#7EC87E',
    fontSize: screenWidth * 0.04,
    fontWeight: '700',
    marginTop: screenHeight * 0.0125,
    letterSpacing: 0.5,
  },
  // 추가: 센서 설정 스타일
  sensorSetting: {
    marginBottom: screenHeight * 0.01875,
  },
  sensorLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: screenHeight * 0.00625,
  },
  sensorIcon: {
    marginRight: screenWidth * 0.0125,
  },
  sensorLabelText: {
    fontSize: screenWidth * 0.04,
    fontWeight: '500',
    color: '#1F2937',
    letterSpacing: 0.5,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: screenHeight * 0.00625,
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  decreaseButton: {
    backgroundColor: '#3498DB',
    padding: screenWidth * 0.0125,
    borderRadius: 5,
    marginRight: screenWidth * 0.0125,
    shadowColor: '#3498DB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  increaseButton: {
    backgroundColor: '#E74C3C',
    padding: screenWidth * 0.0125,
    borderRadius: 5,
    shadowColor: '#E74C3C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
});