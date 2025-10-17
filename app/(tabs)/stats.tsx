import React, { useEffect, useState, useRef } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Modal,
  LogBox,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VictoryChart, VictoryLine, VictoryAxis, VictoryLegend, VictoryTheme, Rect } from 'victory-native';
import BottomTabBarLayout from './bottomtabbar';
import { Calendar, DateData } from 'react-native-calendars';
import AsyncStorage from '@react-native-async-storage/async-storage';

LogBox.ignoreLogs(['Support for defaultProps will be removed from function components',]);

const screenWidth = Dimensions.get('window').width;

// 커스텀 VRect 컴포넌트 정의 (훅 호출 오류 방지)
const CustomVRect = (props: React.ComponentProps<typeof Rect>) => <Rect {...props} />;

// ------------------ 예시 데이터 (일/주/월) ------------------
const sensorData = {
  daily: {
    labels: ['0시', '2시', '4시', '6시', '8시', '10시', '12시', '14시', '16시', '18시', '20시', '22시'],
    temperature: Array(12).fill(0),
    humidity:    Array(12).fill(0),
    soil:        Array(12).fill(0),
    co2:         Array(12).fill(0),
  },
  weekly: {
    labels: ['월','화','수','목','금','토','일'],
    temperature: Array(7).fill(0), // 서버 데이터로 대체될 예정이므로 초기값 0으로 설정
    humidity:    Array(7).fill(0),
    soil:        Array(7).fill(0),
    co2:         Array(7).fill(0),
  },
  monthly: {
    labels: ['0시', '2시', '4시', '6시', '8시', '10시', '12시', '14시', '16시', '18시', '20시', '22시'],
    temperature: Array(12).fill(25), // 더미 데이터와 비슷한 수준으로 초기값 설정
    humidity:    Array(12).fill(50),
    soil:        Array(12).fill(35),
    co2:         Array(12).fill(45),
  },
};

const sensorColors = {
  temperature: '#F59E0B',
  humidity:    '#3B82F6',
  soil:        '#10B981',
  co2:         '#EF4444',
};

const sensorItems: Array<{ key: "temperature" | "humidity" | "soil" | "co2"; label: string; icon: string }> = [
  { key: 'temperature', label: '온도', icon: 'thermometer-outline' },
  { key: 'humidity',    label: '습도', icon: 'water-outline' },
  { key: 'soil',        label: '토양습도', icon: 'leaf-outline' },
  { key: 'co2',         label: 'CO2',  icon: 'cloud-outline' },
];

