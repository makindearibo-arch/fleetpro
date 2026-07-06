import { useState, useEffect, useCallback } from "react";
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";
import { AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";
import { Truck, Users, Fuel, Wrench, Settings, FileText, Home, ChevronLeft, ChevronRight, Plus, Search, Zap, Clock, Gauge, DollarSign, AlertTriangle, X, Save, LogOut, Eye, EyeOff, Shield, Download, BarChart3, ClipboardList, Trash2, Pencil, FileCheck, Bell, Check, CheckCircle, Briefcase, Camera, Droplet, Trophy, TrendingUp, TrendingDown, Package, Send, ShoppingCart, Calendar, Filter, FileDown, MapPin } from "lucide-react";
import { supabase } from "./supabase.js";
import { db, signIn, signOut, getSession, getProfile, inviteUser, resetPassword } from "./db.js";
import LiveMapPage from "./LiveMapPage.jsx";

const isMob=()=>typeof window!=="undefined"&&window.innerWidth<768;
const P="#0F62FE";
// DB field mappers
const toV=(r)=>({id:r.id,name:r.name,type:r.type,year:r.year,status:r.status,km:Number(r.km)||0,driver:r.driver,loc:r.loc,nextSvc:r.next_svc,plate:r.plate,img:r.img,vin:r.vin,group:r.grp,fuelType:r.fuel_type,svcCostLife:Number(r.svc_cost_life)||0,fuelCostLife:Number(r.fuel_cost_life)||0,otherCostLife:Number(r.other_cost_life)||0});
const fromV=(v)=>({id:v.id,name:v.name,type:v.type,year:v.year||0,status:v.status,km:v.km||0,driver:v.driver||"",loc:v.loc||"",next_svc:v.nextSvc||"",plate:v.plate||"",img:v.img||"🚛",vin:v.vin||"",grp:v.group||"",fuel_type:v.fuelType||"",svc_cost_life:v.svcCostLife||0,fuel_cost_life:v.fuelCostLife||0,other_cost_life:v.otherCostLife||0});
const toG=(r)=>({id:r.id,name:r.name,brand:r.brand,cap:r.cap,status:r.status,hrs:Number(r.hrs)||0,loc:r.loc,nextSvc:r.next_svc,costHr:Number(r.cost_hr)||0,tank:r.tank,assigned:r.assigned,fuelType:r.fuel_type,svcCostLife:Number(r.svc_cost_life)||0,fuelCostLife:Number(r.fuel_cost_life)||0,assetType:r.asset_type||"generator"});
const fromG=(g)=>({id:g.id,name:g.name,brand:g.brand||"",cap:g.cap||"",status:g.status,hrs:g.hrs||0,loc:g.loc||"",next_svc:g.nextSvc||"",cost_hr:g.costHr||0,tank:g.tank||0,assigned:g.assigned||"",fuel_type:g.fuelType||"",svc_cost_life:g.svcCostLife||0,fuel_cost_life:g.fuelCostLife||0,asset_type:g.assetType||"generator"});
const toFL=(r)=>({id:r.id,asset:r.asset,date:r.date,litres:Number(r.litres)||0,cost:Number(r.cost)||0,reading:Number(r.reading)||0,station:r.station,isGen:r.is_gen,fuelType:r.fuel_type});
const fromFL=(f)=>({asset:f.asset,date:f.date,litres:f.litres||0,cost:f.cost||0,reading:f.reading||0,station:f.station||"",is_gen:f.isGen||false,fuel_type:f.fuelType||"Diesel"});
const toWO=(r)=>({id:r.id,asset:r.asset,type:r.type,priority:r.priority,status:r.status,desc:r.descr,assignee:r.assignee,due:r.due,cost:Number(r.cost)||0,isGen:r.is_gen});
const fromWO=(w)=>({id:w.id,asset:w.asset,type:w.type,priority:w.priority,status:w.status||"Open",descr:w.desc||"",assignee:w.assignee||"",due:w.due||"",cost:w.cost||0,is_gen:w.isGen||false});
const toP=(r)=>({id:r.id,vehicle:r.vehicle,docType:r.doc_type,issueDate:r.issue_date,expiryDate:r.expiry_date,status:r.status,note:r.note});
const fromP=(p)=>({vehicle:p.vehicle,doc_type:p.docType,issue_date:p.issueDate||"",expiry_date:p.expiryDate||"",status:p.status||"Valid",note:p.note||""});
const toSR=(r)=>({id:r.id,vehicle:r.vehicle,type:r.type,intervalKm:r.interval_km,intervalDays:r.interval_days,lastDoneKm:r.last_done_km,lastDoneDate:r.last_done_date,nextDueKm:r.next_due_km,nextDueDate:r.next_due_date,status:r.status});
const fromSR=(s)=>({vehicle:s.vehicle,type:s.type,interval_km:s.intervalKm||0,interval_days:s.intervalDays||0,last_done_km:s.lastDoneKm||0,last_done_date:s.lastDoneDate||"",next_due_km:s.nextDueKm||0,next_due_date:s.nextDueDate||"",status:s.status||"Upcoming"});
const toOdo=(r)=>({id:r.id,asset:r.asset,reading:Number(r.reading)||0,date:r.date,type:r.type});
// Diesel module mappers
const toDR=(r)=>({id:r.id,generatorId:r.generator_id,storeLoc:r.store_location,date:r.date,genHoursOpening:Number(r.gen_hours_opening)||null,genHoursClosing:Number(r.gen_hours_closing)||null,hoursRun:Number(r.hours_run)||0,dieselLevelActual:Number(r.diesel_level_actual)||null,dieselLevelTheoretical:Number(r.diesel_level_theoretical)||null,dieselAdded:Number(r.diesel_added)||0,consumptionLitres:Number(r.consumption_litres)||null,consumptionRate:Number(r.consumption_rate)||null,genPhotoUrl:r.gen_photo_url,genSource:r.gen_photo_reading_source||"manual",dieselLevelPhotoUrl:r.diesel_level_photo_url||"",aiReadings:r.ai_readings_json,aiConfidence:r.ai_confidence,nepaHours:Number(r.nepa_hours)||0,nepaMeterOpening:Number(r.nepa_meter_opening)||null,nepaMeterClosing:Number(r.nepa_meter_closing)||null,nepaPhotoUrl:r.nepa_photo_url,nepaSource:r.nepa_source||"manual",discrepancyLitres:r.discrepancy_litres!=null?Number(r.discrepancy_litres):null,discrepancyFlag:r.discrepancy_flag,batchesProduced:r.batches_produced!=null?Number(r.batches_produced):null,submittedBy:r.submitted_by,notes:r.notes,createdAt:r.created_at});
const fromDR=(d)=>({generator_id:d.generatorId,store_location:d.storeLoc,date:d.date,gen_hours_opening:d.genHoursOpening,gen_hours_closing:d.genHoursClosing,diesel_level_actual:d.dieselLevelActual,diesel_level_theoretical:d.dieselLevelTheoretical,diesel_added:d.dieselAdded||0,consumption_litres:d.consumptionLitres,consumption_rate:d.consumptionRate,gen_photo_url:d.genPhotoUrl||"",gen_photo_reading_source:d.genSource||"manual",diesel_level_photo_url:d.dieselLevelPhotoUrl||"",ai_readings_json:d.aiReadings||null,ai_confidence:d.aiConfidence||null,nepa_hours:d.nepaHours||0,nepa_meter_opening:d.nepaMeterOpening,nepa_meter_closing:d.nepaMeterClosing,nepa_photo_url:d.nepaPhotoUrl||"",nepa_source:d.nepaSource||"manual",discrepancy_litres:d.discrepancyLitres,discrepancy_flag:d.discrepancyFlag||false,batches_produced:d.batchesProduced??null,submitted_by:d.submittedBy,notes:d.notes||""});
const toDT=(r)=>({id:r.id,date:r.date,storeLoc:r.store_location,sourceGenId:r.source_generator_id,destType:r.dest_type||"vehicle",destId:r.dest_id,destLabel:r.dest_label||"",litres:Number(r.litres)||0,notes:r.notes||"",recordedBy:r.recorded_by,createdAt:r.created_at});
const fromDT=(d)=>({date:d.date,store_location:d.storeLoc,source_generator_id:d.sourceGenId||null,dest_type:d.destType||"vehicle",dest_id:d.destId||null,dest_label:d.destLabel||"",litres:d.litres,notes:d.notes||"",recorded_by:d.recordedBy||null});
const toNPL=(r)=>({id:r.id,storeLoc:r.store_location,fromDate:r.from_date,toDate:r.to_date,totalHours:Number(r.total_hours)||0,meterOpening:r.meter_opening!=null?Number(r.meter_opening):null,meterClosing:r.meter_closing!=null?Number(r.meter_closing):null,photoUrl:r.photo_url||"",notes:r.notes||"",submittedBy:r.submitted_by,createdAt:r.created_at});
const fromNPL=(d)=>({store_location:d.storeLoc,from_date:d.fromDate,to_date:d.toDate,total_hours:d.totalHours||null,meter_opening:d.meterOpening,meter_closing:d.meterClosing,photo_url:d.photoUrl||"",notes:d.notes||"",submitted_by:d.submittedBy||null});
const toLOCK=(r)=>({id:r.id,storeLoc:r.store_location||null,fromDate:r.from_date,toDate:r.to_date,reason:r.reason||"",lockedBy:r.locked_by,createdAt:r.created_at});
const toDP=(r)=>({id:r.id,date:r.date,supplier:r.supplier,litres:Number(r.litres)||0,litresReceived:r.litres_received!=null?Number(r.litres_received):null,pricePerL:Number(r.price_per_litre)||0,totalCost:Number(r.total_cost)||0,notes:r.notes,purchasedBy:r.purchased_by,createdAt:r.created_at});
const fromDP=(p)=>({date:p.date,supplier:p.supplier,litres:p.litres,litres_received:p.litresReceived??null,price_per_litre:p.pricePerL,notes:p.notes||"",purchased_by:p.purchasedBy});
const toDD=(r)=>({id:r.id,purchaseId:r.purchase_id,date:r.date,storeLoc:r.store_location,litres:Number(r.litres)||0,confirmed:r.received_confirmed,receivedDate:r.received_date,receivedBy:r.received_by,notes:r.notes,distributedBy:r.distributed_by,createdAt:r.created_at});
const fromDD2=(d)=>({purchase_id:d.purchaseId||null,date:d.date,store_location:d.storeLoc,litres:d.litres,received_confirmed:d.confirmed||false,notes:d.notes||"",distributed_by:d.distributedBy});
// After a delivery is ACCEPTED, fold its litres into that day's already-saved
// reading (if one exists). diesel_added is computed at reading-save time, so a
// delivery recorded/accepted AFTER the reading was saved never reaches it \u2014
// the tank jump then reads as a huge positive "discrepancy" and flags (e.g.
// Okitipupa CR Jun 13: reading saved day 1, 3,000 L delivery accepted day 3).
// Delta math: expected level rises by the accepted litres, so discrepancy
// falls by the same amount; re-evaluate the flag against the stored expected
// burn (same 20% + 25 L min-burn rule as handleSave).
async function applyAcceptToReading(dist,dieselReadings,setDieselReadings,generators){
  try{
    const rs=(dieselReadings||[]).filter(r=>r.storeLoc===dist.storeLoc&&r.date===dist.date);
    if(!rs.length)return;
    const target=rs.find(r=>((generators||[]).find(g=>g.id===r.generatorId)?.assetType)!=="oven")||rs[0];
    const newAdded=(target.dieselAdded||0)+(dist.litres||0);
    const theo=target.consumptionLitres;
    let disc=target.discrepancyLitres!=null?target.discrepancyLitres-(dist.litres||0):null;
    let flag=target.discrepancyFlag||false;
    if(disc!=null&&theo!=null&&theo>0)flag=(Math.abs(disc)/theo*100>20)&&theo>=25;
    const row=await db.updateDieselReading(target.id,{diesel_added:newAdded,discrepancy_litres:disc!=null?Math.round(disc):null,discrepancy_flag:!!flag});
    if(row&&setDieselReadings)setDieselReadings(prev=>prev.map(r=>r.id===target.id?toDR(row):r));
  }catch(e){console.error("applyAcceptToReading:",e);}
}
const fmt=v=>"\u20A6"+Number(v).toLocaleString();
const th={padding:"10px 14px",textAlign:"left",fontSize:11,fontWeight:600,color:"#6F6F6F",textTransform:"uppercase"};
const tc={padding:"11px 14px",borderBottom:"1px solid #F4F4F4",fontSize:13};
const inp={width:"100%",padding:"9px 12px",borderRadius:8,border:"1.5px solid #E0E0E0",fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box"};

function Badge({label}){const m={Active:"#24A148",Completed:"#24A148","On Duty":"#24A148","In Shop":"#F1C21B","In Maintenance":"#F1C21B",Open:"#F1C21B","In Progress":P,Standby:"#8A3FFC","Off Duty":"#8D8D8D","Out of Service":"#DA1E28",Critical:"#DA1E28",High:"#FF832B",Medium:"#F1C21B",Low:"#8D8D8D"};const c=m[label]||"#8D8D8D";return(<span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 10px",borderRadius:20,background:c+"18",color:c,fontSize:11,fontWeight:600}}><span style={{width:6,height:6,borderRadius:"50%",background:c}}/>{label}</span>);}

function Kpi({icon:Icon,label,value,sub,accent,onClick,delta,deltaGoodWhenDown}){
  // delta: % change vs previous period. deltaGoodWhenDown=true means a decrease is "good" (e.g. costs).
  const deltaEl=(delta!=null&&isFinite(delta))?(()=>{const up=delta>0;const good=deltaGoodWhenDown?!up:up;return(<span style={{fontSize:11,fontWeight:700,color:good?"#24A148":"#DA1E28",marginLeft:6}}>{up?"▲":"▼"}{Math.abs(delta).toFixed(0)}%</span>);})():null;
  return(<div onClick={onClick} style={{background:"#fff",borderRadius:14,padding:"18px 20px",border:"1px solid #E8ECF1",cursor:onClick?"pointer":"default"}}><div style={{width:36,height:36,borderRadius:9,background:accent||"#D0E2FF",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:8}}><Icon size={17} color={accent?"#fff":P}/></div><div style={{fontSize:22,fontWeight:700}}>{value}{deltaEl}</div><div style={{fontSize:12,color:"#6F6F6F",marginTop:2}}>{label}</div>{sub&&<div style={{fontSize:11,color:"#8D8D8D",marginTop:1}}>{sub}</div>}</div>);}

function Modal({title,onClose,children}){const isMob=window.innerWidth<768;return(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:isMob?"flex-end":"center",justifyContent:"center",zIndex:1000}} onClick={onClose}><div style={{background:"#fff",borderRadius:isMob?"16px 16px 0 0":16,width:isMob?"100%":520,maxHeight:isMob?"92vh":"85vh",overflow:"auto",boxShadow:isMob?"0 -10px 40px rgba(0,0,0,0.2)":"0 20px 60px rgba(0,0,0,0.2)"}} onClick={e=>e.stopPropagation()}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"18px 22px",borderBottom:"1px solid #E8ECF1"}}><h3 style={{fontSize:16,fontWeight:700,margin:0}}>{title}</h3><button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",padding:4}}><X size={18} color="#8D8D8D"/></button></div><div style={{padding:"20px 22px"}}>{children}</div></div></div>);}

function Field({label,children}){return(<div style={{marginBottom:14}}><label style={{display:"block",fontSize:12,fontWeight:600,color:"#525252",marginBottom:4}}>{label}</label>{children}</div>);}

function SearchSelect({options,value,onChange,placeholder}){
  const [open,setOpen]=useState(false);const [q,setQ]=useState("");
  const filtered=options.filter(o=>(o.label||"").toLowerCase().includes(q.toLowerCase()));
  const selected=options.find(o=>o.value===value);
  return(<div style={{position:"relative"}}><div onClick={()=>setOpen(!open)} style={{...inp,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",background:"#fff"}}><span style={{color:selected?"#161616":"#8D8D8D",fontSize:13}}>{selected?selected.label:(placeholder||"-- Select --")}</span><ChevronRight size={13} color="#8D8D8D" style={{transform:open?"rotate(90deg)":"rotate(0)",transition:"transform 0.15s"}}/></div>{open&&(<div style={{position:"absolute",top:"100%",left:0,right:0,background:"#fff",border:"1.5px solid #E0E0E0",borderRadius:8,marginTop:4,zIndex:999,maxHeight:220,overflow:"auto",boxShadow:"0 8px 24px rgba(0,0,0,0.12)"}}><div style={{padding:"8px 10px",borderBottom:"1px solid #F4F4F4",position:"sticky",top:0,background:"#fff"}}><div style={{display:"flex",alignItems:"center",gap:6,background:"#F4F4F4",borderRadius:6,padding:"6px 10px"}}><Search size={13} color="#8D8D8D"/><input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Type to search..." style={{border:"none",outline:"none",background:"transparent",fontSize:12,width:"100%",fontFamily:"inherit"}}/></div></div>{filtered.length===0?(<div style={{padding:14,textAlign:"center",color:"#8D8D8D",fontSize:12}}>No results</div>):filtered.map(o=>(<div key={o.value} onClick={()=>{onChange(o.value);setOpen(false);setQ("");}} style={{padding:"9px 14px",cursor:"pointer",fontSize:13,fontWeight:value===o.value?600:400,color:value===o.value?P:"#161616",background:value===o.value?"#D0E2FF":"transparent"}} onMouseEnter={e=>{if(value!==o.value)e.currentTarget.style.background="#F8FAFF"}} onMouseLeave={e=>{if(value!==o.value)e.currentTarget.style.background="transparent"}}>{o.label}</div>))}</div>)}</div>);
}

function DashPage({vehicles,generators,workOrders,go,fuelLogs,dieselReadings,dieselPurchases,dieselDistributions,papers,svcReminders}){
  const av=vehicles.filter(v=>v.status==="Active").length;const ag=generators.filter(g=>g.status==="Active").length;const ow=workOrders.filter(w=>w.status!=="Completed").length;
  const pd=[{name:"Active",value:av,color:"#24A148"},{name:"In Shop",value:vehicles.filter(v=>v.status==="In Shop").length,color:"#F1C21B"},{name:"Out of Svc",value:vehicles.filter(v=>v.status==="Out of Service").length,color:"#DA1E28"}].filter(d=>d.value>0);
  // Real operating costs: fuel logs (naira) + diesel consumption x weighted avg purchase price + WO costs, last 6 months
  const now=new Date();
  const avgDieselPrice=(()=>{const priced=(dieselPurchases||[]).filter(p=>(p.pricePerL||0)>0);const tl=priced.reduce((s,p)=>s+(p.litres||0),0);const tcst=priced.reduce((s,p)=>s+(p.litres||0)*p.pricePerL,0);return tl>0?tcst/tl:0;})();
  const costSeries=[...Array(6)].map((_,i)=>{
    const d=new Date(now.getFullYear(),now.getMonth()-5+i,1);
    const ym=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    const fuel=(fuelLogs||[]).filter(f=>f.date&&f.date.startsWith(ym)).reduce((s,f)=>s+(f.cost||0),0);
    const dieselL=(dieselReadings||[]).filter(r=>r.date&&r.date.startsWith(ym)).reduce((s,r)=>s+(r.consumptionLitres||0),0);
    const maint=(workOrders||[]).filter(w=>w.due&&w.due.startsWith(ym)).reduce((s,w)=>s+(w.cost||0),0);
    return{m:d.toLocaleDateString("en",{month:"short"}),fuel,diesel:Math.round(dieselL*avgDieselPrice),maint};
  });
  const cur=costSeries[5]||{fuel:0,diesel:0,maint:0};
  const monthlyCost=cur.fuel+cur.diesel+cur.maint;
  // Delta vs last month, pro-rated to the same day-of-month so an early-month view compares fairly
  const prevM=costSeries[4]||{fuel:0,diesel:0,maint:0};
  const prevTotal=prevM.fuel+prevM.diesel+prevM.maint;
  const daysInPrev=new Date(now.getFullYear(),now.getMonth(),0).getDate();
  const prevProRata=prevTotal*(now.getDate()/daysInPrev);
  const costDelta=prevProRata>0?((monthlyCost-prevProRata)/prevProRata*100):null;
  const nairaTick=(v)=>v>=1e6?(v/1e6).toFixed(1)+"M":v>=1e3?(v/1e3).toFixed(0)+"k":v;
  // Needs Attention feed
  const todayStr=now.toISOString().split("T")[0];
  const yest=new Date(Date.now()-864e5).toISOString().split("T")[0];
  const d7=new Date(Date.now()-7*864e5).toISOString().split("T")[0];
  const d14=new Date(Date.now()-14*864e5).toISOString().split("T")[0];
  const d3=new Date(Date.now()-3*864e5).toISOString().split("T")[0];
  const in30=new Date(Date.now()+30*864e5).toISOString().split("T")[0];
  const attention=[];
  const flagByStore={};(dieselReadings||[]).forEach(r=>{if(r.discrepancyFlag&&r.date>=d7)flagByStore[r.storeLoc]=(flagByStore[r.storeLoc]||0)+1;});
  Object.entries(flagByStore).sort((a,b)=>b[1]-a[1]).forEach(([loc,n])=>attention.push({icon:AlertTriangle,color:"#DA1E28",text:`${loc}: ${n} diesel discrepanc${n>1?"ies":"y"} flagged this week`,page:"diesel-mgmt"}));
  const activeStores=new Set((dieselReadings||[]).filter(r=>r.date>=d14).map(r=>r.storeLoc));
  const loggedYest=new Set((dieselReadings||[]).filter(r=>r.date===yest).map(r=>r.storeLoc));
  const missed=[...activeStores].filter(s=>!loggedYest.has(s)).sort();
  if(missed.length)attention.push({icon:Clock,color:"#FF832B",text:`${missed.length} store${missed.length>1?"s":""} didn't log diesel yesterday: ${missed.slice(0,4).join(", ")}${missed.length>4?" +"+(missed.length-4)+" more":""}`,page:"diesel-mgmt"});
  const unconf=(dieselDistributions||[]).filter(d=>!d.confirmed&&d.date<=d3).length;
  if(unconf)attention.push({icon:Send,color:"#FF832B",text:`${unconf} diesel deliver${unconf>1?"ies":"y"} not yet confirmed by stores`,page:"diesel-mgmt"});
  const expiring=(papers||[]).filter(p=>p.expiryDate&&p.expiryDate>=todayStr&&p.expiryDate<=in30).length;
  if(expiring)attention.push({icon:FileCheck,color:"#F1C21B",text:`${expiring} vehicle paper${expiring>1?"s":""} expiring within 30 days`,page:"papers"});
  const overdueSvc=(svcReminders||[]).filter(s=>s.status==="Overdue").length;
  if(overdueSvc)attention.push({icon:Bell,color:"#DA1E28",text:`${overdueSvc} service reminder${overdueSvc>1?"s":""} overdue`,page:"service"});
  const overdueWO=(workOrders||[]).filter(w=>w.status!=="Completed"&&w.due&&w.due<todayStr).length;
  if(overdueWO)attention.push({icon:Wrench,color:"#FF832B",text:`${overdueWO} open work order${overdueWO>1?"s":""} past due`,page:"workorders"});
  return(<div style={{display:"flex",flexDirection:"column",gap:18}}>
    <div style={{background:"linear-gradient(135deg,#0F1A2E,#1A3A6B,#0F62FE)",borderRadius:16,padding:"24px 28px",color:"#fff"}}><div style={{fontSize:11,color:"rgba(255,255,255,0.5)",textTransform:"uppercase",letterSpacing:"0.08em"}}>Good morning</div><h2 style={{fontSize:20,fontWeight:700,margin:"4px 0 0"}}>Fleet Overview</h2><p style={{fontSize:13,color:"rgba(255,255,255,0.6)",marginTop:4}}>{av} vehicles + {ag} generators active</p></div>
    <div style={{display:"grid",gridTemplateColumns:window.innerWidth<768?"1fr 1fr":"repeat(4,1fr)",gap:14}}><Kpi icon={Truck} label="Vehicles" value={`${av}/${vehicles.length}`} onClick={()=>go("vehicles")}/><Kpi icon={Zap} label="Generators" value={`${ag}/${generators.length}`} onClick={()=>go("generators")}/><Kpi icon={Wrench} label="Open WOs" value={ow} accent="#FF832B" onClick={()=>go("workorders")}/><Kpi icon={DollarSign} label="Cost This Month" value={fmt(monthlyCost)} sub="Fuel + diesel + maintenance" delta={costDelta} deltaGoodWhenDown/></div>
    {attention.length>0&&<div style={{background:"#fff",borderRadius:14,border:"1px solid #E8ECF1",overflow:"hidden"}}>
      <div style={{padding:"14px 20px",borderBottom:"1px solid #F4F4F4",display:"flex",alignItems:"center",gap:8}}><AlertTriangle size={16} color="#FF832B"/><h3 style={{fontSize:14,fontWeight:700,margin:0}}>Needs Attention</h3><span style={{fontSize:11,fontWeight:700,padding:"2px 9px",borderRadius:10,background:"#FFF3E0",color:"#E65100"}}>{attention.length}</span></div>
      {attention.slice(0,8).map((a,i)=>{const AIcon=a.icon;return(<div key={i} onClick={()=>go(a.page)} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 20px",borderBottom:"1px solid #F8F8F8",cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background="#F8FAFF"} onMouseLeave={e=>e.currentTarget.style.background=""}>
        <AIcon size={15} color={a.color} style={{flexShrink:0}}/><span style={{fontSize:13,color:"#161616",flex:1}}>{a.text}</span><ChevronRight size={14} color="#C6C6C6"/>
      </div>);})}
      {attention.length>8&&<div style={{padding:"8px 20px",fontSize:11,color:"#8D8D8D"}}>{attention.length-8} more items…</div>}
    </div>}
    <div style={{display:"grid",gridTemplateColumns:"1.5fr 1fr",gap:14}}>
      <div style={{background:"#fff",borderRadius:14,padding:20,border:"1px solid #E8ECF1"}}><h3 style={{fontSize:14,fontWeight:700,margin:"0 0 12px"}}>Operating Costs (last 6 months)</h3><ResponsiveContainer width="100%" height={180}><AreaChart data={costSeries}><CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0"/><XAxis dataKey="m" tick={{fontSize:11,fill:"#8D8D8D"}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:11,fill:"#8D8D8D"}} axisLine={false} tickLine={false} tickFormatter={nairaTick}/><Tooltip formatter={(v,n)=>[fmt(v),n==="fuel"?"Vehicle Fuel":n==="diesel"?"Gen Diesel":"Maintenance"]}/><Area dataKey="fuel" stroke={P} fill={P+"20"} strokeWidth={2}/><Area dataKey="diesel" stroke="#8A3FFC" fill="#8A3FFC20" strokeWidth={2}/><Area dataKey="maint" stroke="#FF832B" fill="#FF832B20" strokeWidth={2}/></AreaChart></ResponsiveContainer></div>
      <div style={{background:"#fff",borderRadius:14,padding:20,border:"1px solid #E8ECF1"}}><h3 style={{fontSize:14,fontWeight:700,margin:"0 0 8px"}}>Fleet Status</h3><ResponsiveContainer width="100%" height={130}><PieChart><Pie data={pd} cx="50%" cy="50%" innerRadius={38} outerRadius={55} dataKey="value" strokeWidth={0}>{pd.map((e,i)=>(<Cell key={i} fill={e.color}/>))}</Pie></PieChart></ResponsiveContainer><div style={{display:"flex",gap:10,justifyContent:"center"}}>{pd.map(d=>(<span key={d.name} style={{fontSize:11,color:"#525252",display:"flex",alignItems:"center",gap:4}}><span style={{width:7,height:7,borderRadius:"50%",background:d.color}}/>{d.value} {d.name}</span>))}</div></div>
    </div>
    <div style={{background:"#fff",borderRadius:14,padding:20,border:"1px solid #E8ECF1"}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}><h3 style={{fontSize:14,fontWeight:700,margin:0}}>Recent Work Orders</h3><button onClick={()=>go("workorders")} style={{fontSize:12,color:P,fontWeight:600,background:"none",border:"none",cursor:"pointer"}}>View All</button></div>{workOrders.filter(w=>w.status!=="Completed").slice(0,4).map(wo=>(<div key={wo.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid #F4F4F4"}}><div><div style={{fontSize:13,fontWeight:600}}>{wo.id} - {wo.asset}</div><div style={{fontSize:11,color:"#8D8D8D"}}>{wo.type} - Due {wo.due}</div></div><Badge label={wo.status}/></div>))}</div>
  </div>);
}

function VehiclesPage({vehicles,setVehicles,locations,fuelLogs,workOrders,inspections,papers,svcReminders,canEdit,odoLog,setOdoLog}){
  const [sel,setSel]=useState(null);const [filt,setFilt]=useState("All");const [showAdd,setShowAdd]=useState(false);const [showSnap,setShowSnap]=useState(false);const [editV,setEditV]=useState(null);const [showOdo,setShowOdo]=useState(false);const [odoVal,setOdoVal]=useState("");const [odoDate,setOdoDate]=useState(new Date().toISOString().split("T")[0]);
  const calcCostKm=(vid)=>{const vFuel=fuelLogs.filter(f=>!f.isGen&&f.asset===vid).reduce((s,f)=>s+f.cost,0);const vWO=workOrders.filter(w=>!w.isGen&&vehicles.find(x=>x.id===vid&&x.name===w.asset)).reduce((s,w)=>s+(w.cost||0),0);const v=vehicles.find(x=>x.id===vid);const km=v?.km||0;return km>0?Math.round((vFuel+vWO)/km):0;};
  const defForm={name:"",type:"Pickup",year:"2025",status:"Active",km:"0",driver:"",loc:locations[0]||"",nextSvc:"",plate:""};
  const [form,setForm]=useState(defForm);
  const list=filt==="All"?vehicles:vehicles.filter(v=>v.status===filt);
  const handleSave=async()=>{const img=form.type==="Van"?"\ud83d\ude90":form.type.includes("Semi")||form.type.includes("Heavy")?"\ud83d\ude9a":"\ud83d\ude9b";try{if(editV){const up=fromV({...form,year:parseInt(form.year),km:parseInt(form.km)||0,img,id:editV});await db.updateVehicle(editV,up);setVehicles(vehicles.map(v=>v.id===editV?{...v,...form,year:parseInt(form.year),km:parseInt(form.km)||0,img}:v));setEditV(null);}else{const nid=`V-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,5).toUpperCase()}`;const nv=fromV({id:nid,...form,year:parseInt(form.year),km:parseInt(form.km)||0,img});const saved=await db.addVehicle(nv);if(saved){setVehicles(prev=>[...prev,toV(saved)]);}else{const all=await db.getVehicles();setVehicles(all.map(toV));}}setShowAdd(false);setForm(defForm);}catch(e){alert("Error: "+e.message);}};
  const handleDelete=async(id)=>{if(confirm("Delete this vehicle?")){try{await db.deleteVehicle(id);setVehicles(vehicles.filter(v=>v.id!==id));if(sel===id)setSel(null);}catch(e){alert("Error: "+e.message);}}};
  const startEdit=(v)=>{setForm({name:v.name,type:v.type,year:String(v.year),status:v.status,km:String(v.km||0),driver:v.driver||"",loc:v.loc||locations[0]||"",nextSvc:v.nextSvc||"",plate:v.plate||""});setEditV(v.id);setShowAdd(true);};
  const addOdoReading=async(vid)=>{const val=parseFloat(odoVal);if(!val)return;try{const saved=await db.addOdoLog({asset:vid,reading:val,date:odoDate,type:"manual"});setOdoLog([...odoLog,toOdo(saved)]);await db.updateVehicle(vid,{km:val});setVehicles(vehicles.map(v=>v.id===vid?{...v,km:val}:v));setShowOdo(false);setOdoVal("");}catch(e){alert("Error: "+e.message);}};
  const vOdoHistory=(vid)=>odoLog.filter(o=>o.asset===vid).sort((a,b)=>b.date.localeCompare(a.date));
  if(sel){const v=vehicles.find(x=>x.id===sel);if(!v){setSel(null);return null;}const odoHist=vOdoHistory(v.id);return(<div><div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}><button onClick={()=>setSel(null)} style={{display:"flex",alignItems:"center",gap:4,background:"none",border:"none",cursor:"pointer",color:P,fontSize:13,fontWeight:600}}><ChevronLeft size={16}/> Back</button>{canEdit&&<div style={{display:"flex",gap:6}}><button onClick={()=>{startEdit(v);setSel(null);}} style={{display:"flex",alignItems:"center",gap:4,padding:"7px 14px",borderRadius:8,border:"1.5px solid #E0E0E0",background:"#fff",fontSize:12,fontWeight:600,cursor:"pointer",color:"#525252"}}><Pencil size={13}/>Edit</button><button onClick={()=>handleDelete(v.id)} style={{display:"flex",alignItems:"center",gap:4,padding:"7px 14px",borderRadius:8,border:"1.5px solid #E0E0E0",background:"#fff",fontSize:12,fontWeight:600,cursor:"pointer",color:"#DA1E28"}}><Trash2 size={13}/>Delete</button></div>}</div><div style={{background:"#fff",borderRadius:14,border:"1px solid #E8ECF1",overflow:"hidden"}}><div style={{background:"linear-gradient(135deg,#0F1A2E,#1A3A6B)",padding:"22px 26px",color:"#fff"}}><div style={{display:"flex",alignItems:"center",gap:14}}><span style={{fontSize:36}}>{v.img}</span><div><h2 style={{fontSize:18,fontWeight:700,margin:0}}>{v.name}</h2><div style={{fontSize:12,color:"rgba(255,255,255,0.6)",marginTop:2}}>{v.id} - {v.type} - {v.year}</div></div><div style={{marginLeft:"auto"}}><Badge label={v.status}/></div></div></div><div style={{padding:22,display:"grid",gridTemplateColumns:window.innerWidth<768?"1fr 1fr":"1fr 1fr 1fr",gap:14}}>{[["Odometer",`${(v.km||0).toLocaleString()} km`],["Cost/km",(()=>{const c=calcCostKm(v.id);return c>0?fmt(c):"N/A";})()],["Driver",v.driver||"Unassigned"],["Location",v.loc||"-"],["Plate",v.plate||"-"],["VIN/SN",v.vin||"-"],["Fuel Type",v.fuelType||"-"],["Group",v.group||"-"],["Next Service",v.nextSvc||"-"],["Fuel Costs (Life)",v.fuelCostLife?fmt(v.fuelCostLife):"-"],["Service Costs (Life)",v.svcCostLife?fmt(v.svcCostLife):"-"]].map(([l,val])=>(<div key={l}><div style={{fontSize:11,color:"#8D8D8D"}}>{l}</div><div style={{fontSize:14,fontWeight:600,marginTop:2}}>{val}</div></div>))}</div></div>{canEdit&&<div style={{marginTop:14,display:"flex",gap:8}}><button onClick={()=>setShowOdo(true)} style={{display:"flex",alignItems:"center",gap:5,padding:"9px 16px",borderRadius:9,background:P,color:"#fff",border:"none",fontSize:12,fontWeight:600,cursor:"pointer"}}><Gauge size={14}/>Update Odometer</button></div>}{showOdo&&(<Modal title="Update Odometer Reading" onClose={()=>setShowOdo(false)}><div style={{padding:"10px 0 6px",background:"#F4F4F4",borderRadius:8,textAlign:"center",marginBottom:14}}><div style={{fontSize:11,color:"#8D8D8D"}}>Current Reading</div><div style={{fontSize:20,fontWeight:700}}>{(v.km||0).toLocaleString()} km</div></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><Field label="New Reading (km) *"><input style={inp} type="number" placeholder="e.g. 29100" value={odoVal} onChange={e=>setOdoVal(e.target.value)}/></Field><Field label="Date"><input style={inp} type="date" value={odoDate} onChange={e=>setOdoDate(e.target.value)}/></Field></div><div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:8}}><button onClick={()=>setShowOdo(false)} style={{padding:"9px 20px",borderRadius:8,border:"1.5px solid #E0E0E0",background:"#fff",color:"#525252",fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancel</button><button onClick={()=>addOdoReading(v.id)} disabled={!odoVal} style={{padding:"9px 20px",borderRadius:8,border:"none",background:odoVal?P:"#C6C6C6",color:"#fff",fontSize:13,fontWeight:600,cursor:odoVal?"pointer":"not-allowed"}}><Save size={14}/> Save</button></div></Modal>)}{(()=>{const vFuel=fuelLogs.filter(f=>f.asset===v.id&&!f.isGen);const vWO=workOrders.filter(w=>w.asset===v.name);const vInsp=inspections?inspections.filter(i=>i.vehicle===v.id):[];const vPapers=papers?papers.filter(p=>p.vehicle===v.id):[];const vSvc=svcReminders?svcReminders.filter(s=>s.vehicle===v.id):[];return(<div style={{marginTop:14,background:"#fff",borderRadius:14,border:"1px solid #E8ECF1",padding:18}}><h4 style={{fontSize:13,fontWeight:700,marginBottom:12}}>Vehicle History</h4>
{vFuel.length>0&&<div style={{marginBottom:16}}><div style={{fontSize:12,fontWeight:600,color:P,marginBottom:6}}>Fuel Logs ({vFuel.length})</div><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr style={{background:"#F4F4F4"}}>{["Date","Litres","Cost","Reading","Type","Station"].map(h=>(<th key={h} style={th}>{h}</th>))}</tr></thead><tbody>{vFuel.slice(0,10).map(f=>(<tr key={f.id}><td style={tc}>{f.date}</td><td style={tc}>{f.litres} L</td><td style={{...tc,fontWeight:600}}>{fmt(f.cost)}</td><td style={tc}>{f.reading?.toLocaleString()||"-"} km</td><td style={tc}>{f.fuelType||"-"}</td><td style={tc}>{f.station||"-"}</td></tr>))}</tbody></table>{vFuel.length>10&&<div style={{fontSize:11,color:"#8D8D8D",marginTop:4}}>{vFuel.length-10} more entries...</div>}</div>}
{vWO.length>0&&<div style={{marginBottom:16}}><div style={{fontSize:12,fontWeight:600,color:"#FF832B",marginBottom:6}}>Work Orders ({vWO.length})</div><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr style={{background:"#F4F4F4"}}>{["ID","Type","Status","Priority","Cost","Due"].map(h=>(<th key={h} style={th}>{h}</th>))}</tr></thead><tbody>{vWO.slice(0,10).map(w=>(<tr key={w.id}><td style={tc}>{w.id}</td><td style={tc}>{w.type}</td><td style={tc}><Badge label={w.status}/></td><td style={tc}><Badge label={w.priority}/></td><td style={tc}>{w.cost?fmt(w.cost):"-"}</td><td style={tc}>{w.due||"-"}</td></tr>))}</tbody></table></div>}
{vInsp.length>0&&<div style={{marginBottom:16}}><div style={{fontSize:12,fontWeight:600,color:"#24A148",marginBottom:6}}>Inspections ({vInsp.length})</div><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr style={{background:"#F4F4F4"}}>{["Date","Driver","Result"].map(h=>(<th key={h} style={th}>{h}</th>))}</tr></thead><tbody>{vInsp.slice(0,10).map(i=>(<tr key={i.id}><td style={tc}>{i.date}</td><td style={tc}>{i.driver}</td><td style={tc}><Badge label={i.status}/></td></tr>))}</tbody></table></div>}
{vPapers.length>0&&<div style={{marginBottom:16}}><div style={{fontSize:12,fontWeight:600,color:"#6929C4",marginBottom:6}}>Documents ({vPapers.length})</div><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr style={{background:"#F4F4F4"}}>{["Document","Issue","Expiry","Status"].map(h=>(<th key={h} style={th}>{h}</th>))}</tr></thead><tbody>{vPapers.map(p=>(<tr key={p.id}><td style={tc}>{p.docType}</td><td style={tc}>{p.issueDate||"-"}</td><td style={tc}>{p.expiryDate||"-"}</td><td style={tc}><Badge label={p.status}/></td></tr>))}</tbody></table></div>}
{vSvc.length>0&&<div><div style={{fontSize:12,fontWeight:600,color:"#DA1E28",marginBottom:6}}>Service Reminders ({vSvc.length})</div><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr style={{background:"#F4F4F4"}}>{["Type","Status","Next Due","Next Km"].map(h=>(<th key={h} style={th}>{h}</th>))}</tr></thead><tbody>{vSvc.map(s=>(<tr key={s.id}><td style={tc}>{s.type}</td><td style={tc}><Badge label={s.status}/></td><td style={tc}>{s.nextDueDate||"-"}</td><td style={tc}>{s.nextDueKm?.toLocaleString()||"-"}</td></tr>))}</tbody></table></div>}
{vFuel.length===0&&vWO.length===0&&vInsp.length===0&&<div style={{color:"#8D8D8D",fontSize:12}}>No history yet</div>}
</div>);})()}
{odoHist.length>0&&<div style={{marginTop:14,background:"#fff",borderRadius:14,border:"1px solid #E8ECF1",padding:18}}><h4 style={{fontSize:13,fontWeight:700,marginBottom:10}}>Odometer History</h4><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr style={{background:"#F4F4F4"}}>{["Date","Reading","Source"].map(h=>(<th key={h} style={th}>{h}</th>))}</tr></thead><tbody>{odoHist.map(o=>(<tr key={o.id}><td style={tc}>{o.date}</td><td style={{...tc,fontWeight:600}}>{o.reading.toLocaleString()} km</td><td style={tc}><span style={{fontSize:11,padding:"2px 8px",borderRadius:4,background:o.type==="fuel"?"#D0E2FF":"#F4F4F4",color:o.type==="fuel"?P:"#525252",fontWeight:600}}>{o.type==="fuel"?"Fuel Log":"Manual"}</span></td></tr>))}</tbody></table></div>}</div>);}
  return(<div style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"flex",justifyContent:"space-between"}}><div style={{display:"flex",gap:6}}>{["All","Active","In Shop","Out of Service"].map(s=>(<button key={s} onClick={()=>setFilt(s)} style={{padding:"6px 14px",borderRadius:7,border:filt===s?`1.5px solid ${P}`:"1.5px solid #E0E0E0",background:filt===s?"#D0E2FF":"#fff",color:filt===s?P:"#525252",fontSize:12,fontWeight:600,cursor:"pointer"}}>{s} ({s==="All"?vehicles.length:vehicles.filter(v=>v.status===s).length})</button>))}</div>{canEdit&&<button onClick={()=>{setEditV(null);setForm(defForm);setShowAdd(true);}} style={{display:"flex",alignItems:"center",gap:5,padding:"8px 16px",borderRadius:9,background:P,color:"#fff",border:"none",fontSize:12,fontWeight:600,cursor:"pointer"}}><Plus size={15}/>Add Vehicle</button>}</div>
    <div style={{background:"#fff",borderRadius:14,border:"1px solid #E8ECF1",overflow:"hidden"}}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr style={{background:"#F4F4F4"}}>{["Vehicle","Type","Status","Driver","Mileage","Cost/km",canEdit?"Actions":""].filter(Boolean).map(h=>(<th key={h} style={th}>{h}</th>))}</tr></thead><tbody>{list.map(v=>(<tr key={v.id} style={{cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background="#F8FAFF"} onMouseLeave={e=>e.currentTarget.style.background=""}><td style={tc} onClick={()=>setSel(v.id)}><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:18}}>{v.img}</span><div><div style={{fontWeight:600}}>{v.name}</div><div style={{fontSize:11,color:"#8D8D8D"}}>{v.id}</div></div></div></td><td style={tc} onClick={()=>setSel(v.id)}>{v.type}</td><td style={tc} onClick={()=>setSel(v.id)}><Badge label={v.status}/></td><td style={tc} onClick={()=>setSel(v.id)}>{v.driver||"Unassigned"}</td><td style={tc} onClick={()=>setSel(v.id)}>{(v.km||0).toLocaleString()} km</td><td style={tc} onClick={()=>setSel(v.id)}>{(()=>{const c=calcCostKm(v.id);return c>0?fmt(c):"-";})()}</td>{canEdit&&<td style={tc}><div style={{display:"flex",gap:4}}><button onClick={(e)=>{e.stopPropagation();startEdit(v);}} style={{padding:"4px 8px",borderRadius:5,border:"1px solid #E0E0E0",background:"#fff",cursor:"pointer"}}><Pencil size={12} color="#525252"/></button><button onClick={(e)=>{e.stopPropagation();handleDelete(v.id);}} style={{padding:"4px 8px",borderRadius:5,border:"1px solid #E0E0E0",background:"#fff",cursor:"pointer"}}><Trash2 size={12} color="#DA1E28"/></button></div></td>}</tr>))}</tbody></table></div>
    {showAdd&&(<Modal title={editV?"Edit Vehicle":"Add New Vehicle"} onClose={()=>{setShowAdd(false);setEditV(null);}}><Field label="Vehicle Name *"><input style={inp} placeholder="e.g. Toyota Hilux GD-6" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><Field label="Type"><select style={inp} value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option>Pickup</option><option>Van</option><option>Box Truck</option><option>Light Truck</option><option>Heavy Truck</option><option>Semi Truck</option><option>Tipper</option></select></Field><Field label="Year"><input style={inp} type="number" value={form.year} onChange={e=>setForm({...form,year:e.target.value})}/></Field></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><Field label="Status"><select style={inp} value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option>Active</option><option>In Shop</option><option>Out of Service</option></select></Field><Field label="Mileage (km)"><input style={inp} type="number" value={form.km} onChange={e=>setForm({...form,km:e.target.value})}/></Field></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><Field label="Plate"><input style={inp} placeholder="LAG-123-AB" value={form.plate} onChange={e=>setForm({...form,plate:e.target.value})}/></Field><Field label="VIN/SN"><input style={inp} placeholder="Vehicle ID number" value={form.vin||""} onChange={e=>setForm({...form,vin:e.target.value})}/></Field></div><Field label="Driver"><input style={inp} placeholder="Driver name" value={form.driver} onChange={e=>setForm({...form,driver:e.target.value})}/></Field><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><Field label="Location"><select style={inp} value={form.loc} onChange={e=>setForm({...form,loc:e.target.value})}><option value="">-- Select Location --</option>{locations.map(l=>(<option key={l}>{l}</option>))}</select></Field><Field label="Next Service"><input style={inp} type="date" value={form.nextSvc} onChange={e=>setForm({...form,nextSvc:e.target.value})}/></Field></div><div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:8}}><button onClick={()=>{setShowAdd(false);setEditV(null);}} style={{padding:"9px 20px",borderRadius:8,border:"1.5px solid #E0E0E0",background:"#fff",color:"#525252",fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancel</button><button onClick={handleSave} disabled={!form.name} style={{display:"flex",alignItems:"center",gap:6,padding:"9px 20px",borderRadius:8,border:"none",background:form.name?P:"#C6C6C6",color:"#fff",fontSize:13,fontWeight:600,cursor:form.name?"pointer":"not-allowed"}}><Save size={14}/>{editV?"Update":"Save"}</button></div></Modal>)}
  </div>);
}


function MeterSnap({generators,setGenerators,odoLog,setOdoLog,embedded}){
  const [gen,setGen]=useState("");const [photo,setPhoto]=useState(null);const [preview,setPreview]=useState("");
  const [reading,setReading]=useState("");const [readingType,setReadingType]=useState("hours");
  const [analyzing,setAnalyzing]=useState(false);const [confirmed,setConfirmed]=useState(false);
  const [saving,setSaving]=useState(false);const [msg,setMsg]=useState("");const [aiNotes,setAiNotes]=useState("");const [fuelLitres,setFuelLitres]=useState("");const [dieselBought,setDieselBought]=useState("");const [notes,setNotes]=useState("");
  const fileRef={current:null};

  const handlePhoto=async(e)=>{
    const file=e.target.files?.[0];if(!file)return;
    setPhoto(file);setMsg("");setAiNotes("");setReading("");setConfirmed(false);
    const reader=new FileReader();
    reader.onload=(ev)=>{setPreview(ev.target.result);analyzeImage(ev.target.result);};
    reader.readAsDataURL(file);
  };

  const analyzeImage=async(base64)=>{
    setAnalyzing(true);setMsg("Analyzing meter image...");
    try{
      const imgData=base64.split(",")[1];
      const mediaType=base64.startsWith("data:image/png")?"image/png":"image/jpeg";
      const resp=await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",headers:{"Content-Type":"application/json","anthropic-dangerous-direct-browser-access":"true"},
        body:JSON.stringify({
          model:"claude-sonnet-4-20250514",max_tokens:500,
          messages:[{role:"user",content:[
            {type:"image",source:{type:"base64",media_type:mediaType,data:imgData}},
            {type:"text",text:"This is a generator control panel display (commonly DCP-10 or similar). Extract ALL visible readings. These displays typically show: frequency (Hz), RPM, and run hours (labeled Kh, kh, h, or hrs). The run hours reading is the most important one.\n\nReply in JSON only, no markdown backticks:\n{\"readings\": [{\"type\": \"hours\" or \"rpm\" or \"frequency\" or \"voltage\" or \"fuel_level\", \"value\": number, \"unit\": string, \"confidence\": \"high\" or \"medium\" or \"low\"}], \"primary_hours\": number, \"fuel_gauge_percent\": number or null, \"notes\": string}\n\nIMPORTANT: Kh means kilohours (multiply the displayed value by 1000 to get total hours). For example 13.49 Kh = 13490 hours, 18.88 Kh = 18880 hours. If the unit is just h or hrs, the value IS the hours directly. Always return primary_hours as the TOTAL hours (already converted if Kh). If you see a fuel gauge bar, estimate the fill level as a percentage (0-100). The app will convert this to litres based on tank capacity. If display is off or unreadable, set primary_hours to 0."}
          ]}]
        })
      });
      const data=await resp.json();
      const txt=data.content?.[0]?.text||"";
      try{
        const clean=txt.replace(/```json|```/g,"").trim();
        const parsed=JSON.parse(clean);
        setReading(String(parsed.primary_hours||""));
        setReadingType("hours");
        if(parsed.fuel_gauge_percent!=null){const g=generators.find(x=>x.id===gen);const tank=g?.tank||0;if(tank>0)setFuelLitres(String(Math.round(tank*parsed.fuel_gauge_percent/100)));else setFuelLitres("");}
        const allReadings=(parsed.readings||[]).map(r=>r.value+" "+r.unit+" ("+r.type+")").join(", ");
        setAiNotes(allReadings+(parsed.notes?" | "+parsed.notes:""));
        setMsg(parsed.primary_hours>0?"Readings detected! Please verify.":"Could not read clearly - please enter manually.");
      }catch{setMsg("Could not parse reading - please enter manually");setAiNotes(txt);}
    }catch(e){setMsg("Analysis failed: "+e.message);}
    setAnalyzing(false);
  };

  const handleSave=async()=>{
    if(!gen||!reading)return;setSaving(true);setMsg("");
    const val=parseFloat(reading);
    const fuel=parseFloat(fuelLitres)||null;
    const diesel=parseFloat(dieselBought)||0;
    try{
      // Try to get location
      let loc=null;
      try{const pos=await new Promise((res,rej)=>navigator.geolocation.getCurrentPosition(res,rej,{timeout:5000}));loc={lat:pos.coords.latitude,lng:pos.coords.longitude};}catch{}
      // Upload photo to Supabase Storage
      let photoUrl="";
      if(photo){
        const ext=photo.name.split(".").pop();
        const path="meter-readings/"+gen+"-"+Date.now()+"."+ext;
        const{data:upData,error:upErr}=await supabase.storage.from("meter-photos").upload(path,photo);
        if(!upErr&&upData){const{data:urlData}=supabase.storage.from("meter-photos").getPublicUrl(path);photoUrl=urlData?.publicUrl||"";}
      }
      // Save reading log with all data
      const now=new Date();
      const logEntry={asset:gen,reading:val,date:now.toISOString().split("T")[0],type:"photo",fuel_litres:fuel,diesel_bought:diesel,photo_url:photoUrl,location:loc?JSON.stringify(loc):null,notes:notes,timestamp:now.toISOString()};
      const saved=await db.addOdoLog(logEntry);
      if(saved){setOdoLog(prev=>[...prev,toOdo(saved)]);}
      // Update generator hours
      await db.updateGenerator(gen,{hrs:val});
      setGenerators(prev=>prev.map(g=>g.id===gen?{...g,hrs:val}:g));
      // Check for discrepancy flag
      const prevLogs=odoLog.filter(o=>o.asset===gen).sort((a,b)=>b.date.localeCompare(a.date));
      if(prevLogs.length>0&&diesel>0){
        const lastReading=prevLogs[0].reading;
        const hrsUsed=val-lastReading;
        const genData=generators.find(g=>g.id===gen);
        const avgLPerHr=genData?.tank?genData.tank/10:15;
        const expectedDiesel=hrsUsed*avgLPerHr;
        const diff=Math.abs(diesel-expectedDiesel);
        if(diff>expectedDiesel*0.4){
          setMsg("Saved! WARNING: Diesel purchased ("+diesel+"L) vs expected consumption (~"+Math.round(expectedDiesel)+"L for "+hrsUsed.toFixed(0)+" hrs) shows a significant discrepancy.");
        }else{setMsg("Reading saved! Diesel usage looks consistent.");}
      }else{setMsg("Reading saved successfully!");}
      setConfirmed(true);
      setTimeout(()=>{setPhoto(null);setPreview("");setReading("");setGen("");setFuelLitres("");setDieselBought("");setNotes("");setConfirmed(false);setMsg("");setAiNotes("");},4000);
    }catch(e){setMsg("Error: "+e.message);}
    setSaving(false);
  };

  const inner=(<div>
      <Field label="Generator *"><SearchSelect options={generators.map(g=>({value:g.id,label:g.name+" ("+g.id+")"}))} value={gen} onChange={v=>setGen(v)} placeholder="Select generator..."/></Field>
      {gen&&<><div style={{marginBottom:14}}><label style={{display:"block",fontSize:12,fontWeight:600,color:"#525252",marginBottom:6}}>Photo of Meter</label>
        {!preview?(<div onClick={()=>document.getElementById("meter-file-input").click()} style={{border:"2px dashed #D0E2FF",borderRadius:12,padding:"30px 20px",textAlign:"center",cursor:"pointer",background:"#F8FAFF"}}><Camera size={32} color={P} style={{marginBottom:8}}/><div style={{fontSize:13,fontWeight:600,color:P}}>Tap to take photo</div><div style={{fontSize:11,color:"#8D8D8D",marginTop:4}}>or choose from gallery</div></div>)
        :(<div style={{position:"relative"}}><img src={preview} style={{width:"100%",borderRadius:12,maxHeight:300,objectFit:"cover"}}/><button onClick={()=>{setPreview("");setPhoto(null);setReading("");setAiNotes("");setFuelLitres("");}} style={{position:"absolute",top:8,right:8,background:"rgba(0,0,0,0.6)",border:"none",borderRadius:"50%",width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}><X size={14} color="#fff"/></button></div>)}
        <input id="meter-file-input" type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={handlePhoto}/></div>
        {analyzing&&<div style={{display:"flex",alignItems:"center",gap:8,padding:12,background:"#D0E2FF",borderRadius:8,marginBottom:12}}><div style={{width:18,height:18,border:"2px solid "+P,borderTop:"2px solid transparent",borderRadius:"50%",animation:"spin 1s linear infinite"}}/><span style={{fontSize:12,fontWeight:600,color:P}}>Analyzing meter...</span></div>}
        {aiNotes&&<div style={{padding:10,background:"#F4F4F4",borderRadius:8,fontSize:12,color:"#525252",marginBottom:12}}>AI: {aiNotes}</div>}
        <div style={{background:"#F8FAFF",borderRadius:10,padding:14,marginBottom:12,border:"1px solid #D0E2FF"}}>
          <div style={{fontSize:11,fontWeight:700,color:P,marginBottom:10,textTransform:"uppercase",letterSpacing:"0.05em"}}>Detected Readings</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Field label="Run Hours *"><input style={{...inp,fontSize:20,fontWeight:700,textAlign:"center"}} type="number" step="0.1" placeholder="0" value={reading} onChange={e=>setReading(e.target.value)}/></Field>
            <Field label="Fuel Level (L)"><input style={{...inp,fontSize:20,fontWeight:700,textAlign:"center"}} type="number" placeholder="-" value={fuelLitres} onChange={e=>setFuelLitres(e.target.value)}/></Field>
          </div>
          {fuelLitres&&(()=>{const g=generators.find(x=>x.id===gen);const tank=g?.tank||0;const pct=tank>0?Math.min(100,Math.round(parseFloat(fuelLitres)/tank*100)):50;return <div style={{marginTop:8}}><div style={{height:10,borderRadius:5,background:"#E0E0E0",overflow:"hidden"}}><div style={{height:"100%",borderRadius:5,background:pct>50?"#24A148":pct>20?"#FF832B":"#DA1E28",width:pct+"%",transition:"width 0.3s"}}/></div>{tank>0&&<div style={{fontSize:11,color:"#8D8D8D",marginTop:4}}>{fuelLitres}L of {tank}L tank ({pct}%)</div>}</div>;})()}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Field label="Diesel Bought (L)"><input style={inp} type="number" placeholder="e.g. 200 (if refueled)" value={dieselBought} onChange={e=>setDieselBought(e.target.value)}/></Field>
          <Field label="Notes"><input style={inp} placeholder="e.g. refueled today" value={notes} onChange={e=>setNotes(e.target.value)}/></Field>
        </div>
        {msg&&<div style={{marginTop:10,padding:10,borderRadius:8,background:msg.startsWith("Error")?"#DA1E2818":confirmed?"#24A14818":"#D0E2FF",color:msg.startsWith("Error")?"#DA1E28":confirmed?"#24A148":P,fontSize:12,fontWeight:500}}>{msg}</div>}
        <button onClick={handleSave} disabled={!reading||saving||confirmed} style={{width:"100%",marginTop:14,padding:"13px",borderRadius:10,border:"none",background:(reading&&!saving&&!confirmed)?P:"#C6C6C6",color:"#fff",fontSize:14,fontWeight:700,cursor:(reading&&!saving&&!confirmed)?"pointer":"not-allowed"}}>{saving?"Saving...":confirmed?"Saved!":"Confirm & Save Reading"}</button>
      </>}
    </div>);
  if(embedded)return inner;
  return(<div style={{maxWidth:500,margin:"0 auto"}}><div style={{background:"#fff",borderRadius:16,border:"1px solid #E8ECF1",overflow:"hidden"}}>
    <div style={{background:"linear-gradient(135deg,#0F1A2E,#1A3A6B)",padding:"20px 24px",color:"#fff"}}><div style={{display:"flex",alignItems:"center",gap:10}}><Camera size={22}/><div><h3 style={{fontSize:16,fontWeight:700,margin:0}}>Snap Meter Reading</h3><div style={{fontSize:11,color:"rgba(255,255,255,0.6)"}}>Take a photo of your generator meter</div></div></div></div>
    <div style={{padding:20}}>{inner}</div>
  </div></div>);
}

function GenPage({generators,setGenerators,locations,fuelLogs,canEdit,odoLog,setOdoLog,dieselReadings}){
  const [sel,setSel]=useState(null);const [filt,setFilt]=useState("All");const [showAdd,setShowAdd]=useState(false);const [showSnap,setShowSnap]=useState(false);const [editG,setEditG]=useState(null);const [showHrs,setShowHrs]=useState(false);const [hrsVal,setHrsVal]=useState("");const [hrsDate,setHrsDate]=useState("2026-02-27");
  const defForm={name:"",brand:"",cap:"",status:"Active",hrs:"0",loc:locations[0]||"",nextSvc:"",costHr:"",tank:"",assigned:""};
  const [form,setForm]=useState(defForm);
  // Show ALL generators (was previously filtered to only those with a location set,
  // which hid imported generators that had empty loc fields).
  const assigned=generators;const list=filt==="All"?assigned:assigned.filter(g=>g.status===filt);
  const handleSave=async()=>{try{if(editG){const up=fromG({...form,hrs:parseInt(form.hrs)||0,costHr:parseInt(form.costHr)||0,tank:parseInt(form.tank)||0,id:editG});await db.updateGenerator(editG,up);setGenerators(generators.map(g=>g.id===editG?{...g,...form,hrs:parseInt(form.hrs)||0,costHr:parseInt(form.costHr)||0,tank:parseInt(form.tank)||0}:g));setEditG(null);}else{const nid=(typeof crypto!=="undefined"&&crypto.randomUUID)?crypto.randomUUID():`G-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;const ng=fromG({id:nid,...form,hrs:parseInt(form.hrs)||0,costHr:parseInt(form.costHr)||0,tank:parseInt(form.tank)||0});const saved=await db.addGenerator(ng);if(saved){setGenerators(prev=>[...prev,toG(saved)]);}else{const all=await db.getGenerators();setGenerators(all.map(toG));}}setShowAdd(false);setForm(defForm);}catch(e){alert("Error: "+e.message);}};
  const handleDelete=async(id)=>{if(confirm("Delete this generator?")){try{await db.deleteGenerator(id);setGenerators(generators.filter(g=>g.id!==id));if(sel===id)setSel(null);}catch(e){alert("Error: "+e.message);}}};
  const startEdit=(g)=>{setForm({name:g.name,brand:g.brand||"",cap:g.cap||"",status:g.status,hrs:String(g.hrs||0),loc:g.loc||"",nextSvc:g.nextSvc||"",costHr:String(g.costHr||""),tank:String(g.tank||""),assigned:g.assigned||""});setEditG(g.id);setShowAdd(true);};
  const addHrsReading=async(gid)=>{const val=parseFloat(hrsVal);if(!val)return;try{const saved=await db.addOdoLog({asset:gid,reading:val,date:hrsDate,type:"manual"});setOdoLog([...odoLog,toOdo(saved)]);await db.updateGenerator(gid,{hrs:val});setGenerators(generators.map(g=>g.id===gid?{...g,hrs:val}:g));setShowHrs(false);setHrsVal("");}catch(e){alert("Error: "+e.message);}};
  const gHrsHistory=(gid)=>odoLog.filter(o=>o.asset===gid).sort((a,b)=>b.date.localeCompare(a.date));
  if(sel){const g=generators.find(x=>x.id===sel);if(!g){setSel(null);return null;}const hrsHist=gHrsHistory(g.id);
    const aReadings=(dieselReadings||[]).filter(r=>r.generatorId===g.id).sort((a,b)=>b.date.localeCompare(a.date));
    const isOvenAsset=g.assetType==="oven";
    const tBatches=aReadings.reduce((s,r)=>s+(r.batchesProduced||0),0);
    const tConsumed=aReadings.reduce((s,r)=>s+(r.consumptionLitres||0),0);
    return(<div><div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}><button onClick={()=>setSel(null)} style={{display:"flex",alignItems:"center",gap:4,background:"none",border:"none",cursor:"pointer",color:P,fontSize:13,fontWeight:600}}><ChevronLeft size={16}/> Back</button>{canEdit&&<div style={{display:"flex",gap:6}}><button onClick={()=>{startEdit(g);setSel(null);}} style={{display:"flex",alignItems:"center",gap:4,padding:"7px 14px",borderRadius:8,border:"1.5px solid #E0E0E0",background:"#fff",fontSize:12,fontWeight:600,cursor:"pointer",color:"#525252"}}><Pencil size={13}/>Edit</button><button onClick={()=>handleDelete(g.id)} style={{display:"flex",alignItems:"center",gap:4,padding:"7px 14px",borderRadius:8,border:"1.5px solid #E0E0E0",background:"#fff",fontSize:12,fontWeight:600,cursor:"pointer",color:"#DA1E28"}}><Trash2 size={13}/>Delete</button></div>}</div><div style={{background:"#fff",borderRadius:14,border:"1px solid #E8ECF1",overflow:"hidden"}}><div style={{background:"linear-gradient(135deg,#1a1a2e,#0f3460)",padding:"22px 26px",color:"#fff"}}><h2 style={{fontSize:18,fontWeight:700,margin:0}}>{g.name}</h2><div style={{fontSize:12,color:"rgba(255,255,255,0.6)",marginTop:2}}>{g.id} - {g.brand} - {g.cap}</div></div><div style={{padding:22,display:"grid",gridTemplateColumns:window.innerWidth<768?"1fr 1fr":"1fr 1fr 1fr",gap:14}}>{(isOvenAsset
      ?[["Total Batches",tBatches?tBatches.toLocaleString():"-"],["Avg L/Batch",(tBatches>0&&tConsumed>0)?(tConsumed/tBatches).toFixed(2)+" L":"-"],["Total Consumed",tConsumed?tConsumed.toLocaleString()+" L":"-"],["Location",g.loc||"-"],["Readings",aReadings.length||"-"],["Last Reading",aReadings[0]?.date||"-"],["Tank",g.tank?`${g.tank} L`:"-"],["Capacity",g.cap||"-"],["Assigned",g.assigned||"-"]]
      :[["Run Hours",`${(g.hrs||0).toLocaleString()} hrs`],["Cost/Hour",g.costHr?fmt(g.costHr):"-"],["Capacity",g.cap||"-"],["Location",g.loc||"-"],["Fuel Type",g.fuelType||"-"],["Assigned",g.assigned||"-"],["Tank",g.tank?`${g.tank} L`:"-"],["Next Service",g.nextSvc||"-"],["Fuel Costs (Life)",g.fuelCostLife?fmt(g.fuelCostLife):"-"],["Service Costs (Life)",g.svcCostLife?fmt(g.svcCostLife):"-"]]
    ).map(([l,val])=>(<div key={l}><div style={{fontSize:11,color:"#8D8D8D"}}>{l}</div><div style={{fontSize:14,fontWeight:600,marginTop:2}}>{val}</div></div>))}</div></div>
    {aReadings.length>0&&<div style={{marginTop:14,background:"#fff",borderRadius:14,border:"1px solid #E8ECF1",padding:18}}>
      <h4 style={{fontSize:13,fontWeight:700,marginBottom:10}}>Recent Diesel Readings ({aReadings.length})</h4>
      <div style={{overflow:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:isOvenAsset?480:560}}><thead><tr style={{background:"#F4F4F4"}}>{(isOvenAsset?["Date","Batches","Consumed (L)","Level (L)","L/Batch"]:["Date","Open Hrs","Close Hrs","Hours Run","Consumed (L)","Level (L)","Flag"]).map(h=>(<th key={h} style={th}>{h}</th>))}</tr></thead>
      <tbody>{aReadings.slice(0,14).map(r=>(isOvenAsset
        ?<tr key={r.id} style={{borderBottom:"1px solid #F4F4F4"}}><td style={tc}>{r.date}</td><td style={{...tc,fontWeight:600,color:"#8B5CF6"}}>{r.batchesProduced!=null?r.batchesProduced.toLocaleString():"-"}</td><td style={tc}>{r.consumptionLitres!=null?r.consumptionLitres.toLocaleString():"-"}</td><td style={tc}>{r.dieselLevelActual!=null?r.dieselLevelActual.toLocaleString():"-"}</td><td style={{...tc,fontWeight:600}}>{(r.batchesProduced>0&&r.consumptionLitres>0)?(r.consumptionLitres/r.batchesProduced).toFixed(2):"-"}</td></tr>
        :<tr key={r.id} style={{borderBottom:"1px solid #F4F4F4",background:r.discrepancyFlag?"#FFF6F6":""}}><td style={tc}>{r.date}</td><td style={tc}>{r.genHoursOpening!=null?r.genHoursOpening.toLocaleString():"-"}</td><td style={tc}>{r.genHoursClosing!=null?r.genHoursClosing.toLocaleString():"-"}</td><td style={{...tc,fontWeight:600}}>{r.hoursRun?r.hoursRun.toFixed(1):"-"}</td><td style={tc}>{r.consumptionLitres!=null?r.consumptionLitres.toLocaleString():"-"}</td><td style={tc}>{r.dieselLevelActual!=null?r.dieselLevelActual.toLocaleString():"-"}</td><td style={tc}>{r.discrepancyFlag?<AlertTriangle size={13} color="#DA1E28"/>:"-"}</td></tr>
      ))}</tbody></table></div>
      {aReadings.length>14&&<div style={{fontSize:11,color:"#8D8D8D",marginTop:6}}>Showing latest 14 — full history in Diesel Management → readings (filter: {g.name})</div>}
    </div>}{canEdit&&!isOvenAsset&&<div style={{marginTop:14}}><button onClick={()=>setShowHrs(true)} style={{display:"flex",alignItems:"center",gap:5,padding:"9px 16px",borderRadius:9,background:P,color:"#fff",border:"none",fontSize:12,fontWeight:600,cursor:"pointer"}}><Clock size={14}/>Update Run Hours</button></div>}{showHrs&&(<Modal title="Update Run Hours" onClose={()=>setShowHrs(false)}><div style={{padding:"10px 0 6px",background:"#F4F4F4",borderRadius:8,textAlign:"center",marginBottom:14}}><div style={{fontSize:11,color:"#8D8D8D"}}>Current Hours</div><div style={{fontSize:20,fontWeight:700}}>{(g.hrs||0).toLocaleString()} hrs</div></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><Field label="New Hours *"><input style={inp} type="number" placeholder="e.g. 4900" value={hrsVal} onChange={e=>setHrsVal(e.target.value)}/></Field><Field label="Date"><input style={inp} type="date" value={hrsDate} onChange={e=>setHrsDate(e.target.value)}/></Field></div><div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:8}}><button onClick={()=>setShowHrs(false)} style={{padding:"9px 20px",borderRadius:8,border:"1.5px solid #E0E0E0",background:"#fff",color:"#525252",fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancel</button><button onClick={()=>addHrsReading(g.id)} disabled={!hrsVal} style={{padding:"9px 20px",borderRadius:8,border:"none",background:hrsVal?P:"#C6C6C6",color:"#fff",fontSize:13,fontWeight:600,cursor:hrsVal?"pointer":"not-allowed"}}><Save size={14}/> Save</button></div></Modal>)}{(()=>{const gFuel=fuelLogs?fuelLogs.filter(f=>f.asset===g.id&&f.isGen):[];return gFuel.length>0?(<div style={{marginTop:14,background:"#fff",borderRadius:14,border:"1px solid #E8ECF1",padding:18}}><h4 style={{fontSize:13,fontWeight:700,marginBottom:10}}>Fuel History ({gFuel.length})</h4><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr style={{background:"#F4F4F4"}}>{["Date","Litres","Cost","Reading","Station"].map(h=>(<th key={h} style={th}>{h}</th>))}</tr></thead><tbody>{gFuel.slice(0,10).map(f=>(<tr key={f.id}><td style={tc}>{f.date}</td><td style={tc}>{f.litres} L</td><td style={{...tc,fontWeight:600}}>{fmt(f.cost)}</td><td style={tc}>{f.reading?.toLocaleString()||"-"} hrs</td><td style={tc}>{f.station||"-"}</td></tr>))}</tbody></table>{gFuel.length>10&&<div style={{fontSize:11,color:"#8D8D8D",marginTop:4}}>{gFuel.length-10} more entries...</div>}</div>):null;})()}
{hrsHist.length>0&&<div style={{marginTop:14,background:"#fff",borderRadius:14,border:"1px solid #E8ECF1",padding:18}}><h4 style={{fontSize:13,fontWeight:700,marginBottom:10}}>Run Hours History</h4><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr style={{background:"#F4F4F4"}}>{["Date","Reading","Source"].map(h=>(<th key={h} style={th}>{h}</th>))}</tr></thead><tbody>{hrsHist.map(o=>(<tr key={o.id}><td style={tc}>{o.date}</td><td style={{...tc,fontWeight:600}}>{o.reading.toLocaleString()} hrs</td><td style={tc}><span style={{fontSize:11,padding:"2px 8px",borderRadius:4,background:o.type==="fuel"?"#D0E2FF":"#F4F4F4",color:o.type==="fuel"?P:"#525252",fontWeight:600}}>{o.type==="fuel"?"Fuel Log":"Manual"}</span></td></tr>))}</tbody></table></div>}</div>);}
  return(<div style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"grid",gridTemplateColumns:window.innerWidth<768?"1fr 1fr":"repeat(3,1fr)",gap:14}}><Kpi icon={Zap} label="Active" value={`${assigned.filter(g=>g.status==="Active").length}/${assigned.length}`}/><Kpi icon={Gauge} label="Total Run Hours" value={assigned.reduce((s,g)=>s+(g.hrs||0),0).toLocaleString()}/><Kpi icon={Clock} label="In Maintenance" value={assigned.filter(g=>g.status==="In Maintenance").length} accent="#FF832B"/></div>
    <div style={{display:"flex",justifyContent:"space-between"}}><div style={{display:"flex",gap:6}}>{["All","Active","In Maintenance","Standby"].map(s=>(<button key={s} onClick={()=>setFilt(s)} style={{padding:"6px 14px",borderRadius:7,border:filt===s?`1.5px solid ${P}`:"1.5px solid #E0E0E0",background:filt===s?"#D0E2FF":"#fff",color:filt===s?P:"#525252",fontSize:12,fontWeight:600,cursor:"pointer"}}>{s} ({s==="All"?assigned.length:assigned.filter(g=>g.status===s).length})</button>))}</div>{canEdit&&<div style={{display:"flex",gap:6}}><button onClick={()=>setShowSnap(true)} style={{display:"flex",alignItems:"center",gap:5,padding:"8px 14px",borderRadius:9,border:"1.5px solid "+P,background:"#D0E2FF",color:P,fontSize:12,fontWeight:600,cursor:"pointer"}}><Camera size={14}/>Snap Reading</button><button onClick={()=>{setEditG(null);setForm(defForm);setShowAdd(true);}} style={{display:"flex",alignItems:"center",gap:5,padding:"8px 16px",borderRadius:9,background:P,color:"#fff",border:"none",fontSize:12,fontWeight:600,cursor:"pointer"}}><Plus size={15}/>Add Generator</button></div>}</div>
    <div style={{background:"#fff",borderRadius:14,border:"1px solid #E8ECF1",overflow:"hidden"}}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr style={{background:"#F4F4F4"}}>{["Generator","Capacity","Status","Location","Run Hours","Cost/Hr",canEdit?"Actions":""].filter(Boolean).map(h=>(<th key={h} style={th}>{h}</th>))}</tr></thead><tbody>{list.map(g=>(<tr key={g.id} style={{cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background="#F8FAFF"} onMouseLeave={e=>e.currentTarget.style.background=""}><td style={tc} onClick={()=>setSel(g.id)}><div style={{display:"flex",alignItems:"center",gap:8}}><span>{g.assetType==="oven"?"🔥":"⚡"}</span><div><div style={{fontWeight:600,display:"flex",alignItems:"center",gap:6}}>{g.name}{g.assetType==="oven"&&<span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:4,background:"#EDE7F6",color:"#8B5CF6"}}>OVEN</span>}</div><div style={{fontSize:11,color:"#8D8D8D"}}>{g.id}</div></div></div></td><td style={tc} onClick={()=>setSel(g.id)}>{g.cap||"-"}</td><td style={tc} onClick={()=>setSel(g.id)}><Badge label={g.status}/></td><td style={tc} onClick={()=>setSel(g.id)}>{g.loc?g.loc:<span style={{fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:4,background:"#FFF3E0",color:"#E65100"}}>Unassigned</span>}</td><td style={tc} onClick={()=>setSel(g.id)}>{(g.hrs||0).toLocaleString()} hrs</td><td style={tc} onClick={()=>setSel(g.id)}>{g.costHr?fmt(g.costHr):"-"}</td>{canEdit&&<td style={tc}><div style={{display:"flex",gap:4}}><button onClick={(e)=>{e.stopPropagation();startEdit(g);}} style={{padding:"4px 8px",borderRadius:5,border:"1px solid #E0E0E0",background:"#fff",cursor:"pointer"}}><Pencil size={12} color="#525252"/></button><button onClick={(e)=>{e.stopPropagation();handleDelete(g.id);}} style={{padding:"4px 8px",borderRadius:5,border:"1px solid #E0E0E0",background:"#fff",cursor:"pointer"}}><Trash2 size={12} color="#DA1E28"/></button></div></td>}</tr>))}</tbody></table></div>
    {showSnap&&(<div style={{position:"fixed",inset:0,background:"#F7F8FC",zIndex:1000,overflow:"auto",padding:isMob()?"16px":"30px 40px"}}><div style={{maxWidth:600,margin:"0 auto"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}><h2 style={{fontSize:18,fontWeight:700,margin:0}}>Snap Meter Reading</h2><button onClick={()=>setShowSnap(false)} style={{display:"flex",alignItems:"center",gap:5,padding:"8px 16px",borderRadius:8,border:"1.5px solid #E0E0E0",background:"#fff",fontSize:12,fontWeight:600,cursor:"pointer",color:"#525252"}}><X size={14}/>Close</button></div><MeterSnap generators={generators} setGenerators={setGenerators} odoLog={odoLog} setOdoLog={setOdoLog} embedded/></div></div>)}
        {showAdd&&(<Modal title={editG?"Edit Generator":"Add New Generator"} onClose={()=>{setShowAdd(false);setEditG(null);}}><Field label="Name *"><input style={inp} placeholder="e.g. Caterpillar C15 500kVA" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><Field label="Brand"><input style={inp} placeholder="Caterpillar" value={form.brand} onChange={e=>setForm({...form,brand:e.target.value})}/></Field><Field label="Capacity"><input style={inp} placeholder="500 kVA" value={form.cap} onChange={e=>setForm({...form,cap:e.target.value})}/></Field></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><Field label="Status"><select style={inp} value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option>Active</option><option>In Maintenance</option><option>Standby</option></select></Field><Field label="Run Hours"><input style={inp} type="number" value={form.hrs} onChange={e=>setForm({...form,hrs:e.target.value})}/></Field></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><Field label="Cost/Hour"><input style={inp} type="number" placeholder="3200" value={form.costHr} onChange={e=>setForm({...form,costHr:e.target.value})}/></Field><Field label="Tank (L)"><input style={inp} type="number" placeholder="1000" value={form.tank} onChange={e=>setForm({...form,tank:e.target.value})}/></Field></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><Field label="Location"><select style={inp} value={form.loc} onChange={e=>setForm({...form,loc:e.target.value})}><option value="">-- Select Location --</option>{locations.map(l=>(<option key={l}>{l}</option>))}</select></Field><Field label="Next Service"><input style={inp} type="date" value={form.nextSvc} onChange={e=>setForm({...form,nextSvc:e.target.value})}/></Field></div><Field label="Assigned To"><input style={inp} placeholder="e.g. Main Office" value={form.assigned} onChange={e=>setForm({...form,assigned:e.target.value})}/></Field><div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:8}}><button onClick={()=>{setShowAdd(false);setEditG(null);}} style={{padding:"9px 20px",borderRadius:8,border:"1.5px solid #E0E0E0",background:"#fff",color:"#525252",fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancel</button><button onClick={handleSave} disabled={!form.name} style={{display:"flex",alignItems:"center",gap:6,padding:"9px 20px",borderRadius:8,border:"none",background:form.name?P:"#C6C6C6",color:"#fff",fontSize:13,fontWeight:600,cursor:form.name?"pointer":"not-allowed"}}><Save size={14}/>{editG?"Update":"Save"}</button></div></Modal>)}
  </div>);
}


function DriversPage({drivers,setDrivers,canEdit}){
  const [showAdd,setShowAdd]=useState(false);const [editD,setEditD]=useState(null);
  const defForm={name:"",license:"Class C",status:"On Duty",phone:"+234 "};
  const [form,setForm]=useState(defForm);
  const handleSave=async()=>{try{if(editD){await db.updateDriver(editD,{name:form.name,license:form.license,status:form.status,phone:form.phone});setDrivers(drivers.map(d=>d.id===editD?{...d,name:form.name,license:form.license,status:form.status,phone:form.phone}:d));setEditD(null);}else{const nid=`D-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,5).toUpperCase()}`;const saved=await db.addDriver({id:nid,name:form.name,license:form.license,status:form.status,phone:form.phone,trips:0,rating:0,violations:0,certs:[]});if(saved){setDrivers(prev=>[...prev,saved]);}else{const all=await db.getDrivers();setDrivers(all);}}setShowAdd(false);setForm(defForm);}catch(e){alert("Error: "+e.message);}};
  const handleDelete=async(id)=>{if(confirm("Delete this driver?")){try{await db.deleteDriver(id);setDrivers(drivers.filter(d=>d.id!==id));}catch(e){alert("Error: "+e.message);}}};
  const startEdit=(d)=>{setForm({name:d.name,license:d.license||"Class C",status:d.status,phone:d.phone||""});setEditD(d.id);setShowAdd(true);};
  return(<div style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"flex",justifyContent:"flex-end"}}>{canEdit&&<button onClick={()=>{setEditD(null);setForm(defForm);setShowAdd(true);}} style={{display:"flex",alignItems:"center",gap:5,padding:"8px 16px",borderRadius:9,background:P,color:"#fff",border:"none",fontSize:12,fontWeight:600,cursor:"pointer"}}><Plus size={15}/>Add Driver</button>}</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:14}}>{drivers.map(d=>(<div key={d.id} style={{background:"#fff",borderRadius:14,border:"1px solid #E8ECF1",padding:18}}><div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}><div style={{width:42,height:42,borderRadius:"50%",background:`linear-gradient(135deg,${P},#6929C4)`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:14,fontWeight:700}}>{d.name.split(" ").map(w=>w[0]).join("")}</div><div style={{flex:1}}><div style={{fontWeight:700,fontSize:14}}>{d.name}</div><div style={{fontSize:11,color:"#8D8D8D"}}>{d.id} - {d.license}</div></div><Badge label={d.status}/></div><div style={{fontSize:12,color:"#525252",marginBottom:8}}>{d.phone||"-"}</div><div style={{display:"flex",gap:14,marginBottom:10}}>{[["Trips",d.trips||0],["Rating",(d.rating||0)+"/5"],["Violations",d.violations||0]].map(([l,v])=>(<div key={l}><div style={{fontSize:10,color:"#8D8D8D"}}>{l}</div><div style={{fontSize:14,fontWeight:700}}>{v}</div></div>))}</div>{d.certs&&d.certs.length>0&&<div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:8}}>{d.certs.map(c=>(<span key={c} style={{fontSize:10,padding:"2px 8px",borderRadius:4,background:"#D0E2FF",color:P,fontWeight:600}}>{c}</span>))}</div>}{canEdit&&<div style={{display:"flex",gap:6,borderTop:"1px solid #F4F4F4",paddingTop:10}}><button onClick={()=>startEdit(d)} style={{display:"flex",alignItems:"center",gap:4,padding:"5px 10px",borderRadius:6,border:"1px solid #E0E0E0",background:"#fff",fontSize:11,fontWeight:600,cursor:"pointer",color:"#525252"}}><Pencil size={11}/>Edit</button><button onClick={()=>handleDelete(d.id)} style={{display:"flex",alignItems:"center",gap:4,padding:"5px 10px",borderRadius:6,border:"1px solid #E0E0E0",background:"#fff",fontSize:11,fontWeight:600,cursor:"pointer",color:"#DA1E28"}}><Trash2 size={11}/>Delete</button></div>}</div>))}</div>
    {showAdd&&(<Modal title={editD?"Edit Driver":"Add New Driver"} onClose={()=>{setShowAdd(false);setEditD(null);}}><Field label="Full Name *"><input style={inp} placeholder="e.g. Chinedu Okafor" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><Field label="License Class"><select style={inp} value={form.license} onChange={e=>setForm({...form,license:e.target.value})}><option>Class C</option><option>Class D</option><option>Class E</option></select></Field><Field label="Status"><select style={inp} value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option>On Duty</option><option>Off Duty</option></select></Field></div><Field label="Phone"><input style={inp} placeholder="+234 xxx xxx xxxx" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></Field><div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:8}}><button onClick={()=>{setShowAdd(false);setEditD(null);}} style={{padding:"9px 20px",borderRadius:8,border:"1.5px solid #E0E0E0",background:"#fff",color:"#525252",fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancel</button><button onClick={handleSave} disabled={!form.name} style={{display:"flex",alignItems:"center",gap:6,padding:"9px 20px",borderRadius:8,border:"none",background:form.name?P:"#C6C6C6",color:"#fff",fontSize:13,fontWeight:600,cursor:form.name?"pointer":"not-allowed"}}><Save size={14}/>{editD?"Update":"Save"}</button></div></Modal>)}
  </div>);
}


function WOPage({workOrders,setWorkOrders,vehicles,generators,vendors,canEdit}){
  const [filt,setFilt]=useState("All");const [showAdd,setShowAdd]=useState(false);const [editW,setEditW]=useState(null);const [woFilt,setWoFilt]=useState("All");const [woQ,setWoQ]=useState("");
  const defForm={asset:"",type:"Repair",priority:"Medium",desc:"",assignee:"",due:"",cost:"",isGen:false};
  const [form,setForm]=useState(defForm);
  const list=filt==="All"?workOrders:workOrders.filter(w=>w.status===filt);
  const handleSave=async()=>{try{if(editW){const up=fromWO({...form,id:editW,cost:parseFloat(form.cost)||0});await db.updateWorkOrder(editW,up);setWorkOrders(workOrders.map(w=>w.id===editW?{...w,...form,cost:parseFloat(form.cost)||0}:w));setEditW(null);}else{const nid=`WO-${Date.now().toString(36).toUpperCase()}`;const nw=fromWO({id:nid,...form,status:"Open",cost:parseFloat(form.cost)||0});const saved=await db.addWorkOrder(nw);if(saved){setWorkOrders(prev=>[...prev,toWO(saved)]);}else{const all=await db.getWorkOrders();setWorkOrders(all.map(toWO));}}setShowAdd(false);setForm(defForm);}catch(e){alert("Error: "+e.message);}};
  const handleDelete=async(id)=>{if(confirm("Delete this work order?")){try{await db.deleteWorkOrder(id);setWorkOrders(workOrders.filter(w=>w.id!==id));}catch(e){alert("Error: "+e.message);}}};
  const startEdit=(w)=>{setForm({asset:w.asset,type:w.type,priority:w.priority,desc:w.desc||"",assignee:w.assignee||"",due:w.due||"",cost:String(w.cost||""),isGen:w.isGen||false,status:w.status});setEditW(w.id);setShowAdd(true);};
  return(<div style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"flex",justifyContent:"space-between"}}><div style={{display:"flex",gap:6}}>{["All","Open","In Progress","Completed"].map(s=>(<button key={s} onClick={()=>setFilt(s)} style={{padding:"6px 14px",borderRadius:7,border:filt===s?`1.5px solid ${P}`:"1.5px solid #E0E0E0",background:filt===s?"#D0E2FF":"#fff",color:filt===s?P:"#525252",fontSize:12,fontWeight:600,cursor:"pointer"}}>{s} ({s==="All"?workOrders.length:workOrders.filter(w=>w.status===s).length})</button>))}</div>{canEdit&&<button onClick={()=>{setEditW(null);setForm(defForm);setShowAdd(true);}} style={{display:"flex",alignItems:"center",gap:5,padding:"8px 16px",borderRadius:9,background:P,color:"#fff",border:"none",fontSize:12,fontWeight:600,cursor:"pointer"}}><Plus size={15}/>New Work Order</button>}</div>
    {list.map(wo=>(<div key={wo.id} style={{background:"#fff",borderRadius:12,border:"1px solid #E8ECF1",padding:"14px 18px",display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{flex:1}}><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:14,fontWeight:700}}>{wo.id}</span><span style={{fontSize:11,padding:"2px 8px",borderRadius:4,background:"#F4F4F4",fontWeight:600}}>{wo.type}</span>{wo.isGen&&<span style={{fontSize:10,padding:"2px 6px",borderRadius:4,background:"#E8DAFF",color:"#6929C4",fontWeight:600}}>Gen</span>}<Badge label={wo.priority}/></div><div style={{fontSize:13,color:"#393939",marginTop:4}}>{wo.desc}</div><div style={{fontSize:11,color:"#8D8D8D",marginTop:3}}>{wo.asset} - {wo.assignee||"Unassigned"} - Due {wo.due||"TBD"}</div></div><div style={{display:"flex",alignItems:"center",gap:12,marginLeft:16}}><div style={{textAlign:"right"}}><div style={{fontSize:15,fontWeight:700}}>{wo.cost?fmt(wo.cost):"-"}</div><Badge label={wo.status}/></div>{canEdit&&<div style={{display:"flex",flexDirection:"column",gap:4}}><button onClick={()=>startEdit(wo)} style={{padding:"4px 8px",borderRadius:5,border:"1px solid #E0E0E0",background:"#fff",cursor:"pointer"}}><Pencil size={12} color="#525252"/></button><button onClick={()=>handleDelete(wo.id)} style={{padding:"4px 8px",borderRadius:5,border:"1px solid #E0E0E0",background:"#fff",cursor:"pointer"}}><Trash2 size={12} color="#DA1E28"/></button></div>}</div></div>))}
    {showAdd&&(<Modal title={editW?"Edit Work Order":"New Work Order"} onClose={()=>{setShowAdd(false);setEditW(null);}}><Field label="Asset *"><SearchSelect options={[...vehicles.map(v=>({value:v.name,label:`${v.name} (${v.id})`})),...generators.map(g=>({value:g.name,label:`${g.name} (${g.id})`}))]} value={form.asset} onChange={v=>setForm({...form,asset:v})} placeholder="Search vehicles & generators..."/></Field><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><Field label="Type"><select style={inp} value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option>Repair</option><option>Preventive</option><option>Inspection</option><option>Major Overhaul</option></select></Field><Field label="Priority"><select style={inp} value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})}><option>Critical</option><option>High</option><option>Medium</option><option>Low</option></select></Field></div>{editW&&<Field label="Status"><select style={inp} value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option>Open</option><option>In Progress</option><option>Completed</option></select></Field>}<Field label="Description *"><textarea style={{...inp,minHeight:60,resize:"vertical"}} value={form.desc} onChange={e=>setForm({...form,desc:e.target.value})}/></Field><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><Field label="Assigned To"><SearchSelect options={(vendors||[]).filter(v=>v.type==="Mechanic"||v.type==="Service"||v.type==="Electrician"||v.type==="Body Shop").map(v=>({value:v.name,label:v.name+" ("+v.type+")"}))} value={form.assignee} onChange={v=>setForm({...form,assignee:v})} placeholder="Search vendors..."/></Field><Field label="Due Date"><input style={inp} type="date" value={form.due} onChange={e=>setForm({...form,due:e.target.value})}/></Field></div><Field label="Est. Cost"><input style={inp} type="number" placeholder="250000" value={form.cost} onChange={e=>setForm({...form,cost:e.target.value})}/></Field><div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:8}}><button onClick={()=>{setShowAdd(false);setEditW(null);}} style={{padding:"9px 20px",borderRadius:8,border:"1.5px solid #E0E0E0",background:"#fff",color:"#525252",fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancel</button><button onClick={handleSave} disabled={!form.asset||!form.desc} style={{display:"flex",alignItems:"center",gap:6,padding:"9px 20px",borderRadius:8,border:"none",background:(form.asset&&form.desc)?P:"#C6C6C6",color:"#fff",fontSize:13,fontWeight:600,cursor:(form.asset&&form.desc)?"pointer":"not-allowed"}}><Save size={14}/>{editW?"Update":"Create"}</button></div></Modal>)}</div>);
}


function FuelPage({fuelLogs,setFuelLogs,vehicles,generators,canEdit,odoLog,setOdoLog,vendors}){
  const [tab,setTab]=useState("vehicles");const [showAdd,setShowAdd]=useState(false);const [fuelFilt,setFuelFilt]=useState("All");const [editF,setEditF]=useState(null);const [showOdo,setShowOdo]=useState(false);const [odoAsset,setOdoAsset]=useState("");const [odoVal,setOdoVal]=useState("");const [odoDate,setOdoDate]=useState(new Date().toISOString().split("T")[0]);
  const defForm={asset:"",date:new Date().toISOString().split("T")[0],litres:"",cost:"",reading:"",station:"",fuelType:"Diesel",costPerL:""};
  const [form,setForm]=useState(defForm);
  const data=(tab==="vehicles"?fuelLogs.filter(f=>!f.isGen):fuelLogs.filter(f=>f.isGen)).filter(f=>fuelFilt==="All"||f.fuelType===fuelFilt);
  const assetOpts=tab==="vehicles"?vehicles.map(v=>({id:v.id,name:v.name})):generators.map(g=>({id:g.id,name:g.name}));
  const getAssetName=(id,isGen)=>{if(!isGen){const v=vehicles.find(x=>x.id===id);return v?v.name:id;}const g=generators.find(x=>x.id===id);return g?g.name:id;};
  const calcConsumption=(f,idx)=>{const sameLogs=fuelLogs.filter(x=>x.asset===f.asset&&x.isGen===f.isGen).sort((a,b)=>a.date.localeCompare(b.date)||a.id-b.id);const pos=sameLogs.findIndex(x=>x.id===f.id);if(pos<=0)return "-";const prev=sameLogs[pos-1];const diff=f.reading-prev.reading;if(diff<=0)return "-";return f.isGen?(f.litres/diff).toFixed(1):((f.litres/diff)*100).toFixed(1);};
  const getLastReading=(assetId)=>{const logs=fuelLogs.filter(f=>f.asset===assetId).sort((a,b)=>b.date.localeCompare(b.date)||b.id-a.id);return logs.length>0?logs[0].reading:null;};
  const handleSave=async()=>{const reading=parseFloat(form.reading)||0;const entry={asset:form.asset,date:form.date,litres:parseFloat(form.litres)||0,cost:parseFloat(form.cost)||0,reading,station:form.station,isGen:tab==="generators",fuelType:form.fuelType||"Diesel"};try{if(editF){await db.updateFuelLog(editF,fromFL(entry));setFuelLogs(fuelLogs.map(f=>f.id===editF?{...f,...entry}:f));setEditF(null);}else{const saved=await db.addFuelLog(fromFL(entry));if(saved){setFuelLogs(prev=>[...prev,toFL(saved)]);}else{const all=await db.getFuelLogs();setFuelLogs(all.map(toFL));}if(reading>0){const odoSaved=await db.addOdoLog({asset:form.asset,reading,date:form.date,type:"fuel"});setOdoLog([...odoLog,toOdo(odoSaved)]);}}setShowAdd(false);setForm(defForm);}catch(e){alert("Error: "+e.message);}};
  const handleDelete=async(id)=>{if(confirm("Delete this fuel entry?")){try{await db.deleteFuelLog(id);setFuelLogs(fuelLogs.filter(f=>f.id!==id));}catch(e){alert("Error: "+e.message);}}};
  const startEdit=(f)=>{const cpl=f.litres>0?(f.cost/f.litres).toFixed(2):"";setForm({asset:f.asset,date:f.date,litres:String(f.litres),cost:String(f.cost),reading:String(f.reading||""),station:f.station||"",fuelType:f.fuelType||"Diesel",costPerL:cpl});setEditF(f.id);setShowAdd(true);};
  const addOdoReading=()=>{const val=parseFloat(odoVal);if(!val||!odoAsset)return;setOdoLog([...odoLog,{id:odoLog.length+1,asset:odoAsset,reading:val,date:odoDate,type:"manual"}]);if(tab==="vehicles"){const vs=[...vehicles];const vi=vs.findIndex(v=>v.id===odoAsset);if(vi>=0)vs[vi]={...vs[vi],km:val};}setShowOdo(false);setOdoVal("");setOdoAsset("");};
  return(<div style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"grid",gridTemplateColumns:window.innerWidth<768?"1fr 1fr":"repeat(3,1fr)",gap:14}}><Kpi icon={Fuel} label="Vehicle Fuel" value={fmt(fuelLogs.filter(f=>!f.isGen).reduce((s,f)=>s+f.cost,0))}/><Kpi icon={Zap} label="Generator Fuel" value={fmt(fuelLogs.filter(f=>f.isGen).reduce((s,f)=>s+f.cost,0))}/><Kpi icon={DollarSign} label="Combined Spend" value={fmt(fuelLogs.reduce((s,f)=>s+f.cost,0))}/></div>
    <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8}}><div style={{display:"flex",gap:6}}>{["vehicles","generators"].map(t=>(<button key={t} onClick={()=>setTab(t)} style={{padding:"7px 16px",borderRadius:7,border:tab===t?`1.5px solid ${P}`:"1.5px solid #E0E0E0",background:tab===t?"#D0E2FF":"#fff",color:tab===t?P:"#525252",fontSize:12,fontWeight:600,cursor:"pointer",textTransform:"capitalize"}}>{t}</button>))}{["All","Diesel","Petrol"].map(ft=>(<button key={ft} onClick={()=>setFuelFilt(ft)} style={{padding:"7px 12px",borderRadius:7,border:fuelFilt===ft?"1.5px solid #8A3FFC":"1.5px solid #E0E0E0",background:fuelFilt===ft?"#E8DAFF":"#fff",color:fuelFilt===ft?"#8A3FFC":"#525252",fontSize:12,fontWeight:600,cursor:"pointer"}}>{ft}</button>))}</div>{canEdit&&<div style={{display:"flex",gap:6}}><button onClick={()=>setShowOdo(true)} style={{display:"flex",alignItems:"center",gap:5,padding:"8px 14px",borderRadius:9,border:"1.5px solid #E0E0E0",background:"#fff",fontSize:12,fontWeight:600,cursor:"pointer",color:"#525252"}}><Gauge size={14}/>Update Reading</button><button onClick={()=>{setEditF(null);setForm(defForm);setShowAdd(true);}} style={{display:"flex",alignItems:"center",gap:5,padding:"8px 16px",borderRadius:9,background:P,color:"#fff",border:"none",fontSize:12,fontWeight:600,cursor:"pointer"}}><Plus size={15}/>Log Fuel</button></div>}</div>
    <div style={{background:"#fff",borderRadius:14,border:"1px solid #E8ECF1",overflow:"hidden"}}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr style={{background:"#F4F4F4"}}>{["Date","Asset",tab==="vehicles"?"Odometer":"Hours","Litres","Cost",tab==="vehicles"?"L/100km":"L/hr","Station",canEdit?"":""].filter(Boolean).map(h=>(<th key={h} style={th}>{h}</th>))}</tr></thead><tbody>{data.length===0?(<tr><td colSpan={canEdit?8:7} style={{padding:20,textAlign:"center",color:"#8D8D8D",fontSize:13}}>No {tab} fuel logs yet.</td></tr>):data.map((f,idx)=>{const cons=calcConsumption(f,idx);const consNum=parseFloat(cons);const color=cons==="-"?"#8D8D8D":tab==="vehicles"?(consNum>20?"#DA1E28":consNum>12?"#FF832B":"#24A148"):(consNum>15?"#DA1E28":consNum>8?"#FF832B":"#24A148");return(<tr key={f.id}><td style={tc}>{f.date}</td><td style={{...tc,fontWeight:600}}>{getAssetName(f.asset,f.isGen)}</td><td style={tc}>{(f.reading||0).toLocaleString()} {f.isGen?"hrs":"km"}</td><td style={tc}>{f.litres.toLocaleString()} L</td><td style={{...tc,fontWeight:600}}>{fmt(f.cost)}</td><td style={{...tc,fontWeight:700,color}}>{cons}</td><td style={{...tc,color:"#8D8D8D"}}>{f.station}</td>{canEdit&&<td style={tc}><div style={{display:"flex",gap:4}}><button onClick={()=>startEdit(f)} style={{padding:"4px 8px",borderRadius:5,border:"1px solid #E0E0E0",background:"#fff",cursor:"pointer"}}><Pencil size={12} color="#525252"/></button><button onClick={()=>handleDelete(f.id)} style={{padding:"4px 8px",borderRadius:5,border:"1px solid #E0E0E0",background:"#fff",cursor:"pointer"}}><Trash2 size={12} color="#DA1E28"/></button></div></td>}</tr>);})}</tbody></table></div>
    {showOdo&&(<Modal title={`Update ${tab==="vehicles"?"Odometer":"Run Hours"}`} onClose={()=>setShowOdo(false)}><Field label={tab==="vehicles"?"Vehicle *":"Generator *"}><SearchSelect options={assetOpts.map(a=>({value:a.id,label:`${a.name} (${a.id})`}))} value={odoAsset} onChange={v=>setOdoAsset(v)} placeholder="Search assets..."/></Field><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><Field label={tab==="vehicles"?"New Reading (km) *":"New Hours *"}><input style={inp} type="number" placeholder={tab==="vehicles"?"e.g. 29100":"e.g. 4900"} value={odoVal} onChange={e=>setOdoVal(e.target.value)}/></Field><Field label="Date"><input style={inp} type="date" value={odoDate} onChange={e=>setOdoDate(e.target.value)}/></Field></div><div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:8}}><button onClick={()=>setShowOdo(false)} style={{padding:"9px 20px",borderRadius:8,border:"1.5px solid #E0E0E0",background:"#fff",color:"#525252",fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancel</button><button onClick={addOdoReading} disabled={!odoAsset||!odoVal} style={{padding:"9px 20px",borderRadius:8,border:"none",background:(odoAsset&&odoVal)?P:"#C6C6C6",color:"#fff",fontSize:13,fontWeight:600,cursor:(odoAsset&&odoVal)?"pointer":"not-allowed"}}><Save size={14}/> Save</button></div></Modal>)}
    {showAdd&&(<Modal title={editF?"Edit Fuel Entry":`Log ${tab==="generators"?"Generator":"Vehicle"} Fuel`} onClose={()=>{setShowAdd(false);setEditF(null);}}><Field label={tab==="generators"?"Generator *":"Vehicle *"}><SearchSelect options={assetOpts.map(a=>({value:a.id,label:`${a.name} (${a.id})`}))} value={form.asset} onChange={v=>setForm({...form,asset:v})} placeholder="Search assets..."/></Field>{form.asset&&(()=>{const lr=getLastReading(form.asset);return lr?<div style={{padding:"8px 12px",background:"#F4F4F4",borderRadius:8,fontSize:12,color:"#525252",marginBottom:10}}>Last reading: <strong>{lr.toLocaleString()} {tab==="vehicles"?"km":"hrs"}</strong></div>:null;})()}<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><Field label="Date"><input style={inp} type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></Field><Field label={tab==="vehicles"?"Odometer at Fill (km) *":"Run Hours at Fill *"}><input style={inp} type="number" placeholder={tab==="vehicles"?"e.g. 29100":"e.g. 4900"} value={form.reading} onChange={e=>setForm({...form,reading:e.target.value})}/></Field></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><Field label="Fuel Type"><select style={inp} value={form.fuelType||"Diesel"} onChange={e=>setForm({...form,fuelType:e.target.value})}><option>Diesel</option><option>Petrol</option></select></Field><Field label="Cost/Litre (₦)"><input style={inp} type="number" step="0.01" placeholder="e.g. 900" value={form.costPerL} onChange={e=>{const cpl=e.target.value;const l=form.litres;const newCost=cpl&&l?(parseFloat(cpl)*parseFloat(l)).toFixed(0):"";setForm({...form,costPerL:cpl,cost:newCost});}}/></Field></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><Field label="Litres *"><input style={inp} type="number" placeholder="e.g. 85" value={form.litres} onChange={e=>{const l=e.target.value;const cpl=form.costPerL;const newCost=cpl&&l?(parseFloat(cpl)*parseFloat(l)).toFixed(0):"";setForm({...form,litres:l,cost:newCost});}}/></Field><Field label="Total Cost (₦)"><input style={inp} type="number" placeholder="e.g. 76500" value={form.cost} onChange={e=>{const c=e.target.value;const l=form.litres;const newCpl=c&&l?(parseFloat(c)/parseFloat(l)).toFixed(2):"";setForm({...form,cost:c,costPerL:newCpl});}}/></Field></div><Field label="Station"><SearchSelect options={vendors.filter(v=>v.type==="Fuel"||v.type==="Both").map(v=>({value:v.name,label:v.name}))} value={form.station} onChange={v=>setForm({...form,station:v})} placeholder="Search stations..."/></Field><div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:8}}><button onClick={()=>{setShowAdd(false);setEditF(null);}} style={{padding:"9px 20px",borderRadius:8,border:"1.5px solid #E0E0E0",background:"#fff",color:"#525252",fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancel</button><button onClick={handleSave} disabled={!form.asset||!form.litres} style={{display:"flex",alignItems:"center",gap:6,padding:"9px 20px",borderRadius:8,border:"none",background:(form.asset&&form.litres)?P:"#C6C6C6",color:"#fff",fontSize:13,fontWeight:600,cursor:(form.asset&&form.litres)?"pointer":"not-allowed"}}><Save size={14}/>{editF?"Update":"Save"}</button></div></Modal>)}
  </div>);
}


function PapersPage({vehicles,papers,setPapers,canEdit,docTypes,setDocTypes}){
  const [filt,setFilt]=useState("All");const [vFilt,setVFilt]=useState("All");const [showAdd,setShowAdd]=useState(false);const [editP,setEditP]=useState(null);const [showAddType,setShowAddType]=useState(false);const [newType,setNewType]=useState("");
  const defForm={vehicle:"",docType:docTypes[0]||"",issueDate:"",expiryDate:"",status:"Valid",note:""};
  const [form,setForm]=useState(defForm);
  const getVName=(id)=>{const v=vehicles.find(x=>x.id===id);return v?v.name:id;};
  const today=new Date().toISOString().split("T")[0];
  const autoStatus=(exp)=>{if(!exp)return"Valid";if(exp<today)return"Expired";const d=new Date(exp);const t=new Date(today);const diff=(d-t)/(1000*60*60*24);return diff<=30?"Expiring Soon":"Valid";};
  const list=papers.filter(p=>(filt==="All"||p.status===filt)&&(vFilt==="All"||p.vehicle===vFilt));
  const expired=papers.filter(p=>p.status==="Expired").length;
  const expiring=papers.filter(p=>p.status==="Expiring Soon").length;
  const handleSave=async()=>{const entry={...form,status:autoStatus(form.expiryDate)};try{if(editP){await db.updatePaper(editP,fromP(entry));setPapers(papers.map(p=>p.id===editP?{...p,...entry}:p));setEditP(null);}else{const saved=await db.addPaper(fromP(entry));if(saved){setPapers(prev=>[...prev,toP(saved)]);}else{const all=await db.getPapers();setPapers(all.map(toP));}}setShowAdd(false);setForm(defForm);}catch(e){alert("Error: "+e.message);}};
  const handleDelete=async(id)=>{if(confirm("Delete this document?")){try{await db.deletePaper(id);setPapers(papers.filter(p=>p.id!==id));}catch(e){alert("Error: "+e.message);}}};
  const startEdit=(p)=>{setForm({vehicle:p.vehicle,docType:p.docType,issueDate:p.issueDate||"",expiryDate:p.expiryDate||"",status:p.status,note:p.note||""});setEditP(p.id);setShowAdd(true);};
  return(<div style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"grid",gridTemplateColumns:window.innerWidth<768?"1fr 1fr":"repeat(3,1fr)",gap:14}}><Kpi icon={FileCheck} label="Total Documents" value={papers.length}/><Kpi icon={AlertTriangle} label="Expiring Soon" value={expiring} accent="#FF832B"/><Kpi icon={X} label="Expired" value={expired} accent="#DA1E28"/></div>
    <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8}}><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{["All","Valid","Expiring Soon","Expired"].map(s=>(<button key={s} onClick={()=>setFilt(s)} style={{padding:"6px 14px",borderRadius:7,border:filt===s?`1.5px solid ${P}`:"1.5px solid #E0E0E0",background:filt===s?"#D0E2FF":"#fff",color:filt===s?P:"#525252",fontSize:12,fontWeight:600,cursor:"pointer"}}>{s}</button>))}<select style={{...inp,width:160,padding:"6px 10px",fontSize:12}} value={vFilt} onChange={e=>setVFilt(e.target.value)}><option value="All">All Vehicles</option>{vehicles.map(v=>(<option key={v.id} value={v.id}>{v.name}</option>))}</select></div>{canEdit&&<div style={{display:"flex",gap:6}}><button onClick={()=>setShowAddType(true)} style={{display:"flex",alignItems:"center",gap:4,padding:"8px 12px",borderRadius:9,border:"1.5px solid #E0E0E0",background:"#fff",fontSize:12,fontWeight:600,cursor:"pointer",color:"#525252"}}><Plus size={14}/>Doc Type</button><button onClick={()=>{setEditP(null);setForm(defForm);setShowAdd(true);}} style={{display:"flex",alignItems:"center",gap:5,padding:"8px 16px",borderRadius:9,background:P,color:"#fff",border:"none",fontSize:12,fontWeight:600,cursor:"pointer"}}><Plus size={15}/>Add Document</button></div>}</div>
    <div style={{background:"#fff",borderRadius:14,border:"1px solid #E8ECF1",overflow:"hidden"}}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr style={{background:"#F4F4F4"}}>{["Vehicle","Document","Issue Date","Expiry Date","Status","Note",canEdit?"":""].filter(Boolean).map(h=>(<th key={h} style={th}>{h}</th>))}</tr></thead><tbody>{list.length===0?<tr><td colSpan={canEdit?7:6} style={{padding:20,textAlign:"center",color:"#8D8D8D",fontSize:13}}>No documents found</td></tr>:list.map(p=>(<tr key={p.id}><td style={{...tc,fontWeight:600}}>{getVName(p.vehicle)}</td><td style={tc}>{p.docType}</td><td style={tc}>{p.issueDate||"-"}</td><td style={{...tc,fontWeight:600}}>{p.expiryDate||"-"}</td><td style={tc}><Badge label={p.status}/></td><td style={{...tc,color:"#8D8D8D",fontSize:12}}>{p.note||"-"}</td>{canEdit&&<td style={tc}><div style={{display:"flex",gap:4}}><button onClick={()=>startEdit(p)} style={{padding:"4px 8px",borderRadius:5,border:"1px solid #E0E0E0",background:"#fff",cursor:"pointer"}}><Pencil size={12} color="#525252"/></button><button onClick={()=>handleDelete(p.id)} style={{padding:"4px 8px",borderRadius:5,border:"1px solid #E0E0E0",background:"#fff",cursor:"pointer"}}><Trash2 size={12} color="#DA1E28"/></button></div></td>}</tr>))}</tbody></table></div>
    {showAddType&&(<Modal title="Add Document Type" onClose={()=>setShowAddType(false)}><Field label="Document Type Name *"><input style={inp} placeholder="e.g. Customs Clearance" value={newType} onChange={e=>setNewType(e.target.value)}/></Field><div style={{marginBottom:12}}><div style={{fontSize:11,fontWeight:600,color:"#8D8D8D",marginBottom:6}}>Existing Types</div>{docTypes.map((dt,i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #F4F4F4",fontSize:12}}><span>{dt}</span><button onClick={()=>setDocTypes(docTypes.filter((_,j)=>j!==i))} style={{background:"none",border:"none",color:"#DA1E28",fontSize:11,cursor:"pointer",fontWeight:600}}>Remove</button></div>))}</div><div style={{display:"flex",gap:10,justifyContent:"flex-end"}}><button onClick={()=>setShowAddType(false)} style={{padding:"9px 20px",borderRadius:8,border:"1.5px solid #E0E0E0",background:"#fff",color:"#525252",fontSize:13,fontWeight:600,cursor:"pointer"}}>Close</button><button onClick={()=>{if(newType.trim()){setDocTypes([...docTypes,newType.trim()]);setNewType("");}}} disabled={!newType.trim()} style={{padding:"9px 20px",borderRadius:8,border:"none",background:newType.trim()?P:"#C6C6C6",color:"#fff",fontSize:13,fontWeight:600,cursor:newType.trim()?"pointer":"not-allowed"}}>Add Type</button></div></Modal>)}
    {showAdd&&(<Modal title={editP?"Edit Document":"Add Document"} onClose={()=>{setShowAdd(false);setEditP(null);}}><Field label="Vehicle *"><SearchSelect options={vehicles.map(v=>({value:v.id,label:`${v.name} (${v.id})`}))} value={form.vehicle} onChange={v=>setForm({...form,vehicle:v})} placeholder="Search vehicles..."/></Field><Field label="Document Type *"><select style={inp} value={form.docType} onChange={e=>setForm({...form,docType:e.target.value})}>{docTypes.map(d=>(<option key={d}>{d}</option>))}</select></Field><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><Field label="Issue Date"><input style={inp} type="date" value={form.issueDate} onChange={e=>setForm({...form,issueDate:e.target.value})}/></Field><Field label="Expiry Date"><input style={inp} type="date" value={form.expiryDate} onChange={e=>setForm({...form,expiryDate:e.target.value})}/></Field></div><Field label="Note"><input style={inp} placeholder="e.g. Leadway Assurance policy #12345" value={form.note} onChange={e=>setForm({...form,note:e.target.value})}/></Field><div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:8}}><button onClick={()=>{setShowAdd(false);setEditP(null);}} style={{padding:"9px 20px",borderRadius:8,border:"1.5px solid #E0E0E0",background:"#fff",color:"#525252",fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancel</button><button onClick={handleSave} disabled={!form.vehicle||!form.docType} style={{display:"flex",alignItems:"center",gap:6,padding:"9px 20px",borderRadius:8,border:"none",background:(form.vehicle&&form.docType)?P:"#C6C6C6",color:"#fff",fontSize:13,fontWeight:600,cursor:(form.vehicle&&form.docType)?"pointer":"not-allowed"}}><Save size={14}/>{editP?"Update":"Save"}</button></div></Modal>)}
  </div>);
}

function ServicePage({vehicles,svcReminders,setSvcReminders,canEdit}){
  const [filt,setFilt]=useState("All");const [showAdd,setShowAdd]=useState(false);const [editS,setEditS]=useState(null);
  const defForm={vehicle:"",type:"Oil Change",intervalKm:"10000",intervalDays:"90",lastDoneKm:"",lastDoneDate:"",nextDueKm:"",nextDueDate:""};
  const [form,setForm]=useState(defForm);
  const getVName=(id)=>{const v=vehicles.find(x=>x.id===id);return v?v.name:id;};
  const autoStatus=(r)=>{const today=new Date().toISOString().split("T")[0];if(r.nextDueDate&&r.nextDueDate<today)return"Overdue";const v=vehicles.find(x=>x.id===r.vehicle);if(v&&r.nextDueKm&&v.km>=r.nextDueKm)return"Overdue";if(r.nextDueDate){const d=new Date(r.nextDueDate);const t=new Date(today);const diff=(d-t)/(1000*60*60*24);if(diff<=14)return"Due Soon";}if(v&&r.nextDueKm){const diff=r.nextDueKm-v.km;if(diff<=1000)return"Due Soon";}return"Upcoming";};
  const list=filt==="All"?svcReminders:svcReminders.filter(s=>s.status===filt);
  const overdue=svcReminders.filter(s=>s.status==="Overdue").length;
  const dueSoon=svcReminders.filter(s=>s.status==="Due Soon").length;
  const handleSave=async()=>{const entry={vehicle:form.vehicle,type:form.type,intervalKm:parseInt(form.intervalKm)||0,intervalDays:parseInt(form.intervalDays)||0,lastDoneKm:parseInt(form.lastDoneKm)||0,lastDoneDate:form.lastDoneDate,nextDueKm:parseInt(form.nextDueKm)||0,nextDueDate:form.nextDueDate};entry.status=autoStatus(entry);try{if(editS){await db.updateSvcReminder(editS,fromSR(entry));setSvcReminders(svcReminders.map(s=>s.id===editS?{...s,...entry}:s));setEditS(null);}else{const saved=await db.addSvcReminder(fromSR(entry));if(saved){setSvcReminders(prev=>[...prev,toSR(saved)]);}else{const all=await db.getSvcReminders();setSvcReminders(all.map(toSR));}}setShowAdd(false);setForm(defForm);}catch(e){alert("Error: "+e.message);}};
  const handleDelete=async(id)=>{if(confirm("Delete this reminder?")){try{await db.deleteSvcReminder(id);setSvcReminders(svcReminders.filter(s=>s.id!==id));}catch(e){alert("Error: "+e.message);}}};
  const startEdit=(s)=>{setForm({vehicle:s.vehicle,type:s.type,intervalKm:String(s.intervalKm||""),intervalDays:String(s.intervalDays||""),lastDoneKm:String(s.lastDoneKm||""),lastDoneDate:s.lastDoneDate||"",nextDueKm:String(s.nextDueKm||""),nextDueDate:s.nextDueDate||""});setEditS(s.id);setShowAdd(true);};
  const markDone=async(s)=>{const v=vehicles.find(x=>x.id===s.vehicle);const now=new Date().toISOString().split("T")[0];const km=v?v.km:s.lastDoneKm;const nextKm=km+(s.intervalKm||0);const nd=new Date(now);nd.setDate(nd.getDate()+(s.intervalDays||90));const nextDate=nd.toISOString().split("T")[0];const updated={...s,lastDoneKm:km,lastDoneDate:now,nextDueKm:nextKm,nextDueDate:nextDate};updated.status=autoStatus(updated);try{await db.updateSvcReminder(s.id,fromSR(updated));setSvcReminders(svcReminders.map(x=>x.id===s.id?updated:x));}catch(e){alert("Error: "+e.message);}};
  return(<div style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"grid",gridTemplateColumns:window.innerWidth<768?"1fr 1fr":"repeat(3,1fr)",gap:14}}><Kpi icon={Bell} label="Total Reminders" value={svcReminders.length}/><Kpi icon={Clock} label="Due Soon" value={dueSoon} accent="#FF832B"/><Kpi icon={AlertTriangle} label="Overdue" value={overdue} accent="#DA1E28"/></div>
    <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8}}><div style={{display:"flex",gap:6}}>{["All","Upcoming","Due Soon","Overdue"].map(s=>(<button key={s} onClick={()=>setFilt(s)} style={{padding:"6px 14px",borderRadius:7,border:filt===s?`1.5px solid ${P}`:"1.5px solid #E0E0E0",background:filt===s?"#D0E2FF":"#fff",color:filt===s?P:"#525252",fontSize:12,fontWeight:600,cursor:"pointer"}}>{s}</button>))}</div>{canEdit&&<button onClick={()=>{setEditS(null);setForm(defForm);setShowAdd(true);}} style={{display:"flex",alignItems:"center",gap:5,padding:"8px 16px",borderRadius:9,background:P,color:"#fff",border:"none",fontSize:12,fontWeight:600,cursor:"pointer"}}><Plus size={15}/>Add Reminder</button>}</div>
    <div style={{display:"flex",flexDirection:"column",gap:10}}>{list.length===0?<div style={{background:"#fff",borderRadius:14,border:"1px solid #E8ECF1",padding:30,textAlign:"center",color:"#8D8D8D",fontSize:13}}>No service reminders found</div>:list.map(s=>(<div key={s.id} style={{background:"#fff",borderRadius:12,border:"1px solid #E8ECF1",padding:"14px 18px"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}><span style={{fontSize:14,fontWeight:700}}>{s.type}</span><Badge label={s.status}/></div><div style={{fontSize:13,fontWeight:600,color:"#393939"}}>{getVName(s.vehicle)}</div><div style={{fontSize:11,color:"#8D8D8D",marginTop:3}}>Every {s.intervalKm?.toLocaleString()} km / {s.intervalDays} days | Last: {s.lastDoneDate||"N/A"} at {s.lastDoneKm?.toLocaleString()||"N/A"} km</div><div style={{fontSize:12,fontWeight:600,marginTop:4,color:s.status==="Overdue"?"#DA1E28":s.status==="Due Soon"?"#FF832B":"#525252"}}>Next: {s.nextDueDate||"N/A"} / {s.nextDueKm?.toLocaleString()||"N/A"} km</div></div>{canEdit&&<div style={{display:"flex",gap:6,alignItems:"center"}}><button onClick={()=>markDone(s)} style={{padding:"6px 12px",borderRadius:7,border:"none",background:"#24A148",color:"#fff",fontSize:11,fontWeight:600,cursor:"pointer"}}>Mark Done</button><button onClick={()=>startEdit(s)} style={{padding:"5px 8px",borderRadius:5,border:"1px solid #E0E0E0",background:"#fff",cursor:"pointer"}}><Pencil size={12} color="#525252"/></button><button onClick={()=>handleDelete(s.id)} style={{padding:"5px 8px",borderRadius:5,border:"1px solid #E0E0E0",background:"#fff",cursor:"pointer"}}><Trash2 size={12} color="#DA1E28"/></button></div>}</div></div>))}</div>
    {showAdd&&(<Modal title={editS?"Edit Reminder":"Add Service Reminder"} onClose={()=>{setShowAdd(false);setEditS(null);}}><Field label="Vehicle *"><SearchSelect options={vehicles.map(v=>({value:v.id,label:`${v.name} (${v.id})`}))} value={form.vehicle} onChange={v=>setForm({...form,vehicle:v})} placeholder="Search vehicles..."/></Field><Field label="Service Type"><input style={inp} placeholder="e.g. Oil Change, Tyre Rotation, Full Service" value={form.type} onChange={e=>setForm({...form,type:e.target.value})}/></Field><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><Field label="Interval (km)"><input style={inp} type="number" placeholder="10000" value={form.intervalKm} onChange={e=>setForm({...form,intervalKm:e.target.value})}/></Field><Field label="Interval (days)"><input style={inp} type="number" placeholder="90" value={form.intervalDays} onChange={e=>setForm({...form,intervalDays:e.target.value})}/></Field></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><Field label="Last Done (km)"><input style={inp} type="number" value={form.lastDoneKm} onChange={e=>setForm({...form,lastDoneKm:e.target.value})}/></Field><Field label="Last Done Date"><input style={inp} type="date" value={form.lastDoneDate} onChange={e=>setForm({...form,lastDoneDate:e.target.value})}/></Field></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><Field label="Next Due (km)"><input style={inp} type="number" value={form.nextDueKm} onChange={e=>setForm({...form,nextDueKm:e.target.value})}/></Field><Field label="Next Due Date"><input style={inp} type="date" value={form.nextDueDate} onChange={e=>setForm({...form,nextDueDate:e.target.value})}/></Field></div><div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:8}}><button onClick={()=>{setShowAdd(false);setEditS(null);}} style={{padding:"9px 20px",borderRadius:8,border:"1.5px solid #E0E0E0",background:"#fff",color:"#525252",fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancel</button><button onClick={handleSave} disabled={!form.vehicle} style={{display:"flex",alignItems:"center",gap:6,padding:"9px 20px",borderRadius:8,border:"none",background:form.vehicle?P:"#C6C6C6",color:"#fff",fontSize:13,fontWeight:600,cursor:form.vehicle?"pointer":"not-allowed"}}><Save size={14}/>{editS?"Update":"Save"}</button></div></Modal>)}
  </div>);
}

function InspectionPage({vehicles,drivers,inspections,setInspections,canEdit,inspItems,setInspItems}){
  const [showAdd,setShowAdd]=useState(false);const [showDetail,setShowDetail]=useState(null);const [showAddItem,setShowAddItem]=useState(false);const [newItem,setNewItem]=useState("");
  const defForm={vehicle:"",driver:"",date:new Date().toISOString().split("T")[0],odometer:"",items:{},notes:""};
  const [form,setForm]=useState(defForm);
  const getVName=(id)=>{const v=vehicles.find(x=>x.id===id);return v?v.name:id;};
  const passRate=inspections.length>0?Math.round((inspections.filter(i=>i.status==="Pass").length/inspections.length)*100):0;
  const todayCount=inspections.filter(i=>i.date===new Date().toISOString().split("T")[0]).length;
  const failCount=inspections.filter(i=>i.status==="Fail").length;
  const handleSave=async()=>{const hasFail=Object.values(form.items).includes("Fail");try{const saved=await db.addInspection({vehicle:form.vehicle,driver:form.driver,date:form.date,items:form.items,notes:form.notes,status:hasFail?"Fail":"Pass"});if(saved){setInspections(prev=>[...prev,saved]);}else{const all=await db.getInspections();setInspections(all);}setShowAdd(false);setForm(defForm);}catch(e){alert("Error: "+e.message);}};
  const handleDelete=async(id)=>{if(confirm("Delete this inspection?")){try{await db.deleteInspection(id);setInspections(inspections.filter(i=>i.id!==id));}catch(e){alert("Error: "+e.message);}}};
  return(<div style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"grid",gridTemplateColumns:window.innerWidth<768?"1fr 1fr":"repeat(3,1fr)",gap:14}}><Kpi icon={CheckCircle} label="Today's Inspections" value={todayCount}/><Kpi icon={ClipboardList} label="Pass Rate" value={passRate+"%"} accent="#24A148"/><Kpi icon={AlertTriangle} label="Failed" value={failCount} accent="#DA1E28"/></div>
    <div style={{display:"flex",justifyContent:"flex-end",gap:6}}>{canEdit&&<><button onClick={()=>setShowAddItem(true)} style={{display:"flex",alignItems:"center",gap:4,padding:"8px 12px",borderRadius:9,border:"1.5px solid #E0E0E0",background:"#fff",fontSize:12,fontWeight:600,cursor:"pointer",color:"#525252"}}><Plus size={14}/>Checklist Item</button><button onClick={()=>{const items={};inspItems.forEach((_,i)=>{items[i]="Pass";});setForm({...defForm,items});setShowAdd(true);}} style={{display:"flex",alignItems:"center",gap:5,padding:"8px 16px",borderRadius:9,background:P,color:"#fff",border:"none",fontSize:12,fontWeight:600,cursor:"pointer"}}><Plus size={15}/>New Inspection</button></>}</div>
    <div style={{background:"#fff",borderRadius:14,border:"1px solid #E8ECF1",overflow:"hidden"}}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr style={{background:"#F4F4F4"}}>{["Date","Vehicle","Driver","Odometer","Result","Issues","",canEdit?"":""].filter(Boolean).map(h=>(<th key={h} style={th}>{h}</th>))}</tr></thead><tbody>{inspections.length===0?<tr><td colSpan={canEdit?8:7} style={{padding:20,textAlign:"center",color:"#8D8D8D",fontSize:13}}>No inspections yet</td></tr>:inspections.sort((a,b)=>b.date.localeCompare(a.date)).map(ins=>{const failItems=Object.entries(ins.items).filter(([_,v])=>v==="Fail").map(([k])=>inspItems[parseInt(k)]||`Item ${k}`);return(<tr key={ins.id}><td style={tc}>{ins.date}</td><td style={{...tc,fontWeight:600}}>{getVName(ins.vehicle)}</td><td style={tc}>{ins.driver}</td><td style={tc}>{ins.odometer?ins.odometer.toLocaleString()+" km":"-"}</td><td style={tc}><Badge label={ins.status}/></td><td style={{...tc,fontSize:12,color:failItems.length>0?"#DA1E28":"#24A148"}}>{failItems.length>0?failItems.join(", "):"All clear"}</td><td style={tc}><button onClick={()=>setShowDetail(ins)} style={{padding:"4px 10px",borderRadius:5,border:"1px solid #E0E0E0",background:"#fff",cursor:"pointer",fontSize:11,fontWeight:600,color:P}}>View</button></td>{canEdit&&<td style={tc}><button onClick={()=>handleDelete(ins.id)} style={{padding:"4px 8px",borderRadius:5,border:"1px solid #E0E0E0",background:"#fff",cursor:"pointer"}}><Trash2 size={12} color="#DA1E28"/></button></td>}</tr>);})}</tbody></table></div>
    {showDetail&&(<Modal title={`Inspection - ${getVName(showDetail.vehicle)} - ${showDetail.date}`} onClose={()=>setShowDetail(null)}><div style={{marginBottom:10}}><span style={{fontSize:12,color:"#8D8D8D"}}>Driver:</span> <strong>{showDetail.driver}</strong> &nbsp; <span style={{fontSize:12,color:"#8D8D8D"}}>Odometer:</span> <strong>{showDetail.odometer?showDetail.odometer.toLocaleString()+" km":"N/A"}</strong> &nbsp; <Badge label={showDetail.status}/></div><table style={{width:"100%",borderCollapse:"collapse"}}><tbody>{inspItems.map((item,i)=>(<tr key={i}><td style={{...tc,fontSize:13}}>{item}</td><td style={{...tc,textAlign:"right"}}><span style={{padding:"3px 10px",borderRadius:10,fontSize:11,fontWeight:600,background:showDetail.items[i]==="Pass"?"#24A14818":"#DA1E2818",color:showDetail.items[i]==="Pass"?"#24A148":"#DA1E28"}}>{showDetail.items[i]||"N/A"}</span></td></tr>))}</tbody></table>{showDetail.notes&&<div style={{marginTop:12,padding:10,background:"#F4F4F4",borderRadius:8,fontSize:12}}><strong>Notes:</strong> {showDetail.notes}</div>}</Modal>)}
    {showAddItem&&(<Modal title="Manage Checklist Items" onClose={()=>setShowAddItem(false)}><div style={{display:"flex",gap:8,marginBottom:16}}><input style={{...inp,flex:1}} placeholder="e.g. Seat belts" value={newItem} onChange={e=>setNewItem(e.target.value)}/><button onClick={()=>{if(newItem.trim()){setInspItems([...inspItems,newItem.trim()]);setNewItem("");}}} style={{padding:"9px 16px",borderRadius:8,border:"none",background:P,color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>Add</button></div>{inspItems.map((item,i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #F4F4F4",fontSize:13}}><span>{item}</span><button onClick={()=>setInspItems(inspItems.filter((_,j)=>j!==i))} style={{background:"none",border:"none",color:"#DA1E28",fontSize:11,cursor:"pointer",fontWeight:600}}>Remove</button></div>))}<div style={{display:"flex",justifyContent:"flex-end",marginTop:12}}><button onClick={()=>setShowAddItem(false)} style={{padding:"9px 20px",borderRadius:8,border:"1.5px solid #E0E0E0",background:"#fff",color:"#525252",fontSize:13,fontWeight:600,cursor:"pointer"}}>Close</button></div></Modal>)}
    {showAdd&&(<Modal title="Daily Inspection" onClose={()=>setShowAdd(false)}><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><Field label="Vehicle *"><SearchSelect options={vehicles.map(v=>({value:v.id,label:`${v.name} (${v.id})`}))} value={form.vehicle} onChange={v=>setForm({...form,vehicle:v})} placeholder="Search vehicles..."/></Field><Field label="Driver *"><SearchSelect options={drivers.map(d=>({value:d.name,label:d.name}))} value={form.driver} onChange={v=>setForm({...form,driver:v})} placeholder="Search drivers..."/></Field></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><Field label="Date"><input style={inp} type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></Field><Field label="Odometer (km)"><input style={inp} type="number" placeholder="e.g. 45230" value={form.odometer} onChange={e=>setForm({...form,odometer:e.target.value})}/></Field></div><div style={{marginBottom:14}}><label style={{display:"block",fontSize:12,fontWeight:600,color:"#525252",marginBottom:8}}>Inspection Checklist</label>{inspItems.map((item,i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",background:i%2===0?"#F8FAFF":"#fff",borderRadius:6,marginBottom:2}}><span style={{fontSize:13}}>{item}</span><div style={{display:"flex",gap:6}}>{["Pass","Fail"].map(v=>(<button key={v} onClick={()=>setForm({...form,items:{...form.items,[i]:v}})} style={{padding:"4px 12px",borderRadius:6,border:form.items[i]===v?"none":"1.5px solid #E0E0E0",background:form.items[i]===v?(v==="Pass"?"#24A148":"#DA1E28"):"#fff",color:form.items[i]===v?"#fff":(v==="Pass"?"#24A148":"#DA1E28"),fontSize:11,fontWeight:600,cursor:"pointer"}}>{v}</button>))}</div></div>))}</div><Field label="Notes"><input style={inp} placeholder="Any issues or comments" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></Field><div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:8}}><button onClick={()=>setShowAdd(false)} style={{padding:"9px 20px",borderRadius:8,border:"1.5px solid #E0E0E0",background:"#fff",color:"#525252",fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancel</button><button onClick={handleSave} disabled={!form.vehicle||!form.driver} style={{display:"flex",alignItems:"center",gap:6,padding:"9px 20px",borderRadius:8,border:"none",background:(form.vehicle&&form.driver)?P:"#C6C6C6",color:"#fff",fontSize:13,fontWeight:600,cursor:(form.vehicle&&form.driver)?"pointer":"not-allowed"}}><Save size={14}/>Submit</button></div></Modal>)}
  </div>);
}

function VendorsPage({vendors,setVendors,vendorTypes,canEdit}){
  const [filt,setFilt]=useState("All");const [showAdd,setShowAdd]=useState(false);const [editV,setEditV]=useState(null);const [q,setQ]=useState("");
  const defForm={name:"",type:vendorTypes[0]||"Service",phone:"",email:"",contact:"",city:""};
  const [form,setForm]=useState(defForm);
  const list=vendors.filter(v=>(filt==="All"||v.type.includes(filt))&&(q===""||v.name.toLowerCase().includes(q.toLowerCase())));
  const handleSave=async()=>{try{if(editV){await db.updateVendor(editV,form);setVendors(vendors.map(v=>v.id===editV?{...v,...form}:v));setEditV(null);}else{const nid=`VN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,5).toUpperCase()}`;const saved=await db.addVendor({id:nid,...form});if(saved){setVendors(prev=>[...prev,saved]);}else{const all=await db.getVendors();setVendors(all);}}setShowAdd(false);setForm(defForm);}catch(e){alert("Error: "+e.message);}};
  const handleDelete=async(id)=>{if(confirm("Delete this vendor?")){try{await db.deleteVendor(id);setVendors(vendors.filter(v=>v.id!==id));}catch(e){alert("Error: "+e.message);}}};
  const startEdit=(v)=>{setForm({name:v.name,type:v.type||"Service",phone:v.phone||"",email:v.email||"",contact:v.contact||"",city:v.city||""});setEditV(v.id);setShowAdd(true);};
  return(<div style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"grid",gridTemplateColumns:window.innerWidth<768?"1fr 1fr":"repeat(3,1fr)",gap:14}}><Kpi icon={Briefcase} label="Total Vendors" value={vendors.length}/><Kpi icon={Wrench} label="Diesel Suppliers" value={vendors.filter(v=>v.type==="Diesel Supplier").length}/><Kpi icon={Fuel} label="Fuel Stations" value={vendors.filter(v=>v.type==="Fuel Station"||v.type==="Fuel").length}/></div>
    <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8}}><div style={{display:"flex",gap:6,alignItems:"center"}}>{["All",...(vendorTypes.length>0?vendorTypes:["Service","Fuel"])].map(s=>(<button key={s} onClick={()=>setFilt(s)} style={{padding:"6px 14px",borderRadius:7,border:filt===s?`1.5px solid ${P}`:"1.5px solid #E0E0E0",background:filt===s?"#D0E2FF":"#fff",color:filt===s?P:"#525252",fontSize:12,fontWeight:600,cursor:"pointer"}}>{s}</button>))}<div style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:7,background:"#F4F4F4",marginLeft:6}}><Search size={13} color="#8D8D8D"/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search vendors..." style={{border:"none",outline:"none",background:"transparent",fontSize:12,width:140,fontFamily:"inherit"}}/></div></div>{canEdit&&<button onClick={()=>{setEditV(null);setForm(defForm);setShowAdd(true);}} style={{display:"flex",alignItems:"center",gap:5,padding:"8px 16px",borderRadius:9,background:P,color:"#fff",border:"none",fontSize:12,fontWeight:600,cursor:"pointer"}}><Plus size={15}/>Add Vendor</button>}</div>
    <div style={{background:"#fff",borderRadius:14,border:"1px solid #E8ECF1",overflow:"hidden"}}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr style={{background:"#F4F4F4"}}>{["Vendor","Type","Contact","Phone","City",canEdit?"":""].filter(Boolean).map(h=>(<th key={h} style={th}>{h}</th>))}</tr></thead><tbody>{list.length===0?<tr><td colSpan={canEdit?6:5} style={{padding:20,textAlign:"center",color:"#8D8D8D",fontSize:13}}>No vendors found</td></tr>:list.map(v=>(<tr key={v.id} onMouseEnter={e=>e.currentTarget.style.background="#F8FAFF"} onMouseLeave={e=>e.currentTarget.style.background=""}><td style={{...tc,fontWeight:600}}>{v.name}<div style={{fontSize:11,color:"#8D8D8D"}}>{v.id}</div></td><td style={tc}><span style={{fontSize:11,padding:"3px 10px",borderRadius:10,background:v.type.includes("Fuel")?"#D0E2FF":"#F4F4F4",color:v.type.includes("Fuel")?P:"#525252",fontWeight:600}}>{v.type||"Service"}</span></td><td style={tc}>{v.contact||v.email||"-"}</td><td style={tc}>{v.phone||"-"}</td><td style={tc}>{v.city||"-"}</td>{canEdit&&<td style={tc}><div style={{display:"flex",gap:4}}><button onClick={()=>startEdit(v)} style={{padding:"4px 8px",borderRadius:5,border:"1px solid #E0E0E0",background:"#fff",cursor:"pointer"}}><Pencil size={12} color="#525252"/></button><button onClick={()=>handleDelete(v.id)} style={{padding:"4px 8px",borderRadius:5,border:"1px solid #E0E0E0",background:"#fff",cursor:"pointer"}}><Trash2 size={12} color="#DA1E28"/></button></div></td>}</tr>))}</tbody></table></div>
    {showAdd&&(<Modal title={editV?"Edit Vendor":"Add Vendor"} onClose={()=>{setShowAdd(false);setEditV(null);}}><Field label="Vendor Name *"><input style={inp} placeholder="e.g. Kazeem Mechanic" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field><Field label="Type"><select style={inp} value={form.type} onChange={e=>setForm({...form,type:e.target.value})}>{vendorTypes.length>0?vendorTypes.map(t=>(<option key={t}>{t}</option>)):<><option>Service</option><option>Fuel</option></>}</select></Field><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><Field label="Contact Name"><input style={inp} value={form.contact} onChange={e=>setForm({...form,contact:e.target.value})}/></Field><Field label="Phone"><input style={inp} placeholder="+234..." value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></Field></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><Field label="Email"><input style={inp} type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></Field><Field label="City"><input style={inp} value={form.city} onChange={e=>setForm({...form,city:e.target.value})}/></Field></div><div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:8}}><button onClick={()=>{setShowAdd(false);setEditV(null);}} style={{padding:"9px 20px",borderRadius:8,border:"1.5px solid #E0E0E0",background:"#fff",color:"#525252",fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancel</button><button onClick={handleSave} disabled={!form.name} style={{display:"flex",alignItems:"center",gap:6,padding:"9px 20px",borderRadius:8,border:"none",background:form.name?P:"#C6C6C6",color:"#fff",fontSize:13,fontWeight:600,cursor:form.name?"pointer":"not-allowed"}}><Save size={14}/>{editV?"Update":"Save"}</button></div></Modal>)}
  </div>);
}

function ReportsPage({vehicles,generators,drivers,workOrders,fuelLogs,dieselReadings,dieselPurchases,dieselDistributions}){
  const [report,setReport]=useState("fleet");
  const _rpNow=new Date();const _rpMonthStart=new Date(_rpNow.getFullYear(),_rpNow.getMonth(),1).toISOString().split("T")[0];
  const [dateFrom,setDateFrom]=useState(_rpMonthStart);const [dateTo,setDateTo]=useState(_rpNow.toISOString().split("T")[0]);const [fuelTypeFilter,setFuelTypeFilter]=useState("All");
  const tabs=[["fleet","Fleet Summary"],["fuel","Fuel Consumption"],["dieselcost","Diesel Cost"],["storecompare","Store Comparison"],["maintenance","Maintenance & WO"],["driver","Driver Performance"]];
  const inRange=(d)=>{if(!d)return true;return d>=dateFrom&&d<=dateTo;};
  const fFL=fuelLogs.filter(f=>inRange(f.date));
  const fWO=workOrders.filter(w=>inRange(w.due));
  const fDR=(dieselReadings||[]).filter(r=>inRange(r.date));
  const fDD=(dieselDistributions||[]).filter(d=>inRange(d.date));
  const avgDieselPrice=(()=>{const priced=(dieselPurchases||[]).filter(p=>(p.pricePerL||0)>0);const tl=priced.reduce((s,p)=>s+(p.litres||0),0);const tcst=priced.reduce((s,p)=>s+(p.litres||0)*p.pricePerL,0);return tl>0?tcst/tl:0;})();
  const getVName=(id)=>{const v=vehicles.find(x=>x.id===id);return v?v.name:id;};
  const getGName=(id)=>{const g=generators.find(x=>x.id===id);return g?g.name:id;};
  const csvExport=(headers,rows,filename)=>{const csv=[headers.join(","),...rows.map(r=>r.map(c=>typeof c==="string"&&c.includes(",")?`"${c}"`:c).join(","))].join("\n");const blob=new Blob([csv],{type:"text/csv"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=filename+".csv";a.click();};
  const pdfExport=(title,headers,rows)=>{const w=window.open("","_blank");w.document.write(`<html><head><title>${title}</title><style>body{font-family:DM Sans,Arial,sans-serif;padding:30px;color:#161616}h1{font-size:20px;margin-bottom:4px}h2{font-size:12px;color:#8D8D8D;font-weight:400;margin-bottom:20px}table{width:100%;border-collapse:collapse;font-size:12px}th{background:#F4F4F4;padding:8px 12px;text-align:left;font-weight:600;border-bottom:2px solid #E0E0E0}td{padding:8px 12px;border-bottom:1px solid #F4F4F4}.logo{color:#0F62FE;font-size:24px;font-weight:700;margin-bottom:2px}@media print{button{display:none}}</style></head><body><div class="logo">FleetPro</div><h1>${title}</h1><h2>${dateFrom} to ${dateTo}</h2><table><thead><tr>${headers.map(h=>"<th>"+h+"</th>").join("")}</tr></thead><tbody>${rows.map(r=>"<tr>"+r.map(c=>"<td>"+c+"</td>").join("")+"</tr>").join("")}</tbody></table><br><button onclick="window.print();window.close();" style="padding:10px 20px;background:#0F62FE;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600">Print / Save as PDF</button></body></html>`);w.document.close();};
  const card={background:"#fff",borderRadius:14,border:"1px solid #E8ECF1",padding:20};
  const renderFleet=()=>{const statusCount=(arr,s)=>arr.filter(x=>x.status===s).length;const vData=[{name:"Active",v:statusCount(vehicles,"Active"),g:statusCount(generators,"Active")},{name:"In Shop/Maint",v:statusCount(vehicles,"In Shop"),g:statusCount(generators,"In Maintenance")},{name:"Out/Standby",v:statusCount(vehicles,"Out of Service"),g:statusCount(generators,"Standby")}];const headers=["Asset","ID","Type","Status","Location"];const vRows=vehicles.map(v=>[v.name,v.id,v.type,v.status,v.loc]);const gRows=generators.map(g=>[g.name,g.id,g.cap||"-",g.status,g.loc]);const allRows=[...vRows,...gRows];return(<div style={{display:"flex",flexDirection:"column",gap:16}}><div style={{display:"grid",gridTemplateColumns:window.innerWidth<768?"1fr 1fr":"repeat(4,1fr)",gap:14}}><Kpi icon={Truck} label="Total Vehicles" value={vehicles.length}/><Kpi icon={Zap} label="Total Generators" value={generators.length}/><Kpi icon={AlertTriangle} label="In Shop / Maint." value={statusCount(vehicles,"In Shop")+statusCount(generators,"In Maintenance")} accent="#FF832B"/><Kpi icon={ClipboardList} label="Open Work Orders" value={workOrders.filter(w=>w.status!=="Completed").length}/></div><div style={card}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><h4 style={{fontSize:14,fontWeight:700,margin:0}}>Fleet Status Overview</h4><div style={{display:"flex",gap:6}}><button onClick={()=>csvExport(headers,allRows,"fleet-summary")} style={{display:"flex",alignItems:"center",gap:4,padding:"6px 12px",borderRadius:7,border:"1.5px solid #E0E0E0",background:"#fff",fontSize:11,fontWeight:600,cursor:"pointer",color:"#525252"}}><Download size={12}/>CSV</button><button onClick={()=>pdfExport("Fleet Summary Report",headers,allRows)} style={{display:"flex",alignItems:"center",gap:4,padding:"6px 12px",borderRadius:7,border:"1.5px solid #E0E0E0",background:"#fff",fontSize:11,fontWeight:600,cursor:"pointer",color:"#525252"}}><Download size={12}/>PDF</button></div></div><ResponsiveContainer width="100%" height={220}><BarChart data={vData}><CartesianGrid strokeDasharray="3 3" stroke="#F4F4F4"/><XAxis dataKey="name" fontSize={11}/><YAxis fontSize={11}/><Tooltip/><Legend/><Bar dataKey="v" name="Vehicles" fill={P} radius={[4,4,0,0]}/><Bar dataKey="g" name="Generators" fill="#8A3FFC" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div><div style={card}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr style={{background:"#F4F4F4"}}>{["Asset","ID","Type/Capacity","Status","Location"].map(h=>(<th key={h} style={th}>{h}</th>))}</tr></thead><tbody>{vehicles.map(v=>(<tr key={v.id}><td style={{...tc,fontWeight:600}}>{v.name}</td><td style={tc}>{v.id}</td><td style={tc}>{v.type}</td><td style={tc}><Badge label={v.status}/></td><td style={tc}>{v.loc}</td></tr>))}{generators.map(g=>(<tr key={g.id}><td style={{...tc,fontWeight:600}}>{g.name}</td><td style={tc}>{g.id}</td><td style={tc}>{g.cap||"-"}</td><td style={tc}><Badge label={g.status}/></td><td style={tc}>{g.loc}</td></tr>))}</tbody></table></div></div>);};
  const renderFuel=()=>{const ftf=fuelTypeFilter;const vFuel=fFL.filter(f=>!f.isGen&&(ftf==="All"||f.fuelType===ftf));const gFuel=fFL.filter(f=>f.isGen&&(ftf==="All"||f.fuelType===ftf));const totalV=vFuel.reduce((s,f)=>s+f.cost,0);const totalG=gFuel.reduce((s,f)=>s+f.cost,0);const byAsset={};vFuel.forEach(f=>{const n=getVName(f.asset);if(!byAsset[n])byAsset[n]={litres:0,cost:0,km:0};byAsset[n].litres+=f.litres;byAsset[n].cost+=f.cost;byAsset[n].km+=(f.odoEnd||0)-(f.odoStart||0);});const assetData=Object.entries(byAsset).map(([name,d])=>({name:name.length>15?name.substring(0,15)+"..":name,cost:d.cost,l100:d.km>0?((d.litres/d.km)*100):0}));const headers=["Asset","Litres","Cost","Distance","L/100km"];const rows=Object.entries(byAsset).map(([name,d])=>[name,d.litres.toFixed(0),fmt(d.cost),d.km.toLocaleString()+" km",d.km>0?((d.litres/d.km)*100).toFixed(1):"-"]);const gHeaders=["Generator","Litres","Cost","Hours","L/hr"];const gByAsset={};gFuel.forEach(f=>{const n=getGName(f.asset);if(!gByAsset[n])gByAsset[n]={litres:0,cost:0,hrs:0};gByAsset[n].litres+=f.litres;gByAsset[n].cost+=f.cost;gByAsset[n].hrs+=(f.hrsEnd||0)-(f.hrsStart||0);});const gRows=Object.entries(gByAsset).map(([name,d])=>[name,d.litres.toFixed(0),fmt(d.cost),d.hrs+" hrs",d.hrs>0?(d.litres/d.hrs).toFixed(1):"-"]);return(<div style={{display:"flex",flexDirection:"column",gap:16}}><div style={{display:"grid",gridTemplateColumns:window.innerWidth<768?"1fr 1fr":"repeat(4,1fr)",gap:14}}><Kpi icon={Fuel} label="Vehicle Fuel Spend" value={fmt(totalV)}/><Kpi icon={Zap} label="Generator Fuel Spend" value={fmt(totalG)}/><Kpi icon={DollarSign} label="Total Fuel Spend" value={fmt(totalV+totalG)} accent="#DA1E28"/><Kpi icon={Gauge} label="Total Litres" value={(vFuel.reduce((s,f)=>s+f.litres,0)+gFuel.reduce((s,f)=>s+f.litres,0)).toLocaleString()+" L"}/></div><div style={card}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><h4 style={{fontSize:14,fontWeight:700,margin:0}}>Vehicle Fuel Cost by Asset</h4><div style={{display:"flex",gap:6}}><button onClick={()=>csvExport(headers,rows,"fuel-vehicles")} style={{display:"flex",alignItems:"center",gap:4,padding:"6px 12px",borderRadius:7,border:"1.5px solid #E0E0E0",background:"#fff",fontSize:11,fontWeight:600,cursor:"pointer",color:"#525252"}}><Download size={12}/>CSV</button><button onClick={()=>pdfExport("Vehicle Fuel Consumption Report",headers,rows)} style={{display:"flex",alignItems:"center",gap:4,padding:"6px 12px",borderRadius:7,border:"1.5px solid #E0E0E0",background:"#fff",fontSize:11,fontWeight:600,cursor:"pointer",color:"#525252"}}><Download size={12}/>PDF</button></div></div>{assetData.length>0&&<ResponsiveContainer width="100%" height={220}><BarChart data={assetData}><CartesianGrid strokeDasharray="3 3" stroke="#F4F4F4"/><XAxis dataKey="name" fontSize={10}/><YAxis fontSize={11}/><Tooltip formatter={(v)=>fmt(v)}/><Bar dataKey="cost" name="Cost" fill={P} radius={[4,4,0,0]}/></BarChart></ResponsiveContainer>}<table style={{width:"100%",borderCollapse:"collapse",marginTop:12}}><thead><tr style={{background:"#F4F4F4"}}>{headers.map(h=>(<th key={h} style={th}>{h}</th>))}</tr></thead><tbody>{rows.length===0?<tr><td colSpan={5} style={{...tc,textAlign:"center",color:"#8D8D8D"}}>No vehicle fuel data in range</td></tr>:rows.map((r,i)=>(<tr key={i}>{r.map((c,j)=>(<td key={j} style={{...tc,fontWeight:j===0?600:400}}>{c}</td>))}</tr>))}{rows.length>0&&<tr style={{background:"#F4F4F4"}}><td style={{...tc,fontWeight:700}}>Total</td><td style={{...tc,fontWeight:700}}>{Object.values(byAsset).reduce((s,d)=>s+d.litres,0).toLocaleString()} L</td><td style={{...tc,fontWeight:700}}>{fmt(Object.values(byAsset).reduce((s,d)=>s+d.cost,0))}</td><td style={tc}>-</td><td style={tc}>-</td></tr>}</tbody></table></div><div style={card}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><h4 style={{fontSize:14,fontWeight:700,margin:0}}>Generator Fuel by Asset</h4><div style={{display:"flex",gap:6}}><button onClick={()=>csvExport(gHeaders,gRows,"fuel-generators")} style={{display:"flex",alignItems:"center",gap:4,padding:"6px 12px",borderRadius:7,border:"1.5px solid #E0E0E0",background:"#fff",fontSize:11,fontWeight:600,cursor:"pointer",color:"#525252"}}><Download size={12}/>CSV</button><button onClick={()=>pdfExport("Generator Fuel Report",gHeaders,gRows)} style={{display:"flex",alignItems:"center",gap:4,padding:"6px 12px",borderRadius:7,border:"1.5px solid #E0E0E0",background:"#fff",fontSize:11,fontWeight:600,cursor:"pointer",color:"#525252"}}><Download size={12}/>PDF</button></div></div><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr style={{background:"#F4F4F4"}}>{gHeaders.map(h=>(<th key={h} style={th}>{h}</th>))}</tr></thead><tbody>{gRows.length===0?<tr><td colSpan={5} style={{...tc,textAlign:"center",color:"#8D8D8D"}}>No generator fuel data in range</td></tr>:gRows.map((r,i)=>(<tr key={i}>{r.map((c,j)=>(<td key={j} style={{...tc,fontWeight:j===0?600:400}}>{c}</td>))}</tr>))}</tbody></table></div></div>);};
  const renderMaint=()=>{const open=fWO.filter(w=>w.status==="Open").length;const prog=fWO.filter(w=>w.status==="In Progress").length;const done=fWO.filter(w=>w.status==="Completed").length;const totalCost=fWO.reduce((s,w)=>s+(w.cost||0),0);const byType={};fWO.forEach(w=>{if(!byType[w.type])byType[w.type]={count:0,cost:0};byType[w.type].count++;byType[w.type].cost+=w.cost||0;});const typeData=Object.entries(byType).map(([t,d])=>({name:t,...d}));const headers=["WO ID","Asset","Type","Priority","Status","Cost","Due"];const rows=fWO.map(w=>[w.id,w.asset,w.type,w.priority,w.status,w.cost?fmt(w.cost):"-",w.due||"-"]);return(<div style={{display:"flex",flexDirection:"column",gap:16}}><div style={{display:"grid",gridTemplateColumns:window.innerWidth<768?"1fr 1fr":"repeat(4,1fr)",gap:14}}><Kpi icon={FileText} label="Open" value={open} accent="#F1C21B"/><Kpi icon={Clock} label="In Progress" value={prog} accent={P}/><Kpi icon={Wrench} label="Completed" value={done} accent="#24A148"/><Kpi icon={DollarSign} label="Total WO Cost" value={fmt(totalCost)}/></div><div style={card}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><h4 style={{fontSize:14,fontWeight:700,margin:0}}>Work Orders by Type</h4><div style={{display:"flex",gap:6}}><button onClick={()=>csvExport(headers,rows,"work-orders")} style={{display:"flex",alignItems:"center",gap:4,padding:"6px 12px",borderRadius:7,border:"1.5px solid #E0E0E0",background:"#fff",fontSize:11,fontWeight:600,cursor:"pointer",color:"#525252"}}><Download size={12}/>CSV</button><button onClick={()=>pdfExport("Maintenance & Work Orders Report",headers,rows)} style={{display:"flex",alignItems:"center",gap:4,padding:"6px 12px",borderRadius:7,border:"1.5px solid #E0E0E0",background:"#fff",fontSize:11,fontWeight:600,cursor:"pointer",color:"#525252"}}><Download size={12}/>PDF</button></div></div>{typeData.length>0&&<ResponsiveContainer width="100%" height={220}><BarChart data={typeData}><CartesianGrid strokeDasharray="3 3" stroke="#F4F4F4"/><XAxis dataKey="name" fontSize={11}/><YAxis fontSize={11}/><Tooltip formatter={(v,n)=>n==="cost"?fmt(v):v}/><Legend/><Bar dataKey="count" name="Count" fill="#8A3FFC" radius={[4,4,0,0]}/><Bar dataKey="cost" name="Cost" fill="#FF832B" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer>}<table style={{width:"100%",borderCollapse:"collapse",marginTop:12}}><thead><tr style={{background:"#F4F4F4"}}>{headers.map(h=>(<th key={h} style={th}>{h}</th>))}</tr></thead><tbody>{rows.length===0?<tr><td colSpan={7} style={{...tc,textAlign:"center",color:"#8D8D8D"}}>No work orders in range</td></tr>:rows.map((r,i)=>(<tr key={i}>{r.map((c,j)=>(<td key={j} style={{...tc,fontWeight:j===0?600:400}}>{c}</td>))}</tr>))}</tbody></table></div></div>);};
  const renderDieselCost=()=>{
    const byStore={};
    fDR.forEach(r=>{const s=byStore[r.storeLoc]=byStore[r.storeLoc]||{litres:0,hrs:0,readings:0};s.litres+=(r.consumptionLitres||0);s.hrs+=(r.hoursRun||0);s.readings++;});
    const totalL=Object.values(byStore).reduce((s,d)=>s+d.litres,0);
    const totalCost=Math.round(totalL*avgDieselPrice);
    const storeRows=Object.entries(byStore).filter(([,d])=>d.litres>0).map(([loc,d])=>({loc,...d,cost:Math.round(d.litres*avgDieselPrice),perHr:d.hrs>0?d.litres*avgDieselPrice/d.hrs:0,share:totalL>0?d.litres/totalL*100:0})).sort((a,b)=>b.cost-a.cost);
    const byMonth={};
    fDR.forEach(r=>{const m=r.date.slice(0,7);const s=byMonth[m]=byMonth[m]||{litres:0};s.litres+=(r.consumptionLitres||0);});
    const monthRows=Object.entries(byMonth).sort((a,b)=>a[0].localeCompare(b[0])).map(([m,d])=>({m,litres:Math.round(d.litres),cost:Math.round(d.litres*avgDieselPrice)}));
    const chartData=storeRows.slice(0,12).map(s=>({name:s.loc.length>12?s.loc.substring(0,12)+"..":s.loc,cost:s.cost}));
    const headers=["Store","Consumed (L)","Est. Cost","Hours Run","Cost/Hr","Share %"];
    const rows=storeRows.map(s=>[s.loc,Math.round(s.litres).toLocaleString(),fmt(s.cost),s.hrs.toFixed(1),s.perHr?fmt(Math.round(s.perHr)):"-",s.share.toFixed(1)+"%"]);
    return(<div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"grid",gridTemplateColumns:window.innerWidth<768?"1fr 1fr":"repeat(4,1fr)",gap:14}}>
        <Kpi icon={DollarSign} label="Est. Diesel Cost" value={fmt(totalCost)} accent="#DA1E28" sub={`@ ${fmt(Math.round(avgDieselPrice))}/L weighted avg`}/>
        <Kpi icon={Droplet} label="Litres Consumed" value={Math.round(totalL).toLocaleString()+" L"}/>
        <Kpi icon={TrendingUp} label="Costliest Store" value={storeRows[0]?.loc||"-"} sub={storeRows[0]?fmt(storeRows[0].cost):""}/>
        <Kpi icon={Package} label="Stores Consuming" value={storeRows.length}/>
      </div>
      {avgDieselPrice===0&&<div style={{padding:"10px 14px",borderRadius:8,background:"#FFF8E1",border:"1px solid #FFE082",color:"#F57F17",fontSize:12}}>No diesel purchases recorded — cost is estimated at ₦0/L. Log purchases in Diesel Management to price consumption.</div>}
      <div style={card}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><h4 style={{fontSize:14,fontWeight:700,margin:0}}>Diesel Cost by Store</h4><div style={{display:"flex",gap:6}}><button onClick={()=>csvExport(headers,rows,"diesel-cost")} style={{display:"flex",alignItems:"center",gap:4,padding:"6px 12px",borderRadius:7,border:"1.5px solid #E0E0E0",background:"#fff",fontSize:11,fontWeight:600,cursor:"pointer",color:"#525252"}}><Download size={12}/>CSV</button><button onClick={()=>pdfExport("Diesel Cost Report",headers,rows)} style={{display:"flex",alignItems:"center",gap:4,padding:"6px 12px",borderRadius:7,border:"1.5px solid #E0E0E0",background:"#fff",fontSize:11,fontWeight:600,cursor:"pointer",color:"#525252"}}><Download size={12}/>PDF</button></div></div>
        {chartData.length>0&&<ResponsiveContainer width="100%" height={220}><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="#F4F4F4"/><XAxis dataKey="name" fontSize={10}/><YAxis fontSize={11} tickFormatter={(v)=>v>=1e6?(v/1e6).toFixed(1)+"M":(v/1e3).toFixed(0)+"k"}/><Tooltip formatter={(v)=>fmt(v)}/><Bar dataKey="cost" name="Cost" fill={P} radius={[4,4,0,0]}/></BarChart></ResponsiveContainer>}
        <table style={{width:"100%",borderCollapse:"collapse",marginTop:12}}><thead><tr style={{background:"#F4F4F4"}}>{headers.map(h=>(<th key={h} style={th}>{h}</th>))}</tr></thead><tbody>
          {rows.length===0?<tr><td colSpan={6} style={{...tc,textAlign:"center",color:"#8D8D8D"}}>No diesel consumption in range</td></tr>:rows.map((r,i)=>(<tr key={i}>{r.map((c,j)=>(<td key={j} style={{...tc,fontWeight:j===0?600:400}}>{c}</td>))}</tr>))}
          {rows.length>0&&<tr style={{background:"#F4F4F4"}}><td style={{...tc,fontWeight:700}}>Total</td><td style={{...tc,fontWeight:700}}>{Math.round(totalL).toLocaleString()} L</td><td style={{...tc,fontWeight:700}}>{fmt(totalCost)}</td><td style={tc} colSpan={3}>-</td></tr>}
        </tbody></table>
      </div>
      <div style={card}>
        <h4 style={{fontSize:14,fontWeight:700,margin:"0 0 12px"}}>Monthly Trend</h4>
        {monthRows.length>0&&<ResponsiveContainer width="100%" height={180}><BarChart data={monthRows}><CartesianGrid strokeDasharray="3 3" stroke="#F4F4F4"/><XAxis dataKey="m" fontSize={10}/><YAxis fontSize={11} tickFormatter={(v)=>v>=1e6?(v/1e6).toFixed(1)+"M":(v/1e3).toFixed(0)+"k"}/><Tooltip formatter={(v)=>fmt(v)}/><Bar dataKey="cost" name="Cost" fill="#8A3FFC" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer>}
      </div>
    </div>);};
  const renderStoreCompare=()=>{
    const byStore={};
    fDR.forEach(r=>{const s=byStore[r.storeLoc]=byStore[r.storeLoc]||{readings:0,hrs:0,litres:0,flags:0,evaluated:0,photo:0};s.readings++;s.hrs+=(r.hoursRun||0);s.litres+=(r.consumptionLitres||0);if(r.discrepancyLitres!=null)s.evaluated++;if(r.discrepancyFlag)s.flags++;if(r.genSource==="photo")s.photo++;});
    fDD.forEach(d=>{const s=byStore[d.storeLoc];if(s)s.received=(s.received||0)+(d.litres||0);});
    const list=Object.entries(byStore).map(([loc,s])=>({loc,...s,rate:s.hrs>0?s.litres/s.hrs:0,received:s.received||0,balance:(s.received||0)-s.litres,flagPct:s.evaluated>0?s.flags/s.evaluated*100:null,photoPct:s.readings>0?s.photo/s.readings*100:0})).sort((a,b)=>b.litres-a.litres);
    const withRate=list.filter(s=>s.rate>0);
    const best=withRate.length?[...withRate].sort((a,b)=>a.rate-b.rate)[0]:null;
    const worst=withRate.length?[...withRate].sort((a,b)=>b.rate-a.rate)[0]:null;
    const chartData=withRate.map(s=>({name:s.loc.length>12?s.loc.substring(0,12)+"..":s.loc,rate:Math.round(s.rate*100)/100}));
    const headers=["Store","Readings","Hours Run","Consumed (L)","L/hr","Received (L)","Balance (L)","Flags","Flag %","Photo %"];
    const rows=list.map(s=>[s.loc,s.readings,s.hrs.toFixed(1),Math.round(s.litres).toLocaleString(),s.rate?s.rate.toFixed(2):"-",s.received?Math.round(s.received).toLocaleString():"-",Math.round(s.balance).toLocaleString(),s.flags,s.flagPct!=null?s.flagPct.toFixed(0)+"%":"-",s.photoPct.toFixed(0)+"%"]);
    return(<div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"grid",gridTemplateColumns:window.innerWidth<768?"1fr 1fr":"repeat(4,1fr)",gap:14}}>
        <Kpi icon={Package} label="Stores Reporting" value={list.length}/>
        <Kpi icon={TrendingDown} label="Most Efficient" value={best?.loc||"-"} sub={best?best.rate.toFixed(2)+" L/hr":""} accent="#24A148"/>
        <Kpi icon={TrendingUp} label="Heaviest Burner" value={worst?.loc||"-"} sub={worst?worst.rate.toFixed(2)+" L/hr":""} accent="#DA1E28"/>
        <Kpi icon={AlertTriangle} label="Total Flags" value={list.reduce((s,x)=>s+x.flags,0)}/>
      </div>
      <div style={card}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><h4 style={{fontSize:14,fontWeight:700,margin:0}}>Consumption Rate by Store (L/hr)</h4><div style={{display:"flex",gap:6}}><button onClick={()=>csvExport(headers,rows,"store-comparison")} style={{display:"flex",alignItems:"center",gap:4,padding:"6px 12px",borderRadius:7,border:"1.5px solid #E0E0E0",background:"#fff",fontSize:11,fontWeight:600,cursor:"pointer",color:"#525252"}}><Download size={12}/>CSV</button><button onClick={()=>pdfExport("Store Comparison Report",headers,rows)} style={{display:"flex",alignItems:"center",gap:4,padding:"6px 12px",borderRadius:7,border:"1.5px solid #E0E0E0",background:"#fff",fontSize:11,fontWeight:600,cursor:"pointer",color:"#525252"}}><Download size={12}/>PDF</button></div></div>
        {chartData.length>0&&<ResponsiveContainer width="100%" height={220}><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="#F4F4F4"/><XAxis dataKey="name" fontSize={10}/><YAxis fontSize={11}/><Tooltip formatter={(v)=>v+" L/hr"}/><Bar dataKey="rate" name="L/hr" fill="#8A3FFC" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer>}
        <div style={{overflow:"auto",marginTop:12}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:780}}><thead><tr style={{background:"#F4F4F4"}}>{headers.map(h=>(<th key={h} style={{...th,whiteSpace:"nowrap"}}>{h}</th>))}</tr></thead><tbody>
          {rows.length===0?<tr><td colSpan={10} style={{...tc,textAlign:"center",color:"#8D8D8D"}}>No diesel readings in range</td></tr>
          :list.map((s,i)=>(<tr key={s.loc} style={{background:s.flagPct!=null&&s.flagPct>50?"#FFF8F8":""}}>
            <td style={{...tc,fontWeight:600}}>{s.loc}</td><td style={tc}>{s.readings}</td><td style={tc}>{s.hrs.toFixed(1)}</td><td style={tc}>{Math.round(s.litres).toLocaleString()}</td>
            <td style={{...tc,fontWeight:600}}>{s.rate?s.rate.toFixed(2):"-"}</td><td style={tc}>{s.received?Math.round(s.received).toLocaleString():"-"}</td>
            <td style={{...tc,color:s.balance<0?"#DA1E28":"#161616"}}>{Math.round(s.balance).toLocaleString()}</td>
            <td style={{...tc,fontWeight:s.flags>0?700:400,color:s.flags>0?"#DA1E28":"#161616"}}>{s.flags}</td>
            <td style={tc}>{s.flagPct!=null?s.flagPct.toFixed(0)+"%":"-"}</td><td style={tc}>{s.photoPct.toFixed(0)+"%"}</td>
          </tr>))}
        </tbody></table></div>
      </div>
    </div>);};
  const renderDriver=()=>{const headers=["Driver","ID","License","Status","Trips","Rating","Violations"];const rows=drivers.map(d=>[d.name,d.id,d.lic,d.status,d.trips||0,(d.rating||0)+"/5",d.violations||0]);const best=[...drivers].sort((a,b)=>(b.rating||0)-(a.rating||0));return(<div style={{display:"flex",flexDirection:"column",gap:16}}><div style={{display:"grid",gridTemplateColumns:window.innerWidth<768?"1fr 1fr":"repeat(4,1fr)",gap:14}}><Kpi icon={Users} label="Total Drivers" value={drivers.length}/><Kpi icon={Truck} label="On Duty" value={drivers.filter(d=>d.status==="On Duty").length} accent="#24A148"/><Kpi icon={AlertTriangle} label="Total Violations" value={drivers.reduce((s,d)=>s+(d.violations||0),0)} accent="#DA1E28"/><Kpi icon={Gauge} label="Avg Rating" value={(drivers.reduce((s,d)=>s+(d.rating||0),0)/Math.max(drivers.length,1)).toFixed(1)+"/5"}/></div><div style={card}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><h4 style={{fontSize:14,fontWeight:700,margin:0}}>Driver Performance</h4><div style={{display:"flex",gap:6}}><button onClick={()=>csvExport(headers,rows,"driver-performance")} style={{display:"flex",alignItems:"center",gap:4,padding:"6px 12px",borderRadius:7,border:"1.5px solid #E0E0E0",background:"#fff",fontSize:11,fontWeight:600,cursor:"pointer",color:"#525252"}}><Download size={12}/>CSV</button><button onClick={()=>pdfExport("Driver Performance Report",headers,rows)} style={{display:"flex",alignItems:"center",gap:4,padding:"6px 12px",borderRadius:7,border:"1.5px solid #E0E0E0",background:"#fff",fontSize:11,fontWeight:600,cursor:"pointer",color:"#525252"}}><Download size={12}/>PDF</button></div></div><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr style={{background:"#F4F4F4"}}>{headers.map(h=>(<th key={h} style={th}>{h}</th>))}</tr></thead><tbody>{drivers.map(d=>(<tr key={d.id}><td style={{...tc,fontWeight:600}}>{d.name}</td><td style={tc}>{d.id}</td><td style={tc}>{d.lic}</td><td style={tc}><Badge label={d.status}/></td><td style={tc}>{d.trips||0}</td><td style={{...tc,fontWeight:600,color:(d.rating||0)>=4?"#24A148":(d.rating||0)>=3?"#FF832B":"#DA1E28"}}>{d.rating||0}/5</td><td style={{...tc,fontWeight:600,color:(d.violations||0)>0?"#DA1E28":"#24A148"}}>{d.violations||0}</td></tr>))}</tbody></table></div></div>);};
  return(<div style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
      <div style={{display:"flex",gap:6}}>{tabs.map(([id,label])=>(<button key={id} onClick={()=>setReport(id)} style={{padding:"7px 16px",borderRadius:7,border:report===id?`1.5px solid ${P}`:"1.5px solid #E0E0E0",background:report===id?"#D0E2FF":"#fff",color:report===id?P:"#525252",fontSize:12,fontWeight:600,cursor:"pointer"}}>{label}</button>))}</div>
      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>{report==="fuel"&&<div style={{display:"flex",gap:4}}>{["All","Diesel","Petrol"].map(ft=>(<button key={ft} onClick={()=>setFuelTypeFilter(ft)} style={{padding:"5px 12px",borderRadius:6,border:fuelTypeFilter===ft?"1.5px solid "+P:"1.5px solid #E0E0E0",background:fuelTypeFilter===ft?"#D0E2FF":"#fff",color:fuelTypeFilter===ft?P:"#525252",fontSize:11,fontWeight:600,cursor:"pointer"}}>{ft}</button>))}</div>}<span style={{fontSize:12,color:"#6F6F6F",fontWeight:500}}>Date Range:</span><input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={{...inp,width:140,padding:"6px 10px",fontSize:12}}/><span style={{color:"#8D8D8D"}}>to</span><input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} style={{...inp,width:140,padding:"6px 10px",fontSize:12}}/></div>
    </div>
    {report==="fleet"&&renderFleet()}{report==="fuel"&&renderFuel()}{report==="dieselcost"&&renderDieselCost()}{report==="storecompare"&&renderStoreCompare()}{report==="maintenance"&&renderMaint()}{report==="driver"&&renderDriver()}
  </div>);
}

function ProfileEditor({user,setUser}){
  const [name,setName]=useState(user.name);const [saving,setSaving]=useState(false);const [msg,setMsg]=useState("");
  const [showPw,setShowPw]=useState(false);const [pw,setPw]=useState("");const [pw2,setPw2]=useState("");
  const handleSaveName=async()=>{if(!name.trim())return;setSaving(true);setMsg("");try{await db.updateProfile(user.id,{name:name.trim(),avatar:name.trim().split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2)});setUser({...user,name:name.trim(),avatar:name.trim().split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2)});setMsg("Profile updated!");}catch(e){setMsg("Error: "+e.message);}setSaving(false);};
  const handleChangePw=async()=>{if(pw.length<6){setMsg("Password must be at least 6 characters");return;}if(pw!==pw2){setMsg("Passwords don't match");return;}setSaving(true);setMsg("");try{const{error}=await supabase.auth.updateUser({password:pw});if(error)throw error;setMsg("Password updated!");setPw("");setPw2("");setShowPw(false);}catch(e){setMsg("Error: "+e.message);}setSaving(false);};
  return(<div><Field label="Full Name"><div style={{display:"flex",gap:8}}><input style={{...inp,flex:1}} value={name} onChange={e=>setName(e.target.value)}/><button onClick={handleSaveName} disabled={saving||name===user.name} style={{padding:"9px 16px",borderRadius:8,border:"none",background:(name!==user.name)?P:"#C6C6C6",color:"#fff",fontSize:12,fontWeight:600,cursor:(name!==user.name)?"pointer":"not-allowed"}}>{saving?"...":"Save"}</button></div></Field>{!showPw?<button onClick={()=>setShowPw(true)} style={{background:"none",border:"none",color:P,fontSize:12,fontWeight:600,cursor:"pointer",marginTop:8}}>Change Password</button>:<div style={{marginTop:12}}><Field label="New Password"><input style={inp} type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="Min 6 characters"/></Field><Field label="Confirm Password"><input style={inp} type="password" value={pw2} onChange={e=>setPw2(e.target.value)} placeholder="Re-enter password"/></Field><div style={{display:"flex",gap:8,marginTop:8}}><button onClick={()=>{setShowPw(false);setPw("");setPw2("");}} style={{padding:"8px 16px",borderRadius:8,border:"1.5px solid #E0E0E0",background:"#fff",fontSize:12,fontWeight:600,cursor:"pointer",color:"#525252"}}>Cancel</button><button onClick={handleChangePw} disabled={saving||!pw} style={{padding:"8px 16px",borderRadius:8,border:"none",background:pw?P:"#C6C6C6",color:"#fff",fontSize:12,fontWeight:600,cursor:pw?"pointer":"not-allowed"}}>{saving?"...":"Update Password"}</button></div></div>}{msg&&<div style={{marginTop:10,padding:8,borderRadius:8,background:msg.startsWith("Error")?"#DA1E2818":"#24A14818",color:msg.startsWith("Error")?"#DA1E28":"#24A148",fontSize:12}}>{msg}</div>}</div>);
}

function SettingsPage({locations,setLocations,vendorTypes,setVendorTypes,users,setUsers,user,setUser,appSettings,setAppSettings,dieselLocks,setDieselLocks}){
  const isAdmin=user?.role==="Super Admin"||user?.role==="Fleet Manager";
  const [tab,setTab]=useState(user?.role==="Store Staff"?"profile":"users");const [showAddUser,setShowAddUser]=useState(false);const [showAddLoc,setShowAddLoc]=useState(false);
  const [uf,setUf]=useState({name:"",email:"",password:"",role:"Viewer",store_location:""});const [newLoc,setNewLoc]=useState("");const [newVT,setNewVT]=useState("");const [showAddVT,setShowAddVT]=useState(false);const [loading,setLoading]=useState(false);const [msg,setMsg]=useState("");
  // Diesel admin local state
  const [lockForm,setLockForm]=useState({storeLoc:"",fromDate:"",toDate:"",reason:""});
  const [showAddLock,setShowAddLock]=useState(false);
  const [savingSetting,setSavingSetting]=useState(false);
  const handleAddUser=async()=>{if(!uf.email)return;if(uf.role==="Store Staff"&&!uf.store_location){setMsg("Error: Store Staff must have a store location assigned.");return;}setLoading(true);setMsg("");try{const result=await inviteUser(uf.email,uf.name,uf.role,uf.password);if(uf.role==="Store Staff"&&uf.store_location&&result.user){await db.updateProfile(result.user.id,{store_location:uf.store_location});}setMsg("User created! They can now sign in.");const pr=await db.getProfiles();setUsers(pr);setShowAddUser(false);setUf({name:"",email:"",password:"",role:"Viewer",store_location:""});}catch(e){setMsg("Error: "+e.message);}setLoading(false);};
  const handleRoleChange=async(uid,role)=>{try{await db.updateProfile(uid,{role});setUsers(users.map(u=>u.id===uid?{...u,role}:u));}catch(e){alert("Error: "+e.message);}};
  const handleAddLoc=async()=>{if(!newLoc.trim())return;try{await db.addLocation(newLoc.trim());setLocations([...locations,newLoc.trim()]);setNewLoc("");setShowAddLoc(false);}catch(e){alert("Error: "+e.message);}};
  const handleAddVT=async()=>{if(!newVT.trim())return;try{await db.addVendorType(newVT.trim());setVendorTypes([...vendorTypes,newVT.trim()]);setNewVT("");setShowAddVT(false);}catch(e){alert("Error: "+e.message);}};
  const handleSaveSetting=async(key,value)=>{
    setSavingSetting(true);
    try{await db.setAppSetting(key,value,user?.uid);setAppSettings(prev=>({...prev,[key]:value}));}
    catch(e){alert("Error: "+e.message);}
    setSavingSetting(false);
  };
  const handleAddLock=async()=>{
    if(!lockForm.fromDate||!lockForm.toDate){alert("From and To dates required");return;}
    if(lockForm.fromDate>lockForm.toDate){alert("From must be before To");return;}
    try{
      const row=await db.addDieselLock({store_location:lockForm.storeLoc||null,from_date:lockForm.fromDate,to_date:lockForm.toDate,reason:lockForm.reason||null,locked_by:user?.uid||null});
      if(row)setDieselLocks(prev=>[toLOCK(row),...prev]);
      setShowAddLock(false);setLockForm({storeLoc:"",fromDate:"",toDate:"",reason:""});
    }catch(e){alert("Error: "+e.message);}
  };
  const handleDeleteLock=async(id)=>{
    if(!confirm("Remove this lock?"))return;
    try{await db.deleteDieselLock(id);setDieselLocks(prev=>prev.filter(l=>l.id!==id));}
    catch(e){alert("Error: "+e.message);}
  };
  const isSA=user?.role==="Super Admin";
  const tabs=user?.role==="Store Staff"?["profile"]:isAdmin?["profile","users","locations","vendor types","diesel"]:["profile","users","locations","vendor types"];
  return(<div style={{maxWidth:800}}><div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"}}>{tabs.map(t=>(<button key={t} onClick={()=>setTab(t)} style={{padding:"8px 20px",borderRadius:8,border:tab===t?`1.5px solid ${P}`:"1.5px solid #E0E0E0",background:tab===t?"#D0E2FF":"#fff",color:tab===t?P:"#525252",fontSize:13,fontWeight:600,cursor:"pointer",textTransform:"capitalize"}}>{t}</button>))}</div>
    {tab==="profile"&&(<div style={{maxWidth:480}}><h3 style={{fontSize:15,fontWeight:700,marginBottom:14}}>My Profile</h3><div style={{background:"#fff",borderRadius:14,border:"1px solid #E8ECF1",padding:20}}><div style={{display:"flex",alignItems:"center",gap:14,marginBottom:20}}><div style={{width:52,height:52,borderRadius:"50%",background:`linear-gradient(135deg,${P},#6929C4)`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:18,fontWeight:700}}>{user.avatar}</div><div><div style={{fontSize:16,fontWeight:700}}>{user.name}</div><div style={{fontSize:12,color:"#8D8D8D"}}>{user.email}</div><Badge label={user.role}/></div></div><ProfileEditor user={user} setUser={(u)=>{setUser(u);setUsers(users.map(x=>x.id===u.id?u:x));}} /></div></div>)}
    {tab==="users"&&(<div><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}><h3 style={{fontSize:15,fontWeight:700,margin:0}}>Team Members</h3>{isSA&&<button onClick={()=>setShowAddUser(true)} style={{display:"flex",alignItems:"center",gap:5,padding:"8px 16px",borderRadius:9,background:P,color:"#fff",border:"none",fontSize:12,fontWeight:600,cursor:"pointer"}}><Plus size={15}/>Add User</button>}</div>
      <div style={{background:"#fff",borderRadius:14,border:"1px solid #E8ECF1",overflow:"hidden"}}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr style={{background:"#F4F4F4"}}>{["Name","Email","Role",isSA?"Actions":""].filter(Boolean).map(h=>(<th key={h} style={th}>{h}</th>))}</tr></thead><tbody>{users.map(u=>(<tr key={u.id}><td style={{...tc,fontWeight:600}}><div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:32,height:32,borderRadius:"50%",background:"#D0E2FF",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:P}}>{u.avatar||"?"}</div>{u.name}</div></td><td style={tc}>{u.email}</td><td style={tc}><Badge label={u.role}/></td>{isSA&&<td style={tc}><select style={{...inp,width:140,padding:"5px 8px",fontSize:11}} value={u.role} onChange={e=>handleRoleChange(u.id,e.target.value)}><option>Super Admin</option><option>Fleet Manager</option><option>Store Staff</option><option>Viewer</option></select></td>}</tr>))}</tbody></table></div>
      {showAddUser&&(<Modal title="Add Team Member" onClose={()=>setShowAddUser(false)}><Field label="Full Name *"><input style={inp} placeholder="e.g. John Doe" value={uf.name} onChange={e=>setUf({...uf,name:e.target.value})}/></Field><Field label="Email *"><input style={inp} type="email" placeholder="john@micmakin.com" value={uf.email} onChange={e=>setUf({...uf,email:e.target.value})}/></Field><Field label="Password *"><input style={inp} type="text" placeholder="Temporary password" value={uf.password} onChange={e=>setUf({...uf,password:e.target.value})}/></Field><Field label="Role"><select style={inp} value={uf.role} onChange={e=>setUf({...uf,role:e.target.value})}><option>Super Admin</option><option>Fleet Manager</option><option>Store Staff</option><option>Viewer</option></select></Field>{uf.role==="Store Staff"&&<Field label="Store Location *"><select style={inp} value={uf.store_location||""} onChange={e=>setUf({...uf,store_location:e.target.value})}><option value="">-- Select Store --</option>{locations.map(l=>(<option key={l} value={l}>{l}</option>))}</select></Field>}{msg&&<div style={{padding:10,borderRadius:8,background:msg.startsWith("Error")?"#DA1E2818":"#24A14818",color:msg.startsWith("Error")?"#DA1E28":"#24A148",fontSize:12,marginBottom:10}}>{msg}</div>}<div style={{display:"flex",gap:10,justifyContent:"flex-end"}}><button onClick={()=>setShowAddUser(false)} style={{padding:"9px 20px",borderRadius:8,border:"1.5px solid #E0E0E0",background:"#fff",color:"#525252",fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancel</button><button onClick={handleAddUser} disabled={!uf.email||!uf.password||loading} style={{padding:"9px 20px",borderRadius:8,border:"none",background:(uf.email&&uf.password&&!loading)?P:"#C6C6C6",color:"#fff",fontSize:13,fontWeight:600,cursor:(uf.email&&uf.password&&!loading)?"pointer":"not-allowed"}}>{loading?"Creating...":"Create User"}</button></div></Modal>)}
    </div>)}
    {tab==="locations"&&(<div><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}><h3 style={{fontSize:15,fontWeight:700,margin:0}}>Locations</h3><button onClick={()=>setShowAddLoc(true)} style={{display:"flex",alignItems:"center",gap:5,padding:"8px 16px",borderRadius:9,background:P,color:"#fff",border:"none",fontSize:12,fontWeight:600,cursor:"pointer"}}><Plus size={15}/>Add Location</button></div>
      <div style={{display:"flex",flexWrap:"wrap",gap:8}}>{locations.map((l,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 14px",background:"#fff",borderRadius:8,border:"1px solid #E8ECF1"}}><span style={{fontSize:13}}>{l}</span></div>))}</div>
      {showAddLoc&&(<Modal title="Add Location" onClose={()=>setShowAddLoc(false)}><Field label="Location Name *"><input style={inp} placeholder="e.g. Lagos HQ" value={newLoc} onChange={e=>setNewLoc(e.target.value)}/></Field><div style={{display:"flex",gap:10,justifyContent:"flex-end"}}><button onClick={()=>setShowAddLoc(false)} style={{padding:"9px 20px",borderRadius:8,border:"1.5px solid #E0E0E0",background:"#fff",color:"#525252",fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancel</button><button onClick={handleAddLoc} disabled={!newLoc.trim()} style={{padding:"9px 20px",borderRadius:8,border:"none",background:newLoc.trim()?P:"#C6C6C6",color:"#fff",fontSize:13,fontWeight:600,cursor:newLoc.trim()?"pointer":"not-allowed"}}>Add</button></div></Modal>)}
    </div>)}
    {tab==="vendor types"&&(<div><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}><h3 style={{fontSize:15,fontWeight:700,margin:0}}>Vendor Types</h3><button onClick={()=>setShowAddVT(true)} style={{display:"flex",alignItems:"center",gap:5,padding:"8px 16px",borderRadius:9,background:P,color:"#fff",border:"none",fontSize:12,fontWeight:600,cursor:"pointer"}}><Plus size={15}/>Add Type</button></div>
      <div style={{display:"flex",flexWrap:"wrap",gap:8}}>{vendorTypes.map((t,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 14px",background:"#fff",borderRadius:8,border:"1px solid #E8ECF1"}}><span style={{fontSize:13}}>{t}</span></div>))}</div>
      {vendorTypes.length===0&&<div style={{padding:20,textAlign:"center",color:"#8D8D8D",fontSize:13}}>No vendor types yet. Add types like "Diesel Supplier", "Mechanic", "Parts Dealer".</div>}
      {showAddVT&&(<Modal title="Add Vendor Type" onClose={()=>setShowAddVT(false)}><Field label="Type Name *"><input style={inp} placeholder="e.g. Diesel Supplier" value={newVT} onChange={e=>setNewVT(e.target.value)}/></Field><div style={{display:"flex",gap:10,justifyContent:"flex-end"}}><button onClick={()=>setShowAddVT(false)} style={{padding:"9px 20px",borderRadius:8,border:"1.5px solid #E0E0E0",background:"#fff",color:"#525252",fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancel</button><button onClick={handleAddVT} disabled={!newVT.trim()} style={{padding:"9px 20px",borderRadius:8,border:"none",background:newVT.trim()?P:"#C6C6C6",color:"#fff",fontSize:13,fontWeight:600,cursor:newVT.trim()?"pointer":"not-allowed"}}>Add</button></div></Modal>)}
    </div>)}
    {tab==="diesel"&&isAdmin&&(<div>
      <h3 style={{fontSize:15,fontWeight:700,margin:"0 0 14px"}}>Diesel Entry Settings</h3>
      <div style={{background:"#fff",borderRadius:14,border:"1px solid #E8ECF1",padding:20,marginBottom:18}}>
        <div style={{marginBottom:18}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
            <div>
              <div style={{fontSize:13,fontWeight:600}}>Auto-lock days</div>
              <div style={{fontSize:11,color:"#8D8D8D",marginTop:2}}>How many days back staff can still enter or edit. 0 = today only. Older entries lock automatically.</div>
            </div>
            <input type="number" min="0" max="30" value={appSettings?.diesel_auto_lock_days??1} onChange={e=>{const v=parseInt(e.target.value)||0;handleSaveSetting("diesel_auto_lock_days",v);}} disabled={savingSetting} style={{width:70,padding:"7px 10px",borderRadius:7,border:"1px solid #E0E0E0",fontSize:14,fontWeight:600,textAlign:"center"}}/>
          </div>
        </div>
        <div style={{borderTop:"1px solid #F4F4F4",paddingTop:14,marginBottom:18}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div>
              <div style={{fontSize:13,fontWeight:600}}>Require photo for backdated entries</div>
              <div style={{fontSize:11,color:"#8D8D8D",marginTop:2}}>When ON, generator photo is mandatory if entry is for a past date.</div>
            </div>
            <button onClick={()=>handleSaveSetting("diesel_require_photo_backdated",!(appSettings?.diesel_require_photo_backdated!==false))} disabled={savingSetting} style={{width:46,height:26,borderRadius:13,border:"none",background:appSettings?.diesel_require_photo_backdated!==false?"#24A148":"#C6C6C6",position:"relative",cursor:"pointer",transition:"background 0.2s"}}>
              <div style={{position:"absolute",top:2,left:appSettings?.diesel_require_photo_backdated!==false?22:2,width:22,height:22,borderRadius:"50%",background:"#fff",transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)"}}/>
            </button>
          </div>
        </div>
        <div style={{borderTop:"1px solid #F4F4F4",paddingTop:14}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div>
              <div style={{fontSize:13,fontWeight:600}}>Edit window (minutes)</div>
              <div style={{fontSize:11,color:"#8D8D8D",marginTop:2}}>After a staff member submits a log, they can edit it for this many minutes. After that, only Fleet Manager / Super Admin can change it. Default 60.</div>
            </div>
            <input type="number" min="0" max="1440" value={appSettings?.diesel_edit_window_minutes??60} onChange={e=>{const v=parseInt(e.target.value)||0;handleSaveSetting("diesel_edit_window_minutes",v);}} disabled={savingSetting} style={{width:80,padding:"7px 10px",borderRadius:7,border:"1px solid #E0E0E0",fontSize:14,fontWeight:600,textAlign:"center"}}/>
          </div>
        </div>
      </div>

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <h4 style={{fontSize:14,fontWeight:700,margin:0}}>Manual Date Locks</h4>
        <button onClick={()=>setShowAddLock(true)} style={{display:"flex",alignItems:"center",gap:5,padding:"7px 14px",borderRadius:8,background:"#DA1E28",color:"#fff",border:"none",fontSize:12,fontWeight:600,cursor:"pointer"}}><Plus size={14}/>Add Lock</button>
      </div>
      <div style={{background:"#fff",borderRadius:14,border:"1px solid #E8ECF1",overflow:"hidden"}}>
        {(dieselLocks||[]).length===0?<div style={{padding:24,textAlign:"center",color:"#8D8D8D",fontSize:13}}>No manual locks. Auto-lock applies based on days setting above.</div>
        :<table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr style={{background:"#F4F4F4"}}>{["Period","Store","Reason","Created","Actions"].map(h=>(<th key={h} style={th}>{h}</th>))}</tr></thead>
        <tbody>{dieselLocks.map(l=>(<tr key={l.id}><td style={tc}><div>{l.fromDate}</div><div style={{fontSize:10,color:"#8D8D8D"}}>to {l.toDate}</div></td><td style={tc}>{l.storeLoc||<span style={{color:"#8D8D8D",fontStyle:"italic"}}>All stores</span>}</td><td style={tc}>{l.reason||"-"}</td><td style={{...tc,fontSize:11,color:"#8D8D8D"}}>{l.createdAt?new Date(l.createdAt).toLocaleDateString():"-"}</td><td style={tc}><button onClick={()=>handleDeleteLock(l.id)} style={{padding:"4px 10px",borderRadius:5,border:"1px solid #FFD7DA",background:"#FFF1F1",color:"#DA1E28",cursor:"pointer",fontSize:11,fontWeight:600}}>Remove</button></td></tr>))}</tbody></table>}
      </div>

      {showAddLock&&(<Modal title="Add Manual Lock" onClose={()=>setShowAddLock(false)}>
        <Field label="Store Location"><select style={inp} value={lockForm.storeLoc} onChange={e=>setLockForm({...lockForm,storeLoc:e.target.value})}><option value="">All stores</option>{(locations||[]).map(l=>(<option key={l} value={l}>{l}</option>))}</select></Field>
        <Field label="From Date *"><input type="date" style={inp} value={lockForm.fromDate} onChange={e=>setLockForm({...lockForm,fromDate:e.target.value})}/></Field>
        <Field label="To Date *"><input type="date" style={inp} value={lockForm.toDate} onChange={e=>setLockForm({...lockForm,toDate:e.target.value})}/></Field>
        <Field label="Reason"><input style={inp} placeholder="e.g. Month-end close" value={lockForm.reason} onChange={e=>setLockForm({...lockForm,reason:e.target.value})}/></Field>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <button onClick={()=>setShowAddLock(false)} style={{padding:"9px 20px",borderRadius:8,border:"1.5px solid #E0E0E0",background:"#fff",color:"#525252",fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancel</button>
          <button onClick={handleAddLock} disabled={!lockForm.fromDate||!lockForm.toDate} style={{padding:"9px 20px",borderRadius:8,border:"none",background:(lockForm.fromDate&&lockForm.toDate)?"#DA1E28":"#C6C6C6",color:"#fff",fontSize:13,fontWeight:600,cursor:(lockForm.fromDate&&lockForm.toDate)?"pointer":"not-allowed"}}>Add Lock</button>
        </div>
      </Modal>)}
    </div>)}
  </div>);
}

// ============================================
// DIESEL LOG PAGE - Daily Staff Input
// ============================================
function DieselLogPage({generators,setGenerators,dieselReadings,setDieselReadings,dieselDistributions,setDieselDistributions,dieselPurchases,user,locations,odoLog,setOdoLog,genBaselines,setGenBaselines,nepaPeriodLogs,setNepaPeriodLogs,dieselLocks,appSettings,vehicles,dieselTransfers,setDieselTransfers}){
  const [pageTab,setPageTab]=useState("daily"); // daily | nepa
  const [step,setStep]=useState("select"); // select | input | review | done
  const [selGen,setSelGen]=useState("");
  const [editingId,setEditingId]=useState(null); // id of reading being edited (null = new)
  const todayStr=new Date().toISOString().split("T")[0];
  const [entryDate,setEntryDate]=useState(todayStr);
  const [inputMode,setInputMode]=useState("photo"); // photo | manual
  const [photo,setPhoto]=useState(null);
  const [preview,setPreview]=useState("");
  const [analyzing,setAnalyzing]=useState(false);
  const [saving,setSaving]=useState(false);
  const [msg,setMsg]=useState("");
  const [aiNotes,setAiNotes]=useState("");
  // Generator reading fields
  const [hoursOpening,setHoursOpening]=useState("");
  const [hoursClosing,setHoursClosing]=useState("");
  const [dieselLevel,setDieselLevel]=useState("");
  const [dieselAdded,setDieselAdded]=useState("");
  // Diesel level (tank) photo
  const [tankPhoto,setTankPhoto]=useState(null);
  const [tankPreview,setTankPreview]=useState("");
  // Bread batches (ovens only)
  const [batches,setBatches]=useState("");
  // NEPA fields
  const [nepaMode,setNepaMode]=useState("manual"); // photo | manual
  const [nepaHours,setNepaHours]=useState("");
  const [nepaPhoto,setNepaPhoto]=useState(null);
  const [nepaPreview,setNepaPreview]=useState("");
  const [nepaMeterOpen,setNepaMeterOpen]=useState("");
  const [nepaMeterClose,setNepaMeterClose]=useState("");
  const [nepaAnalyzing,setNepaAnalyzing]=useState(false);
  const [notes,setNotes]=useState("");
  // Second generator support
  const [hasSecondGen,setHasSecondGen]=useState(false);
  const [showHistory,setShowHistory]=useState(false);

  const userStore=user?.store_location||"";
  const isStoreStaff=user?.role==="Store Staff";
  const isAdmin=user?.role==="Super Admin"||user?.role==="Fleet Manager";
  const storeGens=isStoreStaff?generators.filter(g=>g.loc===userStore):generators;
  const autoLockDays=Number(appSettings?.diesel_auto_lock_days??1);
  const requirePhotoBackdated=appSettings?.diesel_require_photo_backdated!==false;
  const editWindowMinutes=Number(appSettings?.diesel_edit_window_minutes??60);

  // Edit-window check: store staff can only edit their own entry within N minutes
  // of submission (default 60). Admin / Fleet Manager bypass. Returns {canEdit, reason}.
  const checkEditWindow=(entry)=>{
    if(isAdmin)return{canEdit:true};
    if(!entry||!entry.createdAt)return{canEdit:true}; // safety: no timestamp → allow
    const elapsedMin=(Date.now()-new Date(entry.createdAt).getTime())/60000;
    if(elapsedMin>editWindowMinutes){
      return{canEdit:false,reason:`Edit window expired (submitted ${Math.round(elapsedMin)}min ago). Contact a Fleet Manager or Super Admin.`};
    }
    return{canEdit:true,remainingMin:Math.max(0,Math.round(editWindowMinutes-elapsedMin))};
  };

  // Lock check: returns {locked:boolean, reason:string}
  const checkDateLock=(dateStr,storeLoc)=>{
    if(isAdmin)return{locked:false};
    if(!dateStr)return{locked:false};
    if(dateStr>todayStr)return{locked:true,reason:"Future dates not allowed"};
    // Auto-lock window
    const today=new Date(todayStr);const entry=new Date(dateStr);
    const diffDays=Math.round((today-entry)/86400000);
    if(diffDays>autoLockDays)return{locked:true,reason:`Auto-locked (older than ${autoLockDays} day${autoLockDays===1?"":"s"})`};
    // Manual locks
    const manualLock=(dieselLocks||[]).find(l=>(!l.storeLoc||l.storeLoc===storeLoc)&&dateStr>=l.fromDate&&dateStr<=l.toDate);
    if(manualLock)return{locked:true,reason:manualLock.reason||"Locked by admin"};
    return{locked:false};
  };

  const dateReadings=dieselReadings.filter(r=>r.date===entryDate&&r.storeLoc===(isStoreStaff?userStore:r.storeLoc));
  const todayReadings=dieselReadings.filter(r=>r.date===todayStr&&r.storeLoc===(isStoreStaff?userStore:r.storeLoc));
  const alreadySubmitted=(genId)=>dateReadings.some(r=>r.generatorId===genId&&r.id!==editingId);
  const existingForGenDate=(genId)=>dateReadings.find(r=>r.generatorId===genId);
  const isBackdated=entryDate!==todayStr;
  const lockInfo=checkDateLock(entryDate,isStoreStaff?userStore:(generators.find(g=>g.id===selGen)?.loc||""));

  // Get the previous reading RELATIVE TO THE ENTRY DATE (not just the latest
  // overall) — critical for backdating: entering June 9 must use June 8's
  // closing, even if June 10 was already logged.
  const getPrevReading=(genId)=>{
    const prev=dieselReadings.filter(r=>r.generatorId===genId&&r.date<entryDate).sort((a,b)=>b.date.localeCompare(a.date));
    return prev[0]||null;
  };

  // Get baseline for a generator
  const getBaseline=(genId)=>{
    const bl=genBaselines?.find(b=>b.generator_id===genId);
    return bl?.avg_litres_per_hour||null;
  };

  // Analyze generator meter photo
  const analyzeGenPhoto=async(base64)=>{
    setAnalyzing(true);setMsg("Analyzing generator meter...");
    try{
      const imgData=base64.split(",")[1];
      const mediaType=base64.startsWith("data:image/png")?"image/png":"image/jpeg";
      const resp=await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",headers:{"Content-Type":"application/json","anthropic-dangerous-direct-browser-access":"true"},
        body:JSON.stringify({
          model:"claude-sonnet-4-20250514",max_tokens:500,
          messages:[{role:"user",content:[
            {type:"image",source:{type:"base64",media_type:mediaType,data:imgData}},
            {type:"text",text:"This is a generator control panel display (commonly DCP-10 or similar). Extract ALL visible readings. These displays typically show: frequency (Hz), RPM, and run hours (labeled Kh, kh, h, or hrs). The run hours reading is the most important one.\n\nReply in JSON only, no markdown backticks:\n{\"readings\": [{\"type\": \"hours\" or \"rpm\" or \"frequency\" or \"voltage\" or \"fuel_level\", \"value\": number, \"unit\": string, \"confidence\": \"high\" or \"medium\" or \"low\"}], \"primary_hours\": number, \"fuel_gauge_percent\": number or null, \"notes\": string}\n\nIMPORTANT: Kh means kilohours (multiply the displayed value by 1000 to get total hours). For example 13.49 Kh = 13490 hours, 18.88 Kh = 18880 hours. If the unit is just h or hrs, the value IS the hours directly. Always return primary_hours as the TOTAL hours (already converted if Kh). If you see a fuel gauge bar, estimate the fill level as a percentage (0-100). If display is off or unreadable, set primary_hours to 0."}
          ]}]
        })
      });
      const data=await resp.json();
      const txt=data.content?.[0]?.text||"";
      try{
        const clean=txt.replace(/```json|```/g,"").trim();
        const parsed=JSON.parse(clean);
        const hrs=parsed.primary_hours||0;
        setHoursClosing(String(hrs));
        // Auto-fill opening from previous reading
        const prev=getPrevReading(selGen);
        if(prev&&prev.genHoursClosing){setHoursOpening(String(prev.genHoursClosing));}
        // Fuel gauge
        if(parsed.fuel_gauge_percent!=null){
          const g=generators.find(x=>x.id===selGen);
          const tank=g?.tank||0;
          if(tank>0)setDieselLevel(String(Math.round(tank*parsed.fuel_gauge_percent/100)));
        }
        const allR=(parsed.readings||[]).map(r=>r.value+" "+r.unit+" ("+r.type+")").join(", ");
        setAiNotes(allR+(parsed.notes?" | "+parsed.notes:""));
        setMsg(hrs>0?"Readings detected! Please verify and continue.":"Could not read clearly - please enter manually.");
      }catch{setMsg("Could not parse - please enter readings manually.");setAiNotes(txt);setInputMode("manual");}
    }catch(e){setMsg("Analysis failed: "+e.message);setInputMode("manual");}
    setAnalyzing(false);
  };

  // Analyze NEPA meter photo
  const analyzeNepaPhoto=async(base64)=>{
    setNepaAnalyzing(true);
    try{
      const imgData=base64.split(",")[1];
      const mediaType=base64.startsWith("data:image/png")?"image/png":"image/jpeg";
      const resp=await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",headers:{"Content-Type":"application/json","anthropic-dangerous-direct-browser-access":"true"},
        body:JSON.stringify({
          model:"claude-sonnet-4-20250514",max_tokens:300,
          messages:[{role:"user",content:[
            {type:"image",source:{type:"base64",media_type:mediaType,data:imgData}},
            {type:"text",text:"This is an electricity/NEPA/power meter. Read the current kWh or unit reading displayed. Reply in JSON only, no markdown:\n{\"reading\": number, \"unit\": \"kWh\", \"confidence\": \"high\" or \"medium\" or \"low\", \"notes\": string}"}
          ]}]
        })
      });
      const data=await resp.json();
      const txt=data.content?.[0]?.text||"";
      try{
        const clean=txt.replace(/```json|```/g,"").trim();
        const parsed=JSON.parse(clean);
        setNepaMeterClose(String(parsed.reading||""));
        const prev=getPrevReading(selGen);
        if(prev&&prev.nepaMeterClosing){setNepaMeterOpen(String(prev.nepaMeterClosing));}
      }catch{}
    }catch{}
    setNepaAnalyzing(false);
  };

  const handleGenPhoto=async(e)=>{
    const file=e.target.files?.[0];if(!file)return;
    setPhoto(file);setMsg("");setAiNotes("");
    const reader=new FileReader();
    reader.onload=(ev)=>{setPreview(ev.target.result);analyzeGenPhoto(ev.target.result);};
    reader.readAsDataURL(file);
  };

  const handleNepaPhotoCapture=async(e)=>{
    const file=e.target.files?.[0];if(!file)return;
    setNepaPhoto(file);
    const reader=new FileReader();
    reader.onload=(ev)=>{setNepaPreview(ev.target.result);analyzeNepaPhoto(ev.target.result);};
    reader.readAsDataURL(file);
  };

  const handleTankPhoto=async(e)=>{
    const file=e.target.files?.[0];if(!file)return;
    setTankPhoto(file);
    const reader=new FileReader();
    reader.onload=(ev)=>{setTankPreview(ev.target.result);};
    reader.readAsDataURL(file);
  };

  // Calculate theoretical consumption
  const calcTheoretical=()=>{
    const hrsRun=parseFloat(hoursClosing)-parseFloat(hoursOpening);
    if(isNaN(hrsRun)||hrsRun<=0)return null;
    const baseline=getBaseline(selGen);
    const g=generators.find(x=>x.id===selGen);
    const rate=baseline||(g?.tank?g.tank/10:15);
    return hrsRun*rate;
  };

  // Save the daily reading
  const handleSave=async()=>{
    if(!selGen)return;
    // Lock check
    if(lockInfo.locked){setMsg("Cannot save: "+lockInfo.reason);return;}
    // Edit-window check: store staff can only edit within N min of submission
    if(editingId){
      const existing=dieselReadings.find(r=>r.id===editingId);
      const ed=checkEditWindow(existing);
      if(!ed.canEdit){setMsg("Cannot save: "+ed.reason);return;}
    }
    // Require photo for backdated entries (if toggle on)
    if(isBackdated&&requirePhotoBackdated&&!photo&&!editingId){setMsg("A generator photo is required for backdated entries.");return;}
    // Acceptance-gated diesel received: a delivery on this date the store hasn't
    // ACCEPTED yet is NOT counted in this reading. Warn so staff don't silently
    // omit received diesel (which would skew consumption / flag a discrepancy).
    {
      const sForAdd=(generators.find(x=>x.id===selGen)?.loc)||userStore||"";
      const pend=(dieselDistributions||[]).filter(d=>d.storeLoc===sForAdd&&d.date===entryDate&&!d.confirmed);
      if(pend.length){
        const pl=pend.reduce((s,d)=>s+(d.litres||0),0);
        if(!confirm(`${pl.toLocaleString()} L was delivered to your store on ${entryDate} but has not been accepted yet, so it will NOT be added to this reading. Tap the green Accept button to include it.\n\nSave the reading without it anyway?`))return;
      }
    }
    setSaving(true);setMsg("");
    try{
      const g=generators.find(x=>x.id===selGen);
      // Opening ALWAYS comes from the previous day's closing (live), never a
      // stale stored value; manual entry only for the first-ever reading.
      const prevForOpen=getPrevReading(selGen);
      const hOpen=(prevForOpen?.genHoursClosing!=null)?prevForOpen.genHoursClosing:(parseFloat(hoursOpening)||null);
      const hClose=parseFloat(hoursClosing)||null;
      const hrsRun=(hOpen!=null&&hClose!=null)?hClose-hOpen:null;
      const actualLevel=parseFloat(dieselLevel)||null;
      // Diesel added = admin distributions to this store on this date that the
      // store has ACCEPTED (received_confirmed). Acceptance is the trigger; an
      // unaccepted delivery is not counted (not a manually-typed figure either).
      const storeForAdd=g?.loc||userStore||"";
      const added=(dieselDistributions||[]).filter(d=>d.storeLoc===storeForAdd&&d.date===entryDate&&d.confirmed).reduce((s,d)=>s+(d.litres||0),0);
      const nHours=parseFloat(nepaHours)||0;
      const bl=genBaselines?.find(b=>b.generator_id===selGen);
      const baselineRate=bl?.avg_litres_per_hour||null;
      const thresholdPct=bl?.threshold_pct||20;
      const fallbackRate=g?.tank?g.tank/10:15;
      const rate=baselineRate||fallbackRate;
      const theoretical=hrsRun?hrsRun*rate:null;
      const consumptionRate=rate;
      // Same-day transfers OUT of this tank (to vehicles/oven) are not generator consumption
      const transfersOut=(dieselTransfers||[]).filter(t=>t.sourceGenId===selGen&&t.date===entryDate).reduce((s,t)=>s+(t.litres||0),0);
      // Discrepancy calculation
      let discrepancy=null;let discFlag=false;
      if(actualLevel!=null&&theoretical!=null){
        const prev=getPrevReading(selGen);
        const prevLevel=prev?.dieselLevelActual||null;
        if(prevLevel!=null){
          const expectedLevel=prevLevel+added-transfersOut-theoretical;
          discrepancy=actualLevel-expectedLevel;
          const pctDiff=theoretical>0?Math.abs(discrepancy)/theoretical*100:0;
          // Min-burn floor (must match backfill_discrepancy_flags.py): when the
          // expected burn is below dipstick resolution (~25 L), a "discrepancy"
          // is measurement noise — short-run days would otherwise always flag.
          discFlag=pctDiff>thresholdPct&&theoretical>=25;
        }
      }
      // Helper for photo upload
      const uploadPhoto=async(file,folder)=>{
        if(!file)return"";
        const ext=file.name.split(".").pop();
        const path=folder+"/"+selGen+"-"+Date.now()+"."+ext;
        const{data:upData,error:upErr}=await supabase.storage.from("meter-photos").upload(path,file);
        if(upErr||!upData)return"";
        const{data:urlData}=supabase.storage.from("meter-photos").getPublicUrl(path);
        return urlData?.publicUrl||"";
      };
      const existing=editingId?dieselReadings.find(r=>r.id===editingId):null;
      const genPhotoUrl=photo?await uploadPhoto(photo,"diesel-readings"):(existing?.genPhotoUrl||"");
      const nepaPhotoUrl=nepaPhoto?await uploadPhoto(nepaPhoto,"nepa-readings"):(existing?.nepaPhotoUrl||"");
      const tankPhotoUrl=tankPhoto?await uploadPhoto(tankPhoto,"diesel-tank"):(existing?.dieselLevelPhotoUrl||"");
      // Build record
      const record=fromDR({
        generatorId:selGen,storeLoc:g?.loc||userStore||"",date:entryDate,
        genHoursOpening:hOpen,genHoursClosing:hClose,
        dieselLevelActual:actualLevel,dieselLevelTheoretical:theoretical?Math.round(theoretical):null,
        dieselAdded:added,consumptionLitres:theoretical?Math.round(theoretical):null,consumptionRate:rate,
        genPhotoUrl:genPhotoUrl,genSource:inputMode,
        dieselLevelPhotoUrl:tankPhotoUrl,
        aiReadings:aiNotes?{raw:aiNotes}:null,aiConfidence:null,
        nepaHours:nHours,nepaMeterOpening:parseFloat(nepaMeterOpen)||null,
        nepaMeterClosing:parseFloat(nepaMeterClose)||null,nepaPhotoUrl:nepaPhotoUrl,nepaSource:nepaMode,
        discrepancyLitres:discrepancy!=null?Math.round(discrepancy):null,discrepancyFlag:discFlag,
        batchesProduced:batches!==""?parseFloat(batches):null,
        submittedBy:user?.uid||null,notes:notes
      });
      let saved;
      if(editingId){
        saved=await db.updateDieselReading(editingId,record);
        if(saved){setDieselReadings(prev=>prev.map(r=>r.id===editingId?toDR(saved):r));}
      }else{
        saved=await db.addDieselReading(record);
        if(saved){setDieselReadings(prev=>[toDR(saved),...prev]);}
      }
      // Update generator hours (only when entering today's reading, to avoid backwards-overwriting)
      if(hClose&&!isBackdated){
        await db.updateGenerator(selGen,{hrs:hClose});
        setGenerators(prev=>prev.map(gg=>gg.id===selGen?{...gg,hrs:hClose}:gg));
      }
      // Also save to odo_log for compatibility (only for new entries, not edits)
      if(hClose&&!editingId){
        const odoEntry={asset:selGen,reading:hClose,date:entryDate,type:inputMode==="photo"?"photo":"manual"};
        const savedOdo=await db.addOdoLog(odoEntry);
        if(savedOdo)setOdoLog(prev=>[...prev,toOdo(savedOdo)]);
      }
      // Auto-learn baseline from this reading
      if(hrsRun&&hrsRun>0&&actualLevel!=null){
        const prev=getPrevReading(selGen);
        if(prev?.dieselLevelActual!=null){
          const actualConsumption=prev.dieselLevelActual+added-transfersOut-actualLevel;
          if(actualConsumption>0){
            const actualRate=actualConsumption/hrsRun;
            const oldBl=genBaselines?.find(b=>b.generator_id===selGen);
            const oldCount=oldBl?.baseline_readings_count||0;
            const oldAvg=oldBl?.avg_litres_per_hour||actualRate;
            const newCount=oldCount+1;
            const newAvg=((oldAvg*oldCount)+actualRate)/newCount;
            const oldMin=oldBl?.min_rate!=null?Math.min(oldBl.min_rate,actualRate):actualRate;
            const oldMax=oldBl?.max_rate!=null?Math.max(oldBl.max_rate,actualRate):actualRate;
            try{
              const upserted=await db.upsertGeneratorBaseline({generator_id:selGen,avg_litres_per_hour:Math.round(newAvg*100)/100,baseline_readings_count:newCount,last_calculated:new Date().toISOString(),min_rate:Math.round(oldMin*100)/100,max_rate:Math.round(oldMax*100)/100,threshold_pct:oldBl?.threshold_pct||20});
              if(upserted)setGenBaselines(prev=>{const filtered=prev.filter(b=>b.generator_id!==selGen);return[...filtered,upserted];});
            }catch(e){console.error("Baseline update error:",e);}
          }
        }
      }
      if(discFlag){
        setMsg("Saved! WARNING: Diesel level discrepancy of "+Math.abs(Math.round(discrepancy))+"L detected. Expected ~"+Math.round(theoretical)+"L consumption but actual levels differ.");
      }else{
        setMsg("Reading saved successfully!");
      }
      setStep("done");
    }catch(e){setMsg("Error: "+e.message);}
    setSaving(false);
  };

  const resetForm=()=>{
    setStep("select");setSelGen("");setEditingId(null);setEntryDate(todayStr);
    setInputMode("photo");setPhoto(null);setPreview("");
    setAnalyzing(false);setMsg("");setAiNotes("");setHoursOpening("");setHoursClosing("");
    setDieselLevel("");setDieselAdded("");setTankPhoto(null);setTankPreview("");setBatches("");
    setNepaMode("manual");setNepaHours("");
    setNepaPhoto(null);setNepaPreview("");setNepaMeterOpen("");setNepaMeterClose("");setNotes("");
  };

  // Load existing reading into form for edit
  const loadForEdit=(r)=>{
    setEditingId(r.id);setSelGen(r.generatorId);setEntryDate(r.date);
    setHoursOpening(r.genHoursOpening?String(r.genHoursOpening):"");
    setHoursClosing(r.genHoursClosing?String(r.genHoursClosing):"");
    setDieselLevel(r.dieselLevelActual!=null?String(r.dieselLevelActual):"");
    setDieselAdded(r.dieselAdded?String(r.dieselAdded):"");
    setNepaHours(r.nepaHours?String(r.nepaHours):"");
    setNepaMeterOpen(r.nepaMeterOpening?String(r.nepaMeterOpening):"");
    setNepaMeterClose(r.nepaMeterClosing?String(r.nepaMeterClosing):"");
    setBatches(r.batchesProduced!=null?String(r.batchesProduced):"");
    setNotes(r.notes||"");setInputMode(r.genSource||"manual");setNepaMode(r.nepaSource||"manual");
    setPreview(r.genPhotoUrl||"");setNepaPreview(r.nepaPhotoUrl||"");setTankPreview(r.dieselLevelPhotoUrl||"");
    setStep("input");
  };

  // Store ranking (anonymous)
  const getStoreRank=()=>{
    if(!userStore)return null;
    const last30=dieselReadings.filter(r=>{const d=new Date(r.date);const ago=new Date();ago.setDate(ago.getDate()-30);return d>=ago;});
    const storeData={};
    last30.forEach(r=>{
      if(!storeData[r.storeLoc])storeData[r.storeLoc]={totalHrs:0,totalConsumption:0,count:0};
      storeData[r.storeLoc].totalHrs+=r.hoursRun||0;
      storeData[r.storeLoc].totalConsumption+=r.consumptionLitres||0;
      storeData[r.storeLoc].count++;
    });
    const ranked=Object.entries(storeData).filter(([,d])=>d.totalHrs>0).map(([loc,d])=>({loc,efficiency:d.totalConsumption/d.totalHrs})).sort((a,b)=>a.efficiency-b.efficiency);
    const myRank=ranked.findIndex(r=>r.loc===userStore)+1;
    return{rank:myRank,total:ranked.length,efficiency:ranked.find(r=>r.loc===userStore)?.efficiency};
  };

  const rank=isStoreStaff?getStoreRank():null;
  const selectedGen=generators.find(g=>g.id===selGen);
  const prevReading=selGen?getPrevReading(selGen):null;
  // Effective opening hours: previous day's closing if it exists (locked, live), else manual.
  const effOpen=prevReading?.genHoursClosing!=null?prevReading.genHoursClosing:(parseFloat(hoursOpening)||null);
  // Diesel added = admin distributions to this store on the entry date that the
  // store has ACCEPTED. Acceptance is the trigger — a delivery only counts toward
  // the day's reading once accepted (received_confirmed).
  const storeForEntry=isStoreStaff?userStore:(selectedGen?.loc||"");
  const dayDists=(dieselDistributions||[]).filter(d=>d.storeLoc===storeForEntry&&d.date===entryDate);
  const autoAdded=dayDists.filter(d=>d.confirmed).reduce((s,d)=>s+(d.litres||0),0);
  const pendingDists=dayDists.filter(d=>!d.confirmed);


  // Simple reading history
  if(showHistory){
    const hist=dieselReadings.filter(r=>isStoreStaff?r.storeLoc===userStore:true).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,30);
    return(<div>
      <button onClick={()=>setShowHistory(false)} style={{display:"flex",alignItems:"center",gap:4,background:"none",border:"none",cursor:"pointer",color:P,fontSize:13,fontWeight:600,marginBottom:14}}><ChevronLeft size={16}/> Back to Log</button>
      <div style={{background:"#fff",borderRadius:14,border:"1px solid #E8ECF1",overflow:"hidden"}}>
        <div style={{padding:"16px 20px",borderBottom:"1px solid #E8ECF1"}}><h3 style={{fontSize:15,fontWeight:700,margin:0}}>Recent Readings</h3></div>
        {hist.length===0?<div style={{padding:30,textAlign:"center",color:"#8D8D8D",fontSize:13}}>No readings yet</div>
        :<table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr style={{background:"#F4F4F4"}}>{["Date","Generator","Hours Run","Diesel Level","NEPA","Source"].map(h=>(<th key={h} style={th}>{h}</th>))}</tr></thead>
        <tbody>{hist.map(r=>{const g=generators.find(x=>x.id===r.generatorId);return(<tr key={r.id}><td style={tc}>{r.date}</td><td style={{...tc,fontWeight:600}}>{g?.name||r.generatorId}</td><td style={tc}>{r.hoursRun?r.hoursRun.toFixed(1)+"h":"-"}</td><td style={tc}>{r.dieselLevelActual!=null?r.dieselLevelActual+"L":"-"}</td><td style={tc}>{r.nepaHours?r.nepaHours+"h":"-"}</td><td style={tc}><span style={{fontSize:11,padding:"2px 8px",borderRadius:4,background:r.genSource==="photo"?"#D0E2FF":"#F4F4F4",color:r.genSource==="photo"?P:"#525252",fontWeight:600}}>{r.genSource==="photo"?"Photo":"Manual"}</span></td></tr>);})}</tbody></table>}
      </div>
    </div>);
  }

  return(<div style={{maxWidth:560,margin:"0 auto"}}>
    {/* Header Card */}
    <div style={{background:"linear-gradient(135deg,#0F1A2E,#1A3A6B,#0F62FE)",borderRadius:16,padding:"22px 26px",color:"#fff",marginBottom:18}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:40,height:40,borderRadius:10,background:"rgba(255,255,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center"}}><Droplet size={20}/></div>
          <div><h2 style={{fontSize:18,fontWeight:700,margin:0}}>Daily Diesel Log</h2><div style={{fontSize:12,color:"rgba(255,255,255,0.6)",marginTop:2}}>{new Date().toLocaleDateString("en-NG",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</div></div>
        </div>
        <button onClick={()=>setShowHistory(true)} style={{background:"rgba(255,255,255,0.12)",border:"none",borderRadius:8,padding:"8px 12px",color:"#fff",fontSize:11,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}><Clock size={13}/> History</button>
      </div>
      {isStoreStaff&&userStore&&<div style={{marginTop:12,padding:"10px 14px",background:"rgba(255,255,255,0.08)",borderRadius:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div><div style={{fontSize:11,color:"rgba(255,255,255,0.5)"}}>Your Store</div><div style={{fontSize:14,fontWeight:600}}>{userStore}</div></div>
        {rank&&rank.rank>0&&<div style={{textAlign:"right"}}><div style={{fontSize:11,color:"rgba(255,255,255,0.5)"}}>Efficiency Rank</div><div style={{display:"flex",alignItems:"center",gap:4}}><Trophy size={14} color="#FFD700"/><span style={{fontSize:16,fontWeight:700}}>#{rank.rank}</span><span style={{fontSize:11,color:"rgba(255,255,255,0.5)"}}>of {rank.total}</span></div></div>}
      </div>}
      {todayReadings.length>0&&<div style={{marginTop:10,padding:"8px 12px",background:"rgba(36,161,72,0.2)",borderRadius:8,fontSize:12,display:"flex",alignItems:"center",gap:6}}><CheckCircle size={14} color="#24A148"/><span>{todayReadings.length} reading{todayReadings.length>1?"s":""} submitted today</span></div>}
    </div>

    {/* Page-level tab switcher: Daily Reading | NEPA Period */}
    <div style={{display:"flex",gap:6,marginBottom:14}}>
      <button onClick={()=>setPageTab("daily")} style={{padding:"8px 18px",borderRadius:8,border:pageTab==="daily"?"1.5px solid "+P:"1.5px solid #E0E0E0",background:pageTab==="daily"?"#D0E2FF":"#fff",color:pageTab==="daily"?P:"#525252",fontSize:13,fontWeight:600,cursor:"pointer"}}>Daily Reading</button>
      <button onClick={()=>setPageTab("nepa")} style={{padding:"8px 18px",borderRadius:8,border:pageTab==="nepa"?"1.5px solid #8B5CF6":"1.5px solid #E0E0E0",background:pageTab==="nepa"?"#EDE7F6":"#fff",color:pageTab==="nepa"?"#8B5CF6":"#525252",fontSize:13,fontWeight:600,cursor:"pointer"}}>NEPA Period</button>
      <button onClick={()=>setPageTab("transfer")} style={{padding:"8px 18px",borderRadius:8,border:pageTab==="transfer"?"1.5px solid #FF832B":"1.5px solid #E0E0E0",background:pageTab==="transfer"?"#FFF4EC":"#fff",color:pageTab==="transfer"?"#FF832B":"#525252",fontSize:13,fontWeight:600,cursor:"pointer"}}>Transfer Diesel</button>
    </div>

    {/* Step: Select Generator (Daily Reading tab) */}
    {pageTab==="daily"&&step==="select"&&(<div style={{background:"#fff",borderRadius:14,border:"1px solid #E8ECF1",padding:22}}>
      <h3 style={{fontSize:15,fontWeight:700,margin:"0 0 12px"}}>Reading Date</h3>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8,flexWrap:"wrap"}}>
        <input type="date" value={entryDate} max={todayStr} onChange={e=>setEntryDate(e.target.value)} style={{padding:"8px 12px",borderRadius:8,border:"1px solid #E0E0E0",fontSize:13,fontFamily:"inherit"}}/>
        {isBackdated&&<span style={{fontSize:11,fontWeight:600,padding:"4px 10px",borderRadius:6,background:"#FFF3E0",color:"#E65100",display:"flex",alignItems:"center",gap:4}}><Clock size={12}/>Backdated</span>}
        {entryDate===todayStr&&<span style={{fontSize:11,color:"#8D8D8D"}}>(today)</span>}
      </div>
      {lockInfo.locked&&<div style={{padding:"10px 12px",borderRadius:8,background:"#FFF1F1",border:"1px solid #FFD7DA",color:"#DA1E28",fontSize:12,fontWeight:500,marginBottom:14,display:"flex",alignItems:"center",gap:6}}><AlertTriangle size={14}/>Date locked: {lockInfo.reason}. Contact a Fleet Manager or Super Admin to make changes.</div>}
      {isBackdated&&!lockInfo.locked&&requirePhotoBackdated&&<div style={{padding:"10px 12px",borderRadius:8,background:"#FFF8E1",border:"1px solid #FFE082",color:"#F57F17",fontSize:12,fontWeight:500,marginBottom:14,display:"flex",alignItems:"center",gap:6}}><Camera size={13}/>A generator photo is required for backdated entries.</div>}
      <h3 style={{fontSize:15,fontWeight:700,margin:"16px 0 12px"}}>Select Generator</h3>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {storeGens.map(g=>{
          const existing=existingForGenDate(g.id);
          // For NEW entries (no existing record): block if the date is locked
          // For EXISTING entries: block if EITHER the date is locked OR the edit window has elapsed
          let blocked=false;let blockMsg=null;let blockLabel="Locked";
          if(existing){
            const edit=checkEditWindow(existing);
            if(!edit.canEdit){blocked=true;blockMsg=edit.reason;blockLabel="Edit window expired";}
            else if(lockInfo.locked&&!isAdmin){blocked=true;blockMsg="Date locked: "+lockInfo.reason;}
          }else{
            if(lockInfo.locked){blocked=true;blockMsg="Date locked: "+lockInfo.reason;}
          }
          return(
          <button key={g.id} onClick={()=>{
            if(blocked){alert(blockMsg);return;}
            if(existing){loadForEdit(existing);return;}
            setEditingId(null);setSelGen(g.id);setStep("input");
            const prev=getPrevReading(g.id);if(prev&&prev.genHoursClosing)setHoursOpening(String(prev.genHoursClosing));
          }} disabled={blocked}
            title={blockMsg||""}
            style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px",borderRadius:10,border:blocked?"1.5px solid #E0E0E0":existing?"1.5px solid #FFE082":"1.5px solid #D0E2FF",background:blocked?"#F4F4F4":existing?"#FFFBEA":"#F8FAFF",cursor:blocked?"not-allowed":"pointer",textAlign:"left",opacity:blocked?0.55:1}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:38,height:38,borderRadius:9,background:blocked?"#E0E0E0":existing?"#FFE082":"#D0E2FF",display:"flex",alignItems:"center",justifyContent:"center"}}><Zap size={18} color={blocked?"#8D8D8D":existing?"#F57F17":P}/></div>
              <div><div style={{fontSize:14,fontWeight:600,color:blocked?"#8D8D8D":"#161616",display:"flex",alignItems:"center",gap:6}}>{g.name}{g.assetType==="oven"&&<span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:4,background:"#EDE7F6",color:"#8B5CF6",letterSpacing:"0.04em"}}>OVEN</span>}</div><div style={{fontSize:11,color:"#8D8D8D"}}>{g.brand} - {g.cap} - {g.loc}</div><div style={{fontSize:11,color:"#8D8D8D"}}>{g.assetType==="oven"?"Log batches + diesel level":`Current: ${g.hrs?.toLocaleString()||0} hrs`}</div></div>
            </div>
            {existing&&blocked?<span style={{fontSize:11,fontWeight:600,color:"#8D8D8D",display:"flex",alignItems:"center",gap:4,textAlign:"right"}}><AlertTriangle size={13}/>{blockLabel}</span>
            :existing?(()=>{const ed=checkEditWindow(existing);return(<span style={{fontSize:11,fontWeight:600,color:"#F57F17",display:"flex",alignItems:"center",gap:4}}><CheckCircle size={13}/>Edit{ed.remainingMin!=null?` (${ed.remainingMin}m left)`:""}</span>);})()
            :blocked?<span style={{fontSize:11,fontWeight:600,color:"#8D8D8D"}}>Locked</span>
            :<ChevronRight size={16} color={P}/>}
          </button>
        );})}
      </div>
      {storeGens.length===0&&<div style={{textAlign:"center",padding:30,color:"#8D8D8D"}}><Zap size={32} style={{opacity:0.3,marginBottom:8}}/><div style={{fontSize:13}}>No generators assigned to {isStoreStaff?"your store":"this location"}</div></div>}
    </div>)}

    {/* Step: Input (Daily Reading tab) */}
    {pageTab==="daily"&&step==="input"&&selectedGen&&(<div>
      <button onClick={()=>{resetForm();}} style={{display:"flex",alignItems:"center",gap:4,background:"none",border:"none",cursor:"pointer",color:P,fontSize:13,fontWeight:600,marginBottom:12}}><ChevronLeft size={16}/> Back</button>

      <div style={{background:"#fff",borderRadius:14,border:"1px solid #E8ECF1",overflow:"hidden"}}>
        {/* Generator info bar */}
        <div style={{padding:"14px 20px",background:"#F8FAFF",borderBottom:"1px solid #E8ECF1",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
          <div><div style={{fontSize:14,fontWeight:700,display:"flex",alignItems:"center",gap:6}}>{selectedGen.name}{editingId&&<span style={{fontSize:10,padding:"2px 8px",borderRadius:4,background:"#FFF3E0",color:"#E65100",fontWeight:700}}>EDITING</span>}{isBackdated&&!editingId&&<span style={{fontSize:10,padding:"2px 8px",borderRadius:4,background:"#FFF3E0",color:"#E65100",fontWeight:700}}>BACKDATED</span>}</div><div style={{fontSize:11,color:"#8D8D8D"}}>{[selectedGen.brand,selectedGen.cap,entryDate].filter(Boolean).join(" - ")}</div></div>
          <div style={{textAlign:"right"}}><div style={{fontSize:11,color:"#8D8D8D"}}>Last Reading{prevReading?` (${prevReading.date})`:""}</div><div style={{fontSize:14,fontWeight:700}}>{!prevReading?"No prior"
            :selectedGen.assetType==="oven"
              ?(prevReading.dieselLevelActual!=null?prevReading.dieselLevelActual.toLocaleString()+" L":(prevReading.batchesProduced!=null?prevReading.batchesProduced+" batches":"Logged"))
              :(prevReading.genHoursClosing!=null?prevReading.genHoursClosing.toLocaleString()+" hrs":(prevReading.dieselLevelActual!=null?prevReading.dieselLevelActual.toLocaleString()+" L":"Logged"))}</div></div>
        </div>
        {lockInfo.locked&&<div style={{padding:"10px 16px",background:"#FFF1F1",borderBottom:"1px solid #FFD7DA",color:"#DA1E28",fontSize:12,fontWeight:500,display:"flex",alignItems:"center",gap:6}}><AlertTriangle size={14}/>Date locked: {lockInfo.reason}. Only Fleet Manager or Super Admin can change.</div>}
        {editingId&&(()=>{const ed=checkEditWindow(dieselReadings.find(r=>r.id===editingId));
          if(!ed.canEdit)return(<div style={{padding:"10px 16px",background:"#FFF1F1",borderBottom:"1px solid #FFD7DA",color:"#DA1E28",fontSize:12,fontWeight:500,display:"flex",alignItems:"center",gap:6}}><AlertTriangle size={14}/>{ed.reason}</div>);
          if(ed.remainingMin!=null&&!isAdmin)return(<div style={{padding:"10px 16px",background:"#FFF8E1",borderBottom:"1px solid #FFE082",color:"#F57F17",fontSize:12,fontWeight:500,display:"flex",alignItems:"center",gap:6}}><Clock size={13}/>Edit window: {ed.remainingMin} min remaining. After that, only Fleet Manager / Super Admin can change.</div>);
          return null;})()}
        {isBackdated&&requirePhotoBackdated&&!editingId&&<div style={{padding:"10px 16px",background:"#FFF8E1",borderBottom:"1px solid #FFE082",color:"#F57F17",fontSize:12,fontWeight:500,display:"flex",alignItems:"center",gap:6}}><Camera size={13}/>Generator photo required for backdated entry.</div>}

        <div style={{padding:20}}>
          {/* Section 1: Generator Meter (hidden for ovens — they have no hour meter) */}
          {selectedGen.assetType!=="oven"&&<div style={{marginBottom:20}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
              <div style={{fontSize:13,fontWeight:700,display:"flex",alignItems:"center",gap:6}}><div style={{width:22,height:22,borderRadius:"50%",background:P,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700}}>1</div> Generator Meter</div>
              <div style={{display:"flex",gap:4}}>
                <button onClick={()=>setInputMode("photo")} style={{padding:"4px 10px",borderRadius:6,fontSize:11,fontWeight:600,border:inputMode==="photo"?"1.5px solid "+P:"1.5px solid #E0E0E0",background:inputMode==="photo"?"#D0E2FF":"#fff",color:inputMode==="photo"?P:"#8D8D8D",cursor:"pointer"}}>Photo</button>
                <button onClick={()=>setInputMode("manual")} style={{padding:"4px 10px",borderRadius:6,fontSize:11,fontWeight:600,border:inputMode==="manual"?"1.5px solid "+P:"1.5px solid #E0E0E0",background:inputMode==="manual"?"#D0E2FF":"#fff",color:inputMode==="manual"?P:"#8D8D8D",cursor:"pointer"}}>Manual</button>
              </div>
            </div>

            {inputMode==="photo"&&(<div style={{marginBottom:14}}>
              {!preview?(<div onClick={()=>document.getElementById("diesel-gen-photo").click()} style={{border:"2px dashed #D0E2FF",borderRadius:12,padding:"28px 20px",textAlign:"center",cursor:"pointer",background:"#F8FAFF"}}>
                <Camera size={30} color={P} style={{marginBottom:6}}/><div style={{fontSize:13,fontWeight:600,color:P}}>Tap to take photo</div><div style={{fontSize:11,color:"#8D8D8D",marginTop:3}}>of generator control panel</div></div>)
              :(<div style={{position:"relative"}}><img src={preview} style={{width:"100%",borderRadius:12,maxHeight:220,objectFit:"cover"}}/><button onClick={()=>{setPreview("");setPhoto(null);setHoursClosing("");setAiNotes("");}} style={{position:"absolute",top:8,right:8,background:"rgba(0,0,0,0.6)",border:"none",borderRadius:"50%",width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}><X size={14} color="#fff"/></button></div>)}
              <input id="diesel-gen-photo" type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={handleGenPhoto}/>
              {analyzing&&<div style={{display:"flex",alignItems:"center",gap:8,padding:10,background:"#D0E2FF",borderRadius:8,marginTop:10}}><div style={{width:16,height:16,border:"2px solid "+P,borderTop:"2px solid transparent",borderRadius:"50%",animation:"spin 1s linear infinite"}}/><span style={{fontSize:12,fontWeight:600,color:P}}>Analyzing meter...</span></div>}
              {aiNotes&&<div style={{padding:8,background:"#F4F4F4",borderRadius:8,fontSize:11,color:"#525252",marginTop:8}}>AI: {aiNotes}</div>}
            </div>)}

            <div style={{background:"#F8FAFF",borderRadius:10,padding:14,border:"1px solid #D0E2FF"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <Field label="Opening Hours">{prevReading?.genHoursClosing!=null
                  ?(<><input style={{...inp,fontSize:18,fontWeight:700,textAlign:"center",background:"#F4F4F4",color:"#525252"}} type="number" value={prevReading.genHoursClosing} disabled readOnly/><div style={{fontSize:10,color:"#8D8D8D",marginTop:2}}>From {prevReading.date} closing ({prevReading.genHoursClosing.toLocaleString()}) — not editable</div></>)
                  :(<><input style={{...inp,fontSize:18,fontWeight:700,textAlign:"center",background:hoursOpening?"#E8F5E9":"#fff"}} type="number" step="0.1" placeholder="0" value={hoursOpening} onChange={e=>setHoursOpening(e.target.value)}/><div style={{fontSize:10,color:"#8D8D8D",marginTop:2}}>First reading — enter starting hours</div></>)}</Field>
                <Field label="Closing Hours *"><input style={{...inp,fontSize:18,fontWeight:700,textAlign:"center"}} type="number" step="0.1" placeholder="0" value={hoursClosing} onChange={e=>setHoursClosing(e.target.value)}/></Field>
              </div>
              {effOpen!=null&&hoursClosing&&parseFloat(hoursClosing)>effOpen&&(
                <div style={{marginTop:10,padding:8,background:"#E8F5E9",borderRadius:6,display:"flex",justifyContent:"space-between",fontSize:12}}>
                  <span style={{color:"#525252"}}>Hours Run Today:</span>
                  <span style={{fontWeight:700,color:"#24A148"}}>{(parseFloat(hoursClosing)-effOpen).toFixed(1)} hours</span>
                </div>
              )}
            </div>
          </div>}

          {/* Section: Bread Batches (ovens only) */}
          {selectedGen.assetType==="oven"&&<div style={{marginBottom:20}}>
            <div style={{fontSize:13,fontWeight:700,display:"flex",alignItems:"center",gap:6,marginBottom:10}}><div style={{width:22,height:22,borderRadius:"50%",background:"#8B5CF6",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700}}>1</div> Bread Production</div>
            <Field label="Batches Produced Today *"><input style={{...inp,fontSize:18,fontWeight:700,textAlign:"center"}} type="number" step="1" placeholder="e.g. 32" value={batches} onChange={e=>setBatches(e.target.value)}/></Field>
            {batches&&dieselLevel&&(()=>{
              const prev=getPrevReading(selGen);
              const cons=prev?.dieselLevelActual!=null?prev.dieselLevelActual+autoAdded-parseFloat(dieselLevel):null;
              const perBatch=cons&&parseFloat(batches)>0?cons/parseFloat(batches):null;
              return perBatch&&perBatch>0?(<div style={{marginTop:8,padding:8,background:"#EDE7F6",borderRadius:6,display:"flex",justifyContent:"space-between",fontSize:12}}><span style={{color:"#525252"}}>Diesel per batch:</span><span style={{fontWeight:700,color:"#8B5CF6"}}>{perBatch.toFixed(2)} L/batch</span></div>):null;
            })()}
          </div>}

          {/* Section 2: Diesel Level */}
          <div style={{marginBottom:20}}>
            <div style={{fontSize:13,fontWeight:700,display:"flex",alignItems:"center",gap:6,marginBottom:10}}><div style={{width:22,height:22,borderRadius:"50%",background:"#FF832B",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700}}>2</div> Diesel Level</div>
            {/* Diesel level photo (tank/dipstick) */}
            <div style={{marginBottom:12}}>
              {!tankPreview?(<div onClick={()=>document.getElementById("diesel-tank-photo").click()} style={{border:"2px dashed #FFD7B5",borderRadius:12,padding:"22px 16px",textAlign:"center",cursor:"pointer",background:"#FFF4EC"}}>
                <Camera size={26} color="#FF832B" style={{marginBottom:4}}/><div style={{fontSize:12,fontWeight:600,color:"#FF832B"}}>Photo of diesel tank / dipstick</div><div style={{fontSize:10,color:"#8D8D8D",marginTop:2}}>Optional but recommended</div></div>)
              :(<div style={{position:"relative"}}><img src={tankPreview} style={{width:"100%",borderRadius:12,maxHeight:180,objectFit:"cover"}}/><button onClick={()=>{setTankPreview("");setTankPhoto(null);}} style={{position:"absolute",top:6,right:6,background:"rgba(0,0,0,0.6)",border:"none",borderRadius:"50%",width:24,height:24,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}><X size={12} color="#fff"/></button></div>)}
              <input id="diesel-tank-photo" type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={handleTankPhoto}/>
            </div>
            <Field label="Current Level (Litres) *"><input style={inp} type="number" placeholder="e.g. 150" value={dieselLevel} onChange={e=>setDieselLevel(e.target.value)}/></Field>
            {/* Diesel Received — admin deliveries for this date. Accept a delivery
                to confirm receipt and add it to today's reading (acceptance-gated). */}
            <div style={{marginTop:12,border:"1px solid #E8ECF1",borderRadius:10,overflow:"hidden"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",background:"#F7F8FC"}}>
                <div style={{fontSize:12,fontWeight:700}}>Diesel Received Today</div>
                <div style={{fontSize:14,fontWeight:700,color:autoAdded>0?"#24A148":"#8D8D8D"}}>{autoAdded>0?autoAdded.toLocaleString()+" L":"0 L"}</div>
              </div>
              {dayDists.length===0
                ?<div style={{padding:"10px 12px",fontSize:11,color:"#8D8D8D",borderTop:"1px solid #E8ECF1"}}>No admin delivery recorded for this date. Diesel you receive from admin is added here automatically once you accept it.</div>
                :dayDists.map(d=>{const p=(dieselPurchases||[]).find(x=>x.id===d.purchaseId);return(
                  <div key={d.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,padding:"9px 12px",borderTop:"1px solid #F0F2F5"}}>
                    <div style={{minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:700,color:P}}>{d.litres.toLocaleString()} L</div>
                      <div style={{fontSize:10,color:"#8D8D8D",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p?p.supplier:"Admin delivery"}{d.notes?" — "+d.notes:""}</div>
                    </div>
                    {d.confirmed
                      ?<span style={{display:"flex",alignItems:"center",gap:4,fontSize:11,fontWeight:700,color:"#24A148",whiteSpace:"nowrap"}}><Check size={13}/>Accepted</span>
                      :<button type="button" onClick={async()=>{try{const row=await db.updateDieselDistribution(d.id,{received_confirmed:true,received_date:new Date().toISOString().split("T")[0],received_by:user?.uid});setDieselDistributions(prev=>prev.map(x=>x.id===d.id?toDD(row):x));await applyAcceptToReading(d,dieselReadings,setDieselReadings,generators);}catch(e){alert("Error: "+e.message);}}} style={{padding:"6px 14px",borderRadius:7,border:"none",background:"#24A148",color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>Accept</button>}
                  </div>);})}
              {pendingDists.length>0&&<div style={{padding:"8px 12px",background:"#FFF4EC",borderTop:"1px solid #FFD7B5",fontSize:11,color:"#8A3800"}}>{pendingDists.reduce((s,d)=>s+(d.litres||0),0).toLocaleString()} L delivered but not yet accepted — tap <b>Accept</b> to include it in today's reading.</div>}
            </div>
            {dieselLevel&&selectedGen.tank>0&&(()=>{
              const pct=Math.min(100,Math.round(parseFloat(dieselLevel)/selectedGen.tank*100));
              return(<div style={{marginTop:8}}>
                <div style={{height:10,borderRadius:5,background:"#E0E0E0",overflow:"hidden"}}><div style={{height:"100%",borderRadius:5,background:pct>50?"#24A148":pct>20?"#FF832B":"#DA1E28",width:pct+"%",transition:"width 0.3s"}}/></div>
                <div style={{fontSize:11,color:"#8D8D8D",marginTop:3}}>{dieselLevel}L of {selectedGen.tank}L tank ({pct}%)</div>
              </div>);
            })()}
            {/* Theoretical comparison */}
            {hoursOpening&&hoursClosing&&dieselLevel&&(()=>{
              const theoretical=calcTheoretical();
              if(!theoretical)return null;
              return(<div style={{marginTop:10,padding:10,borderRadius:8,background:"#FFF8E1",border:"1px solid #FFE082",fontSize:12}}>
                <div style={{fontWeight:600,color:"#F57F17",marginBottom:4}}>Theoretical Consumption</div>
                <div style={{display:"flex",justifyContent:"space-between"}}><span>Expected usage:</span><span style={{fontWeight:700}}>{Math.round(theoretical)}L for {(parseFloat(hoursClosing)-parseFloat(hoursOpening)).toFixed(1)} hrs</span></div>
              </div>);
            })()}
          </div>

          {/* Section 3: NEPA (hidden for ovens) */}
          {selectedGen.assetType!=="oven"&&<div style={{marginBottom:20}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <div style={{fontSize:13,fontWeight:700,display:"flex",alignItems:"center",gap:6}}><div style={{width:22,height:22,borderRadius:"50%",background:"#8B5CF6",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700}}>3</div> NEPA / Power</div>
              <div style={{display:"flex",gap:4}}>
                <button onClick={()=>setNepaMode("manual")} style={{padding:"4px 10px",borderRadius:6,fontSize:11,fontWeight:600,border:nepaMode==="manual"?"1.5px solid #8B5CF6":"1.5px solid #E0E0E0",background:nepaMode==="manual"?"#EDE7F6":"#fff",color:nepaMode==="manual"?"#8B5CF6":"#8D8D8D",cursor:"pointer"}}>Manual</button>
                <button onClick={()=>setNepaMode("photo")} style={{padding:"4px 10px",borderRadius:6,fontSize:11,fontWeight:600,border:nepaMode==="photo"?"1.5px solid #8B5CF6":"1.5px solid #E0E0E0",background:nepaMode==="photo"?"#EDE7F6":"#fff",color:nepaMode==="photo"?"#8B5CF6":"#8D8D8D",cursor:"pointer"}}>Photo</button>
              </div>
            </div>

            {nepaMode==="manual"?(
              <Field label="Total NEPA Hours Today"><input style={inp} type="number" step="0.5" placeholder="e.g. 14" value={nepaHours} onChange={e=>setNepaHours(e.target.value)}/></Field>
            ):(
              <div>
                {!nepaPreview?(<div onClick={()=>document.getElementById("diesel-nepa-photo").click()} style={{border:"2px dashed #D1C4E9",borderRadius:12,padding:"22px 16px",textAlign:"center",cursor:"pointer",background:"#F3E5F5",marginBottom:10}}>
                  <Camera size={26} color="#8B5CF6" style={{marginBottom:4}}/><div style={{fontSize:12,fontWeight:600,color:"#8B5CF6"}}>Photo of NEPA meter</div></div>)
                :(<div style={{position:"relative",marginBottom:10}}><img src={nepaPreview} style={{width:"100%",borderRadius:12,maxHeight:180,objectFit:"cover"}}/><button onClick={()=>{setNepaPreview("");setNepaPhoto(null);setNepaMeterClose("");}} style={{position:"absolute",top:6,right:6,background:"rgba(0,0,0,0.6)",border:"none",borderRadius:"50%",width:24,height:24,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}><X size={12} color="#fff"/></button></div>)}
                <input id="diesel-nepa-photo" type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={handleNepaPhotoCapture}/>
                {nepaAnalyzing&&<div style={{display:"flex",alignItems:"center",gap:6,padding:8,background:"#EDE7F6",borderRadius:8,marginBottom:8}}><div style={{width:14,height:14,border:"2px solid #8B5CF6",borderTop:"2px solid transparent",borderRadius:"50%",animation:"spin 1s linear infinite"}}/><span style={{fontSize:11,fontWeight:600,color:"#8B5CF6"}}>Reading meter...</span></div>}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <Field label="Opening Reading"><input style={inp} type="number" placeholder="0" value={nepaMeterOpen} onChange={e=>setNepaMeterOpen(e.target.value)}/></Field>
                  <Field label="Closing Reading"><input style={inp} type="number" placeholder="0" value={nepaMeterClose} onChange={e=>setNepaMeterClose(e.target.value)}/></Field>
                </div>
                <Field label="Total NEPA Hours"><input style={inp} type="number" step="0.5" placeholder="e.g. 14" value={nepaHours} onChange={e=>setNepaHours(e.target.value)}/></Field>
              </div>
            )}
          </div>}

          {/* Notes */}
          <Field label="Notes (optional)"><input style={inp} placeholder="e.g. generator serviced today" value={notes} onChange={e=>setNotes(e.target.value)}/></Field>

          {msg&&<div style={{marginTop:10,padding:10,borderRadius:8,background:msg.startsWith("Error")?"#DA1E2818":"#D0E2FF",color:msg.startsWith("Error")?"#DA1E28":P,fontSize:12,fontWeight:500}}>{msg}</div>}

          {(()=>{const editLocked=editingId&&!checkEditWindow(dieselReadings.find(r=>r.id===editingId)).canEdit;
            const disabled=(!hoursClosing&&!dieselLevel)||saving||lockInfo.locked||editLocked;
            return(
              <button onClick={handleSave} disabled={disabled}
                style={{width:"100%",marginTop:16,padding:"14px",borderRadius:10,border:"none",background:disabled?"#C6C6C6":P,color:"#fff",fontSize:14,fontWeight:700,cursor:disabled?"not-allowed":"pointer"}}>
                {saving?"Saving...":lockInfo.locked?"Date Locked":editLocked?"Edit Window Expired":editingId?"Update Reading":"Submit Reading"}
              </button>
            );})()}
        </div>
      </div>
    </div>)}

    {/* Step: Done (Daily Reading tab) */}
    {pageTab==="daily"&&step==="done"&&(<div style={{background:"#fff",borderRadius:14,border:"1px solid #E8ECF1",padding:30,textAlign:"center"}}>
      <div style={{width:56,height:56,borderRadius:"50%",background:"#E8F5E9",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px"}}><CheckCircle size={28} color="#24A148"/></div>
      <h3 style={{fontSize:17,fontWeight:700,margin:"0 0 6px"}}>{editingId?"Reading Updated!":"Reading Submitted!"}</h3>
      <div style={{fontSize:13,color:"#8D8D8D",marginBottom:6}}>{selectedGen?.name} - {entryDate}</div>
      {msg&&msg.includes("WARNING")&&<div style={{padding:10,borderRadius:8,background:"#FFF3E0",border:"1px solid #FFE0B2",color:"#E65100",fontSize:12,fontWeight:500,margin:"12px 0",textAlign:"left"}}><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}><AlertTriangle size={14}/><span style={{fontWeight:700}}>Discrepancy Detected</span></div>{msg}</div>}
      <div style={{display:"flex",gap:10,justifyContent:"center",marginTop:18}}>
        <button onClick={resetForm} style={{padding:"10px 24px",borderRadius:9,border:"1.5px solid #E0E0E0",background:"#fff",color:"#525252",fontSize:13,fontWeight:600,cursor:"pointer"}}>Back</button>
        <button onClick={()=>setShowHistory(true)} style={{padding:"10px 24px",borderRadius:9,border:"none",background:P,color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>View History</button>
      </div>
    </div>)}

    {/* NEPA Period Tab */}
    {pageTab==="nepa"&&<NepaPeriodSection user={user} nepaPeriodLogs={nepaPeriodLogs} setNepaPeriodLogs={setNepaPeriodLogs} locations={locations} appSettings={appSettings}/>}

    {/* Transfer Diesel Tab */}
    {pageTab==="transfer"&&<TransferSection user={user} generators={generators} vehicles={vehicles} dieselTransfers={dieselTransfers} setDieselTransfers={setDieselTransfers} locations={locations} appSettings={appSettings} dieselLocks={dieselLocks}/>}
  </div>);
}

// ============================================
// TRANSFER DIESEL SECTION - inside Diesel Log page
// Tracks diesel moved OUT of a store tank/generator into a vehicle or
// the bakery oven, so it stops being counted as generator consumption.
// ============================================
function TransferSection({user,generators,vehicles,dieselTransfers,setDieselTransfers,locations,appSettings,dieselLocks}){
  const isStoreStaff=user?.role==="Store Staff";
  const isAdmin=user?.role==="Super Admin"||user?.role==="Fleet Manager";
  const userStore=user?.store_location||"";
  const todayStr=new Date().toISOString().split("T")[0];
  const autoLockDays=Number(appSettings?.diesel_auto_lock_days??1);
  const [showForm,setShowForm]=useState(false);
  const [storeLoc,setStoreLoc]=useState(isStoreStaff?userStore:"");
  const [date,setDate]=useState(todayStr);
  const [sourceGen,setSourceGen]=useState("");
  const [destType,setDestType]=useState("vehicle");
  const [destId,setDestId]=useState("");
  const [destLabel,setDestLabel]=useState("");
  const [litres,setLitres]=useState("");
  const [notes,setNotes]=useState("");
  const [saving,setSaving]=useState(false);
  const [msg,setMsg]=useState("");

  const visible=(dieselTransfers||[]).filter(t=>isStoreStaff?t.storeLoc===userStore:true).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,100);
  const storeGens=(generators||[]).filter(g=>g.loc===(isStoreStaff?userStore:storeLoc));
  const sourceOpts=storeGens.filter(g=>g.assetType!=="oven");
  const ovenOpts=storeGens.filter(g=>g.assetType==="oven");
  const genName=(id)=>(generators||[]).find(g=>g.id===id)?.name||(vehicles||[]).find(v=>v.id===id)?.name||id;

  const dateLocked=(()=>{
    if(isAdmin)return null;
    if(date>todayStr)return "Future dates not allowed";
    const diff=Math.round((new Date(todayStr)-new Date(date))/864e5);
    if(diff>autoLockDays)return `Auto-locked (older than ${autoLockDays} day${autoLockDays===1?"":"s"})`;
    const ml=(dieselLocks||[]).find(l=>(!l.storeLoc||l.storeLoc===(isStoreStaff?userStore:storeLoc))&&date>=l.fromDate&&date<=l.toDate);
    return ml?(ml.reason||"Locked by admin"):null;
  })();

  const resetForm=()=>{setDate(todayStr);setSourceGen("");setDestType("vehicle");setDestId("");setDestLabel("");setLitres("");setNotes("");setMsg("");if(!isStoreStaff)setStoreLoc("");};

  const handleSave=async()=>{
    const loc=isStoreStaff?userStore:storeLoc;
    if(!loc){setMsg("Store is required.");return;}
    if(!litres||parseFloat(litres)<=0){setMsg("Litres must be greater than 0.");return;}
    if(destType==="vehicle"&&!destId&&!destLabel.trim()){setMsg("Pick a vehicle or type its name/plate.");return;}
    if(destType==="oven"&&!destId){setMsg("Pick the oven.");return;}
    if(dateLocked){setMsg("Cannot save: "+dateLocked);return;}
    setSaving(true);setMsg("");
    try{
      const destName=destType==="vehicle"
        ?((vehicles||[]).find(v=>v.id===destId)?.name||destLabel.trim())
        :destType==="oven"?(genName(destId)||"Oven"):(destLabel.trim()||"Other");
      const row=await db.addDieselTransfer(fromDT({
        date,storeLoc:loc,sourceGenId:sourceGen||null,destType,
        destId:destId||null,destLabel:destName,litres:parseFloat(litres),
        notes,recordedBy:user?.uid||null
      }));
      if(row)setDieselTransfers(prev=>[toDT(row),...prev]);
      setShowForm(false);resetForm();
    }catch(e){setMsg("Error: "+e.message);}
    setSaving(false);
  };

  const handleDelete=async(id)=>{
    if(!confirm("Delete this transfer?"))return;
    try{await db.deleteDieselTransfer(id);setDieselTransfers(prev=>prev.filter(t=>t.id!==id));}
    catch(e){alert("Error: "+e.message);}
  };

  return(<div>
    {!showForm&&<div style={{background:"#fff",borderRadius:14,border:"1px solid #E8ECF1",overflow:"hidden"}}>
      <div style={{padding:"16px 20px",borderBottom:"1px solid #E8ECF1",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div><h3 style={{fontSize:15,fontWeight:700,margin:0}}>Diesel Transfers</h3><div style={{fontSize:11,color:"#8D8D8D",marginTop:2}}>Diesel given to vehicles or moved to the oven — kept separate from generator consumption</div></div>
        <button onClick={()=>{resetForm();setShowForm(true);}} style={{padding:"8px 14px",borderRadius:8,border:"none",background:"#FF832B",color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}><Plus size={13}/>New Transfer</button>
      </div>
      {visible.length===0?<div style={{padding:30,textAlign:"center",color:"#8D8D8D",fontSize:13}}>No transfers recorded yet</div>
      :<div style={{overflow:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:640}}><thead><tr style={{background:"#F4F4F4"}}>{["Date","Store","From","To","Litres","Notes",""].map(h=>(<th key={h} style={th}>{h}</th>))}</tr></thead>
      <tbody>{visible.map(t=>(<tr key={t.id} style={{borderBottom:"1px solid #F4F4F4"}}>
        <td style={{...tc,whiteSpace:"nowrap"}}>{t.date}</td>
        <td style={tc}>{t.storeLoc}</td>
        <td style={tc}>{t.sourceGenId?genName(t.sourceGenId):"Store tank"}</td>
        <td style={{...tc,fontWeight:600}}><span style={{display:"inline-flex",alignItems:"center",gap:6}}>{t.destLabel||genName(t.destId)||"-"}<span style={{fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:4,background:t.destType==="vehicle"?"#D0E2FF":t.destType==="oven"?"#EDE7F6":"#F4F4F4",color:t.destType==="vehicle"?P:t.destType==="oven"?"#8B5CF6":"#525252"}}>{(t.destType||"other").toUpperCase()}</span></span></td>
        <td style={{...tc,fontWeight:700,color:"#FF832B"}}>{t.litres.toLocaleString()} L</td>
        <td style={{...tc,fontSize:11,color:"#8D8D8D",maxWidth:180}}>{t.notes||""}</td>
        <td style={tc}>{isAdmin&&<button onClick={()=>handleDelete(t.id)} style={{padding:"4px 8px",borderRadius:5,border:"1px solid #E0E0E0",background:"#fff",cursor:"pointer"}}><Trash2 size={12} color="#DA1E28"/></button>}</td>
      </tr>))}</tbody></table></div>}
    </div>}

    {showForm&&<div style={{background:"#fff",borderRadius:14,border:"1px solid #E8ECF1",padding:22}}>
      <button onClick={()=>{setShowForm(false);resetForm();}} style={{display:"flex",alignItems:"center",gap:4,background:"none",border:"none",cursor:"pointer",color:"#FF832B",fontSize:13,fontWeight:600,marginBottom:14}}><ChevronLeft size={16}/> Back to List</button>
      <h3 style={{fontSize:16,fontWeight:700,margin:"0 0 16px"}}>New Diesel Transfer</h3>
      <div style={{display:"grid",gridTemplateColumns:isMob()?"1fr":"1fr 1fr",gap:12,marginBottom:6}}>
        <Field label="Store *">
          {isStoreStaff?<input style={{...inp,background:"#F4F4F4"}} value={userStore} disabled/>
          :<select style={inp} value={storeLoc} onChange={e=>{setStoreLoc(e.target.value);setSourceGen("");setDestId("");}}><option value="">Select store...</option>{(locations||[]).map(l=>(<option key={l} value={l}>{l}</option>))}</select>}
        </Field>
        <Field label="Date *"><input type="date" style={inp} value={date} max={todayStr} onChange={e=>setDate(e.target.value)}/></Field>
        <Field label="From (source tank)"><select style={inp} value={sourceGen} onChange={e=>setSourceGen(e.target.value)}><option value="">Store tank / unspecified</option>{sourceOpts.map(g=>(<option key={g.id} value={g.id}>{g.name}</option>))}</select></Field>
        <Field label="Transfer To *">
          <div style={{display:"flex",gap:4,marginBottom:6}}>
            {[["vehicle","Vehicle"],["oven","Oven"],["other","Other"]].filter(([k])=>k!=="oven"||ovenOpts.length>0).map(([k,l])=>(
              <button key={k} onClick={()=>{setDestType(k);setDestId("");setDestLabel("");}} style={{padding:"5px 12px",borderRadius:6,fontSize:11,fontWeight:600,border:destType===k?"1.5px solid #FF832B":"1.5px solid #E0E0E0",background:destType===k?"#FFF4EC":"#fff",color:destType===k?"#FF832B":"#8D8D8D",cursor:"pointer"}}>{l}</button>
            ))}
          </div>
          {destType==="vehicle"&&<><select style={inp} value={destId} onChange={e=>setDestId(e.target.value)}><option value="">Select vehicle...</option>{(vehicles||[]).map(v=>(<option key={v.id} value={v.id}>{v.name}{v.plate?` (${v.plate})`:""}</option>))}</select>
            {!destId&&<input style={{...inp,marginTop:6}} placeholder="...or type vehicle name / plate" value={destLabel} onChange={e=>setDestLabel(e.target.value)}/>}</>}
          {destType==="oven"&&<select style={inp} value={destId} onChange={e=>setDestId(e.target.value)}><option value="">Select oven...</option>{ovenOpts.map(g=>(<option key={g.id} value={g.id}>{g.name}</option>))}</select>}
          {destType==="other"&&<input style={inp} placeholder="Describe destination" value={destLabel} onChange={e=>setDestLabel(e.target.value)}/>}
        </Field>
        <Field label="Litres *"><input style={{...inp,fontSize:18,fontWeight:700,textAlign:"center"}} type="number" placeholder="e.g. 45" value={litres} onChange={e=>setLitres(e.target.value)}/></Field>
        <Field label="Notes"><input style={inp} placeholder="Optional" value={notes} onChange={e=>setNotes(e.target.value)}/></Field>
      </div>
      {dateLocked&&<div style={{marginBottom:10,padding:10,borderRadius:8,background:"#FFF1F1",border:"1px solid #FFD7DA",color:"#DA1E28",fontSize:12,fontWeight:500,display:"flex",alignItems:"center",gap:6}}><AlertTriangle size={14}/>Date locked: {dateLocked}</div>}
      {msg&&<div style={{marginBottom:10,padding:10,borderRadius:8,background:msg.startsWith("Error")?"#DA1E2818":"#FFF8E1",color:msg.startsWith("Error")?"#DA1E28":"#F57F17",fontSize:12,fontWeight:500}}>{msg}</div>}
      <button onClick={handleSave} disabled={saving||!!dateLocked} style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:(saving||dateLocked)?"#C6C6C6":"#FF832B",color:"#fff",fontSize:14,fontWeight:700,cursor:(saving||dateLocked)?"not-allowed":"pointer"}}>{saving?"Saving...":"Save Transfer"}</button>
    </div>}
  </div>);
}

// ============================================
// NEPA PERIOD SECTION - inside Diesel Log page
// Custom date-range NEPA tracking (separate from daily readings)
// ============================================
function NepaPeriodSection({user,nepaPeriodLogs,setNepaPeriodLogs,locations,appSettings}){
  const isStoreStaff=user?.role==="Store Staff";
  const isAdmin=user?.role==="Super Admin"||user?.role==="Fleet Manager";
  const editWindowMinutes=Number(appSettings?.diesel_edit_window_minutes??60);
  const canEditEntry=(entry)=>{
    if(isAdmin)return true;
    if(!entry||!entry.createdAt)return true;
    const elapsedMin=(Date.now()-new Date(entry.createdAt).getTime())/60000;
    return elapsedMin<=editWindowMinutes;
  };
  const userStore=user?.store_location||"";
  const todayStr=new Date().toISOString().split("T")[0];
  const monthStart=new Date(new Date().getFullYear(),new Date().getMonth(),1).toISOString().split("T")[0];
  const [showForm,setShowForm]=useState(false);
  const [editId,setEditId]=useState(null);
  const [storeLoc,setStoreLoc]=useState(isStoreStaff?userStore:"");
  const [fromDate,setFromDate]=useState(monthStart);
  const [toDate,setToDate]=useState(todayStr);
  const [meterOpen,setMeterOpen]=useState("");
  const [meterClose,setMeterClose]=useState("");
  const [totalHours,setTotalHours]=useState("");
  const [photo,setPhoto]=useState(null);
  const [preview,setPreview]=useState("");
  const [notes,setNotes]=useState("");
  const [saving,setSaving]=useState(false);
  const [msg,setMsg]=useState("");

  const visible=(nepaPeriodLogs||[]).filter(n=>isStoreStaff?n.storeLoc===userStore:true).sort((a,b)=>b.fromDate.localeCompare(a.fromDate));

  const handlePhoto=(e)=>{
    const file=e.target.files?.[0];if(!file)return;
    setPhoto(file);
    const reader=new FileReader();
    reader.onload=(ev)=>setPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const resetForm=()=>{
    setEditId(null);setStoreLoc(isStoreStaff?userStore:"");setFromDate(monthStart);setToDate(todayStr);
    setMeterOpen("");setMeterClose("");setTotalHours("");setPhoto(null);setPreview("");setNotes("");setMsg("");
  };

  const startEdit=(n)=>{
    setEditId(n.id);setStoreLoc(n.storeLoc);setFromDate(n.fromDate);setToDate(n.toDate);
    setMeterOpen(n.meterOpening!=null?String(n.meterOpening):"");
    setMeterClose(n.meterClosing!=null?String(n.meterClosing):"");
    setTotalHours(n.totalHours?String(n.totalHours):"");
    setPreview(n.photoUrl||"");setPhoto(null);setNotes(n.notes||"");
    setShowForm(true);setMsg("");
  };

  const handleSave=async()=>{
    if(!storeLoc){setMsg("Store is required.");return;}
    if(!fromDate||!toDate){setMsg("From and To dates are required.");return;}
    if(fromDate>toDate){setMsg("From date must be before To date.");return;}
    if(!totalHours&&!(meterOpen&&meterClose)){setMsg("Provide total hours OR both meter readings.");return;}
    if(editId){
      const existing=nepaPeriodLogs.find(n=>n.id===editId);
      if(!canEditEntry(existing)){setMsg(`Edit window expired (>${editWindowMinutes} min). Contact a Fleet Manager or Super Admin.`);return;}
    }
    setSaving(true);setMsg("");
    try{
      let photoUrl=preview&&!photo?preview:"";
      if(photo){
        const ext=photo.name.split(".").pop();
        const path="nepa-period/"+storeLoc.replace(/\s+/g,"_")+"-"+Date.now()+"."+ext;
        const{data:upData,error:upErr}=await supabase.storage.from("meter-photos").upload(path,photo);
        if(!upErr&&upData){const{data:urlData}=supabase.storage.from("meter-photos").getPublicUrl(path);photoUrl=urlData?.publicUrl||"";}
      }
      const computedHours=totalHours?parseFloat(totalHours):(meterClose&&meterOpen?parseFloat(meterClose)-parseFloat(meterOpen):null);
      const record=fromNPL({storeLoc,fromDate,toDate,totalHours:computedHours,meterOpening:parseFloat(meterOpen)||null,meterClosing:parseFloat(meterClose)||null,photoUrl,notes,submittedBy:user?.uid||null});
      let saved;
      if(editId){
        saved=await db.updateNepaPeriodLog(editId,record);
        if(saved)setNepaPeriodLogs(prev=>prev.map(n=>n.id===editId?toNPL(saved):n));
      }else{
        saved=await db.addNepaPeriodLog(record);
        if(saved)setNepaPeriodLogs(prev=>[toNPL(saved),...prev]);
      }
      setShowForm(false);resetForm();
    }catch(e){setMsg("Error: "+e.message);}
    setSaving(false);
  };

  const handleDelete=async(id)=>{
    if(!confirm("Delete this NEPA period log?"))return;
    try{await db.deleteNepaPeriodLog(id);setNepaPeriodLogs(prev=>prev.filter(n=>n.id!==id));}
    catch(e){alert("Error: "+e.message);}
  };

  return(<div>
    {!showForm&&<div style={{background:"#fff",borderRadius:14,border:"1px solid #E8ECF1",overflow:"hidden"}}>
      <div style={{padding:"16px 20px",borderBottom:"1px solid #E8ECF1",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div><h3 style={{fontSize:15,fontWeight:700,margin:0}}>NEPA Period Logs</h3><div style={{fontSize:11,color:"#8D8D8D",marginTop:2}}>Track NEPA/power hours for any custom date range</div></div>
        <button onClick={()=>{resetForm();setShowForm(true);}} style={{padding:"8px 14px",borderRadius:8,border:"none",background:"#8B5CF6",color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}><Plus size={13}/>Add Log</button>
      </div>
      {visible.length===0?<div style={{padding:30,textAlign:"center",color:"#8D8D8D",fontSize:13}}>No NEPA period logs yet</div>
      :<table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr style={{background:"#F4F4F4"}}>{["Period","Store","Hours","Meter Reading","Photo","Submitted","Actions"].map(h=>(<th key={h} style={th}>{h}</th>))}</tr></thead>
      <tbody>{visible.map(n=>{const editAllowed=canEditEntry(n);return(<tr key={n.id}><td style={tc}><div>{n.fromDate}</div><div style={{fontSize:10,color:"#8D8D8D"}}>to {n.toDate}</div></td><td style={tc}>{n.storeLoc}</td><td style={{...tc,fontWeight:700,color:"#8B5CF6"}}>{n.totalHours?n.totalHours.toFixed(1)+"h":"-"}</td><td style={tc}>{n.meterOpening!=null&&n.meterClosing!=null?n.meterOpening+" → "+n.meterClosing:"-"}</td><td style={tc}>{n.photoUrl?<a href={n.photoUrl} target="_blank" rel="noreferrer" style={{color:"#8B5CF6",fontSize:11,fontWeight:600}}>View</a>:"-"}</td><td style={{...tc,fontSize:11,color:"#8D8D8D"}}>{n.createdAt?new Date(n.createdAt).toLocaleDateString():"-"}</td><td style={tc}><div style={{display:"flex",gap:6}}><button onClick={()=>{if(!editAllowed){alert(`Edit window expired (>${editWindowMinutes} min). Contact a Fleet Manager or Super Admin.`);return;}startEdit(n);}} disabled={!editAllowed} title={editAllowed?"":"Edit window expired"} style={{padding:"4px 10px",borderRadius:5,border:"1px solid #E0E0E0",background:editAllowed?"#fff":"#F4F4F4",cursor:editAllowed?"pointer":"not-allowed",fontSize:11,fontWeight:600,color:editAllowed?"#525252":"#8D8D8D"}}>{editAllowed?"Edit":"Locked"}</button>{isAdmin&&<button onClick={()=>handleDelete(n.id)} style={{padding:"4px 10px",borderRadius:5,border:"1px solid #FFD7DA",background:"#FFF1F1",color:"#DA1E28",cursor:"pointer",fontSize:11,fontWeight:600}}>Delete</button>}</div></td></tr>);})}</tbody></table>}
    </div>}

    {showForm&&<div style={{background:"#fff",borderRadius:14,border:"1px solid #E8ECF1",padding:22}}>
      <button onClick={()=>{setShowForm(false);resetForm();}} style={{display:"flex",alignItems:"center",gap:4,background:"none",border:"none",cursor:"pointer",color:"#8B5CF6",fontSize:13,fontWeight:600,marginBottom:14}}><ChevronLeft size={16}/> Back to List</button>
      <h3 style={{fontSize:16,fontWeight:700,margin:"0 0 16px"}}>{editId?"Edit NEPA Period Log":"New NEPA Period Log"}</h3>
      <div style={{display:"grid",gridTemplateColumns:isMob()?"1fr":"1fr 1fr",gap:12,marginBottom:14}}>
        <Field label="Store *">
          {isStoreStaff?<input style={{...inp,background:"#F4F4F4"}} value={userStore} disabled/>
          :<select style={inp} value={storeLoc} onChange={e=>setStoreLoc(e.target.value)}><option value="">Select store...</option>{(locations||[]).map(l=>(<option key={l} value={l}>{l}</option>))}</select>}
        </Field>
        <Field label=""><div/></Field>
        <Field label="From Date *"><input type="date" style={inp} value={fromDate} max={toDate} onChange={e=>setFromDate(e.target.value)}/></Field>
        <Field label="To Date *"><input type="date" style={inp} value={toDate} min={fromDate} max={todayStr} onChange={e=>setToDate(e.target.value)}/></Field>
        <Field label="Meter Opening"><input style={inp} type="number" placeholder="Optional" value={meterOpen} onChange={e=>setMeterOpen(e.target.value)}/></Field>
        <Field label="Meter Closing"><input style={inp} type="number" placeholder="Optional" value={meterClose} onChange={e=>setMeterClose(e.target.value)}/></Field>
        <Field label="Total Hours"><input style={inp} type="number" step="0.5" placeholder={meterOpen&&meterClose?"Auto from meters":"e.g. 320"} value={totalHours} onChange={e=>setTotalHours(e.target.value)}/></Field>
        <Field label="Notes"><input style={inp} placeholder="Optional notes" value={notes} onChange={e=>setNotes(e.target.value)}/></Field>
      </div>
      <div style={{marginBottom:14}}>
        <div style={{fontSize:12,fontWeight:600,color:"#525252",marginBottom:6}}>Meter Photo</div>
        {!preview?(<div onClick={()=>document.getElementById("nepa-period-photo").click()} style={{border:"2px dashed #D1C4E9",borderRadius:12,padding:"22px 16px",textAlign:"center",cursor:"pointer",background:"#F3E5F5"}}>
          <Camera size={26} color="#8B5CF6" style={{marginBottom:4}}/><div style={{fontSize:12,fontWeight:600,color:"#8B5CF6"}}>Photo of NEPA meter</div></div>)
        :(<div style={{position:"relative"}}><img src={preview} style={{width:"100%",borderRadius:12,maxHeight:200,objectFit:"cover"}}/><button onClick={()=>{setPreview("");setPhoto(null);}} style={{position:"absolute",top:6,right:6,background:"rgba(0,0,0,0.6)",border:"none",borderRadius:"50%",width:24,height:24,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}><X size={12} color="#fff"/></button></div>)}
        <input id="nepa-period-photo" type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={handlePhoto}/>
      </div>
      {msg&&<div style={{marginBottom:10,padding:10,borderRadius:8,background:msg.startsWith("Error")?"#DA1E2818":"#FFF8E1",color:msg.startsWith("Error")?"#DA1E28":"#F57F17",fontSize:12,fontWeight:500}}>{msg}</div>}
      <button onClick={handleSave} disabled={saving} style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:saving?"#C6C6C6":"#8B5CF6",color:"#fff",fontSize:14,fontWeight:700,cursor:saving?"not-allowed":"pointer"}}>{saving?"Saving...":editId?"Update Log":"Save Log"}</button>
    </div>}
  </div>);
}

// ============================================
// STAFF DASHBOARD PAGE - Supply, History, Generators, Reports
// ============================================
function StaffDashboardPage({generators,dieselReadings,setDieselReadings,dieselDistributions,setDieselDistributions,dieselPurchases,user}){
  const userStore=user?.store_location||"";
  const isStoreStaff=user?.role==="Store Staff";
  const myStore=isStoreStaff?userStore:null;
  const nowD=new Date();const defMonthStart=new Date(nowD.getFullYear(),nowD.getMonth(),1).toISOString().split("T")[0];const defMonthEnd=new Date(nowD.getFullYear(),nowD.getMonth()+1,0).toISOString().split("T")[0];
  const [dashTab,setDashTab]=useState("supply");
  const [dFrom,setDFrom]=useState(defMonthStart);const [dTo,setDTo]=useState(defMonthEnd);const [quickFilter,setQuickFilter]=useState("month");
  const [rFrom,setRFrom]=useState(defMonthStart);const [rTo,setRTo]=useState(nowD.toISOString().split("T")[0]);const [rTab,setRTab]=useState("readings");const [rGen,setRGen]=useState("");
  const [showReports,setShowReports]=useState(false);

  const applyQuick=(q)=>{setQuickFilter(q);const t=new Date();if(q==="7d"){setDFrom(new Date(t-7*864e5).toISOString().split("T")[0]);setDTo(t.toISOString().split("T")[0]);}else if(q==="30d"){setDFrom(new Date(t-30*864e5).toISOString().split("T")[0]);setDTo(t.toISOString().split("T")[0]);}else if(q==="month"){setDFrom(new Date(t.getFullYear(),t.getMonth(),1).toISOString().split("T")[0]);setDTo(new Date(t.getFullYear(),t.getMonth()+1,0).toISOString().split("T")[0]);}else if(q==="prev"){setDFrom(new Date(t.getFullYear(),t.getMonth()-1,1).toISOString().split("T")[0]);setDTo(new Date(t.getFullYear(),t.getMonth(),0).toISOString().split("T")[0]);}else if(q==="year"){setDFrom(new Date(t.getFullYear(),0,1).toISOString().split("T")[0]);setDTo(t.toISOString().split("T")[0]);}else if(q==="prevyear"){setDFrom(new Date(t.getFullYear()-1,0,1).toISOString().split("T")[0]);setDTo(new Date(t.getFullYear()-1,11,31).toISOString().split("T")[0]);}};
  const inRange=(d)=>d>=dFrom&&d<=dTo;
  const myDists=(dieselDistributions||[]).filter(d=>(myStore?d.storeLoc===myStore:true)&&inRange(d.date)).sort((a,b)=>b.date.localeCompare(a.date));
  const myReadings=dieselReadings.filter(r=>(myStore?r.storeLoc===myStore:true)&&inRange(r.date));
  const allDists=(dieselDistributions||[]).filter(d=>myStore?d.storeLoc===myStore:true);
  const allReadings=dieselReadings.filter(r=>myStore?r.storeLoc===myStore:true);
  const totalReceived=myDists.reduce((s,d)=>s+d.litres,0);
  const totalConsumed=myReadings.reduce((s,r)=>s+(r.consumptionLitres||0),0);
  const totalHoursRun=myReadings.reduce((s,r)=>s+(r.hoursRun||0),0);
  // Diesel in Tank = the latest recorded level per asset, summed. This is the
  // store's real balance (what's physically there). Ledger-style balances
  // (received − consumed, added − consumed) drift from the tank and mislead —
  // especially for locally-buying stores whose purchases aren't distributions.
  const tankRows=(()=>{const byGen={};allReadings.forEach(r=>{if(r.dieselLevelActual!=null&&(!byGen[r.generatorId]||r.date>byGen[r.generatorId].date))byGen[r.generatorId]=r;});return Object.values(byGen);})();
  const tankTotal=tankRows.reduce((s,r)=>s+r.dieselLevelActual,0);
  const tankAsOf=tankRows.length?tankRows.map(r=>r.date).sort().slice(-1)[0]:null;
  // Per-generator breakdown
  const genMap={};myReadings.forEach(r=>{if(!genMap[r.generatorId])genMap[r.generatorId]={hrs:0,consumed:0,readings:0};genMap[r.generatorId].hrs+=(r.hoursRun||0);genMap[r.generatorId].consumed+=(r.consumptionLitres||0);genMap[r.generatorId].readings++;});
  const genBreakdown=Object.entries(genMap).map(([gid,d])=>{const g=generators.find(x=>x.id===gid);return{id:gid,name:g?.name||gid,...d,rate:d.hrs>0?(d.consumed/d.hrs):0};}).sort((a,b)=>b.consumed-a.consumed);
  // Daily chart data
  const dayMap={};myReadings.forEach(r=>{if(!dayMap[r.date])dayMap[r.date]={consumed:0,hrs:0};dayMap[r.date].consumed+=(r.consumptionLitres||0);dayMap[r.date].hrs+=(r.hoursRun||0);});
  const chartData=Object.entries(dayMap).sort((a,b)=>a[0].localeCompare(b[0])).map(([date,d])=>({date:date.slice(5),consumed:Math.round(d.consumed*10)/10,hrs:Math.round(d.hrs*10)/10}));

  // Reports export functions
  const inR=(d)=>d>=rFrom&&d<=rTo;
  const myGenIds=new Set(dieselReadings.filter(r=>myStore?r.storeLoc===myStore:true).map(r=>r.generatorId));
  const rGenOpts=(generators||[]).filter(g=>myGenIds.has(g.id));
  const rReadings=dieselReadings.filter(r=>(myStore?r.storeLoc===myStore:true)&&inR(r.date)&&(!rGen||r.generatorId===rGen)).sort((a,b)=>b.date.localeCompare(a.date));
  const rDists=(dieselDistributions||[]).filter(d=>(myStore?d.storeLoc===myStore:true)&&inR(d.date)).sort((a,b)=>b.date.localeCompare(a.date));
  const rTotalConsumed=rReadings.reduce((s,r)=>s+(r.consumptionLitres||0),0);
  const rTotalReceived=rDists.reduce((s,d)=>s+d.litres,0);
  const rTotalHrs=rReadings.reduce((s,r)=>s+(r.hoursRun||0),0);
  const exportCSV=(type)=>{
    let csv="";
    if(type==="readings"){csv="Date,Generator,Open Hrs,Close Hrs,Hours Run,Diesel Level (L),Added (L),Consumed (L),Rate (L/hr),NEPA Open,NEPA Close,Discrepancy\n";rReadings.forEach(r=>{const g=generators.find(x=>x.id===r.generatorId);csv+=`${r.date},${g?.name||r.generatorId},${r.genHoursOpening??""},${r.genHoursClosing??""},${r.hoursRun||""},${r.dieselLevelActual!=null?r.dieselLevelActual:""},${r.dieselAdded||""},${r.consumptionLitres||""},${r.consumptionRate!=null?r.consumptionRate.toFixed(2):""},${r.nepaMeterOpening??""},${r.nepaMeterClosing??""},${r.discrepancyFlag?"YES":"NO"}\n`;});}
    else{csv="Date,Litres,Supplier,Notes,Status\n";rDists.forEach(d=>{const p=(dieselPurchases||[]).find(x=>x.id===d.purchaseId);csv+=`${d.date},${d.litres},${p?.supplier||""},${(d.notes||"").replace(/,/g," ")},${d.confirmed?"Confirmed":"Pending"}\n`;});}
    const blob=new Blob([csv],{type:"text/csv"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`${myStore||"all"}_${type}_${rFrom}_to_${rTo}.csv`;a.click();URL.revokeObjectURL(url);
  };
  const exportPDF=(type)=>{
    let html="<html><head><title>"+((myStore||"All Stores")+" "+type+" Report")+"</title><style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #ddd;padding:8px;font-size:12px;text-align:left}th{background:#f4f4f4;font-weight:700}h1{font-size:18px}h2{font-size:14px;color:#666}.summary{display:flex;gap:20px;margin:12px 0}.summary div{padding:10px;background:#f9f9f9;border-radius:8px;flex:1}.summary .val{font-size:18px;font-weight:700}</style></head><body>";
    html+="<h1>"+(myStore||"All Stores")+" \u2014 "+type.charAt(0).toUpperCase()+type.slice(1)+" Report</h1>";
    html+="<h2>"+rFrom+" to "+rTo+"</h2>";
    if(type==="readings"){
      html+="<div class=\"summary\"><div><div>Total Consumed</div><div class=\"val\">"+rTotalConsumed.toFixed(1)+" L</div></div><div><div>Total Hours</div><div class=\"val\">"+rTotalHrs.toFixed(1)+" h</div></div><div><div>Readings</div><div class=\"val\">"+rReadings.length+"</div></div></div>";
      html+="<table><thead><tr><th>Date</th><th>Generator</th><th>Hours Run</th><th>Diesel Level</th><th>Consumed</th><th>NEPA</th><th>Source</th><th>Flag</th></tr></thead><tbody>";
      rReadings.forEach(r=>{const g=generators.find(x=>x.id===r.generatorId);html+="<tr><td>"+r.date+"</td><td>"+(g?.name||r.generatorId)+"</td><td>"+(r.hoursRun?r.hoursRun.toFixed(1)+"h":"-")+"</td><td>"+(r.dieselLevelActual!=null?r.dieselLevelActual+"L":"-")+"</td><td>"+(r.consumptionLitres?r.consumptionLitres.toFixed(1)+"L":"-")+"</td><td>"+(r.nepaHours?r.nepaHours+"h":"-")+"</td><td>"+(r.genSource||"manual")+"</td><td>"+(r.discrepancyFlag?"YES":"-")+"</td></tr>";});
      html+="</tbody></table>";
    }else{
      html+="<div class=\"summary\"><div><div>Total Received</div><div class=\"val\">"+rTotalReceived.toFixed(1)+" L</div></div><div><div>Deliveries</div><div class=\"val\">"+rDists.length+"</div></div></div>";
      html+="<table><thead><tr><th>Date</th><th>Litres</th><th>Supplier</th><th>Notes</th><th>Status</th></tr></thead><tbody>";
      rDists.forEach(d=>{const p=(dieselPurchases||[]).find(x=>x.id===d.purchaseId);html+="<tr><td>"+d.date+"</td><td>"+d.litres+" L</td><td>"+(p?.supplier||"\u2014")+"</td><td>"+(d.notes||"\u2014")+"</td><td>"+(d.confirmed?"Confirmed":"Pending")+"</td></tr>";});
      html+="</tbody></table>";
    }
    html+="</body></html>";
    const w=window.open("","_blank","width=800,height=600");w.document.write(html);w.document.close();setTimeout(()=>{w.print();},500);
  };

  // Reports sub-view
  if(showReports){return(<div>
    <button onClick={()=>setShowReports(false)} style={{display:"flex",alignItems:"center",gap:4,background:"none",border:"none",cursor:"pointer",color:P,fontSize:13,fontWeight:600,marginBottom:14}}><ChevronLeft size={16}/> Back to Dashboard</button>
    <div style={{marginBottom:16}}><h3 style={{fontSize:16,fontWeight:700,margin:"0 0 4px"}}>{myStore?myStore+" \u2014 ":""}Reports</h3><div style={{fontSize:12,color:"#8D8D8D"}}>Filter and export your store data</div></div>
    <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
      <Calendar size={14} color="#8D8D8D"/><input type="date" value={rFrom} onChange={e=>setRFrom(e.target.value)} style={{padding:"6px 10px",borderRadius:6,border:"1px solid #E0E0E0",fontSize:12}}/><span style={{fontSize:12,color:"#8D8D8D"}}>to</span><input type="date" value={rTo} onChange={e=>setRTo(e.target.value)} style={{padding:"6px 10px",borderRadius:6,border:"1px solid #E0E0E0",fontSize:12}}/>
      {rTab==="readings"&&rGenOpts.length>1&&<select value={rGen} onChange={e=>setRGen(e.target.value)} style={{padding:"6px 10px",borderRadius:6,border:"1px solid #E0E0E0",fontSize:12}}><option value="">All generators</option>{rGenOpts.map(g=>(<option key={g.id} value={g.id}>{g.name}</option>))}</select>}
    </div>
    <div style={{display:"flex",gap:6,marginBottom:14}}>{[{k:"readings",l:"Diesel Readings"},{k:"supply",l:"Diesel Supply"}].map(t=>(<button key={t.k} onClick={()=>setRTab(t.k)} style={{padding:"7px 18px",borderRadius:8,border:rTab===t.k?"1.5px solid "+P:"1.5px solid #E0E0E0",background:rTab===t.k?"#D0E2FF":"#fff",color:rTab===t.k?P:"#525252",fontSize:12,fontWeight:600,cursor:"pointer"}}>{t.l}</button>))}</div>
    <div style={{display:"grid",gridTemplateColumns:isMob()?"1fr 1fr":"repeat(3,1fr)",gap:12,marginBottom:16}}>
      {rTab==="readings"?<><Kpi icon={Fuel} label="Consumed" value={rTotalConsumed.toFixed(1)+" L"} sub={rReadings.length+" readings"}/><Kpi icon={Clock} label="Hours Run" value={rTotalHrs.toFixed(1)+" h"} sub="Total"/><Kpi icon={Gauge} label="Avg L/hr" value={rTotalHrs>0?(rTotalConsumed/rTotalHrs).toFixed(2):"-"} sub="Efficiency"/></>
      :<><Kpi icon={Send} label="Received" value={rTotalReceived.toFixed(1)+" L"} sub={rDists.length+" deliveries"}/><Kpi icon={Package} label="Net Stock Change" value={(rReadings.reduce((s,r)=>s+(r.dieselAdded||0),0)-rTotalConsumed).toFixed(1)+" L"} sub="Added − consumed in period"/></>}
    </div>
    <div style={{display:"flex",gap:8,marginBottom:16}}>
      <button onClick={()=>exportCSV(rTab)} style={{display:"flex",alignItems:"center",gap:5,padding:"8px 16px",borderRadius:8,border:"1.5px solid #24A148",background:"#E8F5E9",color:"#24A148",fontSize:12,fontWeight:600,cursor:"pointer"}}><FileDown size={14}/>Export CSV</button>
      <button onClick={()=>exportPDF(rTab)} style={{display:"flex",alignItems:"center",gap:5,padding:"8px 16px",borderRadius:8,border:"1.5px solid #DA1E28",background:"#FFF1F1",color:"#DA1E28",fontSize:12,fontWeight:600,cursor:"pointer"}}><FileDown size={14}/>Export PDF</button>
    </div>
    <div style={{background:"#fff",borderRadius:14,border:"1px solid #E8ECF1",overflow:"auto"}}>
      {rTab==="readings"?(<>
        {rReadings.length===0?<div style={{padding:30,textAlign:"center",color:"#8D8D8D",fontSize:13}}>No readings in this period</div>
        :<table style={{width:"100%",borderCollapse:"collapse",minWidth:880}}><thead><tr style={{background:"#F4F4F4"}}>{["Date","Generator","Open Hrs","Close Hrs","Hours Run","Diesel Level (L)","Added (L)","Consumed (L)","Rate (L/hr)","NEPA Open","NEPA Close","Flag"].map(h=>(<th key={h} style={{...th,whiteSpace:"nowrap"}}>{h}</th>))}</tr></thead>
        <tbody>{rReadings.map(r=>{const g=generators.find(x=>x.id===r.generatorId);return(<tr key={r.id}><td style={{...tc,whiteSpace:"nowrap"}}>{r.date}</td><td style={{...tc,fontWeight:600}}>{g?.name||r.generatorId}</td><td style={tc}>{r.genHoursOpening!=null?r.genHoursOpening.toLocaleString():"-"}</td><td style={tc}>{r.genHoursClosing!=null?r.genHoursClosing.toLocaleString():"-"}</td><td style={{...tc,fontWeight:600}}>{r.hoursRun?r.hoursRun.toFixed(1):"-"}</td><td style={tc}>{r.dieselLevelActual!=null?r.dieselLevelActual.toLocaleString():"-"}</td><td style={tc}>{r.dieselAdded?r.dieselAdded.toLocaleString():"-"}</td><td style={tc}>{r.consumptionLitres!=null?r.consumptionLitres.toLocaleString():"-"}</td><td style={tc}>{r.consumptionRate!=null?r.consumptionRate.toFixed(2):"-"}</td><td style={tc}>{r.nepaMeterOpening!=null?r.nepaMeterOpening.toLocaleString():"-"}</td><td style={tc}>{r.nepaMeterClosing!=null?r.nepaMeterClosing.toLocaleString():"-"}</td><td style={tc}>{r.discrepancyFlag?<span style={{color:"#DA1E28",fontWeight:700}}>!</span>:"-"}</td></tr>);})}</tbody></table>}
      </>):(<>
        {rDists.length===0?<div style={{padding:30,textAlign:"center",color:"#8D8D8D",fontSize:13}}>No deliveries in this period</div>
        :<table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr style={{background:"#F4F4F4"}}>{["Date","Litres","Supplier","Notes","Status"].map(h=>(<th key={h} style={th}>{h}</th>))}</tr></thead>
        <tbody>{rDists.map(d=>{const p=(dieselPurchases||[]).find(x=>x.id===d.purchaseId);return(<tr key={d.id}><td style={tc}>{d.date}</td><td style={{...tc,fontWeight:700,color:P}}>{d.litres.toLocaleString()} L</td><td style={tc}>{p?.supplier||"\u2014"}</td><td style={tc}>{d.notes||"\u2014"}</td><td style={tc}><Badge label={d.confirmed?"Confirmed":"Pending"}/></td></tr>);})}</tbody></table>}
      </>)}
    </div>
  </div>);}

  // Recent deliveries the store hasn't accepted yet \u2014 surfaced as a top-of-page
  // alert so staff know diesel arrived (independent of the tab/date filter).
  // Scoped to the last 30 days so old un-accepted imports don't spam the banner.
  const acceptDelivery=async(d)=>{
    try{
      const row=await db.updateDieselDistribution(d.id,{received_confirmed:true,received_date:new Date().toISOString().split("T")[0],received_by:user?.uid});
      setDieselDistributions(prev=>prev.map(x=>x.id===d.id?toDD(row):x));
      await applyAcceptToReading(d,dieselReadings,setDieselReadings,generators);
    }catch(e){alert("Error: "+e.message);}
  };
  const acceptAll=async(list)=>{for(const d of list){await acceptDelivery(d);}};
  const _pendCut=new Date(Date.now()-30*864e5).toISOString().split("T")[0];
  const pendingRecent=(dieselDistributions||[]).filter(d=>(myStore?d.storeLoc===myStore:true)&&!d.confirmed&&d.date>=_pendCut).sort((a,b)=>b.date.localeCompare(a.date));

  return(<div>
    {pendingRecent.length>0&&(
      <div style={{marginBottom:16,border:"1px solid #A6C8FF",borderRadius:12,background:"#EDF5FF",overflow:"hidden"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,padding:"12px 16px",flexWrap:"wrap"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <Send size={18} color={P}/>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:"#0043CE"}}>{pendingRecent.length} diesel deliver{pendingRecent.length>1?"ies":"y"} to confirm</div>
              <div style={{fontSize:11,color:"#525252"}}>{pendingRecent.reduce((s,d)=>s+(d.litres||0),0).toLocaleString()} L delivered to your store \u2014 tap Accept to add it to that day's reading.</div>
            </div>
          </div>
          {pendingRecent.length>1&&<button onClick={()=>acceptAll(pendingRecent)} style={{padding:"7px 14px",borderRadius:8,border:"none",background:P,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>Accept all</button>}
        </div>
        <div>{pendingRecent.slice(0,6).map(d=>{const p=(dieselPurchases||[]).find(x=>x.id===d.purchaseId);return(
          <div key={d.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,padding:"9px 16px",borderTop:"1px solid #D0E2FF"}}>
            <div style={{minWidth:0}}>
              <div style={{fontSize:13,fontWeight:700,color:P}}>{d.litres.toLocaleString()} L <span style={{fontWeight:500,color:"#8D8D8D",fontSize:11}}>\u00b7 {d.date}</span></div>
              <div style={{fontSize:10,color:"#8D8D8D",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p?p.supplier:"Admin delivery"}{d.notes?" \u2014 "+d.notes:""}</div>
            </div>
            <button onClick={()=>acceptDelivery(d)} style={{padding:"6px 14px",borderRadius:7,border:"none",background:"#24A148",color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>Accept</button>
          </div>);})}
          {pendingRecent.length>6&&<div style={{padding:"8px 16px",borderTop:"1px solid #D0E2FF",fontSize:11,color:"#525252"}}>+{pendingRecent.length-6} more in the Supply tab below</div>}
        </div>
      </div>
    )}
    <div style={{marginBottom:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
        <div><h3 style={{fontSize:18,fontWeight:700,margin:"0 0 4px"}}>{myStore?myStore+" \u2014 ":""}Dashboard</h3><div style={{fontSize:12,color:"#8D8D8D"}}>Supply, consumption & history</div></div>
        <button onClick={()=>setShowReports(true)} style={{display:"flex",alignItems:"center",gap:5,padding:"8px 16px",borderRadius:8,border:"1.5px solid "+P,background:"#D0E2FF",color:P,fontSize:12,fontWeight:600,cursor:"pointer"}}><FileDown size={14}/>Reports & Export</button>
      </div>
    </div>
    {/* Date filter bar */}
    <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
      {[{k:"7d",l:"7 Days"},{k:"30d",l:"30 Days"},{k:"month",l:"This Month"},{k:"prev",l:"Last Month"},{k:"year",l:"This Year"},{k:"prevyear",l:"Last Year"}].map(q=>(<button key={q.k} onClick={()=>applyQuick(q.k)} style={{padding:"6px 14px",borderRadius:7,border:quickFilter===q.k?"1.5px solid "+P:"1.5px solid #E0E0E0",background:quickFilter===q.k?"#D0E2FF":"#fff",color:quickFilter===q.k?P:"#525252",fontSize:11,fontWeight:600,cursor:"pointer"}}>{q.l}</button>))}
      <div style={{display:"flex",alignItems:"center",gap:4,marginLeft:4}}><Calendar size={13} color="#8D8D8D"/><input type="date" value={dFrom} onChange={e=>{setDFrom(e.target.value);setQuickFilter("");}} style={{padding:"5px 8px",borderRadius:6,border:"1px solid #E0E0E0",fontSize:11}}/><span style={{fontSize:11,color:"#8D8D8D"}}>to</span><input type="date" value={dTo} onChange={e=>{setDTo(e.target.value);setQuickFilter("");}} style={{padding:"5px 8px",borderRadius:6,border:"1px solid #E0E0E0",fontSize:11}}/></div>
    </div>
    {/* Tab switcher */}
    <div style={{display:"flex",gap:6,marginBottom:16}}>{[{k:"supply",l:"Supply"},{k:"history",l:"History"},{k:"generators",l:"Generators"}].map(t=>(<button key={t.k} onClick={()=>setDashTab(t.k)} style={{padding:"7px 18px",borderRadius:8,border:dashTab===t.k?"1.5px solid "+P:"1.5px solid #E0E0E0",background:dashTab===t.k?"#D0E2FF":"#fff",color:dashTab===t.k?P:"#525252",fontSize:12,fontWeight:600,cursor:"pointer"}}>{t.l}</button>))}</div>
    {/* KPI Cards */}
    <div style={{display:"grid",gridTemplateColumns:isMob()?"1fr 1fr":"repeat(4,1fr)",gap:12,marginBottom:18}}>
      <Kpi icon={Send} label="Received" value={totalReceived.toLocaleString()+" L"} sub={myDists.length+" deliveries"}/>
      <Kpi icon={Fuel} label="Consumed" value={totalConsumed.toLocaleString()+" L"} sub={myReadings.length+" readings"}/>
      <Kpi icon={Clock} label="Hours Run" value={totalHoursRun.toFixed(1)+" h"} sub={genBreakdown.length+" generators"}/>
      <Kpi icon={Package} label="Diesel in Tank" value={tankTotal.toLocaleString()+" L"} sub={tankAsOf?"Latest reading "+tankAsOf:"No level recorded yet"}/>
    </div>
    {/* Daily consumption chart */}
    {chartData.length>1&&<div style={{background:"#fff",borderRadius:14,border:"1px solid #E8ECF1",padding:18,marginBottom:16}}>
      <h4 style={{fontSize:14,fontWeight:700,margin:"0 0 12px",display:"flex",alignItems:"center",gap:6}}><BarChart3 size={16} color={P}/>Daily Consumption</h4>
      <ResponsiveContainer width="100%" height={200}><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="#F4F4F4"/><XAxis dataKey="date" tick={{fontSize:10}} stroke="#8D8D8D"/><YAxis tick={{fontSize:10}} stroke="#8D8D8D"/><Tooltip contentStyle={{borderRadius:8,fontSize:12}}/><Bar dataKey="consumed" name="Litres" fill={P} radius={[4,4,0,0]}/></BarChart></ResponsiveContainer>
    </div>}
    {/* Supply Tab */}
    {dashTab==="supply"&&(<div style={{background:"#fff",borderRadius:14,border:"1px solid #E8ECF1",overflow:"hidden"}}>
      <div style={{padding:"16px 20px",borderBottom:"1px solid #E8ECF1"}}><h4 style={{fontSize:14,fontWeight:700,margin:0}}>Diesel Received</h4></div>
      {myDists.length===0?<div style={{padding:30,textAlign:"center",color:"#8D8D8D",fontSize:13}}>No deliveries in this period</div>
      :<table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr style={{background:"#F4F4F4"}}>{["Date","Litres","Source","Notes","Status",""].map(h=>(<th key={h} style={th}>{h}</th>))}</tr></thead><tbody>{myDists.map(d=>{const p=(dieselPurchases||[]).find(x=>x.id===d.purchaseId);return(<tr key={d.id}><td style={tc}>{d.date}</td><td style={{...tc,fontWeight:700,color:P}}>{d.litres.toLocaleString()} L</td><td style={tc}>{p?p.supplier:"\u2014"}</td><td style={tc}>{d.notes||"\u2014"}</td><td style={tc}><Badge label={d.confirmed?"Confirmed":"Pending"}/></td><td style={tc}>{!d.confirmed&&<button onClick={()=>acceptDelivery(d)} style={{padding:"5px 12px",borderRadius:6,border:"none",background:"#24A148",color:"#fff",fontSize:11,fontWeight:600,cursor:"pointer"}}>Accept Delivery</button>}</td></tr>);})}</tbody></table>}
    </div>)}
    {/* History Tab */}
    {dashTab==="history"&&(<div style={{background:"#fff",borderRadius:14,border:"1px solid #E8ECF1",overflow:"hidden"}}>
      <div style={{padding:"16px 20px",borderBottom:"1px solid #E8ECF1"}}><h4 style={{fontSize:14,fontWeight:700,margin:0}}>Reading History</h4></div>
      {myReadings.length===0?<div style={{padding:30,textAlign:"center",color:"#8D8D8D",fontSize:13}}>No readings in this period</div>
      :<table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr style={{background:"#F4F4F4"}}>{["Date","Generator","Hours Run","Diesel Level","Consumed","NEPA","Source","Flag"].map(h=>(<th key={h} style={th}>{h}</th>))}</tr></thead>
      <tbody>{myReadings.sort((a,b)=>b.date.localeCompare(a.date)).map(r=>{const g=generators.find(x=>x.id===r.generatorId);return(<tr key={r.id}><td style={tc}>{r.date}</td><td style={{...tc,fontWeight:600}}>{g?.name||r.generatorId}</td><td style={tc}>{r.hoursRun?r.hoursRun.toFixed(1)+"h":"-"}</td><td style={tc}>{r.dieselLevelActual!=null?r.dieselLevelActual+"L":"-"}</td><td style={tc}>{r.consumptionLitres?r.consumptionLitres.toFixed(1)+"L":"-"}</td><td style={tc}>{r.nepaHours?r.nepaHours+"h":"-"}</td><td style={tc}><span style={{fontSize:11,padding:"2px 8px",borderRadius:4,background:r.genSource==="photo"?"#D0E2FF":"#F4F4F4",color:r.genSource==="photo"?P:"#525252",fontWeight:600}}>{r.genSource==="photo"?"Photo":"Manual"}</span></td><td style={tc}>{r.discrepancyFlag?<span style={{color:"#DA1E28",fontWeight:700}}>!</span>:"-"}</td></tr>);})}</tbody></table>}
    </div>)}
    {/* Generators Tab */}
    {dashTab==="generators"&&(<div style={{background:"#fff",borderRadius:14,border:"1px solid #E8ECF1",overflow:"hidden"}}>
      <div style={{padding:"16px 20px",borderBottom:"1px solid #E8ECF1"}}><h4 style={{fontSize:14,fontWeight:700,margin:0}}>Per-Generator Breakdown</h4></div>
      {genBreakdown.length===0?<div style={{padding:30,textAlign:"center",color:"#8D8D8D",fontSize:13}}>No generator data in this period</div>
      :<table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr style={{background:"#F4F4F4"}}>{["Generator","Hours Run","Consumed (L)","Avg L/hr","Readings"].map(h=>(<th key={h} style={th}>{h}</th>))}</tr></thead>
      <tbody>{genBreakdown.map(g=>(<tr key={g.id}><td style={{...tc,fontWeight:600}}>{g.name}</td><td style={tc}>{g.hrs.toFixed(1)} h</td><td style={{...tc,fontWeight:600,color:P}}>{g.consumed.toFixed(1)} L</td><td style={tc}>{g.rate.toFixed(2)} L/hr</td><td style={tc}>{g.readings}</td></tr>))}</tbody></table>}
    </div>)}
  </div>);
}

const NAV=[
  {id:"dashboard",path:"/",label:"Dashboard",icon:Home,group:"Overview"},
  {id:"staff-dashboard",path:"/staff-dashboard",label:"My Dashboard",icon:BarChart3,group:"Overview"},
  {id:"diesel",path:"/diesel",label:"Diesel Log",icon:Droplet,group:"Diesel"},
  {id:"diesel-mgmt",path:"/diesel-mgmt",label:"Diesel Management",icon:Package,group:"Diesel"},
  {id:"vehicles",path:"/vehicles",label:"Vehicles",icon:Truck,group:"Fleet"},
  {id:"generators",path:"/generators",label:"Generators",icon:Zap,group:"Fleet"},
  {id:"drivers",path:"/drivers",label:"Drivers",icon:Users,group:"Fleet"},
  {id:"live-map",path:"/live-map",label:"Live Map",icon:MapPin,group:"Fleet"},
  {id:"fuel",path:"/fuel",label:"Fuel & Energy",icon:Fuel,group:"Operations"},
  {id:"workorders",path:"/workorders",label:"Work Orders",icon:FileText,group:"Operations"},
  {id:"papers",path:"/papers",label:"Vehicle Papers",icon:FileCheck,group:"Operations"},
  {id:"service",path:"/service",label:"Service Reminders",icon:Bell,group:"Operations"},
  {id:"inspections",path:"/inspections",label:"Inspections",icon:CheckCircle,group:"Operations"},
  {id:"vendors",path:"/vendors",label:"Vendors",icon:Briefcase,group:"Operations"},
  {id:"reports",path:"/reports",label:"Reports",icon:BarChart3,group:"Admin"},
  {id:"settings",path:"/settings",label:"Settings",icon:Settings,group:"Admin"},
];
// ============================================
// DIESEL MANAGEMENT PAGE - Admin Purchase & Distribution (Phase 2)
// ============================================
function DieselMgmtPage({dieselPurchases:_dp,setDieselPurchases,dieselDistributions:_dd,setDieselDistributions,locations:_locs,vendors,user,dieselReadings:_dr,generators:_gens,genBaselines:_gb,setGenBaselines,dieselTransfers:_dt,setDieselTransfers,vehicles}){
  // Store-staff scope: filter everything to their own store. Admin/Fleet Manager see all.
  const isStaff=user?.role==="Store Staff";
  const scopeStore=isStaff?(user?.store_location||""):null;
  const generators=scopeStore?(_gens||[]).filter(g=>g.loc===scopeStore):_gens;
  const dieselReadings=scopeStore?_dr.filter(r=>r.storeLoc===scopeStore):_dr;
  const dieselDistributions=scopeStore?(_dd||[]).filter(d=>d.storeLoc===scopeStore):_dd;
  const dieselTransfers=scopeStore?(_dt||[]).filter(t=>t.storeLoc===scopeStore):(_dt||[]);
  const genBaselines=scopeStore?(_gb||[]).filter(b=>(generators||[]).some(g=>g.id===b.generator_id)):_gb;
  const dieselPurchases=scopeStore?[]:_dp;   // staff don't see admin purchases
  const locations=scopeStore?[scopeStore]:_locs;
  const [tab,setTab]=useState(scopeStore?"readings":"overview");
  const [showAddPurchase,setShowAddPurchase]=useState(false);
  const [showDistribute,setShowDistribute]=useState(false);
  const [distPurchaseId,setDistPurchaseId]=useState(null);
  const [saving,setSaving]=useState(false);
  const [msg,setMsg]=useState("");
  const today=new Date().toISOString().split("T")[0];
  const [pf,setPf]=useState({date:today,supplier:"",litres:"",litresReceived:"",pricePerL:"",notes:""});
  const [df,setDf]=useState({date:today,storeLoc:"",litres:"",notes:""});
  const [editDist,setEditDist]=useState(null);
  const [editPurchase,setEditPurchase]=useState(null);
  const [showReconcile,setShowReconcile]=useState(false);
  const [reconcileForm,setReconcileForm]=useState({date:today,count:""});
  const handleReconcile=async()=>{
    const count=parseFloat(reconcileForm.count);
    if(isNaN(count)||count<0){setMsg("Error: enter the physical count in litres.");return;}
    setSaving(true);setMsg("");
    try{
      // adjustment so that (existing stock) + adj = physical count
      const curStock=stockInHand;
      const adj=count-curStock;
      const row=await db.addDieselPurchase({date:reconcileForm.date,supplier:"STOCK RECONCILIATION",litres:adj,litres_received:adj,price_per_litre:0,notes:`Physical stock take: ${count.toLocaleString()} L on ${reconcileForm.date} (adjustment ${adj>=0?"+":""}${adj.toLocaleString()} L)`,purchased_by:user.uid});
      setDieselPurchases([toDP(row),...dieselPurchases]);
      setShowReconcile(false);setReconcileForm({date:today,count:""});
      setMsg(`Stock reconciled to ${count.toLocaleString()} L.`);setTimeout(()=>setMsg(""),4000);
    }catch(e){setMsg("Error: "+e.message);}
    setSaving(false);
  };
  const handleEditPurchase=async()=>{
    if(!editPurchase)return;setSaving(true);setMsg("");
    try{
      const row=await db.updateDieselPurchase(editPurchase.id,{date:editPurchase.date,supplier:editPurchase.supplier,litres:parseFloat(editPurchase.litres)||0,litres_received:editPurchase.litresReceived!==""&&editPurchase.litresReceived!=null?parseFloat(editPurchase.litresReceived):null,price_per_litre:parseFloat(editPurchase.pricePerL)||0});
      setDieselPurchases(dieselPurchases.map(p=>p.id===editPurchase.id?toDP(row):p));
      setEditPurchase(null);setMsg("Purchase updated!");setTimeout(()=>setMsg(""),3000);
    }catch(e){setMsg("Error: "+e.message);}
    setSaving(false);
  };
  // Readings tab filters
  const [rdStore,setRdStore]=useState("");
  const [rdGen,setRdGen]=useState("");
  const [rdFrom,setRdFrom]=useState("");
  const [rdTo,setRdTo]=useState("");
  const [rdPage,setRdPage]=useState(0);
  const [rdPageSize,setRdPageSize]=useState(25);
  const [wtStore,setWtStore]=useState(null); // Watchtower drill-down store
  const [cmpMonth,setCmpMonth]=useState(()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;}); // Compliance calendar month
  // Paid = invoice quantity (drives cost). Received = actual litres that came
  // out of the tanker (drives physical stock). Excess = received - paid (free).
  // Reconciliation rows (supplier marker) are opening-balance adjustments from
  // a physical stock take — they move stock but are NOT real purchases.
  const ADJ_SUPPLIER="STOCK RECONCILIATION";
  const isAdj=(p)=>(p.supplier||"")===ADJ_SUPPLIER;
  const receivedOf=(p)=>p.litresReceived!=null?p.litresReceived:p.litres;
  const realPurchases=dieselPurchases.filter(p=>!isAdj(p));
  const totalPurchased=realPurchases.reduce((s,p)=>s+p.litres,0);   // paid (real tankers only)
  const totalReceivedReal=realPurchases.reduce((s,p)=>s+receivedOf(p),0);
  const adjTotal=dieselPurchases.filter(isAdj).reduce((s,p)=>s+receivedOf(p),0);
  const totalSpent=realPurchases.reduce((s,p)=>s+(p.litres*(p.pricePerL||0)),0);
  const totalDistributed=dieselDistributions.reduce((s,d)=>s+d.litres,0);
  const totalExcess=totalReceivedReal-totalPurchased;          // free diesel gained (real tankers)
  const stockInHand=totalReceivedReal+adjTotal-totalDistributed;  // physical balance incl. reconciliation
  const excessPct=totalPurchased>0&&stockInHand<0?Math.abs(stockInHand)/totalPurchased*100:0;
  const pricedLitres=realPurchases.filter(p=>(p.pricePerL||0)>0).reduce((s,p)=>s+p.litres,0);
  const avgPrice=pricedLitres>0?(totalSpent/pricedLitres):0;
  const purchaseDistributed=(pid)=>dieselDistributions.filter(d=>d.purchaseId===pid).reduce((s,d)=>s+d.litres,0);
  const purchaseRemaining=(p)=>receivedOf(p)-purchaseDistributed(p.id);  // physical capacity = received
  const storeStats=locations.map(loc=>{
    const dist=dieselDistributions.filter(d=>d.storeLoc===loc);
    const readings=dieselReadings.filter(r=>r.storeLoc===loc);
    const received=dist.reduce((s,d)=>s+d.litres,0);
    const consumed=readings.reduce((s,r)=>s+(r.consumptionLitres||0),0);
    return{loc,received,consumed,balance:received-consumed,distCount:dist.length};
  }).filter(s=>s.received>0||s.consumed>0).sort((a,b)=>b.received-a.received);
  const handleAddPurchase=async()=>{
    if(!pf.supplier||!pf.litres||!pf.pricePerL){setMsg("Error: Fill in supplier, litres, and price per litre.");return;}
    setSaving(true);setMsg("");
    try{
      const row=await db.addDieselPurchase(fromDP({date:pf.date,supplier:pf.supplier,litres:parseFloat(pf.litres),litresReceived:pf.litresReceived!==""&&pf.litresReceived!=null?parseFloat(pf.litresReceived):null,pricePerL:parseFloat(pf.pricePerL),notes:pf.notes,purchasedBy:user.uid}));
      setDieselPurchases([toDP(row),...dieselPurchases]);
      setShowAddPurchase(false);setPf({date:today,supplier:"",litres:"",litresReceived:"",pricePerL:"",notes:""});
      setMsg("Purchase recorded!");setTimeout(()=>setMsg(""),3000);
    }catch(e){setMsg("Error: "+e.message);}setSaving(false);
  };
  const handleDistribute=async()=>{
    if(!df.storeLoc||!df.litres){setMsg("Error: Select a store and enter litres.");return;}
    const litres=parseFloat(df.litres);
    if(distPurchaseId){const p=dieselPurchases.find(x=>x.id===distPurchaseId);if(p&&litres>purchaseRemaining(p)){setMsg("Error: Only "+purchaseRemaining(p).toLocaleString()+" L remaining from this purchase.");return;}}
    setSaving(true);setMsg("");
    try{
      const row=await db.addDieselDistribution(fromDD2({purchaseId:distPurchaseId,date:df.date,storeLoc:df.storeLoc,litres,notes:df.notes,distributedBy:user.uid}));
      setDieselDistributions([toDD(row),...dieselDistributions]);
      setShowDistribute(false);setDf({date:today,storeLoc:"",litres:"",notes:""});setDistPurchaseId(null);
      setMsg("Distribution recorded!");setTimeout(()=>setMsg(""),3000);
    }catch(e){setMsg("Error: "+e.message);}setSaving(false);
  };
  const handleDeletePurchase=async(id)=>{
    if(dieselDistributions.some(d=>d.purchaseId===id)){alert("Cannot delete — this purchase has distributions.");return;}
    if(!confirm("Delete this purchase?"))return;
    try{await db.deleteDieselPurchase(id);setDieselPurchases(dieselPurchases.filter(p=>p.id!==id));}catch(e){alert("Error: "+e.message);}
  };
  const handleDeleteDistribution=async(id)=>{
    if(!confirm("Delete this distribution?"))return;
    try{await db.deleteDieselDistribution(id);setDieselDistributions(dieselDistributions.filter(d=>d.id!==id));}catch(e){alert("Error: "+e.message);}
  };
  const handleEditDistribution=async()=>{
    if(!editDist)return;setSaving(true);setMsg("");
    try{const row=await db.updateDieselDistribution(editDist.id,{date:editDist.date,store_location:editDist.storeLoc,litres:parseFloat(editDist.litres),notes:editDist.notes||""});
    setDieselDistributions(dieselDistributions.map(d=>d.id===editDist.id?toDD(row):d));setEditDist(null);setMsg("Distribution updated!");setTimeout(()=>setMsg(""),3000);
    }catch(e){setMsg("Error: "+e.message);}setSaving(false);
  };
  const tabs=scopeStore?["readings","compliance","transfers","distributions","stores","baselines","discrepancies"]:["overview","watchtower","readings","compliance","transfers","purchases","distributions","stores","baselines","discrepancies"];
  // Staff KPI values (their store only)
  const staffReceived=dieselDistributions.reduce((s,d)=>s+(d.litres||0),0);
  const staffConsumed=dieselReadings.reduce((s,r)=>s+(r.consumptionLitres||0),0);
  // Diesel in Tank = latest recorded level per asset, summed. This is the
  // store's real balance — a received-minus-consumed ledger misleads for
  // locally-buying stores (their purchases aren't admin distributions).
  const staffTankRows=(()=>{const byGen={};dieselReadings.forEach(r=>{if(r.dieselLevelActual!=null&&(!byGen[r.generatorId]||r.date>byGen[r.generatorId].date))byGen[r.generatorId]=r;});return Object.values(byGen);})();
  const staffTank=staffTankRows.reduce((s,r)=>s+r.dieselLevelActual,0);
  const staffTankAsOf=staffTankRows.length?staffTankRows.map(r=>r.date).sort().slice(-1)[0]:null;
  return(<div style={{maxWidth:1000}}>
    {msg&&<div style={{marginBottom:14,padding:"10px 16px",borderRadius:10,background:msg.startsWith("Error")?"#DA1E2818":"#24A14818",color:msg.startsWith("Error")?"#DA1E28":"#24A148",fontSize:13,fontWeight:500}}>{msg}</div>}
    {scopeStore&&<div style={{marginBottom:14,fontSize:13,color:"#525252"}}><span style={{fontWeight:700}}>{scopeStore}</span> \u2014 diesel supply, generators & readings for your store.</div>}
    <div style={{display:"grid",gridTemplateColumns:isMob()?"1fr 1fr":"repeat(4,1fr)",gap:12,marginBottom:20}}>
      {scopeStore?<>
        <Kpi icon={Send} label="Diesel Received" value={staffReceived.toLocaleString()+" L"} sub={dieselDistributions.length+" deliveries"}/>
        <Kpi icon={Fuel} label="Consumed" value={staffConsumed.toLocaleString()+" L"} sub={dieselReadings.length+" readings"}/>
        <Kpi icon={Package} label="Diesel in Tank" value={staffTank.toLocaleString()+" L"} sub={staffTankAsOf?"Latest reading "+staffTankAsOf:"No level recorded yet"}/>
        <Kpi icon={Zap} label="Generators" value={(generators||[]).length}/>
      </>:<>
        <Kpi icon={ShoppingCart} label="Total Purchased" value={totalPurchased.toLocaleString()+" L"} sub={"\u20A6"+totalSpent.toLocaleString()+(totalExcess>0?`  \u00B7  +${totalExcess.toLocaleString()} L excess`:"")}/>
        <Kpi icon={Send} label="Total Distributed" value={totalDistributed.toLocaleString()+" L"} sub={"to "+new Set(dieselDistributions.map(d=>d.storeLoc)).size+" stores"}/>
        <Kpi icon={Package} label="Stock in Hand" value={stockInHand.toLocaleString()+" L"} sub={stockInHand>=0?(totalExcess>0?`+${totalExcess.toLocaleString()} L excess gained`:"Received − distributed"):excessPct<=3?"Within normal variance":`Review: ${excessPct.toFixed(1)}% short — check records`} accent={stockInHand>=0?undefined:excessPct<=3?undefined:"#FF832B"}/>
        <Kpi icon={DollarSign} label="Avg Price/Litre" value={avgPrice?fmt(Math.round(avgPrice)):"-"} sub={dieselPurchases.length+" purchases"}/>
      </>}
    </div>
    <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
      {tabs.map(t=>(<button key={t} onClick={()=>setTab(t)} style={{padding:"8px 18px",borderRadius:8,border:tab===t?"1.5px solid "+P:"1.5px solid #E0E0E0",background:tab===t?"#D0E2FF":"#fff",color:tab===t?P:"#525252",fontSize:12,fontWeight:600,cursor:"pointer",textTransform:"capitalize"}}>{t}</button>))}
      <div style={{flex:1}}/>
      {!scopeStore&&<><button onClick={()=>setShowAddPurchase(true)} style={{display:"flex",alignItems:"center",gap:5,padding:"8px 16px",borderRadius:9,background:P,color:"#fff",border:"none",fontSize:12,fontWeight:600,cursor:"pointer"}}><Plus size={14}/>Log Purchase</button>
      <button onClick={()=>{setDistPurchaseId(null);setShowDistribute(true);}} style={{display:"flex",alignItems:"center",gap:5,padding:"8px 16px",borderRadius:9,border:"1.5px solid "+P,background:"#D0E2FF",color:P,fontSize:12,fontWeight:600,cursor:"pointer"}}><Send size={14}/>Distribute</button>
      {user?.role==="Super Admin"&&<button onClick={()=>{setReconcileForm({date:today,count:""});setShowReconcile(true);}} style={{display:"flex",alignItems:"center",gap:5,padding:"8px 16px",borderRadius:9,border:"1.5px solid #FF832B",background:"#FFF4EC",color:"#FF832B",fontSize:12,fontWeight:600,cursor:"pointer"}}><Package size={14}/>Reconcile Stock</button>}</>}
    </div>
    {tab==="overview"&&(<div style={{display:"grid",gridTemplateColumns:isMob()?"1fr":"1fr 1fr",gap:16}}>
      <div style={{background:"#fff",borderRadius:14,border:"1px solid #E8ECF1",padding:18}}>
        <h4 style={{fontSize:14,fontWeight:700,marginBottom:12,display:"flex",alignItems:"center",gap:6}}><ShoppingCart size={16} color={P}/>Recent Purchases</h4>
        {dieselPurchases.length===0?<div style={{padding:20,textAlign:"center",color:"#8D8D8D",fontSize:13}}>No purchases yet. Click "Log Purchase" to start.</div>
        :dieselPurchases.slice(0,5).map(p=>{const rem=purchaseRemaining(p);const pct=Math.round((1-rem/p.litres)*100);return(<div key={p.id} style={{padding:"10px 0",borderBottom:"1px solid #F4F4F4"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontSize:13,fontWeight:600}}>{p.supplier}</div><div style={{fontSize:11,color:"#8D8D8D"}}>{p.date} {p.litres.toLocaleString()} L {fmt(p.litres*p.pricePerL)}</div></div><div style={{textAlign:"right"}}><div style={{fontSize:12,fontWeight:600,color:rem>0?"#FF832B":"#24A148"}}>{rem>0?rem.toLocaleString()+" L left":"Fully distributed"}</div></div></div><div style={{height:4,borderRadius:2,background:"#E0E0E0",marginTop:6,overflow:"hidden"}}><div style={{height:"100%",borderRadius:2,background:pct>=100?"#24A148":P,width:Math.min(100,pct)+"%",transition:"width 0.3s"}}/></div></div>);})}
      </div>
      <div style={{background:"#fff",borderRadius:14,border:"1px solid #E8ECF1",padding:18}}>
        <h4 style={{fontSize:14,fontWeight:700,marginBottom:12,display:"flex",alignItems:"center",gap:6}}><Send size={16} color="#8A3FFC"/>Recent Distributions</h4>
        {dieselDistributions.length===0?<div style={{padding:20,textAlign:"center",color:"#8D8D8D",fontSize:13}}>No distributions yet.</div>
        :dieselDistributions.slice(0,8).map(d=>(<div key={d.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid #F4F4F4"}}><div><div style={{fontSize:13,fontWeight:600}}>{d.storeLoc}</div><div style={{fontSize:11,color:"#8D8D8D"}}>{d.date}{d.notes?" - "+d.notes:""}</div></div><div style={{fontSize:13,fontWeight:700,color:P}}>{d.litres.toLocaleString()} L</div></div>))}
      </div>
    </div>)}
    {tab==="watchtower"&&!scopeStore&&(()=>{
      const today30=new Date(Date.now()-30*864e5).toISOString().split("T")[0];
      const genName=(id)=>(generators||[]).find(g=>g.id===id)?.name||id;
      // Per-generator chronological walk: overnight gaps (level lost between yesterday's close and today's implied opening)
      const byGen={};dieselReadings.forEach(r=>{(byGen[r.generatorId]=byGen[r.generatorId]||[]).push(r);});
      // Transfers out per (generator, date) — moved diesel is accounted for, not "lost"
      const trMap={};(dieselTransfers||[]).forEach(t=>{if(t.sourceGenId)trMap[t.sourceGenId+"|"+t.date]=(trMap[t.sourceGenId+"|"+t.date]||0)+(t.litres||0);});
      const gapsByStore={};const gapEvents=[];
      Object.values(byGen).forEach(arr=>{
        arr.sort((a,b)=>a.date.localeCompare(b.date));
        let prev=null;
        arr.forEach(r=>{
          if(prev&&prev.dieselLevelActual!=null&&r.dieselLevelActual!=null&&r.consumptionLitres!=null){
            const impliedOpen=r.dieselLevelActual-(r.dieselAdded||0)+r.consumptionLitres+(trMap[r.generatorId+"|"+r.date]||0);
            const gap=prev.dieselLevelActual-impliedOpen;
            if(gap>5){const s=gapsByStore[r.storeLoc]=gapsByStore[r.storeLoc]||{count:0,litres:0};s.count++;s.litres+=gap;gapEvents.push({store:r.storeLoc,gen:r.generatorId,date:r.date,litres:gap});}
          }
          if(r.dieselLevelActual!=null)prev=r;
        });
      });
      // Per-store aggregation
      const stores={};
      dieselReadings.forEach(r=>{
        const s=stores[r.storeLoc]=stores[r.storeLoc]||{readings:0,flags:0,evaluated:0,round:0,consumed:0,added:0,rates:[],recent:0,recentPhoto:0};
        s.readings++;
        if(r.discrepancyLitres!=null)s.evaluated++;
        if(r.discrepancyFlag)s.flags++;
        if(r.consumptionLitres!=null&&r.consumptionLitres>0){s.consumed+=r.consumptionLitres;if(r.consumptionLitres%10===0)s.round++;}
        s.added+=(r.dieselAdded||0);
        if(r.hoursRun>0&&r.consumptionLitres>0)s.rates.push(r.consumptionLitres/r.hoursRun);
        if(r.date>=today30){s.recent++;if(r.genSource==="photo")s.recentPhoto++;}
      });
      (dieselDistributions||[]).forEach(d=>{const s=stores[d.storeLoc];if(s)s.sent=(s.sent||0)+(d.litres||0);});
      const scored=Object.entries(stores).map(([loc,s])=>{
        const flagRate=s.evaluated>0?s.flags/s.evaluated:0;
        const roundPct=s.consumed>0?s.round/Math.max(1,s.rates.length):0;
        const mean=s.rates.length?s.rates.reduce((a,b)=>a+b,0)/s.rates.length:0;
        const cv=s.rates.length>5&&mean>0?Math.sqrt(s.rates.reduce((a,b)=>a+(b-mean)**2,0)/s.rates.length)/mean:null;
        const sent=s.sent||0;const supplyGap=sent-s.added;const supplyGapPct=sent>0?supplyGap/sent:0;
        const gaps=gapsByStore[loc]||{count:0,litres:0};
        const photoRate=s.recent>0?s.recentPhoto/s.recent:null;
        // Risk components (transparent weights, cap 100)
        const cFlag=Math.min(30,Math.round(flagRate*60));
        const cSupply=sent>0?Math.min(25,Math.round(Math.max(0,supplyGapPct)*50)):0;
        const cPencil=Math.min(20,(cv!=null&&cv<0.05?12:0)+(roundPct>=0.7?8:roundPct>=0.5?4:0));
        const cGap=Math.min(15,gaps.count*3);
        const cPhoto=photoRate!=null?Math.round((1-photoRate)*10):0;
        const risk=Math.min(100,cFlag+cSupply+cPencil+cGap+cPhoto);
        return{loc,...s,flagRate,roundPct,cv,sent,supplyGap,gaps,photoRate,risk,parts:{cFlag,cSupply,cPencil,cGap,cPhoto}};
      }).sort((a,b)=>b.risk-a.risk);
      const riskColor=(r)=>r>=60?"#DA1E28":r>=30?"#FF832B":"#24A148";
      const riskLabel=(r)=>r>=60?"High":r>=30?"Medium":"Low";
      const sel=wtStore?scored.find(s=>s.loc===wtStore):null;
      const selEvents=sel?[
        ...dieselReadings.filter(r=>r.storeLoc===sel.loc&&r.discrepancyFlag).map(r=>({date:r.date,gen:genName(r.generatorId),type:"Discrepancy",detail:(r.discrepancyLitres>0?"+":"")+r.discrepancyLitres+" L vs expected"})),
        ...gapEvents.filter(g=>g.store===sel.loc).map(g=>({date:g.date,gen:genName(g.gen),type:"Overnight loss",detail:g.litres.toFixed(0)+" L missing before opening"})),
      ].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,15):[];
      const anyEvaluated=scored.some(s=>s.evaluated>0);
      return(<div>
        {!anyEvaluated&&<div style={{padding:"12px 16px",borderRadius:10,background:"#FFF8E1",border:"1px solid #FFE082",color:"#F57F17",fontSize:12,fontWeight:500,marginBottom:14,display:"flex",alignItems:"center",gap:8}}><AlertTriangle size={15}/>No readings have been evaluated against baselines yet. Run <code style={{background:"#fff",padding:"1px 6px",borderRadius:4}}>py scripts\backfill_discrepancy_flags.py --apply</code> to score the imported history.</div>}
        <div style={{display:"grid",gridTemplateColumns:isMob()?"1fr 1fr":"repeat(4,1fr)",gap:12,marginBottom:14}}>
          <Kpi icon={Shield} label="Stores Monitored" value={scored.length}/>
          <Kpi icon={AlertTriangle} label="High Risk" value={scored.filter(s=>s.risk>=60).length} accent="#DA1E28"/>
          <Kpi icon={TrendingDown} label="Supply Gap" value={scored.reduce((a,s)=>a+Math.max(0,s.supplyGap),0).toLocaleString()+" L"} sub="Sent but never tanked"/>
          <Kpi icon={Droplet} label="Overnight Losses" value={gapEvents.reduce((a,g)=>a+g.litres,0).toFixed(0)+" L"} sub={gapEvents.length+" events"}/>
        </div>
        <div style={{background:"#fff",borderRadius:14,border:"1px solid #E8ECF1",overflow:"hidden",marginBottom:14}}>
          <div style={{padding:"14px 20px",borderBottom:"1px solid #E8ECF1",display:"flex",justifyContent:"space-between",alignItems:"center"}}><h4 style={{fontSize:14,fontWeight:700,margin:0,display:"flex",alignItems:"center",gap:6}}><Shield size={16} color={P}/>Store Risk Ranking</h4><div style={{fontSize:11,color:"#8D8D8D"}}>Click a row for details</div></div>
          <div style={{overflow:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:860}}><thead><tr style={{background:"#F4F4F4"}}>{["Store","Risk","Flagged","Supply Sent","Tanked","Gap (L)","Overnight","Round #s","Rate CV","Photo %"].map(h=>(<th key={h} style={{...th,whiteSpace:"nowrap"}}>{h}</th>))}</tr></thead>
          <tbody>{scored.map(s=>(<tr key={s.loc} onClick={()=>setWtStore(wtStore===s.loc?null:s.loc)} style={{cursor:"pointer",background:wtStore===s.loc?"#F8FAFF":s.risk>=60?"#FFF8F8":"",borderBottom:"1px solid #F4F4F4"}}>
            <td style={{...tc,fontWeight:600}}>{s.loc}</td>
            <td style={tc}><span style={{padding:"3px 12px",borderRadius:10,fontSize:11,fontWeight:700,background:riskColor(s.risk)+"22",color:riskColor(s.risk)}}>{s.risk} {riskLabel(s.risk)}</span></td>
            <td style={tc}>{s.evaluated>0?s.flags+"/"+s.evaluated+" ("+Math.round(s.flagRate*100)+"%)":<span style={{color:"#8D8D8D"}}>not evaluated</span>}</td>
            <td style={tc}>{s.sent?s.sent.toLocaleString()+" L":"-"}</td>
            <td style={tc}>{s.added?s.added.toLocaleString()+" L":"-"}</td>
            <td style={{...tc,fontWeight:600,color:s.sent&&s.supplyGap>s.sent*0.1?"#DA1E28":"#161616"}}>{s.sent?(s.supplyGap>0?s.supplyGap.toLocaleString():"0"):"-"}</td>
            <td style={tc}>{s.gaps.count>0?<span style={{color:"#DA1E28",fontWeight:600}}>{s.gaps.count}x ({s.gaps.litres.toFixed(0)} L)</span>:"-"}</td>
            <td style={tc}>{s.rates.length?Math.round(s.roundPct*100)+"%":"-"}</td>
            <td style={tc}>{s.cv!=null?<span style={{color:s.cv<0.05?"#DA1E28":"#161616",fontWeight:s.cv<0.05?700:400}}>{s.cv.toFixed(2)}{s.cv<0.05?" too perfect":""}</span>:"-"}</td>
            <td style={tc}>{s.photoRate!=null?Math.round(s.photoRate*100)+"%":<span style={{color:"#8D8D8D"}}>no recent</span>}</td>
          </tr>))}</tbody></table></div>
        </div>
        {sel&&<div style={{background:"#fff",borderRadius:14,border:"1px solid #E8ECF1",overflow:"hidden"}}>
          <div style={{padding:"14px 20px",borderBottom:"1px solid #E8ECF1",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <h4 style={{fontSize:14,fontWeight:700,margin:0}}>{sel.loc} — risk breakdown</h4>
            <div style={{fontSize:11,color:"#8D8D8D"}}>Flags {sel.parts.cFlag}/30 · Supply {sel.parts.cSupply}/25 · Pencil-whip {sel.parts.cPencil}/20 · Overnight {sel.parts.cGap}/15 · No-photo {sel.parts.cPhoto}/10</div>
          </div>
          {selEvents.length===0?<div style={{padding:24,textAlign:"center",color:"#8D8D8D",fontSize:13}}>No individual suspicious events recorded for this store yet.</div>
          :<table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr style={{background:"#FFF1F1"}}>{["Date","Generator","Type","Detail"].map(h=>(<th key={h} style={{...th,color:"#DA1E28"}}>{h}</th>))}</tr></thead>
          <tbody>{selEvents.map((e,i)=>(<tr key={i} style={{borderBottom:"1px solid #F4F4F4"}}><td style={tc}>{e.date}</td><td style={tc}>{e.gen}</td><td style={{...tc,fontWeight:600,color:e.type==="Overnight loss"?"#DA1E28":"#FF832B"}}>{e.type}</td><td style={tc}>{e.detail}</td></tr>))}</tbody></table>}
        </div>}
      </div>);
    })()}
    {tab==="compliance"&&(()=>{
      const [cy,cm]=cmpMonth.split("-").map(Number);
      const daysInMonth=new Date(cy,cm,0).getDate();
      const todayStr=new Date().toISOString().split("T")[0];
      const byStore={};
      dieselReadings.forEach(r=>{const s=byStore[r.storeLoc]=byStore[r.storeLoc]||{dates:new Set(),first:r.date};s.dates.add(r.date);if(r.date<s.first)s.first=r.date;});
      const storesList=Object.keys(byStore).sort();
      const shift=(dir)=>{const d=new Date(cy,cm-1+dir,1);setCmpMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`);};
      const monthLabel=new Date(cy,cm-1,1).toLocaleDateString("en",{month:"long",year:"numeric"});
      const cellFor=(s,d)=>{
        const dateStr=`${cmpMonth}-${String(d).padStart(2,"0")}`;
        if(dateStr>todayStr||dateStr<s.first)return{bg:"#F4F4F4",t:""};         // future / before store started
        return s.dates.has(dateStr)?{bg:"#24A148",t:"Logged"}:{bg:"#FFB3B8",t:"Missed"};
      };
      const rows=storesList.map(loc=>{
        const s=byStore[loc];let logged=0,expected=0;
        for(let d=1;d<=daysInMonth;d++){const dateStr=`${cmpMonth}-${String(d).padStart(2,"0")}`;if(dateStr<=todayStr&&dateStr>=s.first){expected++;if(s.dates.has(dateStr))logged++;}}
        return{loc,s,logged,expected,pct:expected>0?logged/expected*100:null};
      });
      return(<div style={{background:"#fff",borderRadius:14,border:"1px solid #E8ECF1",overflow:"hidden"}}>
        <div style={{padding:"14px 20px",borderBottom:"1px solid #E8ECF1",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
          <h4 style={{fontSize:14,fontWeight:700,margin:0,display:"flex",alignItems:"center",gap:6}}><Calendar size={16} color={P}/>Daily Logging Compliance</h4>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <button onClick={()=>shift(-1)} style={{padding:"5px 10px",borderRadius:7,border:"1.5px solid #E0E0E0",background:"#fff",cursor:"pointer"}}><ChevronLeft size={14}/></button>
            <span style={{fontSize:13,fontWeight:700,minWidth:130,textAlign:"center"}}>{monthLabel}</span>
            <button onClick={()=>shift(1)} style={{padding:"5px 10px",borderRadius:7,border:"1.5px solid #E0E0E0",background:"#fff",cursor:"pointer"}}><ChevronRight size={14}/></button>
          </div>
          <div style={{display:"flex",gap:12,fontSize:11,color:"#525252"}}>
            <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,borderRadius:3,background:"#24A148",display:"inline-block"}}/>Logged</span>
            <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,borderRadius:3,background:"#FFB3B8",display:"inline-block"}}/>Missed</span>
            <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,borderRadius:3,background:"#F4F4F4",border:"1px solid #E0E0E0",display:"inline-block"}}/>N/A</span>
          </div>
        </div>
        {storesList.length===0?<div style={{padding:30,textAlign:"center",color:"#8D8D8D",fontSize:13}}>No diesel readings yet.</div>
        :<div style={{overflow:"auto",padding:"12px 16px"}}><table style={{borderCollapse:"separate",borderSpacing:2}}>
          <thead><tr><th style={{...th,padding:"4px 8px",textAlign:"left",position:"sticky",left:0,background:"#fff"}}>Store</th>{[...Array(daysInMonth)].map((_,i)=>(<th key={i} style={{fontSize:9,color:"#8D8D8D",fontWeight:600,padding:"0 1px",minWidth:18,textAlign:"center"}}>{i+1}</th>))}<th style={{...th,padding:"4px 8px"}}>%</th></tr></thead>
          <tbody>{rows.map(({loc,s,logged,expected,pct})=>(<tr key={loc}>
            <td style={{fontSize:12,fontWeight:600,padding:"3px 8px",whiteSpace:"nowrap",position:"sticky",left:0,background:"#fff"}}>{loc}</td>
            {[...Array(daysInMonth)].map((_,i)=>{const c=cellFor(s,i+1);return(<td key={i} title={`${cmpMonth}-${String(i+1).padStart(2,"0")}${c.t?" — "+c.t:""}`} style={{width:18,height:18,borderRadius:4,background:c.bg,padding:0}}/>);})}
            <td style={{fontSize:11,fontWeight:700,padding:"3px 8px",textAlign:"center",color:pct==null?"#8D8D8D":pct>=90?"#24A148":pct>=60?"#FF832B":"#DA1E28"}}>{pct==null?"-":Math.round(pct)+"%"}</td>
          </tr>))}</tbody>
        </table></div>}
      </div>);
    })()}
    {tab==="transfers"&&(()=>{
      const list=[...dieselTransfers].sort((a,b)=>b.date.localeCompare(a.date));
      const totalL=list.reduce((s,t)=>s+(t.litres||0),0);
      const toVeh=list.filter(t=>t.destType==="vehicle").reduce((s,t)=>s+(t.litres||0),0);
      const toOven=list.filter(t=>t.destType==="oven").reduce((s,t)=>s+(t.litres||0),0);
      const nameOf=(id)=>(generators||[]).find(g=>g.id===id)?.name||(vehicles||[]).find(v=>v.id===id)?.name||id;
      return(<div>
        <div style={{display:"grid",gridTemplateColumns:isMob()?"1fr 1fr":"repeat(4,1fr)",gap:12,marginBottom:14}}>
          <Kpi icon={Send} label="Transfers" value={list.length}/>
          <Kpi icon={Droplet} label="Total Moved" value={totalL.toLocaleString()+" L"}/>
          <Kpi icon={Truck} label="To Vehicles" value={toVeh.toLocaleString()+" L"}/>
          <Kpi icon={Package} label="To Ovens" value={toOven.toLocaleString()+" L"} sub="Bakeries"/>
        </div>
        <div style={{background:"#fff",borderRadius:14,border:"1px solid #E8ECF1",overflow:"hidden"}}>
          <div style={{padding:"14px 20px",borderBottom:"1px solid #E8ECF1",display:"flex",justifyContent:"space-between",alignItems:"center"}}><h4 style={{fontSize:14,fontWeight:700,margin:0}}>Diesel Transfers</h4><div style={{fontSize:11,color:"#8D8D8D"}}>Recorded in the Diesel Log → Transfer Diesel tab. Excluded from generator consumption.</div></div>
          {list.length===0?<div style={{padding:30,textAlign:"center",color:"#8D8D8D",fontSize:13}}>No transfers recorded yet.</div>
          :<div style={{overflow:"auto",maxHeight:"60vh"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:700}}><thead><tr style={{background:"#F4F4F4"}}>{["Date","Store","From","To","Litres","Notes",""].map(h=>(<th key={h} style={{...th,position:"sticky",top:0,background:"#F4F4F4",zIndex:1}}>{h}</th>))}</tr></thead>
          <tbody>{list.slice(0,300).map(t=>(<tr key={t.id} style={{borderBottom:"1px solid #F4F4F4"}}>
            <td style={{...tc,whiteSpace:"nowrap"}}>{t.date}</td>
            <td style={{...tc,fontWeight:600}}>{t.storeLoc}</td>
            <td style={tc}>{t.sourceGenId?nameOf(t.sourceGenId):"Store tank"}</td>
            <td style={tc}><span style={{display:"inline-flex",alignItems:"center",gap:6}}>{t.destLabel||nameOf(t.destId)||"-"}<span style={{fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:4,background:t.destType==="vehicle"?"#D0E2FF":t.destType==="oven"?"#EDE7F6":"#F4F4F4",color:t.destType==="vehicle"?P:t.destType==="oven"?"#8B5CF6":"#525252"}}>{(t.destType||"other").toUpperCase()}</span></span></td>
            <td style={{...tc,fontWeight:700,color:"#FF832B"}}>{t.litres.toLocaleString()} L</td>
            <td style={{...tc,fontSize:11,color:"#8D8D8D",maxWidth:200}}>{t.notes||""}</td>
            <td style={tc}>{!scopeStore&&<button onClick={async()=>{if(!confirm("Delete this transfer?"))return;try{await db.deleteDieselTransfer(t.id);setDieselTransfers(prev=>prev.filter(x=>x.id!==t.id));}catch(e){alert("Error: "+e.message);}}} style={{padding:"4px 8px",borderRadius:5,border:"1px solid #E0E0E0",background:"#fff",cursor:"pointer"}}><Trash2 size={12} color="#DA1E28"/></button>}</td>
          </tr>))}</tbody></table></div>}
        </div>
      </div>);
    })()}
    {tab==="purchases"&&(<div style={{background:"#fff",borderRadius:14,border:"1px solid #E8ECF1",overflow:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:880}}><thead><tr style={{background:"#F4F4F4"}}>{["Date","Supplier","Paid (L)","Received (L)","Excess","Price/L","Total Cost","Distributed","Remaining",""].map(h=>(<th key={h} style={{...th,whiteSpace:"nowrap"}}>{h}</th>))}</tr></thead><tbody>{dieselPurchases.length===0?<tr><td colSpan={10} style={{...tc,textAlign:"center",color:"#8D8D8D",padding:30}}>No purchases recorded yet</td></tr>:dieselPurchases.map(p=>{const adj=isAdj(p);const dist=purchaseDistributed(p.id);const recv=receivedOf(p);const rem=recv-dist;const exc=recv-p.litres;
      if(adj)return(<tr key={p.id} style={{background:"#FFF8F0"}}><td style={{...tc,whiteSpace:"nowrap"}}>{p.date}</td><td style={{...tc,fontWeight:600}}><span style={{display:"inline-flex",alignItems:"center",gap:6}}>Stock reconciliation<span style={{fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:4,background:"#FFE8D6",color:"#FF832B"}}>ADJUSTMENT</span></span></td><td style={{...tc,color:"#8D8D8D"}} colSpan={4}>{p.notes||"Physical stock take baseline"}</td><td style={tc}>—</td><td style={{...tc,fontWeight:600,color:p.litres>=0?"#24A148":"#DA1E28"}}>{p.litres>=0?"+":""}{p.litres.toLocaleString()} L</td><td style={tc}>—</td><td style={tc}><button onClick={()=>handleDeletePurchase(p.id)} style={{padding:"4px 8px",borderRadius:5,border:"1px solid #E0E0E0",background:"#fff",cursor:"pointer"}}><Trash2 size={12} color="#DA1E28"/></button></td></tr>);
      return(<tr key={p.id}><td style={{...tc,whiteSpace:"nowrap"}}>{p.date}</td><td style={{...tc,fontWeight:600}}>{p.supplier}</td><td style={tc}>{p.litres.toLocaleString()}</td><td style={tc}>{p.litresReceived!=null?recv.toLocaleString():<span style={{color:"#8D8D8D"}}>{recv.toLocaleString()}</span>}</td><td style={tc}>{exc>0?<span style={{color:"#24A148",fontWeight:600}}>+{exc.toLocaleString()}</span>:exc<0?<span style={{color:"#DA1E28",fontWeight:600}}>{exc.toLocaleString()}</span>:"—"}</td><td style={tc}>{p.pricePerL>0?fmt(p.pricePerL):<span style={{color:"#8D8D8D"}}>no price</span>}</td><td style={{...tc,fontWeight:600}}>{p.pricePerL>0?fmt(p.litres*p.pricePerL):"—"}</td><td style={tc}>{dist.toLocaleString()} L</td><td style={tc}><span style={{fontWeight:600,color:rem>0?"#FF832B":"#24A148"}}>{rem.toLocaleString()} L</span></td><td style={tc}><div style={{display:"flex",gap:4}}>{rem>0&&<button onClick={()=>{setDistPurchaseId(p.id);setDf({date:today,storeLoc:"",litres:String(rem),notes:""});setShowDistribute(true);}} style={{padding:"4px 10px",borderRadius:5,border:"1px solid "+P,background:"#D0E2FF",cursor:"pointer",fontSize:11,fontWeight:600,color:P}}>Distribute</button>}<button onClick={()=>setEditPurchase({id:p.id,date:p.date,supplier:p.supplier||"",litres:String(p.litres),litresReceived:p.litresReceived!=null?String(p.litresReceived):"",pricePerL:p.pricePerL?String(p.pricePerL):""})} style={{padding:"4px 8px",borderRadius:5,border:"1px solid #E0E0E0",background:"#fff",cursor:"pointer"}}><Pencil size={12} color="#525252"/></button><button onClick={()=>handleDeletePurchase(p.id)} style={{padding:"4px 8px",borderRadius:5,border:"1px solid #E0E0E0",background:"#fff",cursor:"pointer"}}><Trash2 size={12} color="#DA1E28"/></button></div></td></tr>);})}</tbody></table></div>)}
    {tab==="distributions"&&(<div style={{background:"#fff",borderRadius:14,border:"1px solid #E8ECF1",overflow:"hidden"}}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr style={{background:"#F4F4F4"}}>{["Date","Store","Litres","Source Purchase","Notes","Status","Actions"].map(h=>(<th key={h} style={th}>{h}</th>))}</tr></thead><tbody>{dieselDistributions.length===0?<tr><td colSpan={7} style={{...tc,textAlign:"center",color:"#8D8D8D",padding:30}}>No distributions recorded yet</td></tr>:dieselDistributions.map(d=>{const p=dieselPurchases.find(x=>x.id===d.purchaseId);return(<tr key={d.id}><td style={tc}>{d.date}</td><td style={{...tc,fontWeight:600}}>{d.storeLoc}</td><td style={{...tc,fontWeight:600,color:P}}>{d.litres.toLocaleString()} L</td><td style={tc}>{p?p.supplier+" ("+p.date+")":"\u2014"}</td><td style={tc}>{d.notes||"\u2014"}</td><td style={tc}><Badge label={d.confirmed?"Confirmed":"Pending"}/></td><td style={tc}><div style={{display:"flex",gap:4}}><button onClick={()=>setEditDist({...d})} style={{padding:"4px 10px",borderRadius:5,border:"1px solid "+P,background:"#D0E2FF",cursor:"pointer",fontSize:11,fontWeight:600,color:P}}>Edit</button><button onClick={()=>handleDeleteDistribution(d.id)} style={{padding:"4px 8px",borderRadius:5,border:"1px solid #E0E0E0",background:"#fff",cursor:"pointer"}}><Trash2 size={12} color="#DA1E28"/></button></div></td></tr>);})}</tbody></table></div>)}
    {tab==="stores"&&(<div style={{background:"#fff",borderRadius:14,border:"1px solid #E8ECF1",overflow:"hidden"}}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr style={{background:"#F4F4F4"}}>{["Store","Received (L)","Consumed (L)","Balance (L)","Distributions"].map(h=>(<th key={h} style={th}>{h}</th>))}</tr></thead><tbody>{storeStats.length===0?<tr><td colSpan={5} style={{...tc,textAlign:"center",color:"#8D8D8D",padding:30}}>No store data yet</td></tr>:storeStats.map(s=>(<tr key={s.loc}><td style={{...tc,fontWeight:600}}>{s.loc}</td><td style={{...tc,color:P,fontWeight:600}}>{s.received.toLocaleString()} L</td><td style={tc}>{s.consumed.toLocaleString()} L</td><td style={tc}><span style={{fontWeight:600,color:s.balance>=0?"#24A148":"#DA1E28"}}>{s.balance.toLocaleString()} L</span></td><td style={tc}>{s.distCount}</td></tr>))}</tbody></table></div>)}
    {tab==="baselines"&&(<div style={{background:"#fff",borderRadius:14,border:"1px solid #E8ECF1",overflow:"hidden"}}>
      <div style={{padding:"16px 20px",borderBottom:"1px solid #E8ECF1",display:"flex",justifyContent:"space-between",alignItems:"center"}}><h4 style={{fontSize:14,fontWeight:700,margin:0}}>Generator Baselines</h4><div style={{fontSize:11,color:"#8D8D8D"}}>Auto-learned from staff readings</div></div>
      {(generators||[]).length===0?<div style={{padding:30,textAlign:"center",color:"#8D8D8D",fontSize:13}}>No generators found</div>
      :<table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr style={{background:"#F4F4F4"}}>{["Generator","Location","Avg L/hr","Min","Max","Readings","Threshold %",""].map(h=>(<th key={h} style={th}>{h}</th>))}</tr></thead>
      <tbody>{(generators||[]).map(g=>{const bl=genBaselines?.find(b=>b.generator_id===g.id);return(<tr key={g.id}><td style={{...tc,fontWeight:600}}>{g.name}</td><td style={tc}>{g.loc||"—"}</td><td style={{...tc,fontWeight:700,color:bl?.avg_litres_per_hour?P:"#8D8D8D"}}>{bl?.avg_litres_per_hour?bl.avg_litres_per_hour.toFixed(2)+" L/hr":"No data"}</td><td style={tc}>{bl?.min_rate?bl.min_rate.toFixed(2):"-"}</td><td style={tc}>{bl?.max_rate?bl.max_rate.toFixed(2):"-"}</td><td style={tc}>{bl?.baseline_readings_count||0}</td><td style={tc}><input type="number" value={bl?.threshold_pct||20} onChange={async(e)=>{const val=parseFloat(e.target.value);if(isNaN(val)||val<1)return;try{const upserted=await db.upsertGeneratorBaseline({generator_id:g.id,avg_litres_per_hour:bl?.avg_litres_per_hour||null,baseline_readings_count:bl?.baseline_readings_count||0,last_calculated:bl?.last_calculated||null,min_rate:bl?.min_rate||null,max_rate:bl?.max_rate||null,threshold_pct:val});if(upserted)setGenBaselines(prev=>{const filtered=prev.filter(b=>b.generator_id!==g.id);return[...filtered,upserted];});}catch(err){alert("Error: "+err.message);}}} style={{width:60,padding:"4px 6px",borderRadius:5,border:"1px solid #E0E0E0",fontSize:12,textAlign:"center"}}/></td><td style={tc}>{bl?.baseline_readings_count>0&&<button onClick={async()=>{if(!confirm("Reset baseline for "+g.name+"? This clears the learned rate."))return;try{const upserted=await db.upsertGeneratorBaseline({generator_id:g.id,avg_litres_per_hour:null,baseline_readings_count:0,last_calculated:null,min_rate:null,max_rate:null,threshold_pct:bl?.threshold_pct||20});if(upserted)setGenBaselines(prev=>{const filtered=prev.filter(b=>b.generator_id!==g.id);return[...filtered,upserted];});}catch(err){alert("Error: "+err.message);}}} style={{padding:"4px 10px",borderRadius:5,border:"1px solid #E0E0E0",background:"#fff",cursor:"pointer",fontSize:11,color:"#DA1E28",fontWeight:600}}>Reset</button>}</td></tr>);})}</tbody></table>}
    </div>)}
    {tab==="discrepancies"&&(()=>{
      const flagged=dieselReadings.filter(r=>r.discrepancyFlag).sort((a,b)=>b.date.localeCompare(a.date));
      const totalUnaccounted=flagged.reduce((s,r)=>s+Math.abs(r.discrepancyLitres||0),0);
      const storeFlags={};flagged.forEach(r=>{storeFlags[r.storeLoc]=(storeFlags[r.storeLoc]||0)+1;});
      const worstStore=Object.entries(storeFlags).sort((a,b)=>b[1]-a[1])[0];
      return(<div>
        <div style={{display:"grid",gridTemplateColumns:isMob()?"1fr 1fr":"repeat(4,1fr)",gap:12,marginBottom:16}}>
          <Kpi icon={AlertTriangle} label="Total Flags" value={flagged.length} sub="All time" accent="#DA1E28"/>
          <Kpi icon={Fuel} label="Unaccounted" value={totalUnaccounted.toFixed(0)+" L"} sub="Total discrepancy" accent="#DA1E28"/>
          <Kpi icon={TrendingDown} label="Worst Store" value={worstStore?worstStore[0]:"-"} sub={worstStore?worstStore[1]+" flags":"No flags"}/>
          <Kpi icon={CheckCircle} label="Clean Readings" value={dieselReadings.filter(r=>!r.discrepancyFlag&&r.dieselLevelActual!=null).length} sub="No discrepancy" accent="#24A148"/>
        </div>
        <div style={{background:"#fff",borderRadius:14,border:"1px solid #E8ECF1",overflow:"hidden"}}>
          <div style={{padding:"16px 20px",borderBottom:"1px solid #E8ECF1"}}><h4 style={{fontSize:14,fontWeight:700,margin:0,color:"#DA1E28",display:"flex",alignItems:"center",gap:6}}><AlertTriangle size={16}/>Flagged Readings</h4></div>
          {flagged.length===0?<div style={{padding:30,textAlign:"center",color:"#8D8D8D",fontSize:13}}>No discrepancies detected yet. Flags appear after baselines are learned and discrepancies exceed the threshold.</div>
          :<table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr style={{background:"#FFF1F1"}}>{["Date","Store","Generator","Expected (L)","Actual (L)","Discrepancy","Severity"].map(h=>(<th key={h} style={{...th,color:"#DA1E28"}}>{h}</th>))}</tr></thead>
          <tbody>{flagged.slice(0,50).map(r=>{const g=(generators||[]).find(x=>x.id===r.generatorId);const bl=genBaselines?.find(b=>b.generator_id===r.generatorId);const rate=bl?.avg_litres_per_hour||r.consumptionRate||0;const expected=r.hoursRun?r.hoursRun*rate:null;const pct=expected&&expected>0?Math.abs(r.discrepancyLitres||0)/expected*100:0;return(<tr key={r.id}><td style={tc}>{r.date}</td><td style={{...tc,fontWeight:600}}>{r.storeLoc}</td><td style={tc}>{g?.name||r.generatorId}</td><td style={tc}>{expected?expected.toFixed(1)+" L":"-"}</td><td style={tc}>{r.dieselLevelActual!=null?r.dieselLevelActual+" L":"-"}</td><td style={{...tc,fontWeight:700,color:"#DA1E28"}}>{r.discrepancyLitres!=null?r.discrepancyLitres.toFixed(1)+" L":"-"}</td><td style={tc}><span style={{padding:"3px 10px",borderRadius:10,fontSize:11,fontWeight:600,background:pct>50?"#DA1E28":pct>30?"#FF832B":"#FFD700",color:pct>50?"#fff":"#161616"}}>{pct.toFixed(0)}%</span></td></tr>);})}</tbody></table>}
        </div>
      </div>);
    })()}
    {tab==="readings"&&(()=>{
      // Generator options: those at the selected branch (or all gens that have readings)
      const gensWithReadings=new Set(dieselReadings.map(r=>r.generatorId));
      const genOpts=(generators||[]).filter(g=>(!rdStore||g.loc===rdStore)&&(rdStore||gensWithReadings.has(g.id)));
      // Opening diesel level = the prior day's closing for the same generator (full history)
      const openMap={};const byGen={};
      dieselReadings.forEach(r=>{(byGen[r.generatorId]=byGen[r.generatorId]||[]).push(r);});
      Object.values(byGen).forEach(arr=>{arr.sort((a,b)=>a.date.localeCompare(b.date));arr.forEach((r,i)=>{openMap[r.id]=i>0?arr[i-1].dieselLevelActual:(r.dieselLevelActual!=null&&r.consumptionLitres!=null?r.dieselLevelActual-(r.dieselAdded||0)+r.consumptionLitres:null);});});
      const rows=dieselReadings
        .filter(r=>!rdStore||r.storeLoc===rdStore)
        .filter(r=>!rdGen||r.generatorId===rdGen)
        .filter(r=>!rdFrom||r.date>=rdFrom)
        .filter(r=>!rdTo||r.date<=rdTo)
        .sort((a,b)=>b.date.localeCompare(a.date)||a.storeLoc.localeCompare(b.storeLoc));
      const genName=(id)=>(generators||[]).find(g=>g.id===id)?.name||id;
      const tHours=rows.reduce((s,r)=>s+(r.hoursRun||0),0);
      const tCons=rows.reduce((s,r)=>s+(r.consumptionLitres||0),0);
      const tAdded=rows.reduce((s,r)=>s+(r.dieselAdded||0),0);
      const tBatches=rows.reduce((s,r)=>s+(r.batchesProduced||0),0);
      // Pagination
      const pageCount=Math.max(1,Math.ceil(rows.length/rdPageSize));
      const curPage=Math.min(rdPage,pageCount-1);
      const pageRows=rows.slice(curPage*rdPageSize,(curPage+1)*rdPageSize);
      const cols=["Date","Branch","Asset","Open Hrs","Close Hrs","Hours Run","Open Level (L)","Close Level (L)","Added (L)","Consumption (L)","Batches","Rate (L/hr | L/batch)","NEPA Open","NEPA Close","Notes"];
      const sth={...th,whiteSpace:"nowrap",position:"sticky",top:0,zIndex:1,background:"#F4F4F4"};
      const resetPage=()=>setRdPage(0);
      const exportCsv=()=>{
        const head=cols.join(",");
        const body=rows.map(r=>[r.date,r.storeLoc,genName(r.generatorId),r.genHoursOpening??"",r.genHoursClosing??"",r.hoursRun??"",openMap[r.id]??"",r.dieselLevelActual??"",r.dieselAdded??"",r.consumptionLitres??"",r.batchesProduced??"",r.consumptionRate!=null?r.consumptionRate.toFixed(2):"",r.nepaMeterOpening??"",r.nepaMeterClosing??"",(r.notes||"").replace(/[",\n]/g," ")].join(",")).join("\n");
        const blob=new Blob([head+"\n"+body],{type:"text/csv"});
        const url=URL.createObjectURL(blob);const a=document.createElement("a");
        a.href=url;a.download=`diesel-readings${rdStore?"-"+rdStore.replace(/\s+/g,"_"):""}.csv`;a.click();URL.revokeObjectURL(url);
      };
      return(<div>
        <div style={{background:"#fff",borderRadius:14,border:"1px solid #E8ECF1",padding:16,marginBottom:14,display:"flex",gap:12,flexWrap:"wrap",alignItems:"flex-end"}}>
          {!scopeStore&&<div><div style={{fontSize:11,color:"#8D8D8D",marginBottom:4,fontWeight:600}}>Branch</div><select style={{...inp,width:isMob()?"100%":180}} value={rdStore} onChange={e=>{setRdStore(e.target.value);setRdGen("");resetPage();}}><option value="">All branches</option>{(locations||[]).map(l=>(<option key={l} value={l}>{l}</option>))}</select></div>}
          <div><div style={{fontSize:11,color:"#8D8D8D",marginBottom:4,fontWeight:600}}>Generator</div><select style={{...inp,width:isMob()?"100%":200}} value={rdGen} onChange={e=>{setRdGen(e.target.value);resetPage();}}><option value="">All generators</option>{genOpts.map(g=>(<option key={g.id} value={g.id}>{g.name}</option>))}</select></div>
          <div><div style={{fontSize:11,color:"#8D8D8D",marginBottom:4,fontWeight:600}}>From</div><input type="date" style={{...inp,width:150}} value={rdFrom} onChange={e=>{setRdFrom(e.target.value);resetPage();}}/></div>
          <div><div style={{fontSize:11,color:"#8D8D8D",marginBottom:4,fontWeight:600}}>To</div><input type="date" style={{...inp,width:150}} value={rdTo} onChange={e=>{setRdTo(e.target.value);resetPage();}}/></div>
          {(rdStore||rdGen||rdFrom||rdTo)&&<button onClick={()=>{setRdStore("");setRdGen("");setRdFrom("");setRdTo("");resetPage();}} style={{padding:"9px 14px",borderRadius:8,border:"1.5px solid #E0E0E0",background:"#fff",color:"#525252",fontSize:12,fontWeight:600,cursor:"pointer"}}>Clear</button>}
          <div style={{flex:1}}/>
          <button onClick={exportCsv} disabled={rows.length===0} style={{display:"flex",alignItems:"center",gap:5,padding:"9px 14px",borderRadius:8,border:"1.5px solid "+P,background:rows.length?"#D0E2FF":"#F4F4F4",color:rows.length?P:"#8D8D8D",fontSize:12,fontWeight:600,cursor:rows.length?"pointer":"not-allowed"}}><Download size={14}/>Export CSV</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:isMob()?"1fr 1fr 1fr":`repeat(${tBatches>0?5:4},1fr)`,gap:12,marginBottom:14}}>
          <Kpi icon={FileText} label="Readings" value={rows.length}/>
          <Kpi icon={Clock} label="Total Hours Run" value={tHours.toFixed(1)}/>
          <Kpi icon={Droplet} label="Total Consumption" value={tCons.toLocaleString()+" L"}/>
          <Kpi icon={Fuel} label="Total Added" value={tAdded.toLocaleString()+" L"}/>
          {tBatches>0&&<Kpi icon={Package} label="Bread Batches" value={tBatches.toLocaleString()} sub={tCons>0?`${(tCons/tBatches).toFixed(2)} L/batch avg`:""}/>}
        </div>
        <div style={{background:"#fff",borderRadius:14,border:"1px solid #E8ECF1",overflow:"hidden"}}>
          {rows.length===0?<div style={{padding:30,textAlign:"center",color:"#8D8D8D",fontSize:13}}>No readings for this filter. Pick a branch/generator/date range above.</div>
          :<><div style={{overflow:"auto",maxHeight:"60vh"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:1000}}><thead><tr>{cols.map(h=>(<th key={h} style={sth}>{h}</th>))}</tr></thead>
          <tbody>{pageRows.map(r=>(<tr key={r.id} style={{borderBottom:"1px solid #F4F4F4",background:r.discrepancyFlag?"#FFF6F6":""}}>
            <td style={{...tc,whiteSpace:"nowrap"}}><span style={{display:"inline-flex",alignItems:"center",gap:5}}>{r.discrepancyFlag&&<AlertTriangle size={12} color="#DA1E28"/>}{r.date}{r.genPhotoUrl?<a href={r.genPhotoUrl} target="_blank" rel="noreferrer" title="View meter photo" style={{display:"inline-flex"}}><Camera size={12} color={P}/></a>:null}</span></td>
            <td style={tc}>{r.storeLoc}</td>
            <td style={{...tc,fontWeight:600}}>{genName(r.generatorId)}</td>
            <td style={tc}>{r.genHoursOpening!=null?r.genHoursOpening.toLocaleString():"-"}</td>
            <td style={tc}>{r.genHoursClosing!=null?r.genHoursClosing.toLocaleString():"-"}</td>
            <td style={{...tc,fontWeight:600}}>{r.hoursRun?r.hoursRun.toFixed(1):"-"}</td>
            <td style={tc}>{openMap[r.id]!=null?openMap[r.id].toLocaleString():"-"}</td>
            <td style={{...tc,fontWeight:600}}>{r.dieselLevelActual!=null?r.dieselLevelActual.toLocaleString():"-"}</td>
            <td style={tc}>{r.dieselAdded?r.dieselAdded.toLocaleString():"-"}</td>
            <td style={tc}>{r.consumptionLitres!=null?r.consumptionLitres.toLocaleString():"-"}</td>
            <td style={{...tc,fontWeight:r.batchesProduced!=null?600:400,color:r.batchesProduced!=null?"#8B5CF6":"#161616"}}>{r.batchesProduced!=null?r.batchesProduced.toLocaleString():"-"}</td>
            <td style={tc}>{r.consumptionRate!=null?r.consumptionRate.toFixed(2):"-"}</td>
            <td style={tc}>{r.nepaMeterOpening!=null?r.nepaMeterOpening.toLocaleString():"-"}</td>
            <td style={tc}>{r.nepaMeterClosing!=null?r.nepaMeterClosing.toLocaleString():"-"}</td>
            <td style={{...tc,maxWidth:200,fontSize:11,color:"#8D8D8D"}}>{r.notes||""}</td>
          </tr>))}</tbody></table></div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,padding:"10px 16px",borderTop:"1px solid #E8ECF1",flexWrap:"wrap"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:"#525252"}}>
              <span>Rows per page</span>
              <select value={rdPageSize} onChange={e=>{setRdPageSize(parseInt(e.target.value));resetPage();}} style={{padding:"5px 8px",borderRadius:6,border:"1px solid #E0E0E0",fontSize:12,fontFamily:"inherit"}}>{[25,50,100].map(n=>(<option key={n} value={n}>{n}</option>))}</select>
              <span style={{color:"#8D8D8D"}}>{rows.length===0?0:curPage*rdPageSize+1}-{Math.min((curPage+1)*rdPageSize,rows.length)} of {rows.length}</span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <button onClick={()=>setRdPage(Math.max(0,curPage-1))} disabled={curPage<=0} style={{padding:"6px 12px",borderRadius:7,border:"1.5px solid #E0E0E0",background:curPage<=0?"#F4F4F4":"#fff",color:curPage<=0?"#C6C6C6":"#525252",fontSize:12,fontWeight:600,cursor:curPage<=0?"not-allowed":"pointer"}}>Prev</button>
              <span style={{fontSize:12,color:"#525252"}}>Page {curPage+1} of {pageCount}</span>
              <button onClick={()=>setRdPage(Math.min(pageCount-1,curPage+1))} disabled={curPage>=pageCount-1} style={{padding:"6px 12px",borderRadius:7,border:"1.5px solid #E0E0E0",background:curPage>=pageCount-1?"#F4F4F4":"#fff",color:curPage>=pageCount-1?"#C6C6C6":"#525252",fontSize:12,fontWeight:600,cursor:curPage>=pageCount-1?"not-allowed":"pointer"}}>Next</button>
            </div>
          </div></>}
        </div>
      </div>);
    })()}
        {showReconcile&&(<Modal title="Reconcile Stock" onClose={()=>{setShowReconcile(false);setMsg("");}}>
      <div style={{padding:"12px 14px",borderRadius:8,background:"#F4F4F4",marginBottom:14,fontSize:12,color:"#525252"}}>Do a physical count of diesel actually in the warehouse, enter it below, and the app books a one-time adjustment so Stock in Hand matches reality. All history stays — you just set a clean baseline.</div>
      <div style={{display:"flex",justifyContent:"space-between",padding:"8px 0",marginBottom:6,borderBottom:"1px solid #F4F4F4"}}><span style={{fontSize:12,color:"#8D8D8D"}}>App currently shows</span><span style={{fontSize:13,fontWeight:700,color:stockInHand<0?"#DA1E28":"#161616"}}>{stockInHand.toLocaleString()} L</span></div>
      <Field label="Physical count today (L) *"><input style={{...inp,fontSize:18,fontWeight:700}} type="number" placeholder="e.g. 18615" value={reconcileForm.count} onChange={e=>setReconcileForm({...reconcileForm,count:e.target.value})}/></Field>
      <Field label="Date *"><input style={inp} type="date" value={reconcileForm.date} onChange={e=>setReconcileForm({...reconcileForm,date:e.target.value})}/></Field>
      {reconcileForm.count!==""&&!isNaN(parseFloat(reconcileForm.count))&&(()=>{const adj=parseFloat(reconcileForm.count)-stockInHand;return(<div style={{padding:"10px 14px",borderRadius:8,background:adj>=0?"#E8F5E9":"#FFF1F1",marginBottom:12}}><div style={{fontSize:11,fontWeight:600,color:adj>=0?"#24A148":"#DA1E28"}}>Adjustment booked</div><div style={{fontSize:18,fontWeight:700,color:adj>=0?"#24A148":"#DA1E28"}}>{adj>=0?"+":""}{adj.toLocaleString()} L</div><div style={{fontSize:11,color:"#8D8D8D",marginTop:2}}>Stock in Hand will read {parseFloat(reconcileForm.count).toLocaleString()} L</div></div>);})()}
      {msg&&<div style={{padding:10,borderRadius:8,background:msg.startsWith("Error")?"#DA1E2818":"#24A14818",color:msg.startsWith("Error")?"#DA1E28":"#24A148",fontSize:12,marginBottom:10}}>{msg}</div>}
      <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
        <button onClick={()=>{setShowReconcile(false);setMsg("");}} style={{padding:"9px 20px",borderRadius:8,border:"1.5px solid #E0E0E0",background:"#fff",color:"#525252",fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancel</button>
        <button onClick={handleReconcile} disabled={saving||reconcileForm.count===""} style={{display:"flex",alignItems:"center",gap:6,padding:"9px 20px",borderRadius:8,border:"none",background:(reconcileForm.count!==""&&!saving)?"#FF832B":"#C6C6C6",color:"#fff",fontSize:13,fontWeight:600,cursor:(reconcileForm.count!==""&&!saving)?"pointer":"not-allowed"}}><Save size={14}/>{saving?"Saving...":"Reconcile"}</button>
      </div>
    </Modal>)}
        {editPurchase&&(<Modal title="Edit Purchase" onClose={()=>{setEditPurchase(null);setMsg("");}}>
      <Field label="Date *"><input style={inp} type="date" value={editPurchase.date} onChange={e=>setEditPurchase({...editPurchase,date:e.target.value})}/></Field>
      <Field label="Supplier *"><input style={inp} value={editPurchase.supplier} onChange={e=>setEditPurchase({...editPurchase,supplier:e.target.value})}/></Field>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Field label="Paid Litres * (invoice)"><input style={inp} type="number" value={editPurchase.litres} onChange={e=>setEditPurchase({...editPurchase,litres:e.target.value})}/></Field>
        <Field label="Received Litres (actual)"><input style={inp} type="number" placeholder={editPurchase.litres||"= paid"} value={editPurchase.litresReceived} onChange={e=>setEditPurchase({...editPurchase,litresReceived:e.target.value})}/></Field>
      </div>
      {editPurchase.litresReceived&&parseFloat(editPurchase.litresReceived)!==parseFloat(editPurchase.litres)&&<div style={{padding:"6px 12px",borderRadius:6,background:"#E8F5E9",marginBottom:10,fontSize:12,color:"#24A148",fontWeight:600}}>Excess: {(parseFloat(editPurchase.litresReceived||0)-parseFloat(editPurchase.litres||0)).toLocaleString()} L free diesel</div>}
      <Field label="Price per Litre"><input style={inp} type="number" placeholder="0 = unknown" value={editPurchase.pricePerL} onChange={e=>setEditPurchase({...editPurchase,pricePerL:e.target.value})}/></Field>
      {editPurchase.litres&&editPurchase.pricePerL&&<div style={{padding:"10px 14px",borderRadius:8,background:"#D0E2FF",marginBottom:12}}><div style={{fontSize:11,color:P,fontWeight:600}}>Total Cost</div><div style={{fontSize:20,fontWeight:700,color:P}}>{fmt(parseFloat(editPurchase.litres||0)*parseFloat(editPurchase.pricePerL||0))}</div></div>}
      {msg&&<div style={{padding:10,borderRadius:8,background:msg.startsWith("Error")?"#DA1E2818":"#24A14818",color:msg.startsWith("Error")?"#DA1E28":"#24A148",fontSize:12,marginBottom:10}}>{msg}</div>}
      <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
        <button onClick={()=>{setEditPurchase(null);setMsg("");}} style={{padding:"9px 20px",borderRadius:8,border:"1.5px solid #E0E0E0",background:"#fff",color:"#525252",fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancel</button>
        <button onClick={handleEditPurchase} disabled={saving||!editPurchase.supplier||!editPurchase.litres} style={{display:"flex",alignItems:"center",gap:6,padding:"9px 20px",borderRadius:8,border:"none",background:(editPurchase.supplier&&editPurchase.litres&&!saving)?P:"#C6C6C6",color:"#fff",fontSize:13,fontWeight:600,cursor:(editPurchase.supplier&&editPurchase.litres&&!saving)?"pointer":"not-allowed"}}><Save size={14}/>{saving?"Saving...":"Update"}</button>
      </div>
    </Modal>)}
        {showAddPurchase&&(<Modal title="Log Diesel Purchase" onClose={()=>{setShowAddPurchase(false);setMsg("");}}>
      <Field label="Date *"><input style={inp} type="date" value={pf.date} onChange={e=>setPf({...pf,date:e.target.value})}/></Field>
      <Field label="Supplier *"><select style={inp} value={pf.supplier} onChange={e=>setPf({...pf,supplier:e.target.value})}><option value="">-- Select Supplier --</option>{(vendors||[]).filter(v=>v.type==="Diesel Supplier"||v.type==="Fuel"||v.type==="Fuel Station").map(v=>(<option key={v.id} value={v.name}>{v.name}</option>))}</select></Field>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><Field label="Paid Litres * (invoice)"><input style={inp} type="number" placeholder="e.g. 5000" value={pf.litres} onChange={e=>setPf({...pf,litres:e.target.value})}/></Field><Field label="Received Litres (actual)"><input style={inp} type="number" placeholder={pf.litres||"= paid"} value={pf.litresReceived} onChange={e=>setPf({...pf,litresReceived:e.target.value})}/></Field></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><Field label="Price per Litre"><input style={inp} type="number" placeholder="e.g. 1200" value={pf.pricePerL} onChange={e=>setPf({...pf,pricePerL:e.target.value})}/></Field><div/></div>
      {pf.litresReceived&&parseFloat(pf.litresReceived)!==parseFloat(pf.litres||0)&&<div style={{padding:"6px 12px",borderRadius:6,background:"#E8F5E9",marginBottom:10,fontSize:12,color:"#24A148",fontWeight:600}}>Excess: {(parseFloat(pf.litresReceived||0)-parseFloat(pf.litres||0)).toLocaleString()} L free diesel</div>}
      {pf.litres&&pf.pricePerL&&<div style={{padding:"10px 14px",borderRadius:8,background:"#D0E2FF",marginBottom:12}}><div style={{fontSize:11,color:P,fontWeight:600}}>Total Cost (paid litres × price)</div><div style={{fontSize:20,fontWeight:700,color:P}}>{fmt(parseFloat(pf.litres||0)*parseFloat(pf.pricePerL||0))}</div></div>}
      <Field label="Notes"><input style={inp} placeholder="Optional notes" value={pf.notes} onChange={e=>setPf({...pf,notes:e.target.value})}/></Field>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:8}}><button onClick={()=>{setShowAddPurchase(false);setMsg("");}} style={{padding:"9px 20px",borderRadius:8,border:"1.5px solid #E0E0E0",background:"#fff",color:"#525252",fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancel</button><button onClick={handleAddPurchase} disabled={saving||!pf.supplier||!pf.litres||!pf.pricePerL} style={{display:"flex",alignItems:"center",gap:6,padding:"9px 20px",borderRadius:8,border:"none",background:(pf.supplier&&pf.litres&&pf.pricePerL&&!saving)?P:"#C6C6C6",color:"#fff",fontSize:13,fontWeight:600,cursor:(pf.supplier&&pf.litres&&pf.pricePerL&&!saving)?"pointer":"not-allowed"}}><Save size={14}/>{saving?"Saving...":"Save Purchase"}</button></div>
    </Modal>)}
    {showDistribute&&(<Modal title="Distribute Diesel to Store" onClose={()=>{setShowDistribute(false);setDistPurchaseId(null);setMsg("");}}>
      {distPurchaseId&&(()=>{const p=dieselPurchases.find(x=>x.id===distPurchaseId);return p?<div style={{padding:"10px 14px",borderRadius:8,background:"#F4F4F4",marginBottom:14}}><div style={{fontSize:11,color:"#8D8D8D"}}>From Purchase</div><div style={{fontSize:13,fontWeight:600}}>{p.supplier} - {p.date} - {purchaseRemaining(p).toLocaleString()} L remaining</div></div>:null;})()}
      {!distPurchaseId&&<Field label="From Purchase (optional)"><select style={inp} value={distPurchaseId||""} onChange={e=>setDistPurchaseId(e.target.value||null)}><option value="">-- Any / General Stock --</option>{dieselPurchases.filter(p=>purchaseRemaining(p)>0).map(p=>(<option key={p.id} value={p.id}>{p.supplier} ({p.date}) - {purchaseRemaining(p).toLocaleString()} L left</option>))}</select></Field>}
      <Field label="Date *"><input style={inp} type="date" value={df.date} onChange={e=>setDf({...df,date:e.target.value})}/></Field>
      <Field label="Store Location *"><select style={inp} value={df.storeLoc} onChange={e=>setDf({...df,storeLoc:e.target.value})}><option value="">-- Select Store --</option>{locations.map(l=>(<option key={l} value={l}>{l}</option>))}</select></Field>
      <Field label="Litres *"><input style={inp} type="number" placeholder="e.g. 200" value={df.litres} onChange={e=>setDf({...df,litres:e.target.value})}/></Field>
      <Field label="Notes"><input style={inp} placeholder="e.g. Weekly supply" value={df.notes} onChange={e=>setDf({...df,notes:e.target.value})}/></Field>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:8}}><button onClick={()=>{setShowDistribute(false);setDistPurchaseId(null);setMsg("");}} style={{padding:"9px 20px",borderRadius:8,border:"1.5px solid #E0E0E0",background:"#fff",color:"#525252",fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancel</button><button onClick={handleDistribute} disabled={saving||!df.storeLoc||!df.litres} style={{display:"flex",alignItems:"center",gap:6,padding:"9px 20px",borderRadius:8,border:"none",background:(df.storeLoc&&df.litres&&!saving)?P:"#C6C6C6",color:"#fff",fontSize:13,fontWeight:600,cursor:(df.storeLoc&&df.litres&&!saving)?"pointer":"not-allowed"}}><Send size={14}/>{saving?"Sending...":"Distribute"}</button></div>
    </Modal>)}
    {editDist&&(<Modal title="Edit Distribution" onClose={()=>setEditDist(null)}>
      <Field label="Date *"><input style={inp} type="date" value={editDist.date} onChange={e=>setEditDist({...editDist,date:e.target.value})}/></Field>
      <Field label="Store Location *"><select style={inp} value={editDist.storeLoc} onChange={e=>setEditDist({...editDist,storeLoc:e.target.value})}><option value="">-- Select Store --</option>{locations.map(l=>(<option key={l} value={l}>{l}</option>))}</select></Field>
      <Field label="Litres *"><input style={inp} type="number" value={editDist.litres} onChange={e=>setEditDist({...editDist,litres:e.target.value})}/></Field>
      <Field label="Notes"><input style={inp} placeholder="Optional notes" value={editDist.notes||""} onChange={e=>setEditDist({...editDist,notes:e.target.value})}/></Field>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:8}}><button onClick={()=>setEditDist(null)} style={{padding:"9px 20px",borderRadius:8,border:"1.5px solid #E0E0E0",background:"#fff",color:"#525252",fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancel</button><button onClick={handleEditDistribution} disabled={saving||!editDist.storeLoc||!editDist.litres} style={{padding:"9px 20px",borderRadius:8,border:"none",background:(editDist.storeLoc&&editDist.litres&&!saving)?P:"#C6C6C6",color:"#fff",fontSize:13,fontWeight:600,cursor:(editDist.storeLoc&&editDist.litres&&!saving)?"pointer":"not-allowed"}}>{saving?"Saving...":"Save Changes"}</button></div>
    </Modal>)}
  </div>);
}


function LoginPage({onLogin}){
  const [email,setEmail]=useState("");const [pass,setPass]=useState("");const [err,setErr]=useState("");const [showPass,setShowPass]=useState(false);const [loading,setLoading]=useState(false);const [resetMode,setResetMode]=useState(false);const [resetMsg,setResetMsg]=useState("");
  const handle=async()=>{setLoading(true);setErr("");try{await signIn(email,pass);const{data:{session}}=await supabase.auth.getSession();if(session){const profile=await getProfile(session.user.id);onLogin({...profile,uid:session.user.id});}}catch(e){setErr(e.message||"Invalid email or password");}setLoading(false);};
  const handleReset=async()=>{if(!email){setErr("Enter your email first");return;}setLoading(true);setResetMsg("");try{await resetPassword(email);setResetMsg("Password reset email sent! Check your inbox.");setErr("");}catch(e){setErr(e.message);}setLoading(false);};
  return(<div style={{minHeight:"100vh",background:"linear-gradient(135deg,#0F1A2E 0%,#1A3A6B 50%,#0F62FE 100%)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',sans-serif"}}><link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/><div style={{background:"#fff",borderRadius:20,padding:"44px 40px",width:400,boxShadow:"0 30px 80px rgba(0,0,0,0.35)"}}><div style={{display:"flex",alignItems:"center",gap:12,marginBottom:30}}><div style={{width:44,height:44,borderRadius:11,background:`linear-gradient(135deg,${P},#4589FF)`,display:"flex",alignItems:"center",justifyContent:"center"}}><Truck size={22} color="#fff"/></div><div><div style={{fontSize:22,fontWeight:700,color:"#0F1A2E"}}>FleetPro</div><div style={{fontSize:11,color:"#8D8D8D",textTransform:"uppercase",letterSpacing:"0.06em"}}>Fleet Management</div></div></div><div style={{marginBottom:20}}><label style={{display:"block",fontSize:12,fontWeight:600,color:"#525252",marginBottom:5}}>Email</label><input type="email" value={email} onChange={e=>{setEmail(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&handle()} placeholder="you@micmakin.com" style={{...inp,padding:"12px 14px"}}/></div><div style={{marginBottom:8}}><label style={{display:"block",fontSize:12,fontWeight:600,color:"#525252",marginBottom:5}}>Password</label><div style={{position:"relative"}}><input type={showPass?"text":"password"} value={pass} onChange={e=>{setPass(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&handle()} placeholder="Enter password" style={{...inp,padding:"12px 14px",paddingRight:40}}/><button onClick={()=>setShowPass(!showPass)} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",padding:4}}>{showPass?<EyeOff size={16} color="#8D8D8D"/>:<Eye size={16} color="#8D8D8D"/>}</button></div></div>{err&&<div style={{color:"#DA1E28",fontSize:12,fontWeight:500,marginBottom:10}}>{err}</div>}<button onClick={resetMode?handleReset:handle} disabled={loading} style={{width:"100%",padding:"13px",borderRadius:10,border:"none",background:P,color:"#fff",fontSize:14,fontWeight:700,cursor:loading?"wait":"pointer",marginTop:14,opacity:loading?0.7:1}}>{loading?(resetMode?"Sending...":"Signing in..."):(resetMode?"Send Reset Link":"Sign In")}</button>{resetMsg&&<div style={{marginTop:12,padding:10,borderRadius:8,background:"#24A14818",color:"#24A148",fontSize:12,textAlign:"center"}}>{resetMsg}</div>}<div style={{textAlign:"center",marginTop:16}}><button onClick={()=>{setResetMode(!resetMode);setErr("");setResetMsg("");}} style={{background:"none",border:"none",color:P,fontSize:12,fontWeight:600,cursor:"pointer"}}>{resetMode?"Back to Sign In":"Forgot Password?"}</button></div></div></div>);
}


function FleetProAppInner(){
  const [user,setUser]=useState(null);const [authLoading,setAuthLoading]=useState(true);
  const [col,setCol]=useState(false);const navigate=useNavigate();const location=useLocation();const page=NAV.find(n=>n.path===location.pathname)?.id||"dashboard";const setPage=(id)=>{const item=NAV.find(n=>n.id===id);if(item)navigate(item.path);};const [showUserMenu,setShowUserMenu]=useState(false);const [mob,setMob]=useState(typeof window!=="undefined"&&window.innerWidth<768);const [showNav,setShowNav]=useState(false);
  useEffect(()=>{const h=()=>{const m=window.innerWidth<768;setMob(m);if(!m)setShowNav(false);};window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[]);
  const [vehicles,setVehicles]=useState([]);const [generators,setGenerators]=useState([]);const [drivers,setDrivers]=useState([]);
  const [workOrders,setWorkOrders]=useState([]);const [fuelLogs,setFuelLogs]=useState([]);const [odoLog,setOdoLog]=useState([]);
  const [papers,setPapers]=useState([]);const [inspections,setInspections]=useState([]);const [svcReminders,setSvcReminders]=useState([]);
  const [locations,setLocations]=useState([]);const [vendors,setVendors]=useState([]);
  const [docTypes,setDocTypes]=useState([]);const [vendorTypes,setVendorTypes]=useState([]);const [inspItems,setInspItems]=useState([]);
  const [users,setUsers]=useState([]);
  // Diesel module state
  const [dieselReadings,setDieselReadings]=useState([]);
  const [dieselPurchases,setDieselPurchases]=useState([]);
  const [dieselDistributions,setDieselDistributions]=useState([]);
  const [genBaselines,setGenBaselines]=useState([]);
  const [nepaPeriodLogs,setNepaPeriodLogs]=useState([]);
  const [dieselTransfers,setDieselTransfers]=useState([]);
  const [dieselLocks,setDieselLocks]=useState([]);
  const [appSettings,setAppSettings]=useState({diesel_auto_lock_days:1,diesel_require_photo_backdated:true});
  const canEdit=user?.role!=="Viewer"&&user?.role!=="Store Staff";
  const isStoreStaff=user?.role==="Store Staff";

  const loadAllData=useCallback(async()=>{
    try{
      // Warm up the auth token ONCE before firing the ~23 concurrent table
      // fetches below. If the access token is expired, this triggers a single
      // coordinated refresh while nothing else is contending for the auth lock
      // — so the bulk fetches run with a fresh, cached token and never trigger
      // a mid-load refresh that would hold the lock and get stolen/aborted.
      await supabase.auth.getSession();
      const [v,g,d,wo,fl,ol,vn,p,ins,sr,loc,dt,vt,ii,pr,dr,dp,dd,gb,npl,dlk,as,dtr]=await Promise.all([
        db.getVehicles(),db.getGenerators(),db.getDrivers(),db.getWorkOrders(),
        db.getFuelLogs(),db.getOdoLog(),db.getVendors(),db.getPapers(),
        db.getInspections(),db.getSvcReminders(),db.getLocations(),
        db.getDocTypes(),db.getVendorTypes(),db.getInspItems(),db.getProfiles(),
        db.getDieselReadings(),db.getDieselPurchases(),db.getDieselDistributions(),
        db.getGeneratorBaselines(),db.getNepaPeriodLogs(),db.getDieselLocks(),db.getAppSettings(),
        db.getDieselTransfers()
      ]);
      setVehicles(v.map(toV));setGenerators(g.map(toG));setDrivers(d);setWorkOrders(wo.map(toWO));
      setFuelLogs(fl.map(toFL));setOdoLog(ol.map(toOdo));setVendors(vn);setPapers(p.map(toP));
      setInspections(ins);setSvcReminders(sr.map(toSR));
      setLocations(loc.map(l=>l.name));setDocTypes(dt.map(d=>d.name));setVendorTypes(vt.map(t=>t.name));
      setInspItems(ii.map(i=>i.name));setUsers(pr);
      setDieselReadings(dr.map(toDR));setDieselPurchases(dp.map(toDP));
      setDieselDistributions(dd.map(toDD));setGenBaselines(gb);
      setNepaPeriodLogs((npl||[]).map(toNPL));setDieselLocks((dlk||[]).map(toLOCK));
      setDieselTransfers((dtr||[]).map(toDT));
      const settingsObj={diesel_auto_lock_days:1,diesel_require_photo_backdated:true};
      (as||[]).forEach(row=>{settingsObj[row.key]=row.value;});
      setAppSettings(settingsObj);
      console.log("FleetPro: Data loaded",{v:v.length,g:g.length,fl:fl.length,wo:wo.length,dr:dr.length,npl:(npl||[]).length});
    }catch(e){console.error("FleetPro: Error loading data",e);}
  },[]);

  useEffect(()=>{
    supabase.auth.getSession().then(async({data:{session}})=>{
      if(session){
        try{const profile=await getProfile(session.user.id);setUser({...profile,uid:session.user.id});await loadAllData();}
        catch(e){console.error("Auth error:",e);}
      }
      setAuthLoading(false);
    }).catch(e=>{console.error("Session error:",e);setAuthLoading(false);});
    const{data:{subscription}}=supabase.auth.onAuthStateChange(async(event,session)=>{
      if(event==='SIGNED_OUT'){setUser(null);}
    });
    return()=>subscription.unsubscribe();
  },[loadAllData]);

  const handleLogin=async(profile)=>{setUser(profile);await loadAllData();};
  const handleLogout=async()=>{await signOut();setUser(null);};
  
  if(authLoading) return <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#F4F4F4",fontFamily:"'DM Sans',sans-serif"}}><div style={{textAlign:"center"}}><div style={{width:32,height:32,border:"3px solid #E0E0E0",borderTop:"3px solid "+P,borderRadius:"50%",animation:"spin 1s linear infinite"}}/><div style={{marginTop:12,fontSize:14,color:"#8D8D8D"}}>Loading FleetPro...</div></div><style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style></div>;
  if(!user) return <LoginPage onLogin={handleLogin}/>;
  const sw=mob?0:(col?64:240);const titles={dashboard:"Dashboard",diesel:"Diesel Log","diesel-mgmt":"Diesel Management",vehicles:"Vehicles",generators:"Generators",drivers:"Drivers",fuel:"Fuel & Energy",workorders:"Work Orders",papers:"Vehicle Papers",service:"Service Reminders",inspections:"Daily Inspections",vendors:"Vendors",reports:"Reports",settings:"Settings"};
  return(<div style={{minHeight:"100vh",background:"#F7F8FC",fontFamily:"'DM Sans',system-ui,sans-serif"}}><link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/>
    {mob&&showNav&&<div onClick={()=>setShowNav(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:998}}/>}
    <div style={{width:mob?280:(col?64:240),minHeight:"100vh",background:"linear-gradient(180deg,#0F1A2E 0%,#162D50 100%)",position:"fixed",left:mob?(showNav?0:-280):0,top:0,zIndex:999,transition:mob?"left 0.25s ease":"width 0.2s",overflow:"hidden",boxShadow:mob&&showNav?"4px 0 20px rgba(0,0,0,0.3)":"none"}}>
      <div style={{padding:col&&!mob?"18px 12px":"18px 20px",display:"flex",alignItems:"center",gap:10,borderBottom:"1px solid rgba(255,255,255,0.06)"}}><div style={{width:34,height:34,borderRadius:8,background:`linear-gradient(135deg,${P},#4589FF)`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Truck size={18} color="#fff"/></div>{(!col||mob)&&<div><div style={{fontSize:16,fontWeight:700,color:"#fff"}}>FleetPro</div><div style={{fontSize:9,color:"rgba(255,255,255,0.4)",textTransform:"uppercase",letterSpacing:"0.06em"}}>Fleet Management</div></div>}</div>
      <nav style={{padding:"10px 8px",display:"flex",flexDirection:"column",gap:2,overflowY:"auto",maxHeight:"calc(100vh - 120px)"}}>{(()=>{const items=NAV.filter(item=>isStoreStaff?["staff-dashboard","diesel","diesel-mgmt","generators","settings"].includes(item.id):true);return items.map((item,idx)=>{const active=page===item.id;const Icon=item.icon;const newGroup=idx===0||items[idx-1].group!==item.group;return(<div key={item.id}>{newGroup&&((!col||mob)?<div style={{fontSize:9,fontWeight:700,letterSpacing:"0.12em",color:"rgba(255,255,255,0.25)",padding:idx===0?"2px 12px 4px":"12px 12px 4px",textTransform:"uppercase"}}>{item.group}</div>:idx>0&&<div style={{height:1,background:"rgba(255,255,255,0.08)",margin:"8px 6px"}}/>)}<button onClick={()=>{setPage(item.id);if(mob)setShowNav(false);}} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:8,border:"none",cursor:"pointer",width:"100%",textAlign:"left",background:active?"rgba(15,98,254,0.15)":"transparent",color:active?"#78A9FF":"rgba(255,255,255,0.5)",fontSize:13,fontWeight:active?600:400,position:"relative"}}>{active&&<div style={{position:"absolute",left:0,top:"50%",transform:"translateY(-50%)",width:3,height:18,borderRadius:2,background:P}}/>}<Icon size={17} style={{flexShrink:0}}/>{(!col||mob)&&item.label}</button></div>);});})()}</nav>
      {!mob&&<div style={{position:"absolute",bottom:0,left:0,right:0,padding:"10px 8px",borderTop:"1px solid rgba(255,255,255,0.06)"}}><button onClick={()=>setCol(!col)} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:8,borderRadius:7,border:"none",cursor:"pointer",width:"100%",background:"rgba(255,255,255,0.04)",color:"rgba(255,255,255,0.35)",fontSize:12}}>{col?<ChevronRight size={15}/>:<><ChevronLeft size={15}/> Collapse</>}</button></div>}
    </div>
    <header style={{height:56,background:"#fff",borderBottom:"1px solid #E8ECF1",display:"flex",alignItems:"center",justifyContent:"space-between",padding:mob?"0 12px":"0 24px",position:"sticky",top:0,zIndex:50,marginLeft:sw,transition:"margin-left 0.2s"}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        {mob&&<button onClick={()=>setShowNav(true)} style={{background:"none",border:"none",cursor:"pointer",padding:4,display:"flex"}}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#161616" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg></button>}
        <h1 style={{fontSize:mob?15:17,fontWeight:700,margin:0}}>{titles[page]}</h1>
        {!mob&&<span style={{fontSize:11,color:"#8D8D8D"}}>{new Date().toLocaleDateString("en-NG",{month:"short",day:"numeric",year:"numeric"})}</span>}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        {!mob&&<div style={{display:"flex",alignItems:"center",gap:6,padding:"7px 12px",borderRadius:8,background:"#F4F4F4",width:200}}><Search size={14} color="#8D8D8D"/><input placeholder="Search..." style={{border:"none",outline:"none",background:"transparent",fontSize:12,width:"100%",fontFamily:"inherit"}}/></div>}
        <div style={{position:"relative"}}><button onClick={()=>setShowUserMenu(!showUserMenu)} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",cursor:"pointer",padding:"4px 8px",borderRadius:8}}><div style={{width:32,height:32,borderRadius:"50%",background:`linear-gradient(135deg,${P},#6929C4)`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:11,fontWeight:700}}>{user.avatar}</div>{!mob&&<div style={{textAlign:"left"}}><div style={{fontSize:12,fontWeight:600,color:"#161616"}}>{user.name}</div><div style={{fontSize:10,color:user.role==="Super Admin"?"#DA1E28":user.role==="Fleet Manager"?P:"#8D8D8D",fontWeight:600}}>{user.role}</div></div>}</button>{showUserMenu&&(<div style={{position:"absolute",top:"100%",right:0,background:"#fff",border:"1.5px solid #E0E0E0",borderRadius:10,marginTop:6,width:200,boxShadow:"0 8px 24px rgba(0,0,0,0.12)",zIndex:999,overflow:"hidden"}}><div style={{padding:"14px 16px",borderBottom:"1px solid #F4F4F4"}}><div style={{fontSize:13,fontWeight:600}}>{user.name}</div><div style={{fontSize:11,color:"#8D8D8D"}}>{user.email}</div><div style={{display:"inline-block",marginTop:4,fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:10,background:user.role==="Super Admin"?"#DA1E2818":user.role==="Fleet Manager"?"#0F62FE18":"#8D8D8D18",color:user.role==="Super Admin"?"#DA1E28":user.role==="Fleet Manager"?P:"#8D8D8D"}}>{user.role}</div></div><button onClick={()=>{handleLogout();setShowUserMenu(false);}} style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"12px 16px",background:"none",border:"none",cursor:"pointer",fontSize:12,fontWeight:600,color:"#DA1E28"}}><LogOut size={14}/>Sign Out</button></div>)}</div>
      </div>
    </header>
    <main style={{marginLeft:sw,padding:mob?"14px 10px":"20px 24px",transition:"margin-left 0.2s",minHeight:"calc(100vh - 56px)"}}>
      <Routes>
        <Route path="/" element={isStoreStaff?<Navigate to="/staff-dashboard" replace/>:<DashPage vehicles={vehicles} generators={generators} workOrders={workOrders} go={setPage} fuelLogs={fuelLogs} dieselReadings={dieselReadings} dieselPurchases={dieselPurchases} dieselDistributions={dieselDistributions} papers={papers} svcReminders={svcReminders}/>}/>
        <Route path="/diesel" element={<DieselLogPage generators={generators} setGenerators={setGenerators} dieselReadings={dieselReadings} setDieselReadings={setDieselReadings} dieselDistributions={dieselDistributions} setDieselDistributions={setDieselDistributions} dieselPurchases={dieselPurchases} user={user} locations={locations} odoLog={odoLog} setOdoLog={setOdoLog} genBaselines={genBaselines} setGenBaselines={setGenBaselines} nepaPeriodLogs={nepaPeriodLogs} setNepaPeriodLogs={setNepaPeriodLogs} dieselLocks={dieselLocks} appSettings={appSettings} vehicles={vehicles} dieselTransfers={dieselTransfers} setDieselTransfers={setDieselTransfers}/>}/>
        <Route path="/staff-dashboard" element={<StaffDashboardPage generators={generators} dieselReadings={dieselReadings} setDieselReadings={setDieselReadings} dieselDistributions={dieselDistributions} setDieselDistributions={setDieselDistributions} dieselPurchases={dieselPurchases} user={user}/>}/>
        <Route path="/diesel-mgmt" element={<DieselMgmtPage dieselPurchases={dieselPurchases} setDieselPurchases={setDieselPurchases} dieselDistributions={dieselDistributions} setDieselDistributions={setDieselDistributions} locations={locations} vendors={vendors} user={user} dieselReadings={dieselReadings} generators={generators} genBaselines={genBaselines} setGenBaselines={setGenBaselines} dieselTransfers={dieselTransfers} setDieselTransfers={setDieselTransfers} vehicles={vehicles}/>}/>
        <Route path="/vehicles" element={<VehiclesPage vehicles={vehicles} setVehicles={setVehicles} locations={locations} fuelLogs={fuelLogs} workOrders={workOrders} inspections={inspections} papers={papers} svcReminders={svcReminders} canEdit={canEdit} odoLog={odoLog} setOdoLog={setOdoLog}/>}/>
        <Route path="/snap" element={<div style={{maxWidth:500,margin:"20px auto"}}><MeterSnap generators={generators} setGenerators={setGenerators} odoLog={odoLog} setOdoLog={setOdoLog}/></div>}/>
        <Route path="/generators" element={<GenPage generators={isStoreStaff?generators.filter(g=>g.loc===user?.store_location):generators} setGenerators={setGenerators} locations={locations} fuelLogs={fuelLogs} canEdit={canEdit} odoLog={odoLog} setOdoLog={setOdoLog} dieselReadings={dieselReadings}/>}/>
        <Route path="/drivers" element={<DriversPage drivers={drivers} setDrivers={setDrivers} canEdit={canEdit}/>}/>
        <Route path="/fuel" element={<FuelPage fuelLogs={fuelLogs} setFuelLogs={setFuelLogs} vehicles={vehicles} generators={generators} canEdit={canEdit} odoLog={odoLog} setOdoLog={setOdoLog} vendors={vendors}/>}/>
        <Route path="/workorders" element={<WOPage workOrders={workOrders} setWorkOrders={setWorkOrders} vehicles={vehicles} generators={generators} vendors={vendors} canEdit={canEdit}/>}/>
        <Route path="/papers" element={<PapersPage vehicles={vehicles} papers={papers} setPapers={setPapers} canEdit={canEdit} docTypes={docTypes} setDocTypes={setDocTypes}/>}/>
        <Route path="/service" element={<ServicePage vehicles={vehicles} svcReminders={svcReminders} setSvcReminders={setSvcReminders} canEdit={canEdit}/>}/>
        <Route path="/inspections" element={<InspectionPage vehicles={vehicles} drivers={drivers} inspections={inspections} setInspections={setInspections} canEdit={canEdit} inspItems={inspItems} setInspItems={setInspItems}/>}/>
        <Route path="/vendors" element={<VendorsPage vendors={vendors} setVendors={setVendors} vendorTypes={vendorTypes} canEdit={canEdit}/>}/>
        <Route path="/reports" element={<ReportsPage vehicles={vehicles} generators={generators} drivers={drivers} workOrders={workOrders} fuelLogs={fuelLogs} dieselReadings={dieselReadings} dieselPurchases={dieselPurchases} dieselDistributions={dieselDistributions}/>}/>
        <Route path="/live-map" element={isStoreStaff?<Navigate to="/staff-dashboard" replace/>:<LiveMapPage/>}/>
        <Route path="/settings" element={<SettingsPage locations={locations} setLocations={setLocations} vendorTypes={vendorTypes} setVendorTypes={setVendorTypes} users={users} setUsers={setUsers} user={user} setUser={setUser} appSettings={appSettings} setAppSettings={setAppSettings} dieselLocks={dieselLocks} setDieselLocks={setDieselLocks}/>}/>
        <Route path="*" element={<Navigate to="/" replace/>}/>
      </Routes>
    </main>
  </div>);
}

export default function FleetProApp(){return <BrowserRouter><FleetProAppInner/></BrowserRouter>;}
