import {
    View,
    Text,
    StyleSheet,
    Pressable,
    FlatList,
    TextInput,
    Alert,
    Modal,
    TouchableWithoutFeedback,
    Keyboard
} from "react-native";

import { router, useFocusEffect } from "expo-router";
import { AntDesign, Feather, FontAwesome5 } from "@expo/vector-icons";
import { useState, useCallback } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/client";
import {
    analyzeSuspiciousTransactions,
    Transaction as Tx,
} from "@/lib/transactions/suspicious"


/* Categories same as web */
const CATEGORIES = [
    "Food & Dining",
    "Transportation",
    "Shopping",
    "Entertainment",
    "Bills & Utilities",
    "Healthcare",
    "Education",
    "Travel",
    "Groceries",
    "Gas",
    "Rent",
    "Insurance",
    "Salary",
    "Freelance",
    "Investment",
    "Other"
];

export default function AlertsScreen() {

    type Transaction = {
        id: string;
        description: string;
        category: string;
        type: "income" | "expense";
        amount: number;
        date: string;
        user_id: string;
    };

    type AlertMM = {
        id: string
        user_id: string
        message: string
        risk_score: number
        timestamp: string
        read: boolean
        type: "fraud" | "unusual_spending" | "budget_warning" | "low_balance"
        transaction_id?: string | null
        suspicious_pattern_id?: string | null
    };

    type DismissedRow = { pattern_id: string };

    const [transactions, setTransactions] = useState([] as Transaction[]);
    const [search, setSearch] = useState("");
    const [filterType, setFilterType] = useState("all");
    const [filterCategory] = useState("all");
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [editDescription, setEditDescription] = useState("");
    const [editAmount, setEditAmount] = useState("");
    const [editCategory, setEditCategory] = useState("");
    const [editType, setEditType] = useState<"income" | "expense">("expense");

    const [alerts, setAlerts] = useState([] as AlertMM[]);

    const unreadCount = alerts.filter((a) => !a.read).length
    const alertCount = alerts.length
    const highRiskCount = alerts.filter((a) => a.risk_score > 70).length
    const budgetCount = alerts.filter((a) => a.type === "budget_warning").length

    const fetchAlerts = async () => {
        try {
            const supabase = getSupabaseBrowserClient();
            const {
                data: { user },
            } = await supabase.auth.getUser()

            if (!user) return;

            // 1) Load dismissed suspicious patterns for this user
            const { data: dismissedData, error: dismissedError } = await supabase
                .from("dismissed_suspicious_alerts")
                .select("pattern_id")
                .eq("user_id", user.id)

            if (dismissedError) throw dismissedError;

            const dismissedSet = new Set(
                (dismissedData || []).map((d: DismissedRow) => d.pattern_id),
            );

            // 2) Load recent transactions (e.g., last 90 days)
            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
            const cutoff = ninetyDaysAgo.toISOString().split("T")[0]; // YYYY-MM-DD

            const { data: txData, error: txError } = await supabase
                .from("transactions")
                .select("*")
                .eq("user_id", user.id)
                .gte("date", cutoff)
                .order("date", { ascending: false })

            if (txError) throw txError;

            const txs = (txData || []) as Tx[];

            // 3) Run suspicious analysis
            const suspicious = analyzeSuspiciousTransactions(txs, {
                highAmountThreshold: 1000,
                smallAmountThreshold: 10,
                manySmallCountThreshold: 5,
            });

            // 4) Filter out patterns the user has dismissed
            const toInsert = suspicious.filter((s) => !dismissedSet.has(s.id));

            // 5) Upsert suspicious alerts into alerts table
            if (toInsert.length > 0) {
                const rows = toInsert.map((s) => {
                    const firstTx = s.transactions[0];
                    return {
                        user_id: user.id,
                        message: s.message,
                        risk_score: s.riskScore,
                        type: s.rule === "high-amount" ? "fraud" : "unusual_spending",
                        timestamp: firstTx?.date
                            ? new Date(firstTx.date).toISOString()
                            : new Date().toISOString(),
                        suspicious_pattern_id: s.id,
                        transaction_id: firstTx?.id ?? null,
                    }
                });

                const { error: upsertError } = await supabase
                    .from("alerts")
                    .upsert(rows, {
                        onConflict: "user_id,suspicious_pattern_id",
                    });

                if (upsertError) throw upsertError;
            }

            // 6) Finally, load all alerts from DB
            const { data: alertData, error: alertError } = await supabase
                .from("alerts")
                .select("*")
                .eq("user_id", user.id)
                .order("timestamp", { ascending: false })

            if (alertError) throw alertError;

            setAlerts(
                (alertData || []).map(al => ({
                    ...al,
                    type: al.type?.toLowerCase(),
                }))
            );
        } catch (error) {
            console.error(error)
        }
    }

    


    /* Refresh whenever screen opens */
    useFocusEffect(
        useCallback(() => {
            fetchAlerts();
        }, [])
    );


    /* Filtering Logic */
    const filteredTransactions = transactions.filter(tx => {
        const searchLower = search.toLowerCase();

        const matchSearch =
            searchLower === "" ||
            tx.description.toLowerCase().includes(searchLower) ||
            (tx.category?.toLowerCase().includes(searchLower) ?? false);

        const matchType = filterType === "all" || tx.type === filterType;

        const matchCategory =
            filterCategory === "all" || (tx.category ?? "").toLowerCase() === filterCategory.toLowerCase();

        return matchSearch && matchType && matchCategory;
    });

    const filteredAlerts = alerts
        .filter((alert) => {
            switch (filterType) {
                case "unread":
                    return !alert.read
                case "fraud":
                    return alert.type === "fraud" || alert.risk_score > 70
                case "budget":
                    return alert.type === "budget_warning"
                default:
                    return alert
            }
        })
        .sort((a, b) => {
            // unread first
            if (a.read === b.read) {
                return (
                    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                )
            }
            return a.read ? 1 : -1
        })


    /* Transaction Row */

    const handleEditTransaction = (transaction: Transaction) => {

        setEditingTransaction(transaction);

        setEditDescription(transaction.description);
        setEditAmount(Math.abs(transaction.amount).toString());
        setEditCategory(transaction.category);
        setEditType(transaction.type);

        setEditModalVisible(true);

    };

    const updateTransaction = async () => {

        if (!editingTransaction) return;

        try {

            const supabase = getSupabaseBrowserClient();

            let value = Number.parseFloat(editAmount);

            if (editType === "expense") {
                value = -Math.abs(value);
            } else {
                value = Math.abs(value);
            }

            await supabase
                .from("transactions")
                .update({
                    description: editDescription,
                    amount: value,
                    category: editCategory,
                    type: editType
                })
                .eq("id", editingTransaction.id);

            setEditModalVisible(false);

        } catch (err) {
            console.log(err);
        }

    };

    // Add read handler
    const handleReadAlert = async(alertId: string) => {

        try {

            const supabase = getSupabaseBrowserClient();

            const { error } = await supabase
                .from("alerts")
                .update({ read: true })
                .eq("id", alertId);

            if (error) throw error;

            fetchAlerts();

        } catch (err) {
            console.log("Read alert error", err);
        }
    };

    // Read all handler
    const handleReadAllAlerts = async () => {

        try {

            const supabase = getSupabaseBrowserClient();

            const {
                data: { user },
            } = await supabase.auth.getUser()

            if (!user) return;

            const { error } = await supabase
                .from("alerts")
                .update({ read: true })
                .eq("user_id", user.id);

            if (error) throw error;

            fetchAlerts();

        } catch (err) {
            console.log("Read all alerts error", err);
        }
    };

    // Add delete handler
    const handleDeleteAlert = (alertId: string) => {

        Alert.alert(
            "Delete Alert",
            "Are you sure you want to delete this alert? This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {

                        try {
                            const supabase = getSupabaseBrowserClient()

                            const alertToDelete = alerts.find((a) => a.id === alertId)

                            // If this alert came from a suspicious pattern, remember that dismissal
                            if (alertToDelete?.suspicious_pattern_id) {
                                const {
                                    data: { user },
                                } = await supabase.auth.getUser()
                                if (user) {
                                    await supabase.from("dismissed_suspicious_alerts").upsert({
                                        user_id: user.id,
                                        pattern_id: alertToDelete.suspicious_pattern_id,
                                    })
                                }
                            }

                            const { error } = await supabase.from("alerts").delete().eq("id", alertId);

                            if (error) throw error;

                            fetchAlerts();

                            setAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
                        } catch (error) {
                            console.error(error);
                        }
                    }
                }
            ]
        );

    };

    // Add go to transactions handler
    const handleGoToTransactions = (alertId: string) => {
        router.push("/(tabs)/transactions")
    }

    const renderAlert = ({ item }: { item: AlertMM }) => {

        return (

            <View style={[styles.alertRow, item.type === "fraud" || item.risk_score > 70 ? styles.alertRowHighRisk 
                : item.risk_score > 30 ? styles.alertRowMediumRisk : styles.alertRowLowRisk, !item.read ? styles.alertRowUnread : null]}>

                <View style={{ flex: 1 }}>

                    <Text style={styles.txDescription}>
                        {item.message}
                    </Text>

                    <Text style={styles.txMeta}>
                        {new Date(item.timestamp).toLocaleDateString()} • Risk Score: {item.risk_score}%
                    </Text>

                </View>

                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>

                    <Text style={[
                        styles.amount,
                        styles.highRisk
                    ]}>
                        {item.risk_score > 70 ? "High Risk" : ""}
                    </Text>

                    {/* Render checkmark only when the alert is unread */}
                    {!item.read && (
                        <Pressable onPress={() => handleReadAlert(item.id)}>
                            <AntDesign name="check-circle" size={27} color="#000000" />
                        </Pressable>
                    )}

                    <Pressable onPress={() => handleGoToTransactions(item.id)}>
                        <FontAwesome5 name="location-arrow" size={27} color="#000000" />
                    </Pressable>

                    <Pressable onPress={() => handleDeleteAlert(item.id)}>
                        <Feather name="x-circle" size={30} color="#000000" />
                    </Pressable>

                </View>

            </View>

        );

    };

    const getAlertColor = (type: string, riskScore: number) => {
        if (type === "fraud" || riskScore > 70) {
            return "#ff8080"
        } else if (riskScore > 30) {
            return "#ffb080"
        } else {
            return "#ffff80"
        }
    }

    return (

        <TouchableWithoutFeedback
            onPress={() => {
                Keyboard.dismiss();
            }}
        >
            <View style={styles.container}>


                {/* ALERT STATISTICS */}
                <Text style={{ fontSize: 18, fontWeight: "600", marginTop: 20 }}></Text>
                <View style={styles.filterRow}>
                    <View style={styles.infoChip}>
                        <Text style={styles.largeNumber}>{unreadCount}</Text>
                        <Text>Unread Alerts</Text>
                    </View>
                    <View style={styles.infoChip}>
                        <Text style={styles.largeNumber}>{highRiskCount}</Text>
                        <Text>High Risk Alerts</Text>
                    </View>
                    <View style={styles.infoChip}>
                        <Text style={styles.largeNumber}>{alertCount}</Text>
                        <Text>Total Alerts</Text>
                    </View>
                </View>

                {/* SEARCH */}
                <TouchableWithoutFeedback
                    onPress={() => {
                        setSelectedTransactions([]);
                        Keyboard.dismiss();
                    }}
                >
                    <View style={{ marginTop: 0 }}>

                        <TextInput
                            placeholder="Search alerts..."
                            style={styles.search}
                            value={search}
                            onChangeText={setSearch}
                        />
                    </View>

                </TouchableWithoutFeedback>

                {/* FILTER TYPE */}

                <View style={styles.filterRow}>

                    <Pressable
                        style={[
                            styles.filterButton,
                            filterType === "all" && styles.filterActive
                        ]}
                        onPress={() => setFilterType("all")}
                    >
                        <Text>All ({alertCount})</Text>
                    </Pressable>

                    <Pressable
                        style={[
                            styles.filterButton,
                            filterType === "unread" && styles.filterActive
                        ]}
                        onPress={() => setFilterType("unread")}
                    >
                        <Text>Unread ({unreadCount})</Text>
                    </Pressable>

                    <Pressable
                        style={[
                            styles.filterButton,
                            filterType === "fraud" && styles.filterActive
                        ]}
                        onPress={() => setFilterType("fraud")}
                    >
                        <Text>Fraud ({highRiskCount})</Text>
                    </Pressable>

                    <Pressable
                        style={[
                            styles.filterButton,
                            filterType === "budget" && styles.filterActive
                        ]}
                        onPress={() => setFilterType("budget")}
                    >
                        <Text>Budget ({budgetCount})</Text>
                    </Pressable>

                </View>

                {/* ALERT LIST */}

                <FlatList
                    data={filteredAlerts}
                    renderItem={renderAlert}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ paddingBottom: 120 }}
                    style={{ width: "100%", marginTop: 10 }}
                    ItemSeparatorComponent={() => <View style={{ height: 5 }} />}
                    ListEmptyComponent={
                        <Text style={{ textAlign: "center", marginTop: 20, color: "#6B7280" }}>
                            No alerts found
                        </Text>
                    }
                />

                {/* ACTION BUTTONS */}

                {/* Render only if there are unread alerts */}
                {unreadCount > 0 && (
                    <Pressable
                        style={styles.secondaryButton}
                        onPress={() => handleReadAllAlerts()}
                    >
                        <Text style={styles.secondaryButtonText}>
                            Mark All as Read
                        </Text>
                    </Pressable>
                )}

            </View>

        </TouchableWithoutFeedback>
    );

}



