import { AppButton } from "@/components/app-button";
import { SaveStatus } from "@/components/plan/save-status";
import { palette, ui } from "@/constants/design";
import { usePlan } from "@/context/plan-context";
import { CSV_MAX_BYTES, detectMapping, parseCsv, previewCsv, type CsvMapping, type CsvTable } from "@/lib/activity-csv";
import { formatCurrency } from "@/lib/format";
import * as DocumentPicker from "expo-document-picker";
import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function ColumnChoice({ label, value, headers, onChange }: { label:string; value:number; headers:string[]; onChange:(value:number)=>void }) {
  const [open,setOpen] = useState(false);
  return <View style={styles.field}>
    <Text style={ui.label}>{label}</Text>
    <AppButton title={value < 0 ? "Not used" : `${value+1}. ${headers[value] || "Unnamed column"}`} variant="secondary" onPress={()=>setOpen(!open)} />
    {open && <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.options}>
      {[-1,...headers.map((_,index)=>index)].map(index=><Pressable key={index} accessibilityRole="radio"
        accessibilityLabel={`${label}: ${index < 0 ? "Not used" : headers[index]}`}
        accessibilityState={{checked:value===index}} onPress={()=>{onChange(index);setOpen(false);}}
        style={[styles.option,value===index && {backgroundColor:palette.soft}]}>
        <Text style={ui.body}>{index < 0 ? "Not used" : `${index+1}. ${headers[index] || "Unnamed column"}`}</Text>
      </Pressable>)}
    </View>}
  </View>;
}

