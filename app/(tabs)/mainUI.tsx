import React, { useState, FC, useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  StatusBar,
  Dimensions,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import BottomTabBarLayout from "./bottomtabbar";
import axios from "axios";
import Svg, { Circle } from "react-native-svg";

// 화면 크기
const { width, height } = Dimensions.get("window");
const screenWidth = width;
const screenHeight = height;

// (추가) 리포트 타입
type ReportItem = {
  date: string;
  content: string;
  aiAnalysis?: string; // API 응답에서 aiAnalysis 필드를 고려
};

const Badge: FC<{ days: number; text: string }> = ({ days, text }) => {
  const isUnder7 = days <= 7;
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: isUnder7 ? "#EF4444" : "#F5F7FA", maxWidth: screenWidth * 0.35 },
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          { color: isUnder7 ? "#FFFFFF" : "#374151", fontSize: screenWidth * 0.035 },
        ]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {text}
      </Text>
    </View>
  );
};

const ProgressBar: FC<{ progress: number }> = ({ progress }) => {
  const barColor = progress >= 80 ? "#EF4444" : "#10B981";
  return (
    <View style={styles.progressContainer}>
      <View
        style={[
          styles.progressBar,
          { width: `${progress}%`, backgroundColor: barColor },
        ]}
      />
    </View>
  );
};