/* Styles */

const styles = StyleSheet.create({

    container: {
        flex: 1,
        backgroundColor: "#FFFFFF",
        alignItems: "center",
        paddingHorizontal: 15
    },

    iconWrap: {
        width: 88,
        height: 88,
        borderRadius: 24,
        backgroundColor: "#EFF6FF",
        alignItems: "center",
        justifyContent: "center",
        marginTop: 30,
        marginBottom: 20
    },

    title: {
        fontSize: 28,
        fontWeight: "800",
        color: "#111827"
    },

    subtitle: {
        marginTop: 12,
        fontSize: 16,
        lineHeight: 22,
        color: "#6B7280",
        textAlign: "center",
        maxWidth: 320,
        marginBottom: 20
    },

    search: {
        height: 44,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontSize: 16,
        textAlignVertical: "center",
        width: 350,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        marginBottom: 12
    },

    filterRow: {
        flexDirection: "row",
        gap: 8,
        marginBottom: 10
    },

    filterButton: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: "#F3F4F6"
    },

    filterActive: {
        backgroundColor: "#84aafc"
    },

    alertRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderRadius: 12,
        backgroundColor: "#f0f0f0"
    },

    alertRowUnread: {
        borderLeftWidth: 3,
        borderColor: "#2563EB"
    },

    alertRowHighRisk: {
        backgroundColor: "#ffc0c0"
    },

    alertRowMediumRisk: {
        backgroundColor: "#ffe0c0"
    },

    alertRowLowRisk: {
        backgroundColor: "#ffffc0"
    },

    txDescription: {
        fontWeight: "600",
        fontSize: 16
    },

    txMeta: {
        fontSize: 13,
        color: "#6B7280"
    },

    amount: {
        fontWeight: "700",
        fontSize: 16
    },

    primaryButton: {
        backgroundColor: "#2563EB",
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderRadius: 14,
        marginTop: 14,
        width: "100%"
    },

    primaryButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "700",
        textAlign: "center"
    },

    secondaryButton: {
        marginTop: 12,
        borderWidth: 2,
        borderColor: "#2563EB",
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderRadius: 14,
        width: "100%"
    },

    secondaryButtonText: {
        color: "#2563EB",
        fontSize: 16,
        fontWeight: "700",
        textAlign: "center"

    },

    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: "#CBD5F5",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 10
    },

    checkboxSelected: {
        backgroundColor: "#2563EB",
        borderColor: "#2563EB"
    },

    multiDeleteContainer: {
        position: "absolute",
        bottom: 20,
        left: 20,
        right: 20
    },

    deleteSelectedButton: {
        backgroundColor: "#DC2626",
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center"
    },

    deleteBar: {
        backgroundColor: "#FEF2F2",
        borderRadius: 12,
        padding: 14,
        marginTop: 10,
        marginBottom: 10,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%"
    },

    deleteText: {
        fontWeight: "400",
        color: "#991B1B"
    },

    categoryContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginTop: 10
    },

    categoryChip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: "#F3F4F6"
    },

    categoryChipSelected: {
        backgroundColor: "#2563EB"
    },

    categoryChipText: {
        fontSize: 14,
        color: "#374151"
    },

    categoryChipTextSelected: {
        color: "#FFFFFF",
        fontWeight: "600"
    },

    segmentButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: "#F3F4F6",
        alignItems: "center",
        marginHorizontal: 4
    },
    segmentActive: {
        backgroundColor: "#2563EB"
    },
    segmentText: {
        fontSize: 16,
        color: "#374151"
    },
    segmentTextActive: {
        color: "#FFFFFF",
        fontWeight: "700"
    },
    segment: {
        flexDirection: "row",
        gap: 8,
        marginVertical: 16
    },
    infoChip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: "#F3F4F6"
    },
    largeNumber: {
        fontSize: 36,
        fontWeight: "bold",
        textAlign: "center",
        color: "#000"
    },
    highRisk: {
        fontWeight: "bold",
        color: "#DC2626",
    }
});