export function CsvImport({onClose,onSaved}:{onClose:()=>void;onSaved:(message:string)=>void}) {
  const {purchases,balance,saveState,validationError,supportsCsvImport,importActivity} = usePlan();
  const insets=useSafeAreaInsets();
  const [table,setTable]=useState<CsvTable|null>(null);
  const [name,setName]=useState("");
  const [mapping,setMapping]=useState<CsvMapping|null>(null);
  const [positivePurchases,setPositivePurchases]=useState(false);
  const [dayFirst,setDayFirst]=useState(false);
  const [split,setSplit]=useState(false);
  const [review,setReview]=useState(false);
  const [showMapping,setShowMapping]=useState(false);
  const [error,setError]=useState("");
  const [reading,setReading]=useState(false);
  const [pending,setPending]=useState(0);
  const [visible,setVisible]=useState(20);
  const started=useRef(false),submitted=useRef(false);
  const result=table && mapping ? previewCsv(table,{...mapping,...(split?{amount:-1}:{})},purchases,positivePurchases,dayFirst):null;
  const busy=pending>0;
  useEffect(()=>{
    if(!pending)return;
    if(saveState!=="saved")started.current=true;
    else if(started.current)onSaved(`Imported ${pending} ${pending===1?"transaction":"transactions"}`);
  },[pending,saveState,onSaved]);
  function close(){if(!busy || saveState==="error")onClose();}
  async function choose(){
    setError("");
    try {
      const picked=await DocumentPicker.getDocumentAsync({type:["text/csv","text/tab-separated-values","text/comma-separated-values","application/csv","text/plain","application/vnd.ms-excel"],multiple:false,copyToCacheDirectory:true,base64:false});
      if(picked.canceled)return;
      setReading(true);
      const asset=picked.assets[0];
      if(!/\.(csv|tsv)$/i.test(asset.name))throw new Error("Choose a .csv or .tsv file.");
      if((asset.size ?? 0)>CSV_MAX_BYTES)throw new Error("Choose a CSV smaller than 1 MB.");
      const text=Platform.OS==="web" ? await (asset.file ? asset.file.text() : (await fetch(asset.uri)).text())
        : await new (await import("expo-file-system")).File(asset.uri).text();
      const parsed=parseCsv(text), detected=detectMapping(parsed.headers);
      setTable(parsed);setMapping(detected);setName(asset.name);setReview(false);setVisible(20);
      setSplit(detected.amount<0 && detected.debit>=0 && detected.credit>=0);
      setShowMapping(detected.date<0 || (detected.amount<0 && (detected.debit<0 || detected.credit<0)));
    }catch(failure){setError(failure instanceof Error?failure.message:"Unable to read this file. Try a CSV export.");}
    finally{setReading(false);}
  }
  function submit(){
    if(submitted.current || !result || result.errors.length || !result.entries.length || saveState!=="saved")return;
    try{importActivity(result.entries);submitted.current=true;setPending(result.entries.length);}
    catch(failure){setError(failure instanceof Error?failure.message:"Unable to import activity.");}
  }
  return <Modal transparent visible animationType="slide" onRequestClose={close} statusBarTranslucent navigationBarTranslucent>
    <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS==="ios"?"padding":undefined}>
      <Pressable accessible={false} onPress={close} style={styles.backdrop}/>
      <View accessibilityViewIsModal role="dialog" aria-label="Import CSV" style={[styles.sheet,{marginTop:insets.top+16}]}>
        <View style={styles.header}><Text accessibilityRole="header" style={ui.sectionTitle}>{review?"Review import":"Import CSV"}</Text>
          <AppButton title="Close" variant="text" disabled={busy && saveState!=="error"} onPress={close}/></View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content,{paddingBottom:Math.max(insets.bottom,20)}]}>
          <Text style={ui.body}>Add past purchases and income to Activity. Your current balance and savings stay unchanged.</Text>
          {!table && <View style={ui.card}>
            <Text style={ui.sectionTitle}>Bring your history with you</Text>
            <Text style={ui.body}>Choose a CSV export with a date, description, and amount. Files with separate debit and credit columns also work.</Text>
            <Text style={styles.caption}>Example headers: Date, Description, Amount, Type. Use purchase/income or debit/credit for Type. Up to 1 MB and 1,000 rows per import.</Text>
          </View>}
          {!busy && <AppButton title={reading?"Reading file…":table?"Choose another file":"Choose CSV file"} variant="secondary" onPress={()=>void choose()} disabled={reading}/>}
          {!!name && <Text style={styles.caption}>{name} · {table?.rows.length} rows</Text>}
          {table && mapping && !review && <>
            <View style={ui.card}>
              <Text style={ui.sectionTitle}>Check how your file is read</Text>
              <AppButton title={showMapping?"Hide column matching":"Column matching"} variant="text" onPress={()=>setShowMapping(!showMapping)}/>
              {showMapping && <>
                <ColumnChoice label="Date column" headers={table.headers} value={mapping.date} onChange={value=>setMapping({...mapping,date:value})}/>
                <ColumnChoice label="Description column" headers={table.headers} value={mapping.description} onChange={value=>setMapping({...mapping,description:value})}/>
                <AppButton title={split?"Using debit & credit columns":"Using one amount column"} variant="secondary" onPress={()=>setSplit(!split)}/>
                {(split?["debit","credit"]:["amount","type"]).map(key=><ColumnChoice key={key} label={`${key[0].toUpperCase()+key.slice(1)} column`}
                  headers={table.headers} value={mapping[key as keyof CsvMapping]} onChange={value=>setMapping({...mapping,[key]:value})}/>)}
              </>}
              {!split && <>
                <Text style={ui.label}>When no Type is given</Text>
                <AppButton title={positivePurchases?"Positive amounts are purchases":"Negative amounts are purchases"} variant="secondary" onPress={()=>setPositivePurchases(!positivePurchases)}/>
              </>}
              <Text style={ui.label}>Slash date format</Text>
              <AppButton title={dayFirst?"Day / Month / Year":"Month / Day / Year"} variant="secondary" onPress={()=>setDayFirst(!dayFirst)}/>
              <Text style={styles.caption}>YYYY-MM-DD dates always work. All amounts are in USD.</Text>
            </View>
            <AppButton title="Review transactions" onPress={()=>{setReview(true);setError("");}}/>
          </>}
          {result && review && !busy && <>
            <View style={ui.card}>
              <Text accessibilityRole="header" style={ui.sectionTitle}>{result.entries.length} transactions to import</Text>
              <Text style={ui.body}>Purchases: {formatCurrency(result.spent)}{ "\n" }Income: {formatCurrency(result.received)}</Text>
              <Text style={ui.body}>Balance stays {formatCurrency(Number(balance))}. Savings stay unchanged.</Text>
              {result.duplicates>0 && <Text style={styles.caption}>{result.duplicates} previously imported {result.duplicates===1?"row":"rows"} will be skipped.</Text>}
              <Text style={styles.caption}>Check for purchases you’ve already logged manually before importing.</Text>
            </View>
            {result.errors.length>0 && <View style={ui.card}>
              <Text accessibilityRole="alert" style={ui.error}>Fix {result.errors.length} {result.errors.length===1?"row":"rows"} before importing.</Text>
              {result.errors.slice(0,5).map((message,index)=><Text key={index} style={ui.error}>{message}</Text>)}
              {result.errors.length>5 && <Text style={ui.error}>And {result.errors.length-5} more.</Text>}
            </View>}
            {result.entries.slice(0,visible).map(entry=><View key={entry.id} style={styles.previewRow}>
              <View style={styles.rowText}><Text style={styles.name}>{entry.note || (entry.kind==="income"?"Income":"Purchase")}</Text>
                <Text style={styles.caption}>{new Date(entry.createdAt).toLocaleDateString()} · {entry.kind}</Text></View>
              <Text style={ui.money}>{entry.kind==="income"?"+":"−"}{formatCurrency(entry.amount)}</Text>
            </View>)}
            {result.entries.length>visible && <AppButton title="Show more transactions" variant="text" onPress={()=>setVisible(visible+20)}/>}
            {!supportsCsvImport && <Text style={ui.error}>CSV importing isn’t available on this server yet.</Text>}
            {!!validationError && <Text style={ui.error}>{validationError}</Text>}
            <AppButton title={result.entries.length?`Import ${result.entries.length} transactions`:"Nothing new to import"}
              disabled={!result.entries.length || !!result.errors.length || !supportsCsvImport || saveState!=="saved" || !!validationError} onPress={submit}/>
            <AppButton title="Back to file settings" variant="text" onPress={()=>setReview(false)}/>
          </>}
          {busy && <><SaveStatus/><Text accessibilityLiveRegion="polite" style={ui.body}>{saveState==="error"?"Import not saved yet. Keep the app open; we’ll retry automatically.":"Saving imported activity…"}</Text></>}
          {!!error && <Text accessibilityRole="alert" style={ui.error}>{error}</Text>}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}
const styles=StyleSheet.create({
  overlay:{flex:1,justifyContent:"flex-end"},backdrop:{position:"absolute",top:0,right:0,bottom:0,left:0,backgroundColor:"rgba(0,0,0,0.35)"},
  sheet:{height:"90%",width:"100%",maxWidth:560,alignSelf:"center",backgroundColor:palette.background,borderTopLeftRadius:24,borderTopRightRadius:24,overflow:"hidden"},
  header:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",gap:8,paddingLeft:20,paddingRight:4,paddingVertical:8,borderBottomWidth:1,borderBottomColor:palette.border},
  content:{padding:20,gap:20},caption:{...ui.body,fontSize:13,lineHeight:19},field:{gap:4},options:{borderRadius:12,backgroundColor:palette.surface},option:{padding:12,minHeight:44},
  previewRow:{flexDirection:"row",alignItems:"center",gap:12,borderBottomWidth:1,borderBottomColor:palette.border,paddingBottom:12},rowText:{flex:1,gap:4},name:{color:palette.text,fontSize:15,fontWeight:"600"},
});
