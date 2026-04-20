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
import { useState, useCallback, useEffect } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/client";

/* Categories same as web */
const INCOME_CATEGORIES = [
  "Salary",
  "Freelance",
  "Investment",
  "Other Income"
];

const EXPENSE_CATEGORIES = [
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
  "Other Expense"
];

export default function TransactionsScreen(){

  type Transaction = {
  id: string;
  description: string;
  category: string;
  type: "income" | "expense";
  amount: number;
  date: string;
  user_id: string;
};

const [transactions,setTransactions] = useState([ ] as Transaction[]);
const [search,setSearch] = useState("");
const [filterType,setFilterType] = useState("all");
const [filterCategory] = useState("all");
const [selectedTransactions,setSelectedTransactions] = useState<string[]>([]);
const [editModalVisible,setEditModalVisible] = useState(false);
const [editingTransaction,setEditingTransaction] = useState<Transaction | null>(null);
const [editDescription,setEditDescription] = useState("");
const [editAmount,setEditAmount] = useState("");
const [editCategory,setEditCategory] = useState("");
const isSelectionMode = selectedTransactions.length > 0;
const [editType,setEditType] = useState<"income"|"expense">("expense");
const [deleteModalVisible, setDeleteModalVisible] = useState(false);
const [deleteMode, setDeleteMode] = useState<"single" | "bulk">("single");
const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

useEffect(() => {
  if (editType === "income") {
    setEditCategory("Income");
  } else {
    setEditCategory("");
  }
}, [editType]);



/* Fetch Transactions */
const fetchTransactions = async () => {
try {
const supabase = getSupabaseBrowserClient();
const { data, error } = await supabase.auth.getSession();
if (error) throw error;
const user = data.session?.user;
if (!user) return;

const { data: txData, error: txError } = await supabase
.from("transactions")
.select("*")
.eq("user_id", user.id)
.order("date", { ascending: false });

if (txError) throw txError;

setTransactions(
(txData || []).map(tx => ({
...tx,
type: tx.type?.toLowerCase(),
amount: Number(tx.amount),
}))
);

} catch (err) {
console.log("Fetch error", err);
}
};

    type Transaction = {
        id: string;
        description: string;
        category: string;
        type: "income" | "expense";
        amount: number;
        date: string;
        user_id: string;
    };

/* Refresh whenever screen opens */
useFocusEffect(
  useCallback(() => {
    fetchTransactions();

    return () => {
      setSelectedTransactions([]);
    };
  }, [])
);


    /* Fetch Transactions */
    const fetchTransactions = async () => {
        try {
            const supabase = getSupabaseBrowserClient();
            const { data, error } = await supabase.auth.getSession();
            if (error) throw error;
            const user = data.session?.user;
            if (!user) return;

            const { data: txData, error: txError } = await supabase
                .from("transactions")
                .select("*")
                .eq("user_id", user.id)
                .order("date", { ascending: false });

            if (txError) throw txError;

            setTransactions(
                (txData || []).map(tx => ({
                    ...tx,
                    type: tx.type?.toLowerCase(),
                    amount: Number(tx.amount),
                }))
            );

        } catch (err) {
            console.log("Fetch error", err);
        }
    };


    /* Refresh whenever screen opens */
    useFocusEffect(
        useCallback(() => {
            fetchTransactions();
        }, [])
    );


    /* Filtering Logic */
    const filteredTransactions = transactions.filter(tx => {
        const searchLower = search.toLowerCase();

setEditDescription(transaction.description);
setEditAmount(Math.abs(transaction.amount).toString());
if (transaction.type === "income") {
  setEditCategory(transaction.category || "Salary");
} else {
  setEditCategory(transaction.category || "Food & Dining");
}
setEditType(transaction.type);

        const matchType = filterType === "all" || tx.type === filterType;

        const matchCategory =
            filterCategory === "all" || (tx.category ?? "").toLowerCase() === filterCategory.toLowerCase();

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
        type: editType,
        category:
          editType === "income"
            ? editCategory || "Salary"
            : editCategory || "Other Expense"
      })
      .eq("id", editingTransaction.id);

    setEditModalVisible(false);
    fetchTransactions();

  } catch (err) {
    console.log(err);
  }
};

