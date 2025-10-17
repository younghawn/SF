import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Modal,
  TextInput,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
const screenWidth = Dimensions.get('window').width;

export default function ListFarmScreen() {
  const [userId, setUserId] = useState('');

  async function loadUserId() {
    try {
      const storedId = await AsyncStorage.getItem('LOGGED_IN_USER');
      if (storedId) {
        setUserId(storedId);
        console.log('[ListFarm] 내부저장소 userId:', storedId);
      } else {
        console.log('[ListFarm] userId 없음');
      }
    } catch (err) {
      console.log('[ListFarm] userId 로드 오류:', err);
    }
  }
  useEffect(() => {
    loadUserId();
  }, []);

  const [farms, setFarms] = useState([
    { id: '1', farmName: '영돌이 농장', location: '부산', crop: '상추' },
    { id: '2', farmName: '티케하우스', location: '서울', crop: '토마토' },
  ]);

  const testFarms = [
    { id: 't1', farmName: '테스트농장1', location: 'TestLoc1', crop: 'Test작물1' },
    { id: 't2', farmName: '테스트농장2', location: 'TestLoc2', crop: 'Test작물2' },
  ];

  async function fetchFarmsFromServer(_userId: string) {
    try {
      console.log('[ListFarm] fetchFarmsFromServer 시작, userId:', _userId);
      const token = await AsyncStorage.getItem('AUTH_TOKEN');
      const response = await fetch(
        `https://port-0-server-m7tucm4sab201860.sel4.cloudtype.app/getFarms?user_id=${_userId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log('[ListFarm] 응답 status:', response.status);

      if (!response.ok) {
        const errText = await response.text();
        console.log('[ListFarm] getFarms 오류(HTTP):', response.status, errText);
        setFarms(testFarms);
        return;
      }

      const dataObj = await response.json();
      console.log('[ListFarm] 응답 data:', dataObj);

      const farmArray = dataObj.farms;
      if (Array.isArray(farmArray) && farmArray.length > 0) {
        const mapped = farmArray.map((item) => ({
          id: item.farm_id?.toString() || '0',
          farmName: item.farm_name || '이름없음',
          location: item.farm_location || '위치미상',
          crop: item.farm_type || '작물미상',
        }));
        setFarms(mapped);
      } else {
        console.log('[ListFarm] farms 배열이 비어 testFarms 사용');
        setFarms(testFarms);
      }
    } catch (err) {
      console.log('[ListFarm] 서버 통신 오류:', err);
      console.log('[ListFarm] testFarms 적용');
      setFarms(testFarms);
    }
  }

  useEffect(() => {
    if (userId) {
      fetchFarmsFromServer(userId);
    }
  }, [userId]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newFarmName, setNewFarmName] = useState('');
  const [newFarmLocation, setNewFarmLocation] = useState('');
  const [newFarmCrop, setNewFarmCrop] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);

  const cropOptions = ['상추', '방울토마토',];

  const handleAddFarmPress = () => setShowAddModal(true);

  const handleAddFarm = async () => {
    if (!newFarmName || !newFarmLocation || !newFarmCrop) return;

    const farmData = {
      user_id: userId,
      farm_name: newFarmName,
      farm_location: newFarmLocation,
      farm_type: newFarmCrop,
    };
    console.log('[ListFarm] 새 농장 추가 -> POST:', farmData);

    try {
      const token = await AsyncStorage.getItem('AUTH_TOKEN');
      const addRes = await fetch('https://port-0-server-m7tucm4sab201860.sel4.cloudtype.app/addFarm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(farmData),
      });
      console.log('[ListFarm] addFarm 응답 status:', addRes.status);

      if (!addRes.ok) {
        const errText = await addRes.text();
        console.log('[ListFarm] 농장추가 실패(HTTP):', addRes.status, errText);
      } else {
        const addData = await addRes.json();
        console.log('[ListFarm] addFarm 응답 data:', addData);

        if (userId) {
          await fetchFarmsFromServer(userId);
        }
      }
    } catch (err) {
      console.log('[ListFarm] addFarm 오류:', err);
    }

    setNewFarmName('');
    setNewFarmLocation('');
    setNewFarmCrop('');
    setNameError(null);
    setShowAddModal(false);
  };

  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const handleRemoveFarmPress = () => setShowRemoveModal(true);

  async function handleRemoveFarm(id: string) {
    try {
      const token = await AsyncStorage.getItem('AUTH_TOKEN');
      const delUrl = `https://port-0-server-m7tucm4sab201860.sel4.cloudtype.app/delFarm`;
      const response = await fetch(delUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ farm_ids: [id] }),
      });
      console.log('[ListFarm] delFarm 응답 status:', response.status);

      if (!response.ok) {
        const errText = await response.text();
        console.log('[ListFarm] delFarm 오류(HTTP):', response.status, errText);
        return;
      }

      const delData = await response.json();
      console.log('[ListFarm] delFarm 응답 data:', delData);

      const updated = farms.filter((farm) => farm.id !== id);
      setFarms(updated);
    } catch (err) {
      console.log('[ListFarm] delFarm 오류:', err);
    }
  }

  async function storeSelectedFarm(farmId: string, farmName: string) {
    try {
      await AsyncStorage.setItem('SELECTED_FARM_ID', farmId);
      await AsyncStorage.setItem('SELECTED_FARM_NAME', farmName);
      console.log('[ListFarm] 내부저장소 selectedFarmId:', farmId);
      console.log('[ListFarm] 내부저장소 selectedFarmName:', farmName);
    } catch (err) {
      console.log('[ListFarm] selectedFarm 저장 오류:', err);
    }
  }

  const renderFarmItem = ({ item }: { item: typeof farms[number] }) => (
    <TouchableOpacity
      style={styles.farmCard}
      onPress={async () => {
        await storeSelectedFarm(item.id, item.farmName);
        router.push('/(tabs)/mainUI');
      }}
    >
      <Ionicons name="leaf-outline" size={24} color="#555" />

      <View style={styles.farmTextContainer}>
        <Text style={styles.farmName} numberOfLines={1} ellipsizeMode="tail">{item.farmName}</Text>
        <Text style={styles.farmSub} numberOfLines={1} ellipsizeMode="tail">위치: {item.location}</Text>
        <Text style={styles.farmSub} numberOfLines={1} ellipsizeMode="tail">작물: {item.crop}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>레알팜퍼니</Text>
        <View style={styles.headerRightIcons}>
          <TouchableOpacity style={styles.headerIcon} onPress={handleAddFarmPress}>
            <Ionicons name="add-circle-outline" size={24} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.headerIcon} onPress={handleRemoveFarmPress}>
            <Ionicons name="remove-circle-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>내 농장 목록</Text>

        <FlatList
          data={farms}
          keyExtractor={(item) => item.id}
          renderItem={renderFarmItem}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          style={{ marginTop: 16 }}
        />
      </View>

      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>새 농장 추가</Text>

            <TextInput
              style={styles.input}
              placeholder="농장 이름"
              value={newFarmName}
              onChangeText={(text) => {
                if (text.length > 7) {
                  setNameError('농장 이름은 7자 이하로 제한됩니다.');
                } else {
                  setNameError(null);
                  setNewFarmName(text);
                }
              }}
            />
            {nameError && <Text style={styles.errorText}>{nameError}</Text>}

            <TextInput
              style={styles.input}
              placeholder="농장 위치"
              value={newFarmLocation}
              onChangeText={setNewFarmLocation}
            />

            <TextInput
              style={styles.input}
              placeholder="작물"
              value={newFarmCrop}
              onChangeText={setNewFarmCrop}
            />

            <View style={{ marginBottom: 12, borderWidth: 1, borderColor: '#ccc', borderRadius: 8 }}>
              <Text style={{ fontSize: 14, margin: 8, fontWeight: 'bold' }}>작물 리스트</Text>
              <FlatList
                data={cropOptions}
                keyExtractor={(item) => item}
                style={{ maxHeight: 100 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={{ paddingVertical: 8, paddingHorizontal: 10 }}
                    onPress={() => setNewFarmCrop(item)}
                  >
                    <Text style={{ fontSize: 15, color: '#333' }}>{item}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>

            <View style={styles.modalButtonContainer}>
              <TouchableOpacity style={styles.modalButton} onPress={handleAddFarm}>
                <Text style={styles.modalButtonText}>추가</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#aaa' }]}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.modalButtonText}>취소</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showRemoveModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowRemoveModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>농장 삭제 (로컬+서버)</Text>

            <FlatList
              data={farms}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.removeItemRow}>
                  <Text style={styles.removeItemText}>{item.farmName}</Text>
                  <TouchableOpacity
                    style={[styles.modalButton, { paddingHorizontal: 10, marginLeft: 10 }]}
                    onPress={() => handleRemoveFarm(item.id)}
                  >
                    <Text style={styles.modalButtonText}>삭제</Text>
                  </TouchableOpacity>
                </View>
              )}
            />

            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#aaa', flex: 1 }]}
                onPress={() => setShowRemoveModal(false)}
              >
                <Text style={styles.modalButtonText}>닫기</Text>
              </TouchableOpacity>
            </View>
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
  header: {
    width: '100%',
    height: 60,
    backgroundColor: '#7ec87e',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  headerRightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    padding: 8,
    marginLeft: 12,
    backgroundColor: '#ffffff44',
    borderRadius: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#2E4A21',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  farmCard: {
    width: (screenWidth - 80) / 2, // 간격을 넓히기 위해 폭 조정
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20, // 카드 간 수직 간격 증가
    marginHorizontal: 8, // 카드 간 수평 간격 추가
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  farmTextContainer: {
    flex: 1,
    marginLeft: 8,
  },
  farmName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    letterSpacing: 0.5,
  },
  farmSub: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 4,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginHorizontal: 10, // FlatList 항목 간 간격을 위해 마진 추가
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 30,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2E4A21',
    marginBottom: 16,
    letterSpacing: 1,
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
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    backgroundColor: '#7EC87E',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 8,
    alignItems: 'center',
    shadowColor: '#7EC87E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  removeItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  removeItemText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
});