// StatsScreen 컴포넌트
function StatsScreen() {
  const [selectedSensors, setSelectedSensors] = useState({
    temperature: true,
    humidity:    true,
    soil:        false,
    co2:         false,
  });
  const toggleSensor = (key: keyof typeof selectedSensors) => {
    const onCount = Object.values(selectedSensors).filter(Boolean).length;
    if (selectedSensors[key] && onCount === 1) return;
    setSelectedSensors(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('custom');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [noDataMessage, setNoDataMessage] = useState<string | null>(null);
  const [dummyRender, setDummyRender] = useState(false);
  const [farmId, setFarmId] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [timeRange, dummyRender]);

  useEffect(() => {
    async function loadFarmId() {
      try {
        const storedFarmId = await AsyncStorage.getItem('SELECTED_FARM_ID');
        if (storedFarmId) {
          setFarmId(storedFarmId);
        } else {
          setNoDataMessage('농장 ID가 없습니다. 농장을 선택해주세요.');
        }
      } catch (err) {
        console.log('[StatsScreen] farmId 로드 오류:', err);
      }
    }
    loadFarmId();
  }, []);

  const currentKey = timeRange === 'custom' ? 'monthly' : timeRange;
  const currentData = sensorData[currentKey];

  const scaleCO2 = (value: number) => (value / 1200) * 100;
  const unscaleCO2 = (value: number) => (value / 100) * 1200;

  // Victory 데이터 형식으로 변환
  const activeDatasets = Object.keys(selectedSensors)
    .filter(k => selectedSensors[k as keyof typeof selectedSensors])
    .map((k) => {
      const data = currentData[k as keyof typeof currentData] as number[];
      return {
        name: k,
        data: data.map((value, index) => ({
          x: currentData.labels[index],
          y: k === 'co2' ? scaleCO2(value) : value,
        })),
        color: sensorColors[k as keyof typeof sensorColors],
      };
    });

  const onDayPress = (day: DateData) => {
    const newDate = new Date(day.year, day.month - 1, day.day);
    setSelectedDate(newDate);
    setShowDatePicker(false);
  };

  function formatDate(d: Date) {
    const yyyy = d.getUTCFullYear();
    const mm   = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd   = String(d.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  useEffect(() => {
    if (!farmId) return;

    async function fetchServerData() {
      try {
        setNoDataMessage(null);
        if (timeRange === 'daily') {
          const url = `https://port-0-server-m7tucm4sab201860.sel4.cloudtype.app/realtime-data?farm_id=${farmId}`;
          console.log('[StatsScreen] daily fetch:', url);
          const res = await fetch(url);
          if (!res.ok) {
            if (res.status === 404) {
              setNoDataMessage('해당 농장에 대한 데이터가 없습니다.');
            } else{
              const errText = await res.text();
              console.log('[StatsScreen] daily fetch 오류(HTTP):', res.status, errText);
              setNoDataMessage('데이터를 불러오지 못했습니다.');
            }
            return;
          }
          const data = await res.json();
          console.log('[StatsScreen] daily fetch 성공 data:', data);

          const labels = ['0시', '2시', '4시', '6시', '8시', '10시', '12시', '14시', '16시', '18시', '20시', '22시'];
          const newTemp = Array(12).fill(0);
          const newHum  = Array(12).fill(0);
          const newSoil = Array(12).fill(0);
          const newCo2  = Array(12).fill(0);

          data.forEach((item: any, index: number) => {
            if (index < 12) {
              newTemp[index] = item.temperature || 0;
              newHum[index]  = item.humidity    || 0;
              newSoil[index] = item.soil        || 0;
              newCo2[index]  = item.co2         || 0;
            }
          });

          sensorData.daily.labels      = labels;
          sensorData.daily.temperature = newTemp;
          sensorData.daily.humidity    = newHum;
          sensorData.daily.soil        = newSoil;
          sensorData.daily.co2         = newCo2;

          setDummyRender(x => !x);
        } else if (timeRange === 'weekly') {
          // 서버에서 주간 데이터를 가져오도록 수정
          const endDate = new Date();
          const startDate = new Date();
          startDate.setDate(endDate.getDate() - 6); // 최근 7일 데이터

          const startDateStr = formatDate(startDate);
          const endDateStr = formatDate(endDate);
          const url = `https://port-0-server-m7tucm4sab201860.sel4.cloudtype.app/history-data?farm_id=${farmId}&start_date=${startDateStr}&end_date=${endDateStr}`;
          console.log('[StatsScreen] weekly fetch:', url);

          const res = await fetch(url);
          if (!res.ok) {
            const errText = await res.text();
            console.log('[StatsScreen] weekly fetch 오류(HTTP):', res.status, errText);
            if (res.status === 404) {
              setNoDataMessage('해당 기간에 기록된 데이터가 없습니다.');
            }
            return;
          }
          const list = await res.json();
          console.log('[StatsScreen] weekly fetch 성공 data:', list);

          if (list.length === 0) {
            setNoDataMessage('선택한 기간에 데이터가 없습니다.');
            return;
          }

          const labels = ['월', '화', '수', '목', '금', '토', '일'];
          const newTemp = Array(7).fill(0);
          const newHum  = Array(7).fill(0);
          const newSoil = Array(7).fill(0);
          const newCo2  = Array(7).fill(0);

          // 서버 데이터를 주간 데이터로 변환 (일별 평균 계산)
          const dailyAverages: { [key: string]: { temp: number[], hum: number[], soil: number[], co2: number[] } } = {};
          list.forEach((obj: any) => {
            const date = new Date(obj.time_interval);
            const dayIndex = (date.getDay() + 6) % 7; // 월요일(0) ~ 일요일(6)으로 매핑
            if (!dailyAverages[dayIndex]) {
              dailyAverages[dayIndex] = { temp: [], hum: [], soil: [], co2: [] };
            }
            dailyAverages[dayIndex].temp.push(parseFloat(obj.avg_temperature) || 0);
            dailyAverages[dayIndex].hum.push(parseFloat(obj.avg_humidity) || 0);
            dailyAverages[dayIndex].soil.push(parseFloat(obj.avg_soil_moisture) || 0);
            dailyAverages[dayIndex].co2.push(parseFloat(obj.avg_co2) || 0);
          });

          for (let i = 0; i < 7; i++) {
            if (dailyAverages[i]) {
              const tempAvg = dailyAverages[i].temp.reduce((sum: number, val: number) => sum + val, 0) / dailyAverages[i].temp.length;
              const humAvg = dailyAverages[i].hum.reduce((sum: number, val: number) => sum + val, 0) / dailyAverages[i].hum.length;
              const soilAvg = dailyAverages[i].soil.reduce((sum: number, val: number) => sum + val, 0) / dailyAverages[i].soil.length;
              const co2Avg = dailyAverages[i].co2.reduce((sum: number, val: number) => sum + val, 0) / dailyAverages[i].co2.length;

              newTemp[i] = tempAvg || 0;
              newHum[i] = humAvg || 0;
              newSoil[i] = soilAvg || 0;
              newCo2[i] = co2Avg || 0;
            }
          }

          sensorData.weekly.labels      = labels;
          sensorData.weekly.temperature = newTemp;
          sensorData.weekly.humidity    = newHum;
          sensorData.weekly.soil        = newSoil;
          sensorData.weekly.co2         = newCo2;

          setDummyRender(x => !x);
        } else if (timeRange === 'custom') {
          const utcDate = new Date(Date.UTC(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate()));
          const dateStr = formatDate(utcDate);
          const url = `https://port-0-server-m7tucm4sab201860.sel4.cloudtype.app/history-data?farm_id=${farmId}&date=${dateStr}`;
          console.log('[StatsScreen] custom fetch:', url);

          const res = await fetch(url);
          if (!res.ok) {
            const errText = await res.text();
            console.log('[StatsScreen] custom fetch 오류(HTTP):', res.status, errText);
            if (res.status === 404) {
              setNoDataMessage('해당 날짜에 기록된 데이터가 없습니다.');
            }
            return;
          }
          const list = await res.json();
          console.log('[StatsScreen] custom fetch 성공 data:', list);

          if (list.length === 0) {
            setNoDataMessage('선택한 날짜에 데이터가 없습니다.');
            return;
          }

          const labels = ['0시', '2시', '4시', '6시', '8시', '10시', '12시', '14시', '16시', '18시', '20시', '22시'];
          const newTemp: (number|null)[] = Array(12).fill(null);
          const newHum:  (number|null)[] = Array(12).fill(null);
          const newSoil: (number|null)[] = Array(12).fill(null);
          const newCo2:  (number|null)[] = Array(12).fill(null);

          const hourToIndex: Record<number,number> = {
            0: 0, 2: 1, 4: 2, 6: 3, 8: 4, 10: 5, 12: 6, 14: 7, 16: 8, 18: 9, 20: 10, 22: 11
          };

          list.forEach((obj: any) => {
            const tstr = obj.time_interval;
            const hr = parseInt(tstr.slice(11, 13), 10);
            const index = hourToIndex[hr];
            if (index !== undefined) {
              newTemp[index] = parseFloat(obj.avg_temperature)  || 0;
              newHum[index]  = parseFloat(obj.avg_humidity)     || 0;
              newSoil[index] = parseFloat(obj.avg_soil_moisture)|| 0;
              newCo2[index]  = parseFloat(obj.avg_co2)          || 0;
            }
          });

          sensorData.monthly.labels      = labels;
          sensorData.monthly.temperature = newTemp.map(v => v ?? 0);
          sensorData.monthly.humidity    = newHum.map(v => v ?? 0);
          sensorData.monthly.soil        = newSoil.map(v => v ?? 0);
          sensorData.monthly.co2         = newCo2.map(v => v ?? 0);

          setDummyRender(x => !x);
        }
      } catch (err) {
        console.log('[StatsScreen] 서버 fetch 오류:', err);
        setNoDataMessage('서버와의 통신 중 오류가 발생했습니다.');
      }
    }

    if (farmId) {
      fetchServerData();
    }
  }, [timeRange, selectedDate, farmId]);

  return (
    <BottomTabBarLayout initialTab="stats">
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>통계그래프</Text>
      </View>

      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.sensorRow}>
            {sensorItems.map((sItem) => {
              const isOn = selectedSensors[sItem.key as keyof typeof selectedSensors];
              return (
                <TouchableOpacity
                  key={sItem.key}
                  style={[styles.sensorBtn, isOn && styles.sensorBtnActive]}
                  onPress={() => toggleSensor(sItem.key)}
                >
                  <Ionicons
                    name={sItem.icon as any}
                    size={24}
                    color={isOn ? '#FFFFFF' : '#444'}
                    style={{ marginBottom: 4 }}
                  />
                  <Text style={[styles.sensorBtnLabel, isOn && { color: '#FFFFFF' }]}>
                    {sItem.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={[styles.dropdownContainer, { justifyContent: 'center' }]}>
            <TouchableOpacity
              style={styles.dropdownBox}
              onPress={() => setTimeRange('custom')}
            >
              <Text style={{ color: timeRange === 'custom' ? '#7EC87E' : '#444' }}>기간</Text>
            </TouchableOpacity>
          </View>

          {timeRange === 'custom' && (
            <View style={styles.customDateContainer}>
              <TouchableOpacity
                style={styles.calendarButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color="#6B7280"
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.calendarText}>
                  {`${selectedDate.getFullYear()}년 ${selectedDate.getMonth() + 1}월 ${selectedDate.getDate()}일`}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {noDataMessage && (
            <Text style={styles.noDataText}>{noDataMessage}</Text>
          )}

          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>
                {timeRange === 'daily'   && '일간 통계'}
                {timeRange === 'weekly'  && '주간 통계'}
                {timeRange === 'monthly' && '월간 통계'}
                {timeRange === 'custom'  && `(${selectedDate.getMonth() + 1}월 ${selectedDate.getDate()}일) 통계`}
              </Text>
            </View>

            {/* VictoryChart로 변경 */}
            <VictoryChart
              width={screenWidth - 40}
              height={400}
              theme={VictoryTheme.material}
              padding={{ top: 50, bottom: 50, left: 50, right: 30 }}
              domainPadding={{ x: 20 }}
            >
              {/* 범례 추가 */}
              <VictoryLegend
                x={50}
                y={10}
                orientation="horizontal"
                gutter={20}
                data={activeDatasets.map(dataset => ({
                  name: sensorItems.find(si => si.key === dataset.name)?.label || dataset.name,
                  symbol: { fill: dataset.color },
                }))}
                style={{
                  labels: { fontSize: 12, fill: '#1F2937' },
                }}
              />
              {/* X축 라벨 (회전 적용) */}
              <VictoryAxis
                tickValues={currentData.labels}
                style={{
                  tickLabels: { fontSize: 12, fill: '#6B7280', angle: -45, textAnchor: 'end' },
                  grid: { stroke: '#D3E0D3', strokeDasharray: '5, 5' },
                }}
              />
              {/* Y축 라벨 (CO2 스케일 조정) */}
              <VictoryAxis
                dependentAxis
                tickFormat={(value: number) =>
                  selectedSensors.co2 ? `${unscaleCO2(value).toFixed(0)} ppm` : `${value.toFixed(0)}`
                }
                style={{
                  tickLabels: { fontSize: 12, fill: '#6B7280' },
                  grid: { stroke: '#D3E0D3', strokeDasharray: '5, 5' },
                }}
              />
              {/* 데이터 라인 */}
              {activeDatasets.map((dataset, index) => (
                <VictoryLine
                  key={index}
                  data={dataset.data}
                  style={{
                    data: {
                      stroke: dataset.color,
                      strokeWidth: 3,
                    },
                  }}
                />
              ))}
            </VictoryChart>
          </View>
        </ScrollView>
      </Animated.View>

      {showDatePicker && (
        <Modal transparent={true} animationType="fade">
          <View style={styles.datePickerOverlay}>
            <View style={styles.datePickerContainer}>
              <Text style={{ fontSize: 18, fontWeight: '800', marginBottom: 8, color: '#2E4A21', letterSpacing: 1 }}>
                날짜 선택
              </Text>

              <Calendar
                onDayPress={onDayPress}
                style={{ borderRadius: 10 }}
                theme={{
                  arrowColor: '#7EC87E',
                  todayTextColor: '#7EC87E',
                }}
              />

              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 }}>닫기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </BottomTabBarLayout>
  );
}

export default StatsScreen;

// styles는 변경 없음
const styles = StyleSheet.create({
  topBar: {
    height: 60,
    backgroundColor: '#7EC87E', 
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderBottomWidth: 0,
  },
  topBarTitle: {
    color: '#FFFFFF', 
    fontSize: 24, 
    fontWeight: '800', 
    letterSpacing: 1, 
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA', 
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  sensorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    marginTop: 8,
  },
  sensorBtn: {
    width: '22%',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 12, 
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 5, 
    elevation: 5, 
  },
  sensorBtnActive: {
    backgroundColor: '#7EC87E', 
  },
  sensorBtnLabel: {
    fontSize: 14,
    fontWeight: '700', 
    color: '#444',
    letterSpacing: 0.5, 
  },
  dropdownContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12, 
    padding: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 5, 
    elevation: 5, 
  },
  dropdownBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRightWidth: 0,
    borderRightColor: '#D3E0D3', 
    borderRadius: 12, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 5, 
    elevation: 5, 
    backgroundColor: '#F5F7FA', // 고체 배경색 추가
  },
  customDateContainer: {
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  calendarButton: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12, 
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 5, 
    elevation: 5, 
    alignItems: 'center',
  },
  calendarText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
  },
  noDataText: {
    fontSize: 16,
    fontWeight: '500', 
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12, 
    marginTop: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 5, 
    elevation: 5, 
  },
  chartHeader: {
    marginBottom: 8,
  },
  chartTitle: {
    fontSize: 18, 
    fontWeight: '800', 
    color: '#2E4A21', 
    letterSpacing: 1, 
  },
  chartStyle: {
    borderRadius: 16,
    marginTop: 8,
    alignSelf: 'center',
  },
  datePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12, 
    padding: 16,
    width: '80%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 5, 
    elevation: 5, 
  },
  closeButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: '#7EC87E',
    borderRadius: 12, 
    shadowColor: '#7EC87E', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 5, 
    elevation: 5, 
  },
});