const confirmSingleDelete = (id: string) => {
  setPendingDeleteId(id);
  setDeleteMode("single");
  setDeleteModalVisible(true);
};

const confirmBulkDelete = () => {
  setDeleteMode("bulk");
  setDeleteModalVisible(true);
};

const executeDelete = async () => {
  try {
    const supabase = getSupabaseBrowserClient();

    if (deleteMode === "single" && pendingDeleteId) {
      await supabase
        .from("transactions")
        .delete()
        .eq("id", pendingDeleteId);
    }

    if (deleteMode === "bulk") {
      await supabase
        .from("transactions")
        .delete()
        .in("id", selectedTransactions);

      setSelectedTransactions([]);
    }

    fetchTransactions();
    setDeleteModalVisible(false);
    setPendingDeleteId(null);

  } catch (err) {
    console.log("Delete error", err);
  }
};

const toggleSelectTransaction = (id: string) => {
  setSelectedTransactions(prev => {
    if (prev.includes(id)) {
      return prev.filter(tx => tx !== id);
    }
    return [...prev, id];
  });
};

                            const supabase = getSupabaseBrowserClient();

const renderTransaction = ({ item }: { item: Transaction }) => {
  const selected = selectedTransactions.includes(item.id);

  return (
    <Pressable
  style={({ pressed }) => [
    styles.transactionRow,
    selected && styles.transactionRowSelected,
    pressed && styles.transactionRowPressed,
    ]}
      onPress={() => {
        if (isSelectionMode) {
          toggleSelectTransaction(item.id);
        } else {
          handleEditTransaction(item);
        }
      }}
          onLongPress={() => {
      if (!isSelectionMode) {
        toggleSelectTransaction(item.id);
      } else {
        toggleSelectTransaction(item.id);
      }
    }}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.txDescription}>
          {item.description}
        </Text>

        <Text style={styles.txMeta}>
          {new Date(item.date).toLocaleDateString()} • {item.category}
        </Text>
      </View>

      <Text style={[
        styles.amount,
        item.type === "income" ? styles.income : styles.expense
      ]}>
        {item.type === "income" ? "+" : "-"}
        ${Math.abs(item.amount).toFixed(2)}
      </Text>
    </Pressable>
  );
};

                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>

                    <Text style={[
                        styles.amount,
                        item.type === "income" ? styles.income : styles.expense
                    ]}>
                        {item.type === "income" ? "+" : "-"}${Math.abs(item.amount).toFixed(2)}
                    </Text>

                    <Pressable onPress={() => handleEditTransaction(item)}>
                        <Ionicons name="pencil-sharp" size={20} color="#2563EB" />
                    </Pressable>

                    <Pressable onPress={() => handleDeleteTransaction(item.id)}>
                        <Ionicons name="trash-sharp" size={20} color="#DC2626" />
                    </Pressable>

<Pressable
style={[
styles.filterButton,
filterType==="all" && styles.filterActive
]}
onPress={()=>setFilterType("all")}
>
<Text>All</Text>
</Pressable>

<Pressable
style={[
styles.filterButton,
filterType==="income" && styles.filterActive
]}
onPress={()=>setFilterType("income")}
>
<Text>Income</Text>
</Pressable>

<Pressable
style={[
styles.filterButton,
filterType==="expense" && styles.filterActive
]}
onPress={()=>setFilterType("expense")}
>
<Text>Expense</Text>
</Pressable>

</View>


