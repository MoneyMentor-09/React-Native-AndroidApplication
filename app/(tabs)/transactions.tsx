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
import { Ionicons } from "@expo/vector-icons";
import { useState, useCallback } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/client";

/* Categories same as web */
const CATEGORIES = [
"Food",
"Transportation",
"Shopping",
"Entertainment",
"Bills & Utilities",
"Healthcare",
"Education",
"Travel",
"Groceries",
"Gas",
"Rent/Mortgage",
"Insurance",
"Salary",
"Freelance",
"Investment",
"Other"
];

export default function transactionsScreen(){

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
const [filterCategory,setFilterCategory] = useState("all");
const [selectedTransactions,setSelectedTransactions] = useState<string[]>([]);
const [editModalVisible,setEditModalVisible] = useState(false);
const [editingTransaction,setEditingTransaction] = useState<Transaction | null>(null);
const [editDescription,setEditDescription] = useState("");
const [editAmount,setEditAmount] = useState("");
const [editCategory,setEditCategory] = useState("");
const isSelectionMode = selectedTransactions.length > 0;
const [editType,setEditType] = useState<"income"|"expense">("expense");


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
useCallback(()=>{
fetchTransactions();
},[])
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

if(!editingTransaction) return;

try{

const supabase = getSupabaseBrowserClient();

let value = parseFloat(editAmount);

if(editType === "expense"){
value = -Math.abs(value);
}else{
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
.eq("id",editingTransaction.id);

setEditModalVisible(false);

fetchTransactions();

}catch(err){
console.log(err);
}

};

// Add missing delete handler
const handleDeleteTransaction = (transactionId: string) => {

Alert.alert(
"Delete Transaction",
"Are you sure you want to delete this transaction?",
[
{ text:"Cancel", style:"cancel" },
{
text:"Delete",
style:"destructive",
onPress: async () => {

try{

const supabase = getSupabaseBrowserClient();

const { error } = await supabase
.from("transactions")
.delete()
.eq("id", transactionId);

if(error) throw error;

fetchTransactions();

}catch(err){
console.log("Delete error",err);
}

}
}
]
);

};

const toggleSelectTransaction = (id:string)=>{
setSelectedTransactions(prev=>{
if(prev.includes(id)){
return prev.filter(tx => tx !== id);
}
return [...prev,id];
});
};

const deleteSelectedTransactions = () => {

Alert.alert(
"Delete Selected",
"Delete all selected transactions?",
[
{ text:"Cancel",style:"cancel"},
{
text:"Delete",
style:"destructive",
onPress: async () => {

try{

const supabase = getSupabaseBrowserClient();

await supabase
.from("transactions")
.delete()
.in("id",selectedTransactions);

setSelectedTransactions([]);

fetchTransactions();

}catch(err){
console.log(err);
}

}
}
]
);

};

{selectedTransactions.length > 0 && (

<View style={styles.multiDeleteContainer}>

<Pressable
style={styles.deleteSelectedButton}
onPress={deleteSelectedTransactions}
>
<Text style={{color:"#fff",fontWeight:"700"}}>
Delete Selected ({selectedTransactions.length})
</Text>
</Pressable>

</View>

)}

const renderTransaction = ({ item }: { item: Transaction }) => {

const selected = selectedTransactions.includes(item.id);

return(

<View style={styles.transactionRow}>

{/* CHECKBOX */}

<Pressable
onPress={()=>toggleSelectTransaction(item.id)}
style={[
styles.checkbox,
selected && styles.checkboxSelected
]}
>

{selected && (
<Ionicons name="checkmark" size={14} color="#fff" />
)}

</Pressable>

<View style={{flex:1}}>

<Text style={styles.txDescription}>
{item.description}
</Text>

<Text style={styles.txMeta}>
{new Date(item.date).toLocaleDateString()} • {item.category}
</Text>

</View>

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

</View>

</View>

);

};

return(

<TouchableWithoutFeedback
onPress={()=>{
setSelectedTransactions([]);
Keyboard.dismiss();
}}
>
<View style={styles.container}>


{/* SEARCH */}
<TouchableWithoutFeedback
onPress={()=>{
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

<View style={{flex:1,padding:20,backgroundColor:"#fff"}}>

<Text style={{fontSize:20,fontWeight:"700",marginBottom:20}}>
Edit Transaction
</Text>

<View style={styles.segment}>

<Pressable
style={[
styles.segmentButton,
editType==="expense" && styles.segmentActive
]}
onPress={()=>setEditType("expense")}
>
<Text style={[
styles.segmentText,
editType==="expense" && styles.segmentTextActive
]}>
Expense
</Text>
</Pressable>

<Pressable
style={[
styles.segmentButton,
editType==="income" && styles.segmentActive
]}
onPress={()=>setEditType("income")}
>
<Text style={[
styles.segmentText,
editType==="income" && styles.segmentTextActive
]}>

Income
</Text>
</Pressable>

</View>

<Text style={{marginTop:10,marginBottom:3,fontWeight:"600"}}>Description</Text>
<TextInput
value={editDescription}
onChangeText={setEditDescription}
placeholder="Description"
style={styles.search}
/>

<Text style={{marginTop:10,marginBottom:3,fontWeight:"600"}}>Amount</Text>
<TextInput
value={editAmount}
onChangeText={setEditAmount}
placeholder="Amount"
keyboardType="decimal-pad"
style={styles.search}
/>

<Text style={{marginTop:10,fontWeight:"600"}}>Category</Text>

<View style={styles.categoryContainer}>

{CATEGORIES.map((cat)=>{

const selected = editCategory === cat;

return(

<Pressable
key={cat}
onPress={()=>setEditCategory(cat)}
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
onPress={()=>setEditModalVisible(false)}
>
<Text style={styles.secondaryButtonText}>Cancel</Text>
</Pressable>

</View>

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

{isSelectionMode && (

<View style={styles.deleteBar}>

<Text style={styles.deleteText}>
{selectedTransactions.length} Selected
</Text>

<Pressable
style={styles.deleteSelectedButton}
onPress={deleteSelectedTransactions}
>
<Text style={{color:"#fff",fontWeight:"700"}}>
Delete Selected
</Text>
</Pressable>

</View>

)}


{/* ACTION BUTTONS */}

<Pressable
style={styles.primaryButton}
onPress={()=>router.push("/ReceiptCaptureScreen")}
>
<Text style={styles.primaryButtonText}>
Scan Receipt
</Text>
</Pressable>


<Pressable
style={styles.secondaryButton}
onPress={()=>router.push("/ManualTransactionScreen")}
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

transactionRow:{
flexDirection:"row",
justifyContent:"space-between",
alignItems:"center",
paddingVertical:14,
borderBottomWidth:1,
borderColor:"#F3F4F6"
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

checkbox:{
width:22,
height:22,
borderRadius:6,
borderWidth:2,
borderColor:"#CBD5F5",
alignItems:"center",
justifyContent:"center",
marginRight:10
},

checkboxSelected:{
backgroundColor:"#2563EB",
borderColor:"#2563EB"
},

multiDeleteContainer:{
position:"absolute",
bottom:20,
left:20,
right:20
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
}

});