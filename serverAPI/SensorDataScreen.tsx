import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';

export default function SensorDataScreen() {
  const [temperature, setTemperature] = useState<number | null>(null);
  const [humidity, setHumidity] = useState<number | null>(null);
  const [light, setLight] = useState<number | null>(null);
  const [updateTime, setUpdateTime] = useState<string | null>(null);

  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // 컴포넌트 마운트 시 서버에서 데이터 가져옴
    fetchSensorData();
  }, []);

  const fetchSensorData = async () => {
    try {
      // 예: http://115.86.164.103:8000/data 로 JSON을 내려주도록 구현했다고 가정
      const response = await fetch('http://115.86.164.103:8000/');
      // 만약 서버가 HTML이 아닌 JSON을 반환해야 함
      // HTML만 내려준다면, 서버 쪽을 수정하거나 HTML 파싱 필요
      const json = await response.json();

      // json 구조에 따라 키 이름을 맞춰줍니다
      // 예: {"temperature":11,"humidity":22,"light":33,"time":"2025-02-20 10:11:36"}
      setTemperature(json.temperature);
      setHumidity(json.humidity);
      setLight(json.light);
      setUpdateTime(json.time);

      setLoading(false);
    } catch (error) {
      Alert.alert('오류', '센서 데이터를 불러올 수 없습니다.');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#999" />
        <Text>로딩 중...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>스마트팜 센서 데이터</Text>

      <View style={styles.sensorCard}>
        <Text style={styles.label}>온도: {temperature?.toFixed(2)} °C</Text>
        <Text style={styles.label}>습도: {humidity?.toFixed(2)} %</Text>
        <Text style={styles.label}>조도: {light} lx</Text>
        <Text style={styles.label}>업데이트 시간: {updateTime}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#f1f8f4',
    alignItems: 'center',
    paddingTop: 50,
  },
  title: {
    fontSize: 24,
    color: '#2e4a21',
    fontWeight: 'bold',
    marginBottom: 20,
  },
  sensorCard: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    elevation: 3,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
  },
});
