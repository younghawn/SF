import React, { useState, useEffect, useRef, useCallback } from "react"
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  Animated,
  FlatList,
  Image,
  ScrollView,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { WebView } from "react-native-webview"
import AsyncStorage from "@react-native-async-storage/async-storage"

import BottomTabBarLayout from "./bottomtabbar"

const RPI_STREAM_URL = "https://api.hotpotato.me/monitor"

export default function CctvScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current

  const [capturedImages, setCapturedImages] = useState<{ date: string; images: string[] }[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start()
  }, [fadeAnim])

  useEffect(() => {
    const loadCapturedImages = async () => {
      try {
        const storedImages = await AsyncStorage.getItem("capturedImages")
        if (storedImages) {
          const parsedImages = JSON.parse(storedImages)
          setCapturedImages(parsedImages)
          if (parsedImages.length > 0) {
            setSelectedDate(parsedImages[0].date)
          }
        }
      } catch (err) {
        console.log("[CctvScreen] 캡처 이미지 로드 오류:", err)
      }
    }
    loadCapturedImages()
  }, [])

  const handleCapture = useCallback(async () => {
    try {
      const today = new Date()
      const dateStr = today.toISOString().split("T")[0]

      const base64Image = "data:image/jpeg;base64,/9j/4AAQSkZJRg..."

      let updatedImages = [...capturedImages]
      const dateIndex = updatedImages.findIndex((item) => item.date === dateStr)

      if (dateIndex !== -1) {
        updatedImages[dateIndex].images.push(base64Image)
      } else {
        updatedImages = [{ date: dateStr, images: [base64Image] }, ...updatedImages]
      }

      setCapturedImages(updatedImages)
      await AsyncStorage.setItem("capturedImages", JSON.stringify(updatedImages))
      setSelectedDate(dateStr)
      Alert.alert("캡처", "캡쳐완료!")
    } catch (err) {
      console.log("[CctvScreen] 캡처 오류:", err)
      Alert.alert("오류", "캡처 중 오류가 발생했습니다.")
    }
  }, [capturedImages])

  const selectedImages = selectedDate
    ? capturedImages.find((item) => item.date === selectedDate)?.images || []
    : []

  return (
    <BottomTabBarLayout initialTab="cctv">
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <SafeAreaView style={styles.container}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>CCTV 화면</Text>
            </View>

            <View style={styles.cctvBlock}>
              <Text style={styles.blockTitle}>라즈베리파이 카메라</Text>

              <View style={styles.cameraContainer}>
                <WebView
                  source={{ uri: RPI_STREAM_URL }}
                  style={styles.cameraWebView}
                />
              </View>

              <View style={styles.captureRow}>
                <TouchableOpacity
                  style={styles.captureButton}
                  onPress={handleCapture}
                >
                  <Ionicons name="camera" size={24} color="#FFFFFF" />
                  <Text style={styles.captureButtonText}>캡처</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 캡처된 이미지 섹션 */}
            <View style={styles.capturedImagesSection}>
              <Text style={styles.sectionTitle}>캡처된 이미지</Text>

              {/* 날짜 리스트 */}
              <View style={styles.dateListContainer}>
                <FlatList
                  horizontal
                  data={capturedImages}
                  keyExtractor={(item) => item.date}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.dateButton,
                        selectedDate === item.date && styles.selectedDateButton,
                      ]}
                      onPress={() => setSelectedDate(item.date)}
                    >
                      <Text
                        style={[
                          styles.dateButtonText,
                          selectedDate === item.date && styles.selectedDateButtonText,
                        ]}
                      >
                        {item.date}
                      </Text>
                    </TouchableOpacity>
                  )}
                  showsHorizontalScrollIndicator={false}
                />
              </View>

              {/* 캡처된 이미지 리스트 */}
              <View style={styles.imageListContainer}>
                {selectedImages.length === 0 ? (
                  <View style={styles.noImagesContainer}>
                    <Ionicons name="image-outline" size={40} color="#6B7280" />
                    <Text style={styles.noImagesText}>캡처된 이미지가 없습니다.</Text>
                  </View>
                ) : (
                  <FlatList
                    data={selectedImages}
                    keyExtractor={(item, index) => `${selectedDate}-${index}`}
                    renderItem={({ item }) => (
                      <Image
                        source={{ uri: item }}
                        style={styles.capturedImage}
                        resizeMode="cover"
                      />
                    )}
                    numColumns={2}
                    columnWrapperStyle={styles.imageRow}
                  />
                )}
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Animated.View>
    </BottomTabBarLayout>
  )
}

const { width, height } = Dimensions.get("window")
const BLOCK_HEIGHT = 300 // CCTV 블록 높이 조정

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA", 
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    height: 60,
    backgroundColor: "#7EC87E", 
    justifyContent: "center",
    paddingHorizontal: 16,
    borderBottomWidth: 0,
  },
  headerTitle: {
    fontSize: 24, 
    color: "#FFFFFF", 
    fontWeight: "800", 
    letterSpacing: 1, 
  },
  cctvBlock: {
    backgroundColor: "#FFFFFF",
    margin: 16,
    borderRadius: 12, 
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 5, 
    elevation: 5, 
    height: BLOCK_HEIGHT,
  },
  blockTitle: {
    fontSize: 18, 
    fontWeight: "800", 
    marginBottom: 8,
    color: "#2E4A21", 
    letterSpacing: 1, 
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: "#000",
    borderRadius: 8,
    overflow: "hidden",
  },
  cameraWebView: {
    width: "100%",
    height: "100%",
  },
  captureRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
  },
  captureButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#7EC87E", 
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12, 
    shadowColor: "#7EC87E", 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 5, 
    elevation: 5, 
  },
  captureButtonText: {
    marginLeft: 6,
    color: "#FFFFFF", 
    fontWeight: "700", 
    fontSize: 16, 
    letterSpacing: 0.5, 
  },
  // 캡처된 이미지 섹션 스타일
  capturedImagesSection: {
    margin: 16,
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: 18, 
    fontWeight: "800", 
    color: "#2E4A21", 
    marginBottom: 12,
    letterSpacing: 1, 
  },
  dateListContainer: {
    marginBottom: 16,
  },
  dateButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 12,
    borderRadius: 12, 
    backgroundColor: "#F5F7FA", 
    borderWidth: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 5, 
    elevation: 5, 
  },
  selectedDateButton: {
    backgroundColor: "#7EC87E", 
    borderColor: "#7EC87E",
  },
  dateButtonText: {
    fontSize: 16,
    fontWeight: "500", 
    color: "#1F2937",
    letterSpacing: 0.5, 
  },
  selectedDateButtonText: {
    color: "#FFFFFF", 
    fontWeight: "700", 
    letterSpacing: 0.5, 
  },
  imageListContainer: {
    flex: 1,
  },
  noImagesContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  noImagesText: {
    textAlign: "center",
    color: "#6B7280", 
    fontSize: 16,
    fontWeight: "500", 
    marginTop: 12,
  },
  capturedImage: {
    width: (width - 48) / 2,
    height: 140,
    borderRadius: 12,
    margin: 6,
    borderWidth: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 5, 
    elevation: 5, 
  },
  imageRow: {
    justifyContent: "space-between",
  },
})