<Modal visible={editModalVisible} animationType="slide">
  <View style={{ flex: 1, padding: 20, backgroundColor: "#fff" }}>

    {/* HEADER */}
    <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 20 }}>
      Edit Transaction
    </Text>

    {/* TYPE SWITCH */}
    <View style={styles.segment}>
      <Pressable
        style={[
          styles.segmentButton,
          editType === "expense" && styles.segmentActive
        ]}
        onPress={() => setEditType("expense")}
      >
        <Text
          style={[
            styles.segmentText,
            editType === "expense" && styles.segmentTextActive
          ]}
        >
          Expense
        </Text>
      </Pressable>

      <Pressable
        style={[
          styles.segmentButton,
          editType === "income" && styles.segmentActive
        ]}
        onPress={() => setEditType("income")}
      >
        <Text
          style={[
            styles.segmentText,
            editType === "income" && styles.segmentTextActive
          ]}
        >
          Income
        </Text>
      </Pressable>
    </View>

    {/* DESCRIPTION */}
    <Text style={{ marginTop: 10, marginBottom: 3, fontWeight: "600" }}>
      Description
    </Text>
    <TextInput
      value={editDescription}
      onChangeText={setEditDescription}
      placeholder="Description"
      style={styles.search}
    />

    {/* AMOUNT */}
    <Text style={{ marginTop: 10, marginBottom: 3, fontWeight: "600" }}>
      Amount
    </Text>
    <TextInput
      value={editAmount}
      onChangeText={setEditAmount}
      placeholder="Amount"
      keyboardType="decimal-pad"
      style={styles.search}
    />

    {/* CATEGORY (ONLY FOR EXPENSE) */}
{editType === "expense" ? (
  <>
    <Text style={{ marginTop: 10, fontWeight: "600" }}>
      Category
    </Text>

    <View style={styles.categoryContainer}>
      {EXPENSE_CATEGORIES.map((cat) => {
        const selected = editCategory === cat;

        return (
          <Pressable
            key={cat}
            onPress={() => setEditCategory(cat)}
            style={[
              styles.categoryChip,
              selected && styles.categoryChipSelected
            ]}
          >
            <Text
              style={[
                styles.categoryChipText,
                selected && styles.categoryChipTextSelected
              ]}
            >
              {cat}
            </Text>
          </Pressable>
        );
      })}
    </View>
  </>
) : (
  <>
    <Text style={{ marginTop: 10, fontWeight: "600" }}>
      Income Category
    </Text>

    <View style={styles.categoryContainer}>
      {INCOME_CATEGORIES.map((cat) => {
        const selected = editCategory === cat;

        return (
          <Pressable
            key={cat}
            onPress={() => setEditCategory(cat)}
            style={[
              styles.categoryChip,
              selected && styles.categoryChipSelected
            ]}
          >
            <Text
              style={[
                styles.categoryChipText,
                selected && styles.categoryChipTextSelected
              ]}
            >
              {cat}
            </Text>
          </Pressable>
        );
      })}
    </View>
  </>
)}

    {/* SAVE */}
    <Pressable
      style={styles.primaryButton}
      onPress={updateTransaction}
    >
      <Text style={styles.primaryButtonText}>
        Save Changes
      </Text>
    </Pressable>

    {/* CANCEL */}
    <Pressable
      style={styles.secondaryButton}
      onPress={() => setEditModalVisible(false)}
    >
      <Text style={styles.secondaryButtonText}>
        Cancel
      </Text>
    </Pressable>

    {/* DELETE */}
    <Pressable
      style={[
        styles.secondaryButton,
        { borderColor: "#DC2626" }
      ]}
      onPress={() => {
        if (editingTransaction) {
          setEditModalVisible(false);
          confirmSingleDelete(editingTransaction.id);
        }
      }}
    >
      <Text
        style={[
          styles.secondaryButtonText,
          { color: "#DC2626" }
        ]}
      >
        Delete Transaction
      </Text>
    </Pressable>

  </View>
