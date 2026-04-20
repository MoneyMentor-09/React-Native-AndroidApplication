import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  getHelpResponse,
  QUICK_QUESTIONS,
  type ChatMessage,
} from "../lib/ai";

let messageIdCounter = 0;

function createId() {
  messageIdCounter += 1;
  return `chat-${Date.now()}-${messageIdCounter}`;
}

const starterMessage: ChatMessage = {
  id: "starter",
  role: "assistant",
  content:
    "Hi! I’m your MoneyMentor help assistant. Ask me about spending, income, budgets, savings, or recent transactions.",
};

export default function HelpChatWidget() {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([starterMessage]);

  const quickQuestions = useMemo(() => QUICK_QUESTIONS, []);

  const openChat = () => setVisible(true);
  const closeChat = () => setVisible(false);

  async function sendQuestion(rawQuestion: string) {
    const question = rawQuestion.trim();
    if (!question || loading) return;

    const userMessage: ChatMessage = {
      id: createId(),
      role: "user",
      content: question,
    };

    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);
    setInput("");

    try {
      const answer = await getHelpResponse(question);

      const assistantMessage: ChatMessage = {
        id: createId(),
        role: "assistant",
        content: answer,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const fallbackMessage: ChatMessage = {
        id: createId(),
        role: "assistant",
        content:
          error instanceof Error
            ? `I hit an error: ${error.message}`
            : "I hit an unexpected error while generating a response.",
      };

      setMessages((prev) => [...prev, fallbackMessage]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSendPress() {
    await sendQuestion(input);
  }

  function renderMessage({ item }: { item: ChatMessage }) {
    const isUser = item.role === "user";

    return (
      <View
        style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.assistantBubble,
        ]}
      >
        <Text style={[styles.messageText, isUser && styles.userMessageText]}>
          {item.content}
        </Text>
      </View>
    );
  }

  return (
    <>
      <Pressable
        onPress={openChat}
        style={styles.fab}
        accessibilityRole="button"
        accessibilityLabel="Open help chat"
      >
        <Ionicons name="chatbubble-ellipses" size={20} color="#FFFFFF" />
      </Pressable>

      <Modal
        visible={visible}
        animationType="slide"
        transparent
        onRequestClose={closeChat}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable style={styles.backdrop} onPress={closeChat} />

          <SafeAreaView style={styles.chatPanel}>
            <View style={styles.header}>
              <View>
                <Text style={styles.headerTitle}>Help Assistant</Text>
                <Text style={styles.headerSubtitle}>
                  Personalized budgeting help and money insights
                </Text>
              </View>

              <Pressable
                onPress={closeChat}
                style={styles.closeButton}
                accessibilityRole="button"
                accessibilityLabel="Close help chat"
              >
                <Ionicons name="close" size={22} color="#111827" />
              </Pressable>
            </View>

            <FlatList
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={renderMessage}
              contentContainerStyle={styles.messagesList}
              ListHeaderComponent={
                <View style={styles.quickQuestionsSection}>
                  <Text style={styles.quickQuestionsTitle}>
                    Try a question:
                  </Text>

                  <View style={styles.quickQuestionsWrap}>
                    {quickQuestions.map((question) => (
                      <Pressable
                        key={question.id}
                        style={styles.quickChip}
                        onPress={() => sendQuestion(question.prompt)}
                        disabled={loading}
                      >
                        <Text style={styles.quickChipText}>
                          {question.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              }
            />

            {loading && (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" />
                <Text style={styles.loadingText}>Loading response...</Text>
              </View>
            )}

            <View style={styles.inputRow}>
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="Ask about your budget, spending, or savings..."
                placeholderTextColor="#9CA3AF"
                style={styles.textInput}
                editable={!loading}
                returnKeyType="send"
                onSubmitEditing={handleSendPress}
              />

              <Pressable
                onPress={handleSendPress}
                style={[
                  styles.sendButton,
                  (!input.trim() || loading) && styles.sendButtonDisabled,
                ]}
                disabled={!input.trim() || loading}
                accessibilityRole="button"
                accessibilityLabel="Send message"
              >
                <Ionicons name="send" size={18} color="#FFFFFF" />
              </Pressable>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 18,
    bottom: 96,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  chatPanel: {
    height: "78%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  closeButton: {
    padding: 8,
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
  },
  quickQuestionsSection: {
    marginBottom: 12,
  },
  quickQuestionsTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 10,
  },
  quickQuestionsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  quickChip: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  quickChipText: {
    color: "#1D4ED8",
    fontWeight: "600",
    fontSize: 12,
  },
  messagesList: {
    paddingVertical: 8,
    gap: 10,
    flexGrow: 1,
  },
  messageBubble: {
    maxWidth: "82%",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    marginBottom: 10,
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#2563EB",
  },
  assistantBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#F3F4F6",
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#111827",
  },
  userMessageText: {
    color: "#FFFFFF",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    paddingHorizontal: 4,
    paddingTop: 8,
  },
  loadingText: {
    color: "#6B7280",
    fontSize: 13,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 12,
    marginTop: 8,
  },
  textInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