const CircularProgress: FC<{ progress: number }> = ({ progress }) => {
  const size = screenWidth * 0.4;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <View style={[styles.circularProgressContainer, { width: size, height: size }]}>
      <Svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        <Circle
          stroke="#D3E0D3"
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          transform={`rotate(-90, ${size / 2}, ${size / 2})`}
        />
        <Circle
          stroke="#10B981"
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90, ${size / 2}, ${size / 2})`}
        />
      </Svg>
    </View>
  );
};

const MainUI: FC = () => {
  const [farmTitle, setFarmTitle] = useState("테스트농장1");
  const [farmId, setFarmId] = useState<string | null>(null);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [reportDate, setReportDate] = useState<string>("");
  const [isListView, setIsListView] = useState(true);

  useEffect(() => {
    const loadFarmData = async () => {
      try {
        const storedName = await AsyncStorage.getItem("SELECTED_FARM_NAME");
        const storedFarmId = await AsyncStorage.getItem("SELECTED_FARM_ID");
        if (storedName) setFarmTitle(storedName);
        if (storedFarmId) setFarmId(storedFarmId);
      } catch (err) {
        console.log("[mainUI] farmData 불러오기 오류:", err);
      }
    };
    loadFarmData();
  }, []);

  const [startDate, setStartDate] = useState<string | null>(null);
  const [dDay, setDDay] = useState<number>(0);
  const [isStarted, setIsStarted] = useState<boolean>(false);
  const [growthStage, setGrowthStage] = useState<number>(0);
  const [growthRate, setGrowthRate] = useState<number>(20);

  const stageImages = [
    require("../../assets/images/level1.png"),
    require("../../assets/images/level2.png"),
    require("../../assets/images/level3.png"),
    require("../../assets/images/level4.png"),
  ];

  // -----------------------------
  // (1) 기존 작물 성장도 fetch
  // -----------------------------
  useEffect(() => {
    const fetchFarmStatus = async () => {
      if (!farmId) return;
      try {
        const response = await axios.get(
          `https://port-0-server-m7tucm4sab201860.sel4.cloudtype.app/get-farm-status/${farmId}`
        );
        const { startDate, harvestDays, growthRate, farmActive } = response.data;
        console.log("내 작물 성장률:", growthRate);
        console.log("내 작물 D-Day:", harvestDays);
        console.log("내 작물 시작일:", startDate);
        console.log("내 작물 활성화 여부:", farmActive);

        const safeDday = harvestDays === 0 ? 1 : harvestDays;
        const safeGrowthRate = growthRate === 0 ? 1 : growthRate;

        if (startDate && safeDday && safeGrowthRate) {
          setStartDate(startDate);
          const start = new Date(startDate);
          const today = new Date();
          const timeDiff = today.getTime() - start.getTime();
          const daysPassed = Math.floor(timeDiff / (1000 * 3600 * 24));
          const remainingDays = Math.max(safeDday - daysPassed, 0);
          setDDay(remainingDays);
          setGrowthRate(growthRate);
          setIsStarted(farmActive);
        }
      } catch (err) {
        console.log("[mainUI] 성장도 불러오기 오류:", err);
      }
    };
    fetchFarmStatus();
  }, [farmId]);

  // -----------------------------
  // "시작하기" 버튼
  // -----------------------------
  const handleStart = async () => {
    if (!farmId) {
      console.log("[mainUI] farmId가 없습니다.");
      return;
    }
    try {
      const response = await axios.post(
        "https://port-0-server-m7tucm4sab201860.sel4.cloudtype.app/start-farm",
        { farmId }
      );
      const { startDate, harvestDays, growthRate, farmActive } = response.data;

      const safeDday = harvestDays === 0 ? 1 : harvestDays;
      const safeGrowthRate = growthRate === 0 ? 1 : growthRate;

      if (startDate && safeDday && safeGrowthRate) {
        setStartDate(startDate);
        const start = new Date(startDate);
        const today = new Date();
        const timeDiff = today.getTime() - start.getTime();
        const daysPassed = Math.floor(timeDiff / (1000 * 3600 * 24));
        const remainingDays = Math.max(safeDday - daysPassed, 0);
        setDDay(remainingDays);
        setGrowthRate(growthRate);
        setIsStarted(farmActive);
      }
    } catch (err) {
      console.log("[mainUI] 시작하기 오류:", err);
    }
  };

  // -----------------------------
  // (추가) 스마트팜 AI 일일 리포트
  // -----------------------------
  const fetchAllReports = async () => {
    if (!farmId) {
      setMessage("농장 ID가 없습니다.");
      return;
    }
    setIsReportLoading(true);
    setMessage(null);
    try {
      const response = await axios.get(
        `https://port-0-server-m7tucm4sab201860.sel4.cloudtype.app/get-reports/${farmId}`
      );
      console.log("[MainUI] 모든 리포트 응답:", response.data);
      const formattedReports = response.data.map((item: any) => ({
        date: item.date,
        content: item.aiAnalysis || "리포트 내용이 없습니다.",
      }));
      setReports(formattedReports);
      if (formattedReports.length === 0) {
        setMessage("리포트가 없습니다.");
      }
    } catch (err) {
      console.log("[mainUI] 리포트 fetch 오류:", err);
      setReports([]);
      setMessage("리포트를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setIsReportLoading(false);
    }
  };

  useEffect(() => {
    fetchAllReports();
  }, [farmId]);

  const handleReportClick = (report: ReportItem) => {
    setSelectedReport(report);
    setIsListView(false);
  };

  const handleBackToList = () => {
    setSelectedReport(null);
    setIsListView(true);
  };

  const handleGenerateReport = async () => {
    if (!farmId) {
      setMessage("농장 ID가 없습니다.");
      return;
    }

    const today = getTodayDate();
    setIsReportLoading(true);
    setMessage(null);

    try {
      const response = await axios.post(
        "https://port-0-server-m7tucm4sab201860.sel4.cloudtype.app/generate-report",
        { farmId, date: today }
      );
      const newReport = { date: today, content: response.data.content };
      setReports((prev) => [newReport, ...prev.filter((r) => r.date !== today)]);
      setMessage("금일 리포트가 생성되었습니다.");
      fetchAllReports();
    } catch (err: any) {
      console.log("[MainUI] 리포트 생성 오류:", err);
      if (err.response?.status === 400) {
        setMessage("금일 리포트가 이미 생성되었습니다.");
      } else {
        setMessage("리포트 생성 중 오류가 발생했습니다.");
      }
    } finally {
      setIsReportLoading(false);
    }
  };

  const getTodayDate = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const handleDateClick = async (date: string) => {
    if (!farmId || !date) {
      setMessage("농장 ID 또는 날짜가 없습니다.");
      return;
    }
    setIsReportLoading(true);
    setMessage(null);
    try {
      const response = await axios.get(
        `https://port-0-server-m7tucm4sab201860.sel4.cloudtype.app/get-reports/${farmId}`,
        { params: { date } }
      );
      console.log("[MainUI] 날짜별 리포트 응답:", response.data);
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        const formattedReports = response.data.map((item: any) => ({
          date: item.date,
          content: item.aiAnalysis || "리포트 내용이 없습니다.",
        }));
        setReports(formattedReports);
        setIsListView(true);
        setMessage(null);
      } else {
        setReports([]);
        setMessage("해당 날짜의 리포트가 없습니다.");
      }
    } catch (err) {
      console.log("[mainUI] 날짜별 리포트 fetch 오류:", err);
      setReports([]);
      setMessage("리포트 검색 중 오류가 발생했습니다.");
    } finally {
      setIsReportLoading(false);
    }
  };

  const [helperLogs, setHelperLogs] = useState<{ role: "user" | "bot"; text: string }[]>([]);
  const [helperInput, setHelperInput] = useState("");
  const [isHelperLoading, setIsHelperLoading] = useState(false);
  const helperScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    helperScrollRef.current?.scrollToEnd({ animated: true });
  }, [helperLogs]);

  const handleSendHelper = async () => {
    if (!helperInput.trim()) return;

    const userMsg = { role: "user" as const, text: helperInput };
    setHelperLogs((prev) => [...prev, userMsg]);
    setHelperInput("");
    setIsHelperLoading(true);

    const maxRetries = 3;
    let retryCount = 0;
    let retryDelay = 20000;
    const startTime = Date.now();

    while (retryCount < maxRetries) {
      try {
        if (retryCount > 0) {
          setHelperLogs((prev) => [
            ...prev,
            {
              role: "bot" as const,
              text: `요청 한도를 초과했습니다. ${retryDelay / 1000}초 후 재시도 중입니다... (${retryCount}/${maxRetries})`,
            },
          ]);
          await delay(retryDelay);
          retryDelay += 20000;
        }

        const response = await axios.post(
          "https://api.openai.com/v1/chat/completions",
          {
            model: "gpt-3.5-turbo",
            messages: [
              {
                role: "system",
                content:
                  "You are a helpful assistant for farming and plant care. Answer questions in Korean about growing plants and crops.",
              },
              { role: "user", content: helperInput },
            ],
            max_tokens: 150,
            temperature: 0.7,
          },
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer YOUR_OPENAI_API_KEY"
            }
          }
        );

        console.log("[SmartHelper] API 응답 성공:", {
          total_tokens: response.data.usage?.total_tokens,
          response_length: response.data.choices[0].message.content.length,
          response: response.data.choices[0].message.content,
        });

        const botReply = response.data.choices[0].message.content;
        const isTruncated = !/[.!?]$/.test(botReply.trim());
        if (isTruncated) {
          setHelperLogs((prev) => [
            ...prev,
            { role: "bot" as const, text: botReply },
            {
              role: "bot" as const,
              text: "응답이 길어져 일부가 생략되었습니다. 더 자세한 정보를 원하시면 질문을 나눠서 물어보세요.",
            },
          ]);
        } else {
          setHelperLogs((prev) => [
            ...prev,
            { role: "bot" as const, text: botReply },
          ]);
        }
        break;
      } catch (error: any) {
        if (error.response && error.response.status === 429) {
          retryCount++;
          console.warn(`[SmartHelper] 요청 한도 초과, 재시도 중... (${retryCount}/${maxRetries})`);
          if (retryCount === maxRetries) {
            const elapsedTime = Date.now() - startTime;
            const waitTime = 60000 - (elapsedTime % 60000);
            const waitSeconds = Math.ceil(waitTime / 1000);
            setHelperLogs((prev) => [
              ...prev,
              {
                role: "bot" as const,
                text: `죄송합니다. 요청 한도를 초과했습니다. ${waitSeconds}초 후 다시 시도해주세요. Open AI 계정의 Tier를 확인하거나, 다른 앱에서 동일한 API 키를 사용 중인지 확인해주세요.`,
              },
            ]);
          }
        } else {
          const errorMessage = error.response?.data?.error?.message || error.message;
          console.error("[SmartHelper] Open AI API 호출 오류:", errorMessage);
          setHelperLogs((prev) => [
            ...prev,
            { role: "bot" as const, text: `죄송합니다. 응답을 생성하는 중 오류가 발생했습니다. 오류 메시지: ${errorMessage}` },
          ]);
          break;
        }
      }
    }

    setIsHelperLoading(false);
  };

  return (
    <BottomTabBarLayout initialTab="main">
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#F5F7FA" />

        <View style={styles.header}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={styles.headerTitle}>{farmTitle}</Text>
            <Text style={{ fontSize: screenWidth * 0.04, color: "#FFFFFF", marginLeft: 8 }} />
          </View>
        </View>

        <ScrollView style={styles.content}>
          <View style={[styles.section, styles.sectionMargin]}>
            <Text style={styles.sectionTitle}>작물 성장도</Text>
            <Text
              style={{
                fontSize: screenWidth * 0.04,
                color: "#2E4A21",
                marginBottom: screenHeight * 0.015,
                textAlign: "center",
                fontWeight: "500",
                letterSpacing: 0.5,
              }}
            >
              내 작물: {farmTitle}
            </Text>

            <View style={styles.growthContainer}>
              <View style={styles.progressImageContainer}>
                <Image
                  source={stageImages[Math.min(Math.floor(growthRate / 25), 3)]}
                  style={[styles.plantImage, { width: screenWidth * 0.4, height: screenWidth * 0.4 }]}
                />
                <View style={[styles.circularProgressOverlay, { width: screenWidth * 0.4, height: screenWidth * 0.4 }]}>
                  <CircularProgress progress={growthRate} />
                </View>
              </View>

              <Text style={[styles.growthRateTextWithEmoji, { fontSize: screenWidth * 0.06 }]}>
                🌱 작물성장률 {growthRate}%
              </Text>

              <View style={styles.stageContainer}>
                <View style={styles.stageIndicators}>
                  {["씨앗", "새싹", "성장", "열매"].map((label, index) => (
                    <View key={index} style={styles.stageItem}>
                      <View
                        style={[
                          styles.stageDot,
                          growthRate >= index * 25 &&
                            growthRate < (index + 1) * 25 &&
                            styles.activeDot,
                        ]}
                      />
                      <Text
                        style={[
                          styles.stageLabel,
                          growthRate >= index * 25 &&
                            growthRate < (index + 1) * 25 &&
                            styles.activeLabel,
                          { fontSize: screenWidth * 0.035 },
                        ]}
                      >
                        {label}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.dateContainer}>
                <View style={styles.dateWrapper}>
                  <View style={styles.startDate}>
                    <Ionicons name="calendar-outline" size={screenWidth * 0.05} color="#059669" />
                    <Text
                      style={[styles.startDateText, { fontSize: screenWidth * 0.04 }]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      시작일: {isStarted && startDate ? startDate.slice(0, 10) : ""}
                    </Text>
                  </View>
                  <View style={styles.dDay}>
                    <Ionicons name="time-outline" size={screenWidth * 0.05} color="#059669" />
                    <Badge days={dDay} text={`D-DAY: ${dDay}일 남음`} />
                  </View>
                </View>
              </View>

              <View style={styles.buttonContainer}>
                {!isStarted && (
                  <TouchableOpacity style={styles.startButton} onPress={handleStart}>
                    <Text style={[styles.startButtonText, { fontSize: screenWidth * 0.04 }]}>
                      시작하기
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          <View style={[styles.section, styles.chatSection, styles.reportBlock]}>
            <Text style={styles.sectionTitle}>스마트팜 AI 일일 리포트</Text>

            {isListView ? (
              <>
                <View style={styles.reportHeader}>
                  <TouchableOpacity
                    style={[styles.generateButton, isReportLoading && styles.generateButtonDisabled]}
                    onPress={handleGenerateReport}
                    disabled={isReportLoading}
                  >
                    <Text style={styles.generateButtonText}>리포트 생성</Text>
                  </TouchableOpacity>

                  <View style={styles.datePickerContainer}>
                    <TextInput
                      style={styles.dateInput}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="#A0A0A0"
                      value={reportDate}
                      onChangeText={setReportDate}
                    />
                    <TouchableOpacity
                      style={[styles.searchButton, isReportLoading && styles.searchButtonDisabled]}
                      onPress={() => handleDateClick(reportDate)}
                      disabled={isReportLoading}
                    >
                      <Ionicons name="search" size={screenWidth * 0.045} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>

                {message && (
                  <Text style={[styles.reportMessage, { color: message.includes("오류") ? "#EF4444" : "#059669" }]}>
                    {message}
                  </Text>
                )}

                <ScrollView>
                  {reports.length === 0 && !isReportLoading && !message && (
                    <Text style={styles.reportMessage}>리포트가 없습니다.</Text>
                  )}
                  {reports.map((report, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => handleReportClick(report)}
                      style={[
                        styles.reportItem,
                        report.date === reportDate && {
                          borderWidth: 1,
                          borderColor: "#2E4A21",
                        },
                      ]}
                    >
                      <Text style={styles.reportDate}>날짜: {report.date}</Text>
                      <Text style={styles.reportContent} numberOfLines={2}>
                        {report.content}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {isReportLoading && (
                  <Text style={styles.reportMessage}>로딩 중...</Text>
                )}
              </>
            ) : (
              <View style={styles.fullScreenReportContainer}>
                <TouchableOpacity onPress={handleBackToList} style={styles.backButton}>
                  <Ionicons name="arrow-back" size={screenWidth * 0.06} color="#059669" />
                </TouchableOpacity>
                <Text style={styles.fullScreenReportDate}>날짜: {selectedReport?.date}</Text>
                <ScrollView style={styles.fullScreenReportContent}>
                  <Text style={styles.fullScreenReportText}>{selectedReport?.content}</Text>
                </ScrollView>
              </View>
            )}
          </View>

          <View style={[styles.section, styles.chatSection, styles.smartHelperBlock]}>
            <Text style={styles.sectionTitle}>스마트 농부 도우미</Text>

            <ScrollView
              ref={helperScrollRef}
              style={styles.chatMessages}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.chatMessagesContent}
            >
              {helperLogs.map((msg, idx) => {
                const date = new Date();
                const time = `${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`;
                return (
                  <View
                    key={idx}
                    style={[
                      styles.chatBubble,
                      msg.role === "user" ? styles.userBubble : styles.botBubble,
                    ]}
                  >
                    <Text style={styles.chatText}>{msg.text}</Text>
                    <Text style={styles.chatTime}>{time}</Text>
                    <View
                      style={[
                        styles.bubbleTail,
                        msg.role === "user"
                          ? styles.userBubbleTail
                          : styles.botBubbleTail,
                      ]}
                    />
                  </View>
                );
              })}
              {isHelperLoading && (
                <View style={styles.botBubble}>
                  <Text style={styles.chatText}>답변을 생성 중입니다...</Text>
                  <View style={styles.botBubbleTail} />
                </View>
              )}
            </ScrollView>

            <View style={styles.chatInputContainer}>
              <View style={styles.inputWrapper}>
                <Ionicons name="search" size={screenWidth * 0.05} color="#A0A0A0" style={styles.inputIcon} />
                <TextInput
                  style={styles.chatInput}
                  placeholder="농작물 관리 팁을 물어보세요! (예: 상추 키우는 방법)"
                  placeholderTextColor="#A0A0A0"
                  value={helperInput}
                  onChangeText={setHelperInput}
                />
              </View>
              <TouchableOpacity
                style={[styles.sendButton, isHelperLoading && styles.sendButtonDisabled]}
                onPress={handleSendHelper}
                disabled={isHelperLoading}
              >
                <Feather name="send" size={screenWidth * 0.045} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </BottomTabBarLayout>
  );
};

export default MainUI;

// ------------------------ Styles ------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA", 
  },
  header: {
    height: 60,
    backgroundColor: '#7EC87E',
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderBottomWidth: 0,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 1,
  },

  content: {
    flex: 1,
    padding: screenWidth * 0.04,
  },
  section: {
    marginBottom: screenHeight * 0.03,
  },
  sectionMargin: {
    marginBottom: screenHeight * 0.03,
  },
  sectionTitle: {
    fontSize: screenWidth * 0.05, 
    fontWeight: "800", 
    color: "#2E4A21", 
    marginBottom: screenHeight * 0.015,
    letterSpacing: 1, 
  },

  progressContainer: {
    height: screenHeight * 0.01,
    backgroundColor: "#D3E0D3", 
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 4,
  },

  growthContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: screenWidth * 0.04, 
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 10, 
    elevation: 8, 
    alignItems: "center",
  },
  progressImageContainer: {
    position: "relative",
    width: screenWidth * 0.4,
    height: screenWidth * 0.4,
    marginBottom: screenHeight * 0.02,
  },
  plantImage: {
    width: screenWidth * 0.4,
    height: screenWidth * 0.4,
    borderRadius: screenWidth * 0.2,
    backgroundColor: "#D1FAE5",
    position: "absolute",
  },
  circularProgressOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    width: screenWidth * 0.4,
    height: screenWidth * 0.4,
    justifyContent: "center",
    alignItems: "center",
  },
  circularProgressContainer: {
    position: "relative",
    width: screenWidth * 0.4,
    height: screenWidth * 0.4,
    justifyContent: "center",
    alignItems: "center",
  },
  circularProgressText: {
    position: "absolute",
    fontSize: screenWidth * 0.06,
    fontWeight: "bold",
    color: "#059669",
    textAlign: "center",
  },
  growthRateTextWithEmoji: {
    fontSize: screenWidth * 0.06,
    fontWeight: "700", 
    color: "#059669",
    marginTop: screenHeight * 0.01,
    textAlign: "center",
    letterSpacing: 0.5, 
  },
  growthRateText: {},
  stageContainer: {
    marginBottom: screenHeight * 0.02,
  },
  stageIndicators: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  stageItem: {
    alignItems: "center",
  },
  stageDot: {
    width: screenWidth * 0.03,
    height: screenWidth * 0.03,
    borderRadius: screenWidth * 0.015,
    backgroundColor: "#D3E0D3", 
    marginBottom: screenHeight * 0.005,
  },
  activeDot: {
    backgroundColor: "#059669",
  },
  stageLabel: {
    fontSize: screenWidth * 0.035,
    fontWeight: "500", 
    color: "#6B7280", 
  },
  activeLabel: {
    color: "#059669",
    fontWeight: "700", 
    letterSpacing: 0.5, 
  },
  dateContainer: {
    flexDirection: "column",
    alignItems: "center",
    width: "100%",
    marginBottom: screenHeight * 0.02,
  },
  dateWrapper: {
    flexDirection: "column",
    alignItems: "center",
  },
  startDate: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: screenHeight * 0.01,
  },
  startDateText: {
    fontSize: screenWidth * 0.04,
    fontWeight: "500", 
    color: "#1F2937",
    marginLeft: screenWidth * 0.015,
  },
  dDay: {
    flexDirection: "row",
    alignItems: "center",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "center",
    width: "100%",
  },
  startButton: {
    backgroundColor: "#7EC87E", 
    paddingVertical: screenHeight * 0.015,
    paddingHorizontal: screenWidth * 0.06,
    borderRadius: 12, 
    marginTop: screenHeight * 0.02,
    shadowColor: "#7EC87E", 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 5, 
    elevation: 5, 
  },
  startButtonText: {
    fontSize: screenWidth * 0.04,
    color: "#FFFFFF", 
    fontWeight: "700", 
    letterSpacing: 0.5, 
  },

  reportBlock: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 10, 
    elevation: 8, 
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: screenHeight * 0.03,
  },
  reportHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: screenHeight * 0.015,
  },
  generateButton: {
    backgroundColor: "#7EC87E", 
    paddingVertical: screenHeight * 0.012,
    paddingHorizontal: screenWidth * 0.05,
    borderRadius: 12, 
    shadowColor: "#7EC87E", 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 5, 
    elevation: 5, 
  },
  generateButtonDisabled: {
    backgroundColor: "#A0A0A0",
  },
  generateButtonText: {
    fontSize: screenWidth * 0.04,
    color: "#FFFFFF", 
    fontWeight: "700", 
    letterSpacing: 0.5, 
  },
  datePickerContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateInput: {
    backgroundColor: "transparent",
    borderBottomWidth: 1.5, 
    borderBottomColor: "#D3E0D3", 
    paddingHorizontal: screenWidth * 0.03,
    paddingVertical: screenHeight * 0.01,
    fontSize: screenWidth * 0.035,
    color: "#1F2937", 
    width: screenWidth * 0.3,
    borderRadius: 0, 
  },
  searchButton: {
    backgroundColor: "#7EC87E", 
    width: screenWidth * 0.1,
    height: screenWidth * 0.1,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: screenWidth * 0.02,
    shadowColor: "#7EC87E", 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 5, 
    elevation: 5, 
  },
  searchButtonDisabled: {
    backgroundColor: "#A0A0A0",
  },
  reportMessage: {
    fontSize: screenWidth * 0.035,
    fontWeight: "500", 
    marginBottom: screenHeight * 0.015,
    textAlign: "center",
  },
  reportItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: screenWidth * 0.03,
    marginBottom: screenHeight * 0.01,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 5,
    elevation: 5, 
  },
  reportDate: {
    fontSize: screenWidth * 0.04,
    fontWeight: "700", 
    color: "#2E4A21", 
    marginBottom: screenHeight * 0.005,
    letterSpacing: 0.5, 
  },
  reportContent: {
    fontSize: screenWidth * 0.035,
    fontWeight: "500", 
    color: "#1F2937",
  },
  fullScreenReportContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    padding: screenWidth * 0.03,
    marginTop: screenHeight * 0.015,
  },
  backButton: {
    marginBottom: screenHeight * 0.015,
  },
  fullScreenReportDate: {
    fontSize: screenWidth * 0.045,
    fontWeight: "700", 
    color: "#2E4A21", 
    marginBottom: screenHeight * 0.01,
    letterSpacing: 0.5, 
  },
  fullScreenReportContent: {
    flex: 1,
  },
  fullScreenReportText: {
    fontSize: screenWidth * 0.04,
    fontWeight: "500", 
    color: "#1F2937",
    lineHeight: screenHeight * 0.05,
  },

  chatSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: screenWidth * 0.04,
    marginBottom: screenHeight * 0.15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 10, 
    elevation: 8, 
  },
  smartHelperBlock: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 10, 
    elevation: 8, 
    backgroundColor: "#FFFFFF",
    marginBottom: screenHeight * 0.1,
  },
  chatMessages: {
    minHeight: screenHeight * 0.15,
    maxHeight: screenHeight * 0.45,
    marginBottom: screenHeight * 0.015,
    borderRadius: 8,
    backgroundColor: "#F5F7FA", 
    paddingHorizontal: screenWidth * 0.02,
    paddingVertical: screenHeight * 0.015,
  },
  chatMessagesContent: {
    paddingBottom: screenHeight * 0.01,
  },
  chatBubble: {
    marginBottom: screenHeight * 0.015,
    padding: screenWidth * 0.03,
    borderRadius: 16,
    maxWidth: "80%",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 5, 
    elevation: 5, 
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#10B981",
    borderTopRightRadius: 4,
  },
  botBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#D1FAE5",
    borderTopLeftRadius: 4,
  },
  chatText: {
    fontSize: screenWidth * 0.035,
    fontWeight: "500", 
    color: "#1F2937",
  },
  chatTime: {
    fontSize: screenWidth * 0.025,
    fontWeight: "500", 
    marginTop: screenHeight * 0.005,
    alignSelf: "flex-end",
  },
  bubbleTail: {
    position: "absolute",
    width: 0,
    height: 0,
    borderWidth: screenWidth * 0.02,
    borderStyle: "solid",
    bottom: -screenWidth * 0.02,
  },
  userBubbleTail: {
    right: screenWidth * 0.02,
    borderColor: "transparent transparent transparent #10B981",
  },
  botBubbleTail: {
    left: screenWidth * 0.02,
    borderColor: "transparent #D1FAE5 transparent transparent",
  },
  chatInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingHorizontal: screenWidth * 0.02,
    paddingVertical: screenHeight * 0.005,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 5, 
    elevation: 5, 
  },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
    borderBottomWidth: 1.5, 
    borderBottomColor: "#D3E0D3", 
    paddingHorizontal: screenWidth * 0.03,
    paddingVertical: screenHeight * 0.01,
    borderRadius: 0,
  },
  inputIcon: {
    marginRight: screenWidth * 0.02,
  },
  chatInput: {
    flex: 1,
    fontSize: screenWidth * 0.035,
    color: "#1F2937", 
  },
  sendButton: {
    backgroundColor: "#7EC87E", 
    width: screenWidth * 0.1,
    height: screenWidth * 0.1,
    borderRadius: screenWidth * 0.05,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: screenWidth * 0.02,
    shadowColor: "#7EC87E", 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 5, 
    elevation: 5, 
  },
  sendButtonDisabled: {
    backgroundColor: "#A0A0A0",
  },
  badge: {
    paddingHorizontal: screenWidth * 0.02,
    paddingVertical: screenHeight * 0.005,
    borderRadius: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 5, 
    elevation: 5, 
  },
  badgeText: {
    fontSize: screenWidth * 0.035,
    fontWeight: "500", 
  },
});

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}