import { AppButton } from "@/components/app-button";
import { SaveStatus } from "@/components/plan/save-status";
import { palette, ui } from "@/constants/design";
import { usePlan } from "@/context/plan-context";
import { CSV_MAX_BYTES, detectMapping, parseCsv, previewCsv, type CsvMapping, type CsvTable } from "@/lib/activity-csv";
import { formatCurrency } from "@/lib/format";
import * as DocumentPicker from "expo-document-picker";
import { useEffect, useMemo, useRef, useState } from "react";
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
  const [showMapping,setShowMapping]=useState(false);
  const [error,setError]=useState("");
  const [reading,setReading]=useState(false);
  const [pending,setPending]=useState(0);
  const [visible,setVisible]=useState(5);
  const started=useRef(false),submitted=useRef(false);
  const result=useMemo(()=>table && mapping
    ? previewCsv(table,{...mapping,...(split?{amount:-1}:{})},purchases,positivePurchases,dayFirst):null,
    [table,mapping,split,purchases,positivePurchases,dayFirst]);
  const missingColumns=!!mapping && (mapping.date<0 || (split ? mapping.debit<0 || mapping.credit<0 : mapping.amount<0));
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
      setTable(parsed);setMapping(detected);setName(asset.name);setVisible(5);
      setPositivePurchases(false);setDayFirst(false);
      setSplit(detected.amount<0 && detected.debit>=0 && detected.credit>=0);
      setShowMapping(detected.date<0 || (detected.amount<0 && (detected.debit<0 || detected.credit<0)));
    }catch(failure){setError(failure instanceof Error?failure.message:"Unable to read this file. Try a CSV export.");}
    finally{setReading(false);}
  }
  function submit(){
    if(submitted.current || !result || result.errors.length || !result.entries.length || saveState!=="saved" || !supportsCsvImport || !!validationError || reading)return;
    try{importActivity(result.entries);submitted.current=true;setPending(result.entries.length);}
    catch(failure){setError(failure instanceof Error?failure.message:"Unable to import activity.");}
  }
  return <Modal transparent visible animationType="slide" onRequestClose={close} statusBarTranslucent navigationBarTranslucent>
    <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS==="ios"?"padding":undefined}>
      <Pressable accessible={false} onPress={close} style={styles.backdrop}/>
      <View accessibilityViewIsModal role="dialog" aria-label="Import transactions" style={[styles.sheet,{marginTop:insets.top+16}]}>
        <View style={styles.header}><Text accessibilityRole="header" style={ui.sectionTitle}>{table?"Review transactions":"Import transactions"}</Text>
          <AppButton title="Close" variant="text" disabled={busy && saveState!=="error"} onPress={close}/></View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content,{paddingBottom:Math.max(insets.bottom,20)}]}>
          {!busy && <>
            {!table && <>
              <Text style={ui.body}>Add past purchases and income from a CSV file.</Text>
              <View style={ui.card}>
                <Text style={ui.sectionTitle}>Start with your bank’s export</Text>
                <Text style={ui.body}>In your bank’s app or website, open your transactions and look for Download or Export. Choose CSV as the file type, then save the file to your device.</Text>
                <Text style={styles.caption}>Already have a CSV? You can choose it below. You’ll review the transactions before adding them.</Text>
              </View>
              <View style={styles.reassurance}>
                <Text style={styles.name}>Your balance stays the same</Text>
                <Text style={styles.caption}>This only adds history to Activity. Your savings stay unchanged too.</Text>
              </View>
              <AppButton title={reading?"Reading file…":"Choose CSV file"} onPress={()=>void choose()} disabled={reading}/>
              <Text style={styles.caption}>Date and amount are required; descriptions are optional. Up to 1 MB and 1,000 transactions. Amounts are in USD.</Text>
            </>}
            {table && mapping && result && <>
              <View style={styles.fileRow}>
                <View style={styles.rowText}><Text style={styles.name}>{name}</Text>
                  <Text style={styles.caption}>{table.rows.length} {table.rows.length===1?"row":"rows"} found</Text></View>
                <AppButton title={reading?"Reading…":"Change file"} variant="text" onPress={()=>void choose()} disabled={reading}/>
              </View>
              <View style={ui.card}>
                <Text accessibilityRole="header" style={ui.sectionTitle}>{result.errors.length?"Let’s check your file":result.entries.length?`${result.entries.length} ${result.entries.length===1?"transaction":"transactions"} ready to add`:"No new transactions"}</Text>
                <View style={styles.totalRow}><Text style={ui.body}>Purchases</Text><Text style={ui.money}>{formatCurrency(result.spent)}</Text></View>
                <View style={styles.totalRow}><Text style={ui.body}>Income</Text><Text style={ui.money}>{formatCurrency(result.received)}</Text></View>
                <Text style={styles.caption}>Your balance stays {formatCurrency(Number(balance))}. Savings stay unchanged.</Text>
                {result.duplicates>0 && <Text style={styles.caption}>{result.duplicates} previously imported {result.duplicates===1?"transaction":"transactions"} will be skipped.</Text>}
              </View>
              <AppButton title={showMapping?"Hide file settings":"Adjust how this file is read"} variant="text" onPress={()=>setShowMapping(!showMapping)}/>
              {showMapping && <View style={ui.card}>
                <Text style={ui.sectionTitle}>{missingColumns?"Match your columns":"File settings"}</Text>
                <Text style={styles.caption}>Choose which columns contain the dates and amounts. Changes update the preview below.</Text>
                <ColumnChoice label="Dates" headers={table.headers} value={mapping.date} onChange={value=>setMapping({...mapping,date:value})}/>
                <ColumnChoice label="Descriptions (optional)" headers={table.headers} value={mapping.description} onChange={value=>setMapping({...mapping,description:value})}/>
                <Text style={ui.label}>How are amounts listed?</Text>
                <AppButton title="One amount column" selected={!split} variant={!split?"primary":"secondary"} onPress={()=>setSplit(false)}/>
                <AppButton title="Separate debit and credit columns" selected={split} variant={split?"primary":"secondary"} onPress={()=>setSplit(true)}/>
                {(split?["debit","credit"]:["amount","type"]).map(key=><ColumnChoice key={key} label={key==="type"?"Purchase or income type (optional)":key==="debit"?"Debit (money out)":key==="credit"?"Credit (money in)":"Amounts"}
                  headers={table.headers} value={mapping[key as keyof CsvMapping]} onChange={value=>setMapping({...mapping,[key]:value})}/>)}
                {!split && <>
                  <Text style={ui.label}>Which amounts are purchases?</Text>
                  <AppButton title="Negative amounts (−$5.00)" selected={!positivePurchases} variant={!positivePurchases?"primary":"secondary"} onPress={()=>setPositivePurchases(false)}/>
                  <AppButton title="Positive amounts ($5.00)" selected={positivePurchases} variant={positivePurchases?"primary":"secondary"} onPress={()=>setPositivePurchases(true)}/>
                  <Text style={styles.caption}>Used when a row doesn’t say purchase or income. Other amounts count as income.</Text>
                </>}
                <Text style={ui.label}>How are dates written?</Text>
                <AppButton title="Month / Day / Year (12/31/2025)" selected={!dayFirst} variant={!dayFirst?"primary":"secondary"} onPress={()=>setDayFirst(false)}/>
                <AppButton title="Day / Month / Year (31/12/2025)" selected={dayFirst} variant={dayFirst?"primary":"secondary"} onPress={()=>setDayFirst(true)}/>
                <Text style={styles.caption}>Dates like 2025-12-31 work with either choice.</Text>
              </View>}
              {result.errors.length>0 && <View style={ui.card}>
                <Text accessibilityRole="alert" style={ui.error}>{missingColumns?"We couldn’t find the dates or amounts. Match your columns in file settings above.":"Some rows couldn’t be read. Check the file settings or correct these rows in your CSV, then choose the file again."}</Text>
                {result.errors.slice(0,5).map((message,index)=><Text key={index} style={ui.error}>{message}</Text>)}
                {result.errors.length>5 && <Text style={ui.error}>And {result.errors.length-5} more.</Text>}
              </View>}
              {result.entries.length>0 && <View style={styles.field}>
                <Text accessibilityRole="header" style={ui.label}>Check your transactions</Text>
                <Text style={styles.caption}>Do the dates and purchase / income labels look right? Use file settings above to adjust them.</Text>
              </View>}
              {result.entries.slice(0,visible).map(entry=><View key={entry.id} style={styles.previewRow}>
                <View style={styles.rowText}><Text style={styles.name}>{entry.note || (entry.kind==="income"?"Income":"Purchase")}</Text>
                  <Text style={styles.caption}>{new Date(entry.createdAt).toLocaleDateString()} · {entry.kind==="income"?"Income":"Purchase"}</Text></View>
                <Text style={ui.money}>{entry.kind==="income"?"+":"−"}{formatCurrency(entry.amount)}</Text>
              </View>)}
              {result.entries.length>visible && <AppButton title={`Show more (${result.entries.length-visible} remaining)`} variant="text" onPress={()=>setVisible(visible+20)}/>}
              {result.entries.length>0 && <Text style={styles.caption}>Already logged any of these yourself? Remove those rows from your CSV first to avoid counting them twice.</Text>}
              {!supportsCsvImport && <Text style={ui.error}>Importing is temporarily unavailable. Try again later.</Text>}
              {!!validationError && <Text style={ui.error}>{validationError}</Text>}
              {saveState!=="saved" && <SaveStatus/>}
              <AppButton title={result.entries.length?`Add ${result.entries.length} ${result.entries.length===1?"transaction":"transactions"}`:"Nothing new to add"}
                disabled={reading || !result.entries.length || !!result.errors.length || !supportsCsvImport || saveState!=="saved" || !!validationError} onPress={submit}/>
            </>}
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
  content:{padding:20,gap:20},caption:{...ui.body,fontSize:13,lineHeight:19},field:{gap:4},reassurance:{backgroundColor:palette.soft,padding:16,borderRadius:12,gap:4},
  fileRow:{flexDirection:"row",alignItems:"center",gap:8},totalRow:{flexDirection:"row",justifyContent:"space-between",gap:12,flexWrap:"wrap"},
  options:{borderRadius:12,backgroundColor:palette.surface},option:{padding:12,minHeight:44},
  previewRow:{flexDirection:"row",alignItems:"center",gap:12,borderBottomWidth:1,borderBottomColor:palette.border,paddingBottom:12},rowText:{flex:1,gap:4},name:{color:palette.text,fontSize:15,fontWeight:"600"},
});