</Modal>
<Modal
  visible={deleteModalVisible}
  transparent
  animationType="fade"
>
  <TouchableWithoutFeedback onPress={() => setDeleteModalVisible(false)}>
    <View style={styles.menuOverlay}>
      <View style={styles.menuBox}>

        <Text style={{
          fontSize: 16,
          fontWeight: "700",
          marginBottom: 12,
          textAlign: "center"
        }}>
          Confirm Delete
        </Text>

        <Text style={{
          fontSize: 14,
          color: "#6B7280",
          marginBottom: 16,
          textAlign: "center"
        }}>
          {deleteMode === "single"
            ? "Delete this transaction?"
            : `Delete ${selectedTransactions.length} transactions?`}
        </Text>

        <Pressable
          style={styles.menuItem}
          onPress={() => setDeleteModalVisible(false)}
        >
          <Text style={styles.menuText}>Cancel</Text>
        </Pressable>

        <Pressable
          style={styles.menuItem}
          onPress={executeDelete}
        >
          <Text style={[styles.menuText, { color: "#DC2626", fontWeight: "700" }]}>
            Delete
          </Text>
        </Pressable>

      </View>
    </View>
  </TouchableWithoutFeedback>
</Modal>

{/* TRANSACTION LIST */}

<FlatList
data={filteredTransactions}
renderItem={renderTransaction}
keyExtractor={(item)=>item.id}
contentContainerStyle={{paddingBottom:120}}
style={{width:"100%",marginTop:10}}
ListEmptyComponent={
<Text style={{textAlign:"center",marginTop:20,color:"#6B7280"}}>
No transactions found
</Text>
}
/>

        );

    };

    return (

<Pressable
style={styles.deleteSelectedButton}
onPress={confirmBulkDelete}>
<Text style={{color:"#fff",fontWeight:"700"}}>
Delete Selected
</Text>
</Pressable>


                {/* SEARCH */}
                <TouchableWithoutFeedback
                    onPress={() => {
                        setSelectedTransactions([]);
                        Keyboard.dismiss();
                    }}
                >
                    <View style={{ marginTop: 16 }}>

                        <TextInput
                            placeholder="Search transactions..."
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
                        <Text>All</Text>
                    </Pressable>

                    <Pressable
                        style={[
                            styles.filterButton,
                            filterType === "income" && styles.filterActive
                        ]}
                        onPress={() => setFilterType("income")}
                    >
                        <Text>Income</Text>
                    </Pressable>

                    <Pressable
                        style={[
                            styles.filterButton,
                            filterType === "expense" && styles.filterActive
                        ]}
                        onPress={() => setFilterType("expense")}
                    >
                        <Text>Expense</Text>
                    </Pressable>

                </View>


                <Modal visible={editModalVisible} animationType="slide">

                    <View style={{ flex: 1, padding: 20, backgroundColor: "#fff" }}>

                        <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 20 }}>
                            Edit Transaction
                        </Text>

                        <View style={styles.segment}>

                            <Pressable
                                style={[
                                    styles.segmentButton,
                                    editType === "expense" && styles.segmentActive
                                ]}
                                onPress={() => setEditType("expense")}
                            >
                                <Text style={[
                                    styles.segmentText,
                                    editType === "expense" && styles.segmentTextActive
                                ]}>
                                    Expense
                                </Text>
                            </Pressable>

                            <Pressable
                                style={[
                                    styles.segmentButton,
                                    editType === "income" && styles.segmentActive
                                ]}
                                onPress={() => setEditType("income")}
                            >
                                <Text style={[
                                    styles.segmentText,
                                    editType === "income" && styles.segmentTextActive
                                ]}>

                                    Income
                                </Text>
                            </Pressable>

                        </View>

                        <Text style={{ marginTop: 10, marginBottom: 3, fontWeight: "600" }}>Description</Text>
                        <TextInput
                            value={editDescription}
                            onChangeText={setEditDescription}
                            placeholder="Description"
                            style={styles.search}
                        />

                        <Text style={{ marginTop: 10, marginBottom: 3, fontWeight: "600" }}>Amount</Text>
                        <TextInput
                            value={editAmount}
                            onChangeText={setEditAmount}
                            placeholder="Amount"
                            keyboardType="decimal-pad"
                            style={styles.search}
                        />

                        <Text style={{ marginTop: 10, fontWeight: "600" }}>Category</Text>

                        <View style={styles.categoryContainer}>

                            {CATEGORIES.map((cat) => {

                                const selected = editCategory === cat;

                                return (

                                    <Pressable
                                        key={cat}
                                        onPress={() => setEditCategory(cat)}
                                        style={[
                                            styles.categoryChip,
                                            selected && styles.categoryChipSelected
                                        ]}
                                    >

                                        <Text style={[
                                            styles.categoryChipText,
                                            selected && styles.categoryChipTextSelected
                                        ]}>
                                            {cat}
                                        </Text>

                                    </Pressable>

                                );

                            })}

                        </View>

                        <Pressable
                            style={styles.primaryButton}
                            onPress={updateTransaction}
                        >
                            <Text style={styles.primaryButtonText}>Save Changes</Text>
                        </Pressable>

                        <Pressable
                            style={styles.secondaryButton}
                            onPress={() => setEditModalVisible(false)}
                        >
                            <Text style={styles.secondaryButtonText}>Cancel</Text>
                        </Pressable>

                    </View>

                </Modal>

                {/* TRANSACTION LIST */}

                <FlatList
                    data={filteredTransactions}
                    renderItem={renderTransaction}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ paddingBottom: 120 }}
                    style={{ width: "100%", marginTop: 10 }}
                    ListEmptyComponent={
                        <Text style={{ textAlign: "center", marginTop: 20, color: "#6B7280" }}>
                            No transactions found
                        </Text>
                    }
                />

                {isSelectionMode && (

                    <View style={styles.deleteBar}>

                        <Text style={styles.deleteText}>
                            {selectedTransactions.length} Selected
                        </Text>

                        <Pressable
                            style={styles.deleteSelectedButton}
                            onPress={deleteSelectedTransactions}
                        >
                            <Text style={{ color: "#fff", fontWeight: "700" }}>
                                Delete Selected
                            </Text>
                        </Pressable>

                    </View>

                )}


                {/* ACTION BUTTONS */}

                <Pressable
                    style={styles.primaryButton}
                    onPress={() => router.push("/ReceiptCaptureScreen")}
                >
                    <Text style={styles.primaryButtonText}>
                        Scan Receipt
                    </Text>
                </Pressable>


                <Pressable
                    style={styles.secondaryButton}
                    onPress={() => router.push("/ManualTransactionScreen")}
                >
                    <Text style={styles.secondaryButtonText}>
                        Add Manually
                    </Text>
                </Pressable>

            </View>

        </TouchableWithoutFeedback>
    );

}
/* Styles */

const styles = StyleSheet.create({

container:{
flex:1,
backgroundColor:"#FFFFFF",
alignItems:"center",
paddingHorizontal:15
},

iconWrap:{
width:88,
height:88,
borderRadius:24,
backgroundColor:"#EFF6FF",
alignItems:"center",
justifyContent:"center",
marginTop:30,
marginBottom:20
},

title:{
fontSize:28,
fontWeight:"800",
color:"#111827"
},

subtitle:{
marginTop:12,
fontSize:16,
lineHeight:22,
color:"#6B7280",
textAlign:"center",
maxWidth:320,
marginBottom:20
},

search:{
height: 44,
borderRadius: 12,
paddingHorizontal: 12,
paddingVertical: 8,
fontSize: 16,
textAlignVertical: "center", 
width:350,
borderWidth:1,
borderColor:"#E5E7EB",
marginBottom:12
},

filterRow:{
flexDirection:"row",
gap:8,
marginBottom:10
},

filterButton:{
paddingHorizontal:14,
paddingVertical:8,
borderRadius:10,
backgroundColor:"#F3F4F6"
},

filterActive:{
backgroundColor:"#84aafc"
},

transactionRow: {
  flexDirection: "row",
  alignItems: "center",
  paddingVertical: 14,
  paddingHorizontal: 14,
  borderRadius: 16,
  backgroundColor: "#FFFFFF",
  borderColor: "#E5E7EB",
  shadowColor: "#000",
  shadowOpacity: 0.02,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 2 },
  //elevation: 1,
},

transactionRowSelected: {
  backgroundColor: "#F8FAFF",
  borderColor: "#BFDBFE",
  borderLeftWidth: 4,
  borderRightWidth: 4,
  borderLeftColor: "#2563EB",
  borderRightColor: "#2563EB",
  elevation: 3,
  shadowColor: "#2563EB",
  shadowOpacity: 0.06,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
  transform: [{ scale: 1.01 }],
},

transactionRowPressed: {
  opacity: 0.92,
  transform: [{ scale: 0.995 }],
},

txDescription:{
fontWeight:"600",
fontSize:16
},

txMeta:{
fontSize:13,
color:"#6B7280"
},

amount:{
fontWeight:"700",
fontSize:16
},

income:{
color:"#16A34A"
},

expense:{
color:"#DC2626"
},

primaryButton:{
backgroundColor:"#2563EB",
paddingHorizontal:20,
paddingVertical:14,
borderRadius:14,
marginTop:14,
width:"100%"
},

primaryButtonText:{
color:"#FFFFFF",
fontSize:16,
fontWeight:"700",
textAlign:"center"
},

secondaryButton:{
marginTop:12,
borderWidth:2,
borderColor:"#2563EB",
paddingHorizontal:20,
paddingVertical:14,
borderRadius:14,
width:"100%"
},

secondaryButtonText:{
color:"#2563EB",
fontSize:16,
fontWeight:"700",
textAlign:"center"

},

deleteSelectedButton:{
backgroundColor:"#DC2626",
paddingHorizontal:18,
paddingVertical:10,
borderRadius:10,
alignItems:"center",
justifyContent:"center"
},

deleteBar:{
backgroundColor:"#FEF2F2",
borderRadius:12,
padding:14,
marginTop:10,
marginBottom:10,
flexDirection:"row",
alignItems:"center",
justifyContent:"space-between",
width:"100%"
},

deleteText:{
fontWeight:"400",
color:"#991B1B"
},

categoryContainer:{
flexDirection:"row",
flexWrap:"wrap",
gap:8,
marginTop:10
},

categoryChip:{
paddingHorizontal:12,
paddingVertical:8,
borderRadius:10,
backgroundColor:"#F3F4F6"
},

categoryChipSelected:{
backgroundColor:"#2563EB"
},

categoryChipText:{
fontSize:14,
color:"#374151"
},

categoryChipTextSelected:{
color:"#FFFFFF",
fontWeight:"600"
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
menuOverlay: {
  flex: 1,
  backgroundColor: "rgba(0,0,0,0.3)",
  justifyContent: "center",
  alignItems: "center",
},

menuBox: {
  width: 260,
  backgroundColor: "#FFFFFF",
  borderRadius: 14,
  paddingVertical: 10,
  elevation: 5,
  shadowColor: "#000",
  shadowOpacity: 0.15,
  shadowRadius: 10,
},

menuItem: {
  paddingVertical: 12,
  paddingHorizontal: 16,
  alignItems: "center",  
},

menuText: {
  fontSize: 16,
  fontWeight: "600",
  color: "#111827",
  borderWidth:2,
  borderColor:"#2563EB",
  borderRadius:14,
  paddingHorizontal:48,
  paddingVertical:10
}

});