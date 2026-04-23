import { useState, useEffect, useCallback } from "react";
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";
import { AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";
import { Truck, Users, Fuel, Wrench, Settings, FileText, Home, ChevronLeft, ChevronRight, Plus, Search, Zap, Clock, Gauge, DollarSign, AlertTriangle, X, Save, LogOut, Eye, EyeOff, Shield, Download, BarChart3, ClipboardList, Trash2, Pencil, FileCheck, Bell, CheckCircle, Briefcase, Camera, Droplet, Trophy, TrendingUp, TrendingDown, Package, Send, ShoppingCart } from "lucide-react";
import { supabase } from "./supabase.js";
import { db, signIn, signOut, getSession, getProfile, inviteUser, resetPassword } from "./db.js";

const CD=[{m:"Sep",fuel:4.2,maint:2.8},{m:"Oct",fuel:4.5,maint:2.3},{m:"Nov",fuel:4.0,maint:3.2},{m:"Dec",fuel:3.5,maint:2.4},{m:"Jan",fuel:3.9,maint:3.8},{m:"Feb",fuel:4.4,maint:1.9}];
const isMob=()=>typeof window!=="undefined"&&window.innerWidth<768;
const P="#0F62FE";
// DB field mappers
const toV=(r)=>({id:r.id,name:r.name,type:r.type,year:r.year,status:r.status,km:Number(r.km)||0,driver:r.driver,loc:r.loc,nextSvc:r.next_svc,plate:r.plate,img:r.img,vin:r.vin,group:r.grp,fuelType:r.fuel_type,svcCostLife:Number(r.svc_cost_life)||0,fuelCostLife:Number(r.fuel_cost_life)||0,otherCostLife:Number(r.other_cost_life)||0});
const fromV=(v)=>({id:v.id,name:v.name,type:v.type,year:v.year||0,status:v.status,km:v.km||0,driver:v.driver||"",loc:v.loc||"",next_svc:v.nextSvc||"",plate:v.plate||"",img:v.img||"🚛",vin:v.vin||"",grp:v.group||"",fuel_type:v.fuelType||"",svc_cost_life:v.svcCostLife||0,fuel_cost_life:v.fuelCostLife||0,other_cost_life:v.otherCostLife||0});
const toG=(r)=>({id:r.id,name:r.name,brand:r.brand,cap:r.cap,status:r.status,hrs:Number(r.hrs)||0,loc:r.loc,nextSvc:r.next_svc,costHr:Number(r.cost_hr)||0,tank:r.tank,assigned:r.assigned,fuelType:r.fuel_type,svcCostLife:Number(r.svc_cost_life)||0,fuelCostLife:Number(r.fuel_cost_life)||0});
const fromG=(g)=>({id:g.id,name:g.name,brand:g.brand||"",cap:g.cap||"",status:g.status,hrs:g.hrs||0,loc:g.loc||"",next_svc:g.nextSvc||"",cost_hr:g.costHr||0,tank:g.tank||0,assigned:g.assigned||"",fuel_type:g.fuelType||"",svc_cost_life:g.svcCostLife||0,fuel_cost_life:g.fuelCostLife||0});
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
const toDR=(r)=>({id:r.id,generatorId:r.generator_id,storeLoc:r.store_location,date:r.date,genHoursOpening:Number(r.gen_hours_opening)||null,genHoursClosing:Number(r.gen_hours_closing)||null,hoursRun:Number(r.hours_run)||0,dieselLevelActual:Number(r.diesel_level_actual)||null,dieselLevelTheoretical:Number(r.diesel_level_theoretical)||null,dieselAdded:Number(r.diesel_added)||0,consumptionLitres:Number(r.consumption_litres)||null,consumptionRate:Number(r.consumption_rate)||null,genPhotoUrl:r.gen_photo_url,genSource:r.gen_photo_reading_source||"manual",aiReadings:r.ai_readings_json,aiConfidence:r.ai_confidence,nepaHours:Number(r.nepa_hours)||0,nepaMeterOpening:Number(r.nepa_meter_opening)||null,nepaMeterClosing:Number(r.nepa_meter_closing)||null,nepaPhotoUrl:r.nepa_photo_url,nepaSource:r.nepa_source||"manual",discrepancyLitres:Number(r.discrepancy_litres)||null,discrepancyFlag:r.discrepancy_flag,submittedBy:r.submitted_by,notes:r.notes,createdAt:r.created_at});
const fromDR=(d)=>({generator_id:d.generatorId,store_location:d.storeLoc,date:d.date,gen_hours_opening:d.genHoursOpening,gen_hours_closing:d.genHoursClosing,diesel_level_actual:d.dieselLevelActual,diesel_level_theoretical:d.dieselLevelTheoretical,diesel_added:d.dieselAdded||0,consumption_litres:d.consumptionLitres,consumption_rate:d.consumptionRate,gen_photo_url:d.genPhotoUrl||"",gen_photo_reading_source:d.genSource||"manual",ai_readings_json:d.aiReadings||null,ai_confidence:d.aiConfidence||null,nepa_hours:d.nepaHours||0,nepa_meter_opening:d.nepaMeterOpening,nepa_meter_closing:d.nepaMeterClosing,nepa_photo_url:d.nepaPhotoUrl||"",nepa_source:d.nepaSource||"manual",discrepancy_litres:d.discrepancyLitres,discrepancy_flag:d.discrepancyFlag||false,submitted_by:d.submittedBy,notes:d.notes||""});
const toDP=(r)=>({id:r.id,date:r.date,supplier:r.supplier,litres:Number(r.litres)||0,pricePerL:Number(r.price_per_litre)||0,totalCost:Number(r.total_cost)||0,notes:r.notes,purchasedBy:r.purchased_by,createdAt:r.created_at});
const fromDP=(p)=>({date:p.date,supplier:p.supplier,litres:p.litres,price_per_litre:p.pricePerL,notes:p.notes||"",purchased_by:p.purchasedBy});
const toDD=(r)=>({id:r.id,purchaseId:r.purchase_id,date:r.date,storeLoc:r.store_location,litres:Number(r.litres)||0,confirmed:r.received_confirmed,receivedDate:r.received_date,receivedBy:r.received_by,notes:r.notes,distributedBy:r.distributed_by,createdAt:r.created_at});
const fromDD2=(d)=>({purchase_id:d.purchaseId||null,date:d.date,store_location:d.storeLoc,litres:d.litres,received_confirmed:d.confirmed||false,notes:d.notes||"",distributed_by:d.distributedBy});
const fmt=v=>"\u20A6"+Number(v).toLocaleString();
const th={padding:"10px 14px",textAlign:"left",fontSize:11,fontWeight:600,color:"#6F6F6F",textTransform:"uppercase"};
const tc={padding:"11px 14px",borderBottom:"1px solid #F4F4F4",fontSize:13};
const inp={width:"100%",padding:"9px 12px",borderRadius:8,border:"1.5px solid #E0E0E0",fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box"};

function Badge({label}){const m={Active:"#24A148",Completed:"#24A148","On Duty":"#24A148","In Shop":"#F1C21B","In Maintenance":"#F1C21B",Open:"#F1C21B","In Progress":P,Standby:"#8A3FFC","Off Duty":"#8D8D8D","Out of Service":"#DA1E28",Critical:"#DA1E28",High:"#FF832B",Medium:"#F1C21B",Low:"#8D8D8D"};const c=m[label]||"#8D8D8D";return(<span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 10px",borderRadius:20,background:c+"18",color:c,fontSize:11,fontWeight:600}}><span style={{width:6,height:6,borderRadius:"50%",background:c}}/>{label}</span>);}

function Kpi({icon:Icon,label,value,sub,accent,onClick}){return(<div onClick={onClick} style={{background:"#fff",borderRadius:14,padding:"18px 20px",border:"1px solid #E8ECF1",cursor:onClick?"pointer":"default"}}><div style={{width:36,height:36,borderRadius:9,background:accent||"#D0E2FF",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:8}}><Icon size={17} color={accent?"#fff":P}/></div><div style={{fontSize:22,fontWeight:700}}>{value}</div><div style={{fontSize:12,color:"#6F6F6F",marginTop:2}}>{label}</div>{sub&&<div style={{fontSize:11,color:"#8D8D8D",marginTop:1}}>{sub}</div>}</div>);}

function Modal({title,onClose,children}){const isMob=window.innerWidth<768;return(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:isMob?"flex-end":"center",justifyContent:"center",zIndex:1000}} onClick={onClose}><div style={{background:"#fff",borderRadius:isMob?"16px 16px 0 0":16,width:isMob?"100%":520,maxHeight:isMob?"92vh":"85vh",overflow:"auto",boxShadow:isMob?"0 -10px 40px rgba(0,0,0,0.2)":"0 20px 60px rgba(0,0,0,0.2)"}} onClick={e=>e.stopPropagation()}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"18px 22px",borderBottom:"1px solid #E8ECF1"}}><h3 style={{fontSize:16,fontWeight:700,margin:0}}>{title}</h3><button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",padding:4}}><X size={18} color="#8D8D8D"/></button></div><div style={{padding:"20px 22px"}}>{children}</div></div></div>);}

function Field({label,children}){return(<div style={{marginBottom:14}}><label style={{display:"block",fontSize:12,fontWeight:600,color:"#525252",marginBottom:4}}>{label}</label>{children}</div>);}

function SearchSelect({options,value,onChange,placeholder}){
  const [open,setOpen]=useState(false);const [q,setQ]=useState("");
  const filtered=options.filter(o=>(o.label||"").toLowerCase().includes(q.toLowerCase()));
  const selected=options.find(o=>o.value===value);
  return(<div style={{position:"relative"}}><div onClick={()=>setOpen(!open)} style={{...inp,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",background:"#fff"}}><span style={{color:selected?"#161616":"#8D8D8D",fontSize:13}}>{selected?selected.label:(placeholder||"-- Select --")}</span><ChevronRight size={13} color="#8D8D8D" style={{transform:open?"rotate(90deg)":"rotate(0)",transition:"transform 0.15s"}}/></div>{open&&(<div style={{position:"absolute",top:"100%",left:0,right:0,background:"#fff",border:"1.5px solid #E0E0E0",borderRadius:8,marginTop:4,zIndex:999,maxHeight:220,overflow:"auto",boxShadow:"0 8px 24px rgba(0,0,0,0.12)"}}><div style={{padding:"8px 10px",borderBottom:"1px solid #F4F4F4",position:"sticky",top:0,background:"#fff"}}><div style={{display:"flex",alignItems:"center",gap:6,background:"#F4F4F4",borderRadius:6,padding:"6px 10px"}}><Search size={13} color="#8D8D8D"/><input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Type to search..." style={{border:"none",outline:"none",background:"transparent",fontSize:12,width:"100%",fontFamily:"inherit"}}/></div></div>{filtered.length===0?(<div style={{padding:14,textAlign:"center",color:"#8D8D8D",fontSize:12}}>No results</div>):filtered.map(o=>(<div key={o.value} onClick={()=>{onChange(o.value);setOpen(false);setQ("");}} style={{padding:"9px 14px",cursor:"pointer",fontSize:13,fontWeight:value===o.value?600:400,color:value===o.value?P:"#161616",background:value===o.value?"#D0E2FF":"transparent"}} onMouseEnter={e=>{if(value!==o.value)e.currentTarget.style.background="#F8FAFF"}} onMouseLeave={e=>{if(value!==o.value)e.currentTarget.style.background="transparent"}}>{o.label}</div>))}</div>)}</div>);
}

function DashPage({vehicles,generators,workOrders,go}){
  const av=vehicles.filter(v=>v.status==="Active").length;const ag=generators.filter(g=>g.status==="Active").length;const ow=workOrders.filter(w=>w.status!=="Completed").length;
  const pd=[{name:"Active",value:av,color:"#24A148"},{name:"In Shop",value:vehicles.filter(v=>v.status==="In Shop").length,color:"#F1C21B"},{name:"Out of Svc",value:vehicles.filter(v=>v.status==="Out of Service").length,color:"#DA1E28"}].filter(d=>d.value>0);
  return(<div style={{display:"flex",flexDirection:"column",gap:18}}>
    <div style={{background:"linear-gradient(135deg,#0F1A2E,#1A3A6B,#0F62FE)",borderRadius:16,padding:"24px 28px",color:"#fff"}}><div style={{fontSize:11,color:"rgba(255,255,255,0.5)",textTransform:"uppercase",letterSpacing:"0.08em"}}>Good morning</div><h2 style={{fontSize:20,fontWeight:700,margin:"4px 0 0"}}>Fleet Overview</h2><p style={{fontSize:13,color:"rgba(255,255,255,0.6)",marginTop:4}}>{av} vehicles + {ag} generators active</p></div>
    <div style={{display:"grid",gridTemplateColumns:window.innerWidth<768?"1fr 1fr":"repeat(4,1fr)",gap:14}}><Kpi icon={Truck} label="Vehicles" value={`${av}/${vehicles.length}`} onClick={()=>go("vehicles")}/><Kpi icon={Zap} label="Generators" value={`${ag}/${generators.length}`} onClick={()=>go("generators")}/><Kpi icon={Wrench} label="Open WOs" value={ow} accent="#FF832B" onClick={()=>go("workorders")}/><Kpi icon={DollarSign} label="Monthly Cost" value={fmt(8440000)}/></div>
    <div style={{display:"grid",gridTemplateColumns:"1.5fr 1fr",gap:14}}>
      <div style={{background:"#fff",borderRadius:14,padding:20,border:"1px solid #E8ECF1"}}><h3 style={{fontSize:14,fontWeight:700,margin:"0 0 12px"}}>Operating Costs</h3><ResponsiveContainer width="100%" height={180}><AreaChart data={CD}><CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0"/><XAxis dataKey="m" tick={{fontSize:11,fill:"#8D8D8D"}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:11,fill:"#8D8D8D"}} axisLine={false} tickLine={false}/><Tooltip/><Area dataKey="fuel" stroke={P} fill={P+"20"} strokeWidth={2}/><Area dataKey="maint" stroke="#FF832B" fill="#FF832B20" strokeWidth={2}/></AreaChart></ResponsiveContainer></div>
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
  const handleSave=async()=>{const img=form.type==="Van"?"\ud83d\ude90":form.type.includes("Semi")||form.type.includes("Heavy")?"\ud83d\ude9a":"\ud83d\ude9b";try{if(editV){const up=fromV({...form,year:parseInt(form.year),km:parseInt(form.km)||0,img,id:editV});await db.updateVehicle(editV,up);setVehicles(vehicles.map(v=>v.id===editV?{...v,...form,year:parseInt(form.year),km:parseInt(form.km)||0,img}:v));setEditV(null);}else{const nid=`V-${String(Math.max(0,...vehicles.map(v=>parseInt(v.id.replace(/\D/g,""))||0))+1).padStart(4,"0")}`;const nv=fromV({id:nid,...form,year:parseInt(form.year),km:parseInt(form.km)||0,img});const saved=await db.addVehicle(nv);if(saved){setVehicles(prev=>[...prev,toV(saved)]);}else{const all=await db.getVehicles();setVehicles(all.map(toV));}}setShowAdd(false);setForm(defForm);}catch(e){alert("Error: "+e.message);}};
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

function GenPage({generators,setGenerators,locations,fuelLogs,canEdit,odoLog,setOdoLog}){
  const [sel,setSel]=useState(null);const [filt,setFilt]=useState("All");const [showAdd,setShowAdd]=useState(false);const [showSnap,setShowSnap]=useState(false);const [editG,setEditG]=useState(null);const [showHrs,setShowHrs]=useState(false);const [hrsVal,setHrsVal]=useState("");const [hrsDate,setHrsDate]=useState("2026-02-27");
  const defForm={name:"",brand:"",cap:"",status:"Active",hrs:"0",loc:locations[0]||"",nextSvc:"",costHr:"",tank:"",assigned:""};
  const [form,setForm]=useState(defForm);
  const list=filt==="All"?generators:generators.filter(g=>g.status===filt);
  const handleSave=async()=>{try{if(editG){const up=fromG({...form,hrs:parseInt(form.hrs)||0,costHr:parseInt(form.costHr)||0,tank:parseInt(form.tank)||0,id:editG});await db.updateGenerator(editG,up);setGenerators(generators.map(g=>g.id===editG?{...g,...form,hrs:parseInt(form.hrs)||0,costHr:parseInt(form.costHr)||0,tank:parseInt(form.tank)||0}:g));setEditG(null);}else{const nid=`G-${String(Math.max(0,...generators.map(g=>parseInt(g.id.replace(/\D/g,""))||0))+1).padStart(3,"0")}`;const ng=fromG({id:nid,...form,hrs:parseInt(form.hrs)||0,costHr:parseInt(form.costHr)||0,tank:parseInt(form.tank)||0});const saved=await db.addGenerator(ng);if(saved){setGenerators(prev=>[...prev,toG(saved)]);}else{const all=await db.getGenerators();setGenerators(all.map(toG));}}setShowAdd(false);setForm(defForm);}catch(e){alert("Error: "+e.message);}};
  const handleDelete=async(id)=>{if(confirm("Delete this generator?")){try{await db.deleteGenerator(id);setGenerators(generators.filter(g=>g.id!==id));if(sel===id)setSel(null);}catch(e){alert("Error: "+e.message);}}};
  const startEdit=(g)=>{setForm({name:g.name,brand:g.brand||"",cap:g.cap||"",status:g.status,hrs:String(g.hrs||0),loc:g.loc||"",nextSvc:g.nextSvc||"",costHr:String(g.costHr||""),tank:String(g.tank||""),assigned:g.assigned||""});setEditG(g.id);setShowAdd(true);};
  const addHrsReading=async(gid)=>{const val=parseFloat(hrsVal);if(!val)return;try{const saved=await db.addOdoLog({asset:gid,reading:val,date:hrsDate,type:"manual"});setOdoLog([...odoLog,toOdo(saved)]);await db.updateGenerator(gid,{hrs:val});setGenerators(generators.map(g=>g.id===gid?{...g,hrs:val}:g));setShowHrs(false);setHrsVal("");}catch(e){alert("Error: "+e.message);}};
  const gHrsHistory=(gid)=>odoLog.filter(o=>o.asset===gid).sort((a,b)=>b.date.localeCompare(a.date));
  if(sel){const g=generators.find(x=>x.id===sel);if(!g){setSel(null);return null;}const hrsHist=gHrsHistory(g.id);return(<div><div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}><button onClick={()=>setSel(null)} style={{display:"flex",alignItems:"center",gap:4,background:"none",border:"none",cursor:"pointer",color:P,fontSize:13,fontWeight:600}}><ChevronLeft size={16}/> Back</button>{canEdit&&<div style={{display:"flex",gap:6}}><button onClick={()=>{startEdit(g);setSel(null);}} style={{display:"flex",alignItems:"center",gap:4,padding:"7px 14px",borderRadius:8,border:"1.5px solid #E0E0E0",background:"#fff",fontSize:12,fontWeight:600,cursor:"pointer",color:"#525252"}}><Pencil size={13}/>Edit</button><button onClick={()=>handleDelete(g.id)} style={{display:"flex",alignItems:"center",gap:4,padding:"7px 14px",borderRadius:8,border:"1.5px solid #E0E0E0",background:"#fff",fontSize:12,fontWeight:600,cursor:"pointer",color:"#DA1E28"}}><Trash2 size={13}/>Delete</button></div>}</div><div style={{background:"#fff",borderRadius:14,border:"1px solid #E8ECF1",overflow:"hidden"}}><div style={{background:"linear-gradient(135deg,#1a1a2e,#0f3460)",padding:"22px 26px",color:"#fff"}}><h2 style={{fontSize:18,fontWeight:700,margin:0}}>{g.name}</h2><div style={{fontSize:12,color:"rgba(255,255,255,0.6)",marginTop:2}}>{g.id} - {g.brand} - {g.cap}</div></div><div style={{padding:22,display:"grid",gridTemplateColumns:window.innerWidth<768?"1fr 1fr":"1fr 1fr 1fr",gap:14}}>{[["Run Hours",`${(g.hrs||0).toLocaleString()} hrs`],["Cost/Hour",g.costHr?fmt(g.costHr):"-"],["Capacity",g.cap||"-"],["Location",g.loc||"-"],["Fuel Type",g.fuelType||"-"],["Assigned",g.assigned||"-"],["Tank",g.tank?`${g.tank} L`:"-"],["Next Service",g.nextSvc||"-"],["Fuel Costs (Life)",g.fuelCostLife?fmt(g.fuelCostLife):"-"],["Service Costs (Life)",g.svcCostLife?fmt(g.svcCostLife):"-"]].map(([l,val])=>(<div key={l}><div style={{fontSize:11,color:"#8D8D8D"}}>{l}</div><div style={{fontSize:14,fontWeight:600,marginTop:2}}>{val}</div></div>))}</div></div>{canEdit&&<div style={{marginTop:14}}><button onClick={()=>setShowHrs(true)} style={{display:"flex",alignItems:"center",gap:5,padding:"9px 16px",borderRadius:9,background:P,color:"#fff",border:"none",fontSize:12,fontWeight:600,cursor:"pointer"}}><Clock size={14}/>Update Run Hours</button></div>}{showHrs&&(<Modal title="Update Run Hours" onClose={()=>setShowHrs(false)}><div style={{padding:"10px 0 6px",background:"#F4F4F4",borderRadius:8,textAlign:"center",marginBottom:14}}><div style={{fontSize:11,color:"#8D8D8D"}}>Current Hours</div><div style={{fontSize:20,fontWeight:700}}>{(g.hrs||0).toLocaleString()} hrs</div></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><Field label="New Hours *"><input style={inp} type="number" placeholder="e.g. 4900" value={hrsVal} onChange={e=>setHrsVal(e.target.value)}/></Field><Field label="Date"><input style={inp} type="date" value={hrsDate} onChange={e=>setHrsDate(e.target.value)}/></Field></div><div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:8}}><button onClick={()=>setShowHrs(false)} style={{padding:"9px 20px",borderRadius:8,border:"1.5px solid #E0E0E0",background:"#fff",color:"#525252",fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancel</button><button onClick={()=>addHrsReading(g.id)} disabled={!hrsVal} style={{padding:"9px 20px",borderRadius:8,border:"none",background:hrsVal?P:"#C6C6C6",color:"#fff",fontSize:13,fontWeight:600,cursor:hrsVal?"pointer":"not-allowed"}}><Save size={14}/> Save</button></div></Modal>)}{(()=>{const gFuel=fuelLogs?fuelLogs.filter(f=>f.asset===g.id&&f.isGen):[];return gFuel.length>0?(<div style={{marginTop:14,background:"#fff",borderRadius:14,border:"1px solid #E8ECF1",padding:18}}><h4 style={{fontSize:13,fontWeight:700,marginBottom:10}}>Fuel History ({gFuel.length})</h4><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr style={{background:"#F4F4F4"}}>{["Date","Litres","Cost","Reading","Station"].map(h=>(<th key={h} style={th}>{h}</th>))}</tr></thead><tbody>{gFuel.slice(0,10).map(f=>(<tr key={f.id}><td style={tc}>{f.date}</td><td style={tc}>{f.litres} L</td><td style={{...tc,fontWeight:600}}>{fmt(f.cost)}</td><td style={tc}>{f.reading?.toLocaleString()||"-"} hrs</td><td style={tc}>{f.station||"-"}</td></tr>))}</tbody></table>{gFuel.length>10&&<div style={{fontSize:11,color:"#8D8D8D",marginTop:4}}>{gFuel.length-10} more entries...</div>}</div>):null;})()}
{hrsHist.length>0&&<div style={{marginTop:14,background:"#fff",borderRadius:14,border:"1px solid #E8ECF1",padding:18}}><h4 style={{fontSize:13,fontWeight:700,marginBottom:10}}>Run Hours History</h4><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr style={{background:"#F4F4F4"}}>{["Date","Reading","Source"].map(h=>(<th key={h} style={th}>{h}</th>))}</tr></thead><tbody>{hrsHist.map(o=>(<tr key={o.id}><td style={tc}>{o.date}</td><td style={{...tc,fontWeight:600}}>{o.reading.toLocaleString()} hrs</td><td style={tc}><span style={{fontSize:11,padding:"2px 8px",borderRadius:4,background:o.type==="fuel"?"#D0E2FF":"#F4F4F4",color:o.type==="fuel"?P:"#525252",fontWeight:600}}>{o.type==="fuel"?"Fuel Log":"Manual"}</span></td></tr>))}</tbody></table></div>}</div>);}
  return(<div style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"grid",gridTemplateColumns:window.innerWidth<768?"1fr 1fr":"repeat(3,1fr)",gap:14}}><Kpi icon={Zap} label="Active" value={`${generators.filter(g=>g.status==="Active").length}/${generators.length}`}/><Kpi icon={Gauge} label="Total Run Hours" value={generators.reduce((s,g)=>s+(g.hrs||0),0).toLocaleString()}/><Kpi icon={Clock} label="In Maintenance" value={generators.filter(g=>g.status==="In Maintenance").length} accent="#FF832B"/></div>
    <div style={{display:"flex",justifyContent:"space-between"}}><div style={{display:"flex",gap:6}}>{["All","Active","In Maintenance","Standby"].map(s=>(<button key={s} onClick={()=>setFilt(s)} style={{padding:"6px 14px",borderRadius:7,border:filt===s?`1.5px solid ${P}`:"1.5px solid #E0E0E0",background:filt===s?"#D0E2FF":"#fff",color:filt===s?P:"#525252",fontSize:12,fontWeight:600,cursor:"pointer"}}>{s} ({s==="All"?generators.length:generators.filter(g=>g.status===s).length})</button>))}</div>{canEdit&&<div style={{display:"flex",gap:6}}><button onClick={()=>setShowSnap(true)} style={{display:"flex",alignItems:"center",gap:5,padding:"8px 14px",borderRadius:9,border:"1.5px solid "+P,background:"#D0E2FF",color:P,fontSize:12,fontWeight:600,cursor:"pointer"}}><Camera size={14}/>Snap Reading</button><button onClick={()=>{setEditG(null);setForm(defForm);setShowAdd(true);}} style={{display:"flex",alignItems:"center",gap:5,padding:"8px 16px",borderRadius:9,background:P,color:"#fff",border:"none",fontSize:12,fontWeight:600,cursor:"pointer"}}><Plus size={15}/>Add Generator</button></div>}</div>
    <div style={{background:"#fff",borderRadius:14,border:"1px solid #E8ECF1",overflow:"hidden"}}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr style={{background:"#F4F4F4"}}>{["Generator","Capacity","Status","Location","Run Hours","Cost/Hr",canEdit?"Actions":""].filter(Boolean).map(h=>(<th key={h} style={th}>{h}</th>))}</tr></thead><tbody>{list.map(g=>(<tr key={g.id} style={{cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background="#F8FAFF"} onMouseLeave={e=>e.currentTarget.style.background=""}><td style={tc} onClick={()=>setSel(g.id)}><div style={{display:"flex",alignItems:"center",gap:8}}><span>⚡</span><div><div style={{fontWeight:600}}>{g.name}</div><div style={{fontSize:11,color:"#8D8D8D"}}>{g.id}</div></div></div></td><td style={tc} onClick={()=>setSel(g.id)}>{g.cap||"-"}</td><td style={tc} onClick={()=>setSel(g.id)}><Badge label={g.status}/></td><td style={tc} onClick={()=>setSel(g.id)}>{g.loc}</td><td style={tc} onClick={()=>setSel(g.id)}>{(g.hrs||0).toLocaleString()} hrs</td><td style={tc} onClick={()=>setSel(g.id)}>{g.costHr?fmt(g.costHr):"-"}</td>{canEdit&&<td style={tc}><div style={{display:"flex",gap:4}}><button onClick={(e)=>{e.stopPropagation();startEdit(g);}} style={{padding:"4px 8px",borderRadius:5,border:"1px solid #E0E0E0",background:"#fff",cursor:"pointer"}}><Pencil size={12} color="#525252"/></button><button onClick={(e)=>{e.stopPropagation();handleDelete(g.id);}} style={{padding:"4px 8px",borderRadius:5,border:"1px solid #E0E0E0",background:"#fff",cursor:"pointer"}}><Trash2 size={12} color="#DA1E28"/></button></div></td>}</tr>))}</tbody></table></div>
    {showSnap&&(<div style={{position:"fixed",inset:0,background:"#F7F8FC",zIndex:1000,overflow:"auto",padding:isMob()?"16px":"30px 40px"}}><div style={{maxWidth:600,margin:"0 auto"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}><h2 style={{fontSize:18,fontWeight:700,margin:0}}>Snap Meter Reading</h2><button onClick={()=>setShowSnap(false)} style={{display:"flex",alignItems:"center",gap:5,padding:"8px 16px",borderRadius:8,border:"1.5px solid #E0E0E0",background:"#fff",fontSize:12,fontWeight:600,cursor:"pointer",color:"#525252"}}><X size={14}/>Close</button></div><MeterSnap generators={generators} setGenerators={setGenerators} odoLog={odoLog} setOdoLog={setOdoLog} embedded/></div></div>)}
        {showAdd&&(<Modal title={editG?"Edit Generator":"Add New Generator"} onClose={()=>{setShowAdd(false);setEditG(null);}}><Field label="Name *"><input style={inp} placeholder="e.g. Caterpillar C15 500kVA" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><Field label="Brand"><input style={inp} placeholder="Caterpillar" value={form.brand} onChange={e=>setForm({...form,brand:e.target.value})}/></Field><Field label="Capacity"><input style={inp} placeholder="500 kVA" value={form.cap} onChange={e=>setForm({...form,cap:e.target.value})}/></Field></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><Field label="Status"><select style={inp} value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option>Active</option><option>In Maintenance</option><option>Standby</option></select></Field><Field label="Run Hours"><input style={inp} type="number" value={form.hrs} onChange={e=>setForm({...form,hrs:e.target.value})}/></Field></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><Field label="Cost/Hour"><input style={inp} type="number" placeholder="3200" value={form.costHr} onChange={e=>setForm({...form,costHr:e.target.value})}/></Field><Field label="Tank (L)"><input style={inp} type="number" placeholder="1000" value={form.tank} onChange={e=>setForm({...form,tank:e.target.value})}/></Field></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><Field label="Location"><select style={inp} value={form.loc} onChange={e=>setForm({...form,loc:e.target.value})}><option value="">-- Select Location --</option>{locations.map(l=>(<option key={l}>{l}</option>))}</select></Field><Field label="Next Service"><input style={inp} type="date" value={form.nextSvc} onChange={e=>setForm({...form,nextSvc:e.target.value})}/></Field></div><Field label="Assigned To"><input style={inp} placeholder="e.g. Main Office" value={form.assigned} onChange={e=>setForm({...form,assigned:e.target.value})}/></Field><div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:8}}><button onClick={()=>{setShowAdd(false);setEditG(null);}} style={{padding:"9px 20px",borderRadius:8,border:"1.5px solid #E0E0E0",background:"#fff",color:"#525252",fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancel</button><button onClick={handleSave} disabled={!form.name} style={{display:"flex",alignItems:"center",gap:6,padding:"9px 20px",borderRadius:8,border:"none",background:form.name?P:"#C6C6C6",color:"#fff",fontSize:13,fontWeight:600,cursor:form.name?"pointer":"not-allowed"}}><Save size={14}/>{editG?"Update":"Save"}</button></div></Modal>)}
  </div>);
}


function DriversPage({drivers,setDrivers,canEdit}){
  const [showAdd,setShowAdd]=useState(false);const [editD,setEditD]=useState(null);
  const defForm={name:"",license:"Class C",status:"On Duty",phone:"+234 "};
  const [form,setForm]=useState(defForm);
  const handleSave=async()=>{try{if(editD){await db.updateDriver(editD,{name:form.name,license:form.license,status:form.status,phone:form.phone});setDrivers(drivers.map(d=>d.id===editD?{...d,name:form.name,license:form.license,status:form.status,phone:form.phone}:d));setEditD(null);}else{const nid=`D-${String(Math.max(0,...drivers.map(d=>parseInt(d.id.replace(/\D/g,""))||0))+1).padStart(3,"0")}`;const saved=await db.addDriver({id:nid,name:form.name,license:form.license,status:form.status,phone:form.phone,trips:0,rating:0,violations:0,certs:[]});if(saved){setDrivers(prev=>[...prev,saved]);}else{const all=await db.getDrivers();setDrivers(all);}}setShowAdd(false);setForm(defForm);}catch(e){alert("Error: "+e.message);}};
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
  const handleSave=async()=>{try{if(editV){await db.updateVendor(editV,form);setVendors(vendors.map(v=>v.id===editV?{...v,...form}:v));setEditV(null);}else{const nid=`VN-${String(Math.max(0,...vendors.map(v=>parseInt(v.id.replace(/\D/g,""))||0))+1).padStart(3,"0")}`;const saved=await db.addVendor({id:nid,...form});if(saved){setVendors(prev=>[...prev,saved]);}else{const all=await db.getVendors();setVendors(all);}}setShowAdd(false);setForm(defForm);}catch(e){alert("Error: "+e.message);}};
  const handleDelete=async(id)=>{if(confirm("Delete this vendor?")){try{await db.deleteVendor(id);setVendors(vendors.filter(v=>v.id!==id));}catch(e){alert("Error: "+e.message);}}};
  const startEdit=(v)=>{setForm({name:v.name,type:v.type||"Service",phone:v.phone||"",email:v.email||"",contact:v.contact||"",city:v.city||""});setEditV(v.id);setShowAdd(true);};
  return(<div style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"grid",gridTemplateColumns:window.innerWidth<768?"1fr 1fr":"repeat(3,1fr)",gap:14}}><Kpi icon={Briefcase} label="Total Vendors" value={vendors.length}/><Kpi icon={Wrench} label="Diesel Suppliers" value={vendors.filter(v=>v.type==="Diesel Supplier").length}/><Kpi icon={Fuel} label="Fuel Stations" value={vendors.filter(v=>v.type==="Fuel Station"||v.type==="Fuel").length}/></div>
    <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8}}><div style={{display:"flex",gap:6,alignItems:"center"}}>{["All",...(vendorTypes.length>0?vendorTypes:["Service","Fuel"])].map(s=>(<button key={s} onClick={()=>setFilt(s)} style={{padding:"6px 14px",borderRadius:7,border:filt===s?`1.5px solid ${P}`:"1.5px solid #E0E0E0",background:filt===s?"#D0E2FF":"#fff",color:filt===s?P:"#525252",fontSize:12,fontWeight:600,cursor:"pointer"}}>{s}</button>))}<div style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:7,background:"#F4F4F4",marginLeft:6}}><Search size={13} color="#8D8D8D"/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search vendors..." style={{border:"none",outline:"none",background:"transparent",fontSize:12,width:140,fontFamily:"inherit"}}/></div></div>{canEdit&&<button onClick={()=>{setEditV(null);setForm(defForm);setShowAdd(true);}} style={{display:"flex",alignItems:"center",gap:5,padding:"8px 16px",borderRadius:9,background:P,color:"#fff",border:"none",fontSize:12,fontWeight:600,cursor:"pointer"}}><Plus size={15}/>Add Vendor</button>}</div>
    <div style={{background:"#fff",borderRadius:14,border:"1px solid #E8ECF1",overflow:"hidden"}}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr style={{background:"#F4F4F4"}}>{["Vendor","Type","Contact","Phone","City",canEdit?"":""].filter(Boolean).map(h=>(<th key={h} style={th}>{h}</th>))}</tr></thead><tbody>{list.length===0?<tr><td colSpan={canEdit?6:5} style={{padding:20,textAlign:"center",color:"#8D8D8D",fontSize:13}}>No vendors found</td></tr>:list.map(v=>(<tr key={v.id} onMouseEnter={e=>e.currentTarget.style.background="#F8FAFF"} onMouseLeave={e=>e.currentTarget.style.background=""}><td style={{...tc,fontWeight:600}}>{v.name}<div style={{fontSize:11,color:"#8D8D8D"}}>{v.id}</div></td><td style={tc}><span style={{fontSize:11,padding:"3px 10px",borderRadius:10,background:v.type.includes("Fuel")?"#D0E2FF":"#F4F4F4",color:v.type.includes("Fuel")?P:"#525252",fontWeight:600}}>{v.type||"Service"}</span></td><td style={tc}>{v.contact||v.email||"-"}</td><td style={tc}>{v.phone||"-"}</td><td style={tc}>{v.city||"-"}</td>{canEdit&&<td style={tc}><div style={{display:"flex",gap:4}}><button onClick={()=>startEdit(v)} style={{padding:"4px 8px",borderRadius:5,border:"1px solid #E0E0E0",background:"#fff",cursor:"pointer"}}><Pencil size={12} color="#525252"/></button><button onClick={()=>handleDelete(v.id)} style={{padding:"4px 8px",borderRadius:5,border:"1px solid #E0E0E0",background:"#fff",cursor:"pointer"}}><Trash2 size={12} color="#DA1E28"/></button></div></td>}</tr>))}</tbody></table></div>
    {showAdd&&(<Modal title={editV?"Edit Vendor":"Add Vendor"} onClose={()=>{setShowAdd(false);setEditV(null);}}><Field label="Vendor Name *"><input style={inp} placeholder="e.g. Kazeem Mechanic" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field><Field label="Type"><select style={inp} value={form.type} onChange={e=>setForm({...form,type:e.target.value})}>{vendorTypes.length>0?vendorTypes.map(t=>(<option key={t}>{t}</option>)):<><option>Service</option><option>Fuel</option></>}</select></Field><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><Field label="Contact Name"><input style={inp} value={form.contact} onChange={e=>setForm({...form,contact:e.target.value})}/></Field><Field label="Phone"><input style={inp} placeholder="+234..." value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></Field></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><Field label="Email"><input style={inp} type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></Field><Field label="City"><input style={inp} value={form.city} onChange={e=>setForm({...form,city:e.target.value})}/></Field></div><div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:8}}><button onClick={()=>{setShowAdd(false);setEditV(null);}} style={{padding:"9px 20px",borderRadius:8,border:"1.5px solid #E0E0E0",background:"#fff",color:"#525252",fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancel</button><button onClick={handleSave} disabled={!form.name} style={{display:"flex",alignItems:"center",gap:6,padding:"9px 20px",borderRadius:8,border:"none",background:form.name?P:"#C6C6C6",color:"#fff",fontSize:13,fontWeight:600,cursor:form.name?"pointer":"not-allowed"}}><Save size={14}/>{editV?"Update":"Save"}</button></div></Modal>)}
  </div>);
}

function ReportsPage({vehicles,generators,drivers,workOrders,fuelLogs}){
  const [report,setReport]=useState("fleet");
  const [dateFrom,setDateFrom]=useState("2025-01-01");const [dateTo,setDateTo]=useState(new Date().toISOString().split("T")[0]);const [fuelTypeFilter,setFuelTypeFilter]=useState("All");
  const tabs=[["fleet","Fleet Summary"],["fuel","Fuel Consumption"],["maintenance","Maintenance & WO"],["driver","Driver Performance"]];
  const inRange=(d)=>{if(!d)return true;return d>=dateFrom&&d<=dateTo;};
  const fFL=fuelLogs.filter(f=>inRange(f.date));
  const fWO=workOrders.filter(w=>inRange(w.due));
  const getVName=(id)=>{const v=vehicles.find(x=>x.id===id);return v?v.name:id;};
  const getGName=(id)=>{const g=generators.find(x=>x.id===id);return g?g.name:id;};
  const csvExport=(headers,rows,filename)=>{const csv=[headers.join(","),...rows.map(r=>r.map(c=>typeof c==="string"&&c.includes(",")?`"${c}"`:c).join(","))].join("\n");const blob=new Blob([csv],{type:"text/csv"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=filename+".csv";a.click();};
  const pdfExport=(title,headers,rows)=>{const w=window.open("","_blank");w.document.write(`<html><head><title>${title}</title><style>body{font-family:DM Sans,Arial,sans-serif;padding:30px;color:#161616}h1{font-size:20px;margin-bottom:4px}h2{font-size:12px;color:#8D8D8D;font-weight:400;margin-bottom:20px}table{width:100%;border-collapse:collapse;font-size:12px}th{background:#F4F4F4;padding:8px 12px;text-align:left;font-weight:600;border-bottom:2px solid #E0E0E0}td{padding:8px 12px;border-bottom:1px solid #F4F4F4}.logo{color:#0F62FE;font-size:24px;font-weight:700;margin-bottom:2px}@media print{button{display:none}}</style></head><body><div class="logo">FleetPro</div><h1>${title}</h1><h2>${dateFrom} to ${dateTo}</h2><table><thead><tr>${headers.map(h=>"<th>"+h+"</th>").join("")}</tr></thead><tbody>${rows.map(r=>"<tr>"+r.map(c=>"<td>"+c+"</td>").join("")+"</tr>").join("")}</tbody></table><br><button onclick="window.print();window.close();" style="padding:10px 20px;background:#0F62FE;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600">Print / Save as PDF</button></body></html>`);w.document.close();};
  const card={background:"#fff",borderRadius:14,border:"1px solid #E8ECF1",padding:20};
  const renderFleet=()=>{const statusCount=(arr,s)=>arr.filter(x=>x.status===s).length;const vData=[{name:"Active",v:statusCount(vehicles,"Active"),g:statusCount(generators,"Active")},{name:"In Shop/Maint",v:statusCount(vehicles,"In Shop"),g:statusCount(generators,"In Maintenance")},{name:"Out/Standby",v:statusCount(vehicles,"Out of Service"),g:statusCount(generators,"Standby")}];const headers=["Asset","ID","Type","Status","Location"];const vRows=vehicles.map(v=>[v.name,v.id,v.type,v.status,v.loc]);const gRows=generators.map(g=>[g.name,g.id,g.cap||"-",g.status,g.loc]);const allRows=[...vRows,...gRows];return(<div style={{display:"flex",flexDirection:"column",gap:16}}><div style={{display:"grid",gridTemplateColumns:window.innerWidth<768?"1fr 1fr":"repeat(4,1fr)",gap:14}}><Kpi icon={Truck} label="Total Vehicles" value={vehicles.length}/><Kpi icon={Zap} label="Total Generators" value={generators.length}/><Kpi icon={AlertTriangle} label="In Shop / Maint." value={statusCount(vehicles,"In Shop")+statusCount(generators,"In Maintenance")} accent="#FF832B"/><Kpi icon={ClipboardList} label="Open Work Orders" value={workOrders.filter(w=>w.status!=="Completed").length}/></div><div style={card}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><h4 style={{fontSize:14,fontWeight:700,margin:0}}>Fleet Status Overview</h4><div style={{display:"flex",gap:6}}><button onClick={()=>csvExport(headers,allRows,"fleet-summary")} style={{display:"flex",alignItems:"center",gap:4,padding:"6px 12px",borderRadius:7,border:"1.5px solid #E0E0E0",background:"#fff",fontSize:11,fontWeight:600,cursor:"pointer",color:"#525252"}}><Download size={12}/>CSV</button><button onClick={()=>pdfExport("Fleet Summary Report",headers,allRows)} style={{display:"flex",alignItems:"center",gap:4,padding:"6px 12px",borderRadius:7,border:"1.5px solid #E0E0E0",background:"#fff",fontSize:11,fontWeight:600,cursor:"pointer",color:"#525252"}}><Download size={12}/>PDF</button></div></div><ResponsiveContainer width="100%" height={220}><BarChart data={vData}><CartesianGrid strokeDasharray="3 3" stroke="#F4F4F4"/><XAxis dataKey="name" fontSize={11}/><YAxis fontSize={11}/><Tooltip/><Legend/><Bar dataKey="v" name="Vehicles" fill={P} radius={[4,4,0,0]}/><Bar dataKey="g" name="Generators" fill="#8A3FFC" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div><div style={card}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr style={{background:"#F4F4F4"}}>{["Asset","ID","Type/Capacity","Status","Location"].map(h=>(<th key={h} style={th}>{h}</th>))}</tr></thead><tbody>{vehicles.map(v=>(<tr key={v.id}><td style={{...tc,fontWeight:600}}>{v.name}</td><td style={tc}>{v.id}</td><td style={tc}>{v.type}</td><td style={tc}><Badge label={v.status}/></td><td style={tc}>{v.loc}</td></tr>))}{generators.map(g=>(<tr key={g.id}><td style={{...tc,fontWeight:600}}>{g.name}</td><td style={tc}>{g.id}</td><td style={tc}>{g.cap||"-"}</td><td style={tc}><Badge label={g.status}/></td><td style={tc}>{g.loc}</td></tr>))}</tbody></table></div></div>);};
  const renderFuel=()=>{const ftf=fuelTypeFilter;const vFuel=fFL.filter(f=>!f.isGen&&(ftf==="All"||f.fuelType===ftf));const gFuel=fFL.filter(f=>f.isGen&&(ftf==="All"||f.fuelType===ftf));const totalV=vFuel.reduce((s,f)=>s+f.cost,0);const totalG=gFuel.reduce((s,f)=>s+f.cost,0);const byAsset={};vFuel.forEach(f=>{const n=getVName(f.asset);if(!byAsset[n])byAsset[n]={litres:0,cost:0,km:0};byAsset[n].litres+=f.litres;byAsset[n].cost+=f.cost;byAsset[n].km+=(f.odoEnd||0)-(f.odoStart||0);});const assetData=Object.entries(byAsset).map(([name,d])=>({name:name.length>15?name.substring(0,15)+"..":name,cost:d.cost,l100:d.km>0?((d.litres/d.km)*100):0}));const headers=["Asset","Litres","Cost","Distance","L/100km"];const rows=Object.entries(byAsset).map(([name,d])=>[name,d.litres.toFixed(0),fmt(d.cost),d.km.toLocaleString()+" km",d.km>0?((d.litres/d.km)*100).toFixed(1):"-"]);const gHeaders=["Generator","Litres","Cost","Hours","L/hr"];const gByAsset={};gFuel.forEach(f=>{const n=getGName(f.asset);if(!gByAsset[n])gByAsset[n]={litres:0,cost:0,hrs:0};gByAsset[n].litres+=f.litres;gByAsset[n].cost+=f.cost;gByAsset[n].hrs+=(f.hrsEnd||0)-(f.hrsStart||0);});const gRows=Object.entries(gByAsset).map(([name,d])=>[name,d.litres.toFixed(0),fmt(d.cost),d.hrs+" hrs",d.hrs>0?(d.litres/d.hrs).toFixed(1):"-"]);return(<div style={{display:"flex",flexDirection:"column",gap:16}}><div style={{display:"grid",gridTemplateColumns:window.innerWidth<768?"1fr 1fr":"repeat(4,1fr)",gap:14}}><Kpi icon={Fuel} label="Vehicle Fuel Spend" value={fmt(totalV)}/><Kpi icon={Zap} label="Generator Fuel Spend" value={fmt(totalG)}/><Kpi icon={DollarSign} label="Total Fuel Spend" value={fmt(totalV+totalG)} accent="#DA1E28"/><Kpi icon={Gauge} label="Total Litres" value={(vFuel.reduce((s,f)=>s+f.litres,0)+gFuel.reduce((s,f)=>s+f.litres,0)).toLocaleString()+" L"}/></div><div style={card}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><h4 style={{fontSize:14,fontWeight:700,margin:0}}>Vehicle Fuel Cost by Asset</h4><div style={{display:"flex",gap:6}}><button onClick={()=>csvExport(headers,rows,"fuel-vehicles")} style={{display:"flex",alignItems:"center",gap:4,padding:"6px 12px",borderRadius:7,border:"1.5px solid #E0E0E0",background:"#fff",fontSize:11,fontWeight:600,cursor:"pointer",color:"#525252"}}><Download size={12}/>CSV</button><button onClick={()=>pdfExport("Vehicle Fuel Consumption Report",headers,rows)} style={{display:"flex",alignItems:"center",gap:4,padding:"6px 12px",borderRadius:7,border:"1.5px solid #E0E0E0",background:"#fff",fontSize:11,fontWeight:600,cursor:"pointer",color:"#525252"}}><Download size={12}/>PDF</button></div></div>{assetData.length>0&&<ResponsiveContainer width="100%" height={220}><BarChart data={assetData}><CartesianGrid strokeDasharray="3 3" stroke="#F4F4F4"/><XAxis dataKey="name" fontSize={10}/><YAxis fontSize={11}/><Tooltip formatter={(v)=>fmt(v)}/><Bar dataKey="cost" name="Cost" fill={P} radius={[4,4,0,0]}/></BarChart></ResponsiveContainer>}<table style={{width:"100%",borderCollapse:"collapse",marginTop:12}}><thead><tr style={{background:"#F4F4F4"}}>{headers.map(h=>(<th key={h} style={th}>{h}</th>))}</tr></thead><tbody>{rows.length===0?<tr><td colSpan={5} style={{...tc,textAlign:"center",color:"#8D8D8D"}}>No vehicle fuel data in range</td></tr>:rows.map((r,i)=>(<tr key={i}>{r.map((c,j)=>(<td key={j} style={{...tc,fontWeight:j===0?600:400}}>{c}</td>))}</tr>))}{rows.length>0&&<tr style={{background:"#F4F4F4"}}><td style={{...tc,fontWeight:700}}>Total</td><td style={{...tc,fontWeight:700}}>{Object.values(byAsset).reduce((s,d)=>s+d.litres,0).toLocaleString()} L</td><td style={{...tc,fontWeight:700}}>{fmt(Object.values(byAsset).reduce((s,d)=>s+d.cost,0))}</td><td style={tc}>-</td><td style={tc}>-</td></tr>}</tbody></table></div><div style={card}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><h4 style={{fontSize:14,fontWeight:700,margin:0}}>Generator Fuel by Asset</h4><div style={{display:"flex",gap:6}}><button onClick={()=>csvExport(gHeaders,gRows,"fuel-generators")} style={{display:"flex",alignItems:"center",gap:4,padding:"6px 12px",borderRadius:7,border:"1.5px solid #E0E0E0",background:"#fff",fontSize:11,fontWeight:600,cursor:"pointer",color:"#525252"}}><Download size={12}/>CSV</button><button onClick={()=>pdfExport("Generator Fuel Report",gHeaders,gRows)} style={{display:"flex",alignItems:"center",gap:4,padding:"6px 12px",borderRadius:7,border:"1.5px solid #E0E0E0",background:"#fff",fontSize:11,fontWeight:600,cursor:"pointer",color:"#525252"}}><Download size={12}/>PDF</button></div></div><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr style={{background:"#F4F4F4"}}>{gHeaders.map(h=>(<th key={h} style={th}>{h}</th>))}</tr></thead><tbody>{gRows.length===0?<tr><td colSpan={5} style={{...tc,textAlign:"center",color:"#8D8D8D"}}>No generator fuel data in range</td></tr>:gRows.map((r,i)=>(<tr key={i}>{r.map((c,j)=>(<td key={j} style={{...tc,fontWeight:j===0?600:400}}>{c}</td>))}</tr>))}</tbody></table></div></div>);};
  const renderMaint=()=>{const open=fWO.filter(w=>w.status==="Open").length;const prog=fWO.filter(w=>w.status==="In Progress").length;const done=fWO.filter(w=>w.status==="Completed").length;const totalCost=fWO.reduce((s,w)=>s+(w.cost||0),0);const byType={};fWO.forEach(w=>{if(!byType[w.type])byType[w.type]={count:0,cost:0};byType[w.type].count++;byType[w.type].cost+=w.cost||0;});const typeData=Object.entries(byType).map(([t,d])=>({name:t,...d}));const headers=["WO ID","Asset","Type","Priority","Status","Cost","Due"];const rows=fWO.map(w=>[w.id,w.asset,w.type,w.priority,w.status,w.cost?fmt(w.cost):"-",w.due||"-"]);return(<div style={{display:"flex",flexDirection:"column",gap:16}}><div style={{display:"grid",gridTemplateColumns:window.innerWidth<768?"1fr 1fr":"repeat(4,1fr)",gap:14}}><Kpi icon={FileText} label="Open" value={open} accent="#F1C21B"/><Kpi icon={Clock} label="In Progress" value={prog} accent={P}/><Kpi icon={Wrench} label="Completed" value={done} accent="#24A148"/><Kpi icon={DollarSign} label="Total WO Cost" value={fmt(totalCost)}/></div><div style={card}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><h4 style={{fontSize:14,fontWeight:700,margin:0}}>Work Orders by Type</h4><div style={{display:"flex",gap:6}}><button onClick={()=>csvExport(headers,rows,"work-orders")} style={{display:"flex",alignItems:"center",gap:4,padding:"6px 12px",borderRadius:7,border:"1.5px solid #E0E0E0",background:"#fff",fontSize:11,fontWeight:600,cursor:"pointer",color:"#525252"}}><Download size={12}/>CSV</button><button onClick={()=>pdfExport("Maintenance & Work Orders Report",headers,rows)} style={{display:"flex",alignItems:"center",gap:4,padding:"6px 12px",borderRadius:7,border:"1.5px solid #E0E0E0",background:"#fff",fontSize:11,fontWeight:600,cursor:"pointer",color:"#525252"}}><Download size={12}/>PDF</button></div></div>{typeData.length>0&&<ResponsiveContainer width="100%" height={220}><BarChart data={typeData}><CartesianGrid strokeDasharray="3 3" stroke="#F4F4F4"/><XAxis dataKey="name" fontSize={11}/><YAxis fontSize={11}/><Tooltip formatter={(v,n)=>n==="cost"?fmt(v):v}/><Legend/><Bar dataKey="count" name="Count" fill="#8A3FFC" radius={[4,4,0,0]}/><Bar dataKey="cost" name="Cost" fill="#FF832B" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer>}<table style={{width:"100%",borderCollapse:"collapse",marginTop:12}}><thead><tr style={{background:"#F4F4F4"}}>{headers.map(h=>(<th key={h} style={th}>{h}</th>))}</tr></thead><tbody>{rows.length===0?<tr><td colSpan={7} style={{...tc,textAlign:"center",color:"#8D8D8D"}}>No work orders in range</td></tr>:rows.map((r,i)=>(<tr key={i}>{r.map((c,j)=>(<td key={j} style={{...tc,fontWeight:j===0?600:400}}>{c}</td>))}</tr>))}</tbody></table></div></div>);};
  const renderDriver=()=>{const headers=["Driver","ID","License","Status","Trips","Rating","Violations"];const rows=drivers.map(d=>[d.name,d.id,d.lic,d.status,d.trips||0,(d.rating||0)+"/5",d.violations||0]);const best=[...drivers].sort((a,b)=>(b.rating||0)-(a.rating||0));return(<div style={{display:"flex",flexDirection:"column",gap:16}}><div style={{display:"grid",gridTemplateColumns:window.innerWidth<768?"1fr 1fr":"repeat(4,1fr)",gap:14}}><Kpi icon={Users} label="Total Drivers" value={drivers.length}/><Kpi icon={Truck} label="On Duty" value={drivers.filter(d=>d.status==="On Duty").length} accent="#24A148"/><Kpi icon={AlertTriangle} label="Total Violations" value={drivers.reduce((s,d)=>s+(d.violations||0),0)} accent="#DA1E28"/><Kpi icon={Gauge} label="Avg Rating" value={(drivers.reduce((s,d)=>s+(d.rating||0),0)/Math.max(drivers.length,1)).toFixed(1)+"/5"}/></div><div style={card}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><h4 style={{fontSize:14,fontWeight:700,margin:0}}>Driver Performance</h4><div style={{display:"flex",gap:6}}><button onClick={()=>csvExport(headers,rows,"driver-performance")} style={{display:"flex",alignItems:"center",gap:4,padding:"6px 12px",borderRadius:7,border:"1.5px solid #E0E0E0",background:"#fff",fontSize:11,fontWeight:600,cursor:"pointer",color:"#525252"}}><Download size={12}/>CSV</button><button onClick={()=>pdfExport("Driver Performance Report",headers,rows)} style={{display:"flex",alignItems:"center",gap:4,padding:"6px 12px",borderRadius:7,border:"1.5px solid #E0E0E0",background:"#fff",fontSize:11,fontWeight:600,cursor:"pointer",color:"#525252"}}><Download size={12}/>PDF</button></div></div><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr style={{background:"#F4F4F4"}}>{headers.map(h=>(<th key={h} style={th}>{h}</th>))}</tr></thead><tbody>{drivers.map(d=>(<tr key={d.id}><td style={{...tc,fontWeight:600}}>{d.name}</td><td style={tc}>{d.id}</td><td style={tc}>{d.lic}</td><td style={tc}><Badge label={d.status}/></td><td style={tc}>{d.trips||0}</td><td style={{...tc,fontWeight:600,color:(d.rating||0)>=4?"#24A148":(d.rating||0)>=3?"#FF832B":"#DA1E28"}}>{d.rating||0}/5</td><td style={{...tc,fontWeight:600,color:(d.violations||0)>0?"#DA1E28":"#24A148"}}>{d.violations||0}</td></tr>))}</tbody></table></div></div>);};
  return(<div style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
      <div style={{display:"flex",gap:6}}>{tabs.map(([id,label])=>(<button key={id} onClick={()=>setReport(id)} style={{padding:"7px 16px",borderRadius:7,border:report===id?`1.5px solid ${P}`:"1.5px solid #E0E0E0",background:report===id?"#D0E2FF":"#fff",color:report===id?P:"#525252",fontSize:12,fontWeight:600,cursor:"pointer"}}>{label}</button>))}</div>
      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>{report==="fuel"&&<div style={{display:"flex",gap:4}}>{["All","Diesel","Petrol"].map(ft=>(<button key={ft} onClick={()=>setFuelTypeFilter(ft)} style={{padding:"5px 12px",borderRadius:6,border:fuelTypeFilter===ft?"1.5px solid "+P:"1.5px solid #E0E0E0",background:fuelTypeFilter===ft?"#D0E2FF":"#fff",color:fuelTypeFilter===ft?P:"#525252",fontSize:11,fontWeight:600,cursor:"pointer"}}>{ft}</button>))}</div>}<span style={{fontSize:12,color:"#6F6F6F",fontWeight:500}}>Date Range:</span><input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={{...inp,width:140,padding:"6px 10px",fontSize:12}}/><span style={{color:"#8D8D8D"}}>to</span><input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} style={{...inp,width:140,padding:"6px 10px",fontSize:12}}/></div>
    </div>
    {report==="fleet"&&renderFleet()}{report==="fuel"&&renderFuel()}{report==="maintenance"&&renderMaint()}{report==="driver"&&renderDriver()}
  </div>);
}

function ProfileEditor({user,setUser}){
  const [name,setName]=useState(user.name);const [saving,setSaving]=useState(false);const [msg,setMsg]=useState("");
  const [showPw,setShowPw]=useState(false);const [pw,setPw]=useState("");const [pw2,setPw2]=useState("");
  const handleSaveName=async()=>{if(!name.trim())return;setSaving(true);setMsg("");try{await db.updateProfile(user.id,{name:name.trim(),avatar:name.trim().split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2)});setUser({...user,name:name.trim(),avatar:name.trim().split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2)});setMsg("Profile updated!");}catch(e){setMsg("Error: "+e.message);}setSaving(false);};
  const handleChangePw=async()=>{if(pw.length<6){setMsg("Password must be at least 6 characters");return;}if(pw!==pw2){setMsg("Passwords don't match");return;}setSaving(true);setMsg("");try{const{error}=await supabase.auth.updateUser({password:pw});if(error)throw error;setMsg("Password updated!");setPw("");setPw2("");setShowPw(false);}catch(e){setMsg("Error: "+e.message);}setSaving(false);};
  return(<div><Field label="Full Name"><div style={{display:"flex",gap:8}}><input style={{...inp,flex:1}} value={name} onChange={e=>setName(e.target.value)}/><button onClick={handleSaveName} disabled={saving||name===user.name} style={{padding:"9px 16px",borderRadius:8,border:"none",background:(name!==user.name)?P:"#C6C6C6",color:"#fff",fontSize:12,fontWeight:600,cursor:(name!==user.name)?"pointer":"not-allowed"}}>{saving?"...":"Save"}</button></div></Field>{!showPw?<button onClick={()=>setShowPw(true)} style={{background:"none",border:"none",color:P,fontSize:12,fontWeight:600,cursor:"pointer",marginTop:8}}>Change Password</button>:<div style={{marginTop:12}}><Field label="New Password"><input style={inp} type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="Min 6 characters"/></Field><Field label="Confirm Password"><input style={inp} type="password" value={pw2} onChange={e=>setPw2(e.target.value)} placeholder="Re-enter password"/></Field><div style={{display:"flex",gap:8,marginTop:8}}><button onClick={()=>{setShowPw(false);setPw("");setPw2("");}} style={{padding:"8px 16px",borderRadius:8,border:"1.5px solid #E0E0E0",background:"#fff",fontSize:12,fontWeight:600,cursor:"pointer",color:"#525252"}}>Cancel</button><button onClick={handleChangePw} disabled={saving||!pw} style={{padding:"8px 16px",borderRadius:8,border:"none",background:pw?P:"#C6C6C6",color:"#fff",fontSize:12,fontWeight:600,cursor:pw?"pointer":"not-allowed"}}>{saving?"...":"Update Password"}</button></div></div>}{msg&&<div style={{marginTop:10,padding:8,borderRadius:8,background:msg.startsWith("Error")?"#DA1E2818":"#24A14818",color:msg.startsWith("Error")?"#DA1E28":"#24A148",fontSize:12}}>{msg}</div>}</div>);
}

function SettingsPage({locations,setLocations,vendorTypes,setVendorTypes,users,setUsers,user,setUser}){
  const [tab,setTab]=useState(user?.role==="Store Staff"?"profile":"users");const [showAddUser,setShowAddUser]=useState(false);const [showAddLoc,setShowAddLoc]=useState(false);
  const [uf,setUf]=useState({name:"",email:"",password:"",role:"Viewer",store_location:""});const [newLoc,setNewLoc]=useState("");const [newVT,setNewVT]=useState("");const [showAddVT,setShowAddVT]=useState(false);const [loading,setLoading]=useState(false);const [msg,setMsg]=useState("");
  const handleAddUser=async()=>{if(!uf.email)return;if(uf.role==="Store Staff"&&!uf.store_location){setMsg("Error: Store Staff must have a store location assigned.");return;}setLoading(true);setMsg("");try{const result=await inviteUser(uf.email,uf.name,uf.role,uf.password);if(uf.role==="Store Staff"&&uf.store_location&&result.user){await db.updateProfile(result.user.id,{store_location:uf.store_location});}setMsg("User created! They can now sign in.");const pr=await db.getProfiles();setUsers(pr);setShowAddUser(false);setUf({name:"",email:"",password:"",role:"Viewer",store_location:""});}catch(e){setMsg("Error: "+e.message);}setLoading(false);};
  const handleRoleChange=async(uid,role)=>{try{await db.updateProfile(uid,{role});setUsers(users.map(u=>u.id===uid?{...u,role}:u));}catch(e){alert("Error: "+e.message);}};
  const handleAddLoc=async()=>{if(!newLoc.trim())return;try{await db.addLocation(newLoc.trim());setLocations([...locations,newLoc.trim()]);setNewLoc("");setShowAddLoc(false);}catch(e){alert("Error: "+e.message);}};
  const handleAddVT=async()=>{if(!newVT.trim())return;try{await db.addVendorType(newVT.trim());setVendorTypes([...vendorTypes,newVT.trim()]);setNewVT("");setShowAddVT(false);}catch(e){alert("Error: "+e.message);}};
  const isSA=user?.role==="Super Admin";
  return(<div style={{maxWidth:800}}><div style={{display:"flex",gap:8,marginBottom:20}}>{(user?.role==="Store Staff"?["profile"]:["profile","users","locations","vendor types"]).map(t=>(<button key={t} onClick={()=>setTab(t)} style={{padding:"8px 20px",borderRadius:8,border:tab===t?`1.5px solid ${P}`:"1.5px solid #E0E0E0",background:tab===t?"#D0E2FF":"#fff",color:tab===t?P:"#525252",fontSize:13,fontWeight:600,cursor:"pointer",textTransform:"capitalize"}}>{t}</button>))}</div>
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
  </div>);
}

// ============================================
// DIESEL LOG PAGE - Daily Staff Input
// ============================================
function DieselLogPage({generators,setGenerators,dieselReadings,setDieselReadings,dieselDistributions,dieselPurchases,user,locations,odoLog,setOdoLog,genBaselines}){
  const [step,setStep]=useState("select"); // select | input | review | done
  const [selGen,setSelGen]=useState("");
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
  const [showHistory,setShowHistory]=useState(false);const [showSupply,setShowSupply]=useState(false);

  const userStore=user?.store_location||"";
  const isStoreStaff=user?.role==="Store Staff";
  const storeGens=isStoreStaff?generators.filter(g=>g.loc===userStore):generators;
  const todayStr=new Date().toISOString().split("T")[0];
  const todayReadings=dieselReadings.filter(r=>r.date===todayStr&&r.storeLoc===(isStoreStaff?userStore:r.storeLoc));
  const alreadySubmitted=(genId)=>todayReadings.some(r=>r.generatorId===genId);

  // Get previous reading for a generator
  const getPrevReading=(genId)=>{
    const prev=dieselReadings.filter(r=>r.generatorId===genId).sort((a,b)=>b.date.localeCompare(a.date));
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
    setSaving(true);setMsg("");
    try{
      const g=generators.find(x=>x.id===selGen);
      const hOpen=parseFloat(hoursOpening)||null;
      const hClose=parseFloat(hoursClosing)||null;
      const hrsRun=(hOpen!=null&&hClose!=null)?hClose-hOpen:null;
      const actualLevel=parseFloat(dieselLevel)||null;
      const added=parseFloat(dieselAdded)||0;
      const nHours=parseFloat(nepaHours)||0;
      const baseline=getBaseline(selGen);
      const rate=baseline||(g?.tank?g.tank/10:15);
      const theoretical=hrsRun?hrsRun*rate:null;
      const consumptionRate=hrsRun&&actualLevel!=null?null:rate;
      // Discrepancy
      let discrepancy=null;let discFlag=false;
      if(actualLevel!=null&&theoretical!=null){
        const prev=getPrevReading(selGen);
        const prevLevel=prev?.dieselLevelActual||null;
        if(prevLevel!=null){
          const expectedLevel=prevLevel+added-theoretical;
          discrepancy=actualLevel-expectedLevel;
          discFlag=Math.abs(discrepancy)>theoretical*0.3;
        }
      }
      // Get location
      let loc=null;
      try{const pos=await new Promise((res,rej)=>navigator.geolocation.getCurrentPosition(res,rej,{timeout:5000}));loc={lat:pos.coords.latitude,lng:pos.coords.longitude};}catch{}
      // Upload gen photo
      let genPhotoUrl="";
      if(photo){
        const ext=photo.name.split(".").pop();
        const path="diesel-readings/"+selGen+"-"+Date.now()+"."+ext;
        const{data:upData,error:upErr}=await supabase.storage.from("meter-photos").upload(path,photo);
        if(!upErr&&upData){const{data:urlData}=supabase.storage.from("meter-photos").getPublicUrl(path);genPhotoUrl=urlData?.publicUrl||"";}
      }
      // Upload nepa photo
      let nepaPhotoUrl="";
      if(nepaPhoto){
        const ext=nepaPhoto.name.split(".").pop();
        const path="nepa-readings/"+selGen+"-"+Date.now()+"."+ext;
        const{data:upData,error:upErr}=await supabase.storage.from("meter-photos").upload(path,nepaPhoto);
        if(!upErr&&upData){const{data:urlData}=supabase.storage.from("meter-photos").getPublicUrl(path);nepaPhotoUrl=urlData?.publicUrl||"";}
      }
      // Build record
      const record=fromDR({
        generatorId:selGen,storeLoc:g?.loc||userStore||"",date:todayStr,
        genHoursOpening:hOpen,genHoursClosing:hClose,
        dieselLevelActual:actualLevel,dieselLevelTheoretical:theoretical?Math.round(theoretical):null,
        dieselAdded:added,consumptionLitres:theoretical?Math.round(theoretical):null,consumptionRate:rate,
        genPhotoUrl:genPhotoUrl,genSource:inputMode,
        aiReadings:aiNotes?{raw:aiNotes}:null,aiConfidence:null,
        nepaHours:nHours,nepaMeterOpening:parseFloat(nepaMeterOpen)||null,
        nepaMeterClosing:parseFloat(nepaMeterClose)||null,nepaPhotoUrl:nepaPhotoUrl,nepaSource:nepaMode,
        discrepancyLitres:discrepancy!=null?Math.round(discrepancy):null,discrepancyFlag:discFlag,
        submittedBy:user?.uid||null,notes:notes
      });
      const saved=await db.addDieselReading(record);
      if(saved){setDieselReadings(prev=>[toDR(saved),...prev]);}
      // Update generator hours
      if(hClose){
        await db.updateGenerator(selGen,{hrs:hClose});
        setGenerators(prev=>prev.map(gg=>gg.id===selGen?{...gg,hrs:hClose}:gg));
      }
      // Also save to odo_log for compatibility
      if(hClose){
        const odoEntry={asset:selGen,reading:hClose,date:todayStr,type:inputMode==="photo"?"photo":"manual"};
        const savedOdo=await db.addOdoLog(odoEntry);
        if(savedOdo)setOdoLog(prev=>[...prev,toOdo(savedOdo)]);
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
    setStep("select");setSelGen("");setInputMode("photo");setPhoto(null);setPreview("");
    setAnalyzing(false);setMsg("");setAiNotes("");setHoursOpening("");setHoursClosing("");
    setDieselLevel("");setDieselAdded("");setNepaMode("manual");setNepaHours("");
    setNepaPhoto(null);setNepaPreview("");setNepaMeterOpen("");setNepaMeterClose("");setNotes("");
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

  // Supply view - Store Staff can see their diesel distributions & stock
  if(showSupply){
    const myStore=isStoreStaff?userStore:null;
    const myDists=(dieselDistributions||[]).filter(d=>myStore?d.storeLoc===myStore:true).sort((a,b)=>b.date.localeCompare(a.date));
    const myReadings=dieselReadings.filter(r=>myStore?r.storeLoc===myStore:true);
    const totalReceived=myDists.reduce((s,d)=>s+d.litres,0);
    const totalConsumed=myReadings.reduce((s,r)=>s+(r.consumptionLitres||0),0);
    const latestLevel=myReadings.length>0?myReadings.sort((a,b)=>b.date.localeCompare(a.date))[0]:null;
    const balance=totalReceived-totalConsumed;
    return(<div>
      <button onClick={()=>setShowSupply(false)} style={{display:"flex",alignItems:"center",gap:4,background:"none",border:"none",cursor:"pointer",color:P,fontSize:13,fontWeight:600,marginBottom:14}}><ChevronLeft size={16}/> Back to Log</button>
      <div style={{marginBottom:16}}><h3 style={{fontSize:16,fontWeight:700,margin:"0 0 4px"}}>{myStore?myStore+" — ":""}Diesel Supply</h3><div style={{fontSize:12,color:"#8D8D8D"}}>Track diesel received and consumed at {myStore||"all stores"}</div></div>
      <div style={{display:"grid",gridTemplateColumns:isMob()?"1fr 1fr":"repeat(3,1fr)",gap:12,marginBottom:18}}>
        <Kpi icon={Send} label="Total Received" value={totalReceived.toLocaleString()+" L"} sub={myDists.length+" deliveries"}/>
        <Kpi icon={Fuel} label="Total Consumed" value={totalConsumed.toLocaleString()+" L"} sub={myReadings.length+" readings"}/>
        <Kpi icon={Package} label="Balance" value={balance.toLocaleString()+" L"} sub={latestLevel&&latestLevel.dieselLevelActual!=null?"Last reported: "+latestLevel.dieselLevelActual+"L":"No readings yet"} accent={balance<0?"#DA1E28":undefined}/>
      </div>
      <div style={{background:"#fff",borderRadius:14,border:"1px solid #E8ECF1",overflow:"hidden"}}>
        <div style={{padding:"16px 20px",borderBottom:"1px solid #E8ECF1"}}><h4 style={{fontSize:14,fontWeight:700,margin:0}}>Diesel Received</h4></div>
        {myDists.length===0?<div style={{padding:30,textAlign:"center",color:"#8D8D8D",fontSize:13}}>No diesel distributed to {myStore||"stores"} yet</div>
        :<table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr style={{background:"#F4F4F4"}}>{["Date","Litres","Source","Notes","Status",""].map(h=>(<th key={h} style={th}>{h}</th>))}</tr></thead><tbody>{myDists.map(d=>{const p=(dieselPurchases||[]).find(x=>x.id===d.purchaseId);return(<tr key={d.id}><td style={tc}>{d.date}</td><td style={{...tc,fontWeight:700,color:P}}>{d.litres.toLocaleString()} L</td><td style={tc}>{p?p.supplier:"\u2014"}</td><td style={tc}>{d.notes||"\u2014"}</td><td style={tc}><Badge label={d.confirmed?"Confirmed":"Pending"}/></td><td style={tc}>{!d.confirmed&&<button onClick={async()=>{try{const row=await db.updateDieselDistribution(d.id,{received_confirmed:true,received_date:new Date().toISOString().split("T")[0],received_by:user?.uid});const updated=dieselDistributions.map(x=>x.id===d.id?toDD(row):x);setDieselDistributions(updated);}catch(e){alert("Error: "+e.message);}}} style={{padding:"5px 12px",borderRadius:6,border:"none",background:"#24A148",color:"#fff",fontSize:11,fontWeight:600,cursor:"pointer"}}>Accept Delivery</button>}</td></tr>);})}</tbody></table>}
      </div>
    </div>);
  }

  // History view
  if(showHistory){
    const hist=dieselReadings.filter(r=>isStoreStaff?r.storeLoc===userStore:true).slice(0,30);
    return(<div>
      <button onClick={()=>setShowHistory(false)} style={{display:"flex",alignItems:"center",gap:4,background:"none",border:"none",cursor:"pointer",color:P,fontSize:13,fontWeight:600,marginBottom:14}}><ChevronLeft size={16}/> Back to Log</button>
      <div style={{background:"#fff",borderRadius:14,border:"1px solid #E8ECF1",overflow:"hidden"}}>
        <div style={{padding:"16px 20px",borderBottom:"1px solid #E8ECF1"}}><h3 style={{fontSize:15,fontWeight:700,margin:0}}>Diesel Reading History</h3></div>
        <table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr style={{background:"#F4F4F4"}}>{["Date","Generator","Hours Run","Diesel Level","NEPA Hrs","Source","Flag"].map(h=>(<th key={h} style={th}>{h}</th>))}</tr></thead>
        <tbody>{hist.map(r=>{const g=generators.find(x=>x.id===r.generatorId);return(<tr key={r.id}><td style={tc}>{r.date}</td><td style={{...tc,fontWeight:600}}>{g?.name||r.generatorId}</td><td style={tc}>{r.hoursRun?r.hoursRun.toFixed(1)+"h":"-"}</td><td style={tc}>{r.dieselLevelActual!=null?r.dieselLevelActual+"L":"-"}</td><td style={tc}>{r.nepaHours?r.nepaHours+"h":"-"}</td><td style={tc}><span style={{fontSize:11,padding:"2px 8px",borderRadius:4,background:r.genSource==="photo"?"#D0E2FF":"#F4F4F4",color:r.genSource==="photo"?P:"#525252",fontWeight:600}}>{r.genSource==="photo"?"Photo":"Manual"}</span></td><td style={tc}>{r.discrepancyFlag?<span style={{color:"#DA1E28",fontWeight:700}}>!</span>:"-"}</td></tr>);})}</tbody></table>
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
        <div style={{display:"flex",gap:6}}><button onClick={()=>setShowSupply(true)} style={{background:"rgba(255,255,255,0.12)",border:"none",borderRadius:8,padding:"8px 12px",color:"#fff",fontSize:11,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}><Package size={13}/> Supply</button><button onClick={()=>setShowHistory(true)} style={{background:"rgba(255,255,255,0.12)",border:"none",borderRadius:8,padding:"8px 12px",color:"#fff",fontSize:11,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}><Clock size={13}/> History</button></div>
      </div>
      {isStoreStaff&&userStore&&<div style={{marginTop:12,padding:"10px 14px",background:"rgba(255,255,255,0.08)",borderRadius:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div><div style={{fontSize:11,color:"rgba(255,255,255,0.5)"}}>Your Store</div><div style={{fontSize:14,fontWeight:600}}>{userStore}</div></div>
        {rank&&rank.rank>0&&<div style={{textAlign:"right"}}><div style={{fontSize:11,color:"rgba(255,255,255,0.5)"}}>Efficiency Rank</div><div style={{display:"flex",alignItems:"center",gap:4}}><Trophy size={14} color="#FFD700"/><span style={{fontSize:16,fontWeight:700}}>#{rank.rank}</span><span style={{fontSize:11,color:"rgba(255,255,255,0.5)"}}>of {rank.total}</span></div></div>}
      </div>}
      {todayReadings.length>0&&<div style={{marginTop:10,padding:"8px 12px",background:"rgba(36,161,72,0.2)",borderRadius:8,fontSize:12,display:"flex",alignItems:"center",gap:6}}><CheckCircle size={14} color="#24A148"/><span>{todayReadings.length} reading{todayReadings.length>1?"s":""} submitted today</span></div>}
    </div>

    {/* Step: Select Generator */}
    {step==="select"&&(<div style={{background:"#fff",borderRadius:14,border:"1px solid #E8ECF1",padding:22}}>
      <h3 style={{fontSize:15,fontWeight:700,margin:"0 0 16px"}}>Select Generator</h3>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {storeGens.map(g=>{const done=alreadySubmitted(g.id);return(
          <button key={g.id} onClick={()=>{if(!done){setSelGen(g.id);setStep("input");const prev=getPrevReading(g.id);if(prev&&prev.genHoursClosing)setHoursOpening(String(prev.genHoursClosing));}}} disabled={done}
            style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px",borderRadius:10,border:done?"1.5px solid #E0E0E0":"1.5px solid #D0E2FF",background:done?"#F4F4F4":"#F8FAFF",cursor:done?"not-allowed":"pointer",textAlign:"left",opacity:done?0.6:1}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:38,height:38,borderRadius:9,background:done?"#E0E0E0":"#D0E2FF",display:"flex",alignItems:"center",justifyContent:"center"}}><Zap size={18} color={done?"#8D8D8D":P}/></div>
              <div><div style={{fontSize:14,fontWeight:600,color:done?"#8D8D8D":"#161616"}}>{g.name}</div><div style={{fontSize:11,color:"#8D8D8D"}}>{g.brand} - {g.cap} - {g.loc}</div><div style={{fontSize:11,color:"#8D8D8D"}}>Current: {g.hrs?.toLocaleString()||0} hrs</div></div>
            </div>
            {done?<span style={{fontSize:11,fontWeight:600,color:"#24A148",display:"flex",alignItems:"center",gap:4}}><CheckCircle size={13}/>Done</span>
            :<ChevronRight size={16} color={P}/>}
          </button>
        );})}
      </div>
      {storeGens.length===0&&<div style={{textAlign:"center",padding:30,color:"#8D8D8D"}}><Zap size={32} style={{opacity:0.3,marginBottom:8}}/><div style={{fontSize:13}}>No generators assigned to {isStoreStaff?"your store":"this location"}</div></div>}
    </div>)}

    {/* Step: Input */}
    {step==="input"&&selectedGen&&(<div>
      <button onClick={()=>{resetForm();}} style={{display:"flex",alignItems:"center",gap:4,background:"none",border:"none",cursor:"pointer",color:P,fontSize:13,fontWeight:600,marginBottom:12}}><ChevronLeft size={16}/> Back</button>

      <div style={{background:"#fff",borderRadius:14,border:"1px solid #E8ECF1",overflow:"hidden"}}>
        {/* Generator info bar */}
        <div style={{padding:"14px 20px",background:"#F8FAFF",borderBottom:"1px solid #E8ECF1",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><div style={{fontSize:14,fontWeight:700}}>{selectedGen.name}</div><div style={{fontSize:11,color:"#8D8D8D"}}>{selectedGen.brand} - {selectedGen.cap}</div></div>
          <div style={{textAlign:"right"}}><div style={{fontSize:11,color:"#8D8D8D"}}>Last Reading</div><div style={{fontSize:14,fontWeight:700}}>{prevReading?prevReading.genHoursClosing?.toLocaleString()+" hrs":"No prior"}</div></div>
        </div>

        <div style={{padding:20}}>
          {/* Section 1: Generator Meter */}
          <div style={{marginBottom:20}}>
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
                <Field label="Opening Hours"><input style={{...inp,fontSize:18,fontWeight:700,textAlign:"center",background:hoursOpening?"#E8F5E9":"#fff"}} type="number" step="0.1" placeholder="0" value={hoursOpening} onChange={e=>setHoursOpening(e.target.value)}/>{prevReading&&<div style={{fontSize:10,color:"#24A148",marginTop:2}}>Auto-filled from last reading</div>}</Field>
                <Field label="Closing Hours *"><input style={{...inp,fontSize:18,fontWeight:700,textAlign:"center"}} type="number" step="0.1" placeholder="0" value={hoursClosing} onChange={e=>setHoursClosing(e.target.value)}/></Field>
              </div>
              {hoursOpening&&hoursClosing&&parseFloat(hoursClosing)>parseFloat(hoursOpening)&&(
                <div style={{marginTop:10,padding:8,background:"#E8F5E9",borderRadius:6,display:"flex",justifyContent:"space-between",fontSize:12}}>
                  <span style={{color:"#525252"}}>Hours Run Today:</span>
                  <span style={{fontWeight:700,color:"#24A148"}}>{(parseFloat(hoursClosing)-parseFloat(hoursOpening)).toFixed(1)} hours</span>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Diesel Level */}
          <div style={{marginBottom:20}}>
            <div style={{fontSize:13,fontWeight:700,display:"flex",alignItems:"center",gap:6,marginBottom:10}}><div style={{width:22,height:22,borderRadius:"50%",background:"#FF832B",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700}}>2</div> Diesel Level</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <Field label="Current Level (Litres) *"><input style={inp} type="number" placeholder="e.g. 150" value={dieselLevel} onChange={e=>setDieselLevel(e.target.value)}/></Field>
              {user?.role!=="Store Staff"&&<Field label="Diesel Added Today (L)"><input style={inp} type="number" placeholder="0 if none" value={dieselAdded} onChange={e=>setDieselAdded(e.target.value)}/></Field>}
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

          {/* Section 3: NEPA */}
          <div style={{marginBottom:20}}>
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
          </div>

          {/* Notes */}
          <Field label="Notes (optional)"><input style={inp} placeholder="e.g. generator serviced today" value={notes} onChange={e=>setNotes(e.target.value)}/></Field>

          {msg&&<div style={{marginTop:10,padding:10,borderRadius:8,background:msg.startsWith("Error")?"#DA1E2818":"#D0E2FF",color:msg.startsWith("Error")?"#DA1E28":P,fontSize:12,fontWeight:500}}>{msg}</div>}

          <button onClick={handleSave} disabled={(!hoursClosing&&!dieselLevel)||saving}
            style={{width:"100%",marginTop:16,padding:"14px",borderRadius:10,border:"none",background:((hoursClosing||dieselLevel)&&!saving)?P:"#C6C6C6",color:"#fff",fontSize:14,fontWeight:700,cursor:((hoursClosing||dieselLevel)&&!saving)?"pointer":"not-allowed"}}>
            {saving?"Saving...":"Submit Daily Reading"}
          </button>
        </div>
      </div>
    </div>)}

    {/* Step: Done */}
    {step==="done"&&(<div style={{background:"#fff",borderRadius:14,border:"1px solid #E8ECF1",padding:30,textAlign:"center"}}>
      <div style={{width:56,height:56,borderRadius:"50%",background:"#E8F5E9",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px"}}><CheckCircle size={28} color="#24A148"/></div>
      <h3 style={{fontSize:17,fontWeight:700,margin:"0 0 6px"}}>Reading Submitted!</h3>
      <div style={{fontSize:13,color:"#8D8D8D",marginBottom:6}}>{selectedGen?.name} - {todayStr}</div>
      {msg&&msg.includes("WARNING")&&<div style={{padding:10,borderRadius:8,background:"#FFF3E0",border:"1px solid #FFE0B2",color:"#E65100",fontSize:12,fontWeight:500,margin:"12px 0",textAlign:"left"}}><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}><AlertTriangle size={14}/><span style={{fontWeight:700}}>Discrepancy Detected</span></div>{msg}</div>}
      <div style={{display:"flex",gap:10,justifyContent:"center",marginTop:18}}>
        <button onClick={resetForm} style={{padding:"10px 24px",borderRadius:9,border:"1.5px solid #E0E0E0",background:"#fff",color:"#525252",fontSize:13,fontWeight:600,cursor:"pointer"}}>{storeGens.filter(g=>!alreadySubmitted(g.id)).length>0?"Log Another Generator":"Back"}</button>
        <button onClick={()=>setShowHistory(true)} style={{padding:"10px 24px",borderRadius:9,border:"none",background:P,color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>View History</button>
      </div>
    </div>)}
  </div>);
}

const NAV=[{id:"dashboard",path:"/",label:"Dashboard",icon:Home},{id:"diesel",path:"/diesel",label:"Diesel Log",icon:Droplet},{id:"diesel-mgmt",path:"/diesel-mgmt",label:"Diesel Management",icon:Package},{id:"vehicles",path:"/vehicles",label:"Vehicles",icon:Truck},{id:"generators",path:"/generators",label:"Generators",icon:Zap},{id:"drivers",path:"/drivers",label:"Drivers",icon:Users},{id:"fuel",path:"/fuel",label:"Fuel & Energy",icon:Fuel},{id:"workorders",path:"/workorders",label:"Work Orders",icon:FileText},{id:"papers",path:"/papers",label:"Vehicle Papers",icon:FileCheck},{id:"service",path:"/service",label:"Service Reminders",icon:Bell},{id:"inspections",path:"/inspections",label:"Inspections",icon:CheckCircle},{id:"vendors",path:"/vendors",label:"Vendors",icon:Briefcase},{id:"reports",path:"/reports",label:"Reports",icon:BarChart3},{id:"settings",path:"/settings",label:"Settings",icon:Settings}];
// ============================================
// DIESEL MANAGEMENT PAGE - Admin Purchase & Distribution (Phase 2)
// ============================================
function DieselMgmtPage({dieselPurchases,setDieselPurchases,dieselDistributions,setDieselDistributions,locations,vendors,user,dieselReadings}){
  const [tab,setTab]=useState("overview");
  const [showAddPurchase,setShowAddPurchase]=useState(false);
  const [showDistribute,setShowDistribute]=useState(false);
  const [distPurchaseId,setDistPurchaseId]=useState(null);
  const [saving,setSaving]=useState(false);
  const [msg,setMsg]=useState("");
  const today=new Date().toISOString().split("T")[0];
  const [pf,setPf]=useState({date:today,supplier:"",litres:"",pricePerL:"",notes:""});
  const [df,setDf]=useState({date:today,storeLoc:"",litres:"",notes:""});
  const [editDist,setEditDist]=useState(null);
  const totalPurchased=dieselPurchases.reduce((s,p)=>s+p.litres,0);
  const totalSpent=dieselPurchases.reduce((s,p)=>s+(p.litres*(p.pricePerL||0)),0);
  const totalDistributed=dieselDistributions.reduce((s,d)=>s+d.litres,0);
  const stockInHand=totalPurchased-totalDistributed;
  const avgPrice=totalPurchased>0?(totalSpent/totalPurchased):0;
  const purchaseDistributed=(pid)=>dieselDistributions.filter(d=>d.purchaseId===pid).reduce((s,d)=>s+d.litres,0);
  const purchaseRemaining=(p)=>p.litres-purchaseDistributed(p.id);
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
      const row=await db.addDieselPurchase(fromDP({date:pf.date,supplier:pf.supplier,litres:parseFloat(pf.litres),pricePerL:parseFloat(pf.pricePerL),notes:pf.notes,purchasedBy:user.uid}));
      setDieselPurchases([toDP(row),...dieselPurchases]);
      setShowAddPurchase(false);setPf({date:today,supplier:"",litres:"",pricePerL:"",notes:""});
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
  const tabs=["overview","purchases","distributions","stores"];
  return(<div style={{maxWidth:1000}}>
    {msg&&<div style={{marginBottom:14,padding:"10px 16px",borderRadius:10,background:msg.startsWith("Error")?"#DA1E2818":"#24A14818",color:msg.startsWith("Error")?"#DA1E28":"#24A148",fontSize:13,fontWeight:500}}>{msg}</div>}
    <div style={{display:"grid",gridTemplateColumns:isMob()?"1fr 1fr":"repeat(4,1fr)",gap:12,marginBottom:20}}>
      <Kpi icon={ShoppingCart} label="Total Purchased" value={totalPurchased.toLocaleString()+" L"} sub={"\u20A6"+totalSpent.toLocaleString()}/>
      <Kpi icon={Send} label="Total Distributed" value={totalDistributed.toLocaleString()+" L"} sub={"to "+new Set(dieselDistributions.map(d=>d.storeLoc)).size+" stores"}/>
      <Kpi icon={Package} label="Stock in Hand" value={stockInHand.toLocaleString()+" L"} sub={stockInHand<0?"Overspent!":"Available"} accent={stockInHand<0?"#DA1E28":undefined}/>
      <Kpi icon={DollarSign} label="Avg Price/Litre" value={avgPrice?fmt(Math.round(avgPrice)):"-"} sub={dieselPurchases.length+" purchases"}/>
    </div>
    <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
      {tabs.map(t=>(<button key={t} onClick={()=>setTab(t)} style={{padding:"8px 18px",borderRadius:8,border:tab===t?"1.5px solid "+P:"1.5px solid #E0E0E0",background:tab===t?"#D0E2FF":"#fff",color:tab===t?P:"#525252",fontSize:12,fontWeight:600,cursor:"pointer",textTransform:"capitalize"}}>{t}</button>))}
      <div style={{flex:1}}/>
      <button onClick={()=>setShowAddPurchase(true)} style={{display:"flex",alignItems:"center",gap:5,padding:"8px 16px",borderRadius:9,background:P,color:"#fff",border:"none",fontSize:12,fontWeight:600,cursor:"pointer"}}><Plus size={14}/>Log Purchase</button>
      <button onClick={()=>{setDistPurchaseId(null);setShowDistribute(true);}} style={{display:"flex",alignItems:"center",gap:5,padding:"8px 16px",borderRadius:9,border:"1.5px solid "+P,background:"#D0E2FF",color:P,fontSize:12,fontWeight:600,cursor:"pointer"}}><Send size={14}/>Distribute</button>
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
    {tab==="purchases"&&(<div style={{background:"#fff",borderRadius:14,border:"1px solid #E8ECF1",overflow:"hidden"}}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr style={{background:"#F4F4F4"}}>{["Date","Supplier","Litres","Price/L","Total Cost","Distributed","Remaining",""].map(h=>(<th key={h} style={th}>{h}</th>))}</tr></thead><tbody>{dieselPurchases.length===0?<tr><td colSpan={8} style={{...tc,textAlign:"center",color:"#8D8D8D",padding:30}}>No purchases recorded yet</td></tr>:dieselPurchases.map(p=>{const dist=purchaseDistributed(p.id);const rem=p.litres-dist;return(<tr key={p.id}><td style={tc}>{p.date}</td><td style={{...tc,fontWeight:600}}>{p.supplier}</td><td style={tc}>{p.litres.toLocaleString()} L</td><td style={tc}>{fmt(p.pricePerL)}</td><td style={{...tc,fontWeight:600}}>{fmt(p.litres*p.pricePerL)}</td><td style={tc}>{dist.toLocaleString()} L</td><td style={tc}><span style={{fontWeight:600,color:rem>0?"#FF832B":"#24A148"}}>{rem.toLocaleString()} L</span></td><td style={tc}><div style={{display:"flex",gap:4}}>{rem>0&&<button onClick={()=>{setDistPurchaseId(p.id);setDf({date:today,storeLoc:"",litres:String(rem),notes:""});setShowDistribute(true);}} style={{padding:"4px 10px",borderRadius:5,border:"1px solid "+P,background:"#D0E2FF",cursor:"pointer",fontSize:11,fontWeight:600,color:P}}>Distribute</button>}<button onClick={()=>handleDeletePurchase(p.id)} style={{padding:"4px 8px",borderRadius:5,border:"1px solid #E0E0E0",background:"#fff",cursor:"pointer"}}><Trash2 size={12} color="#DA1E28"/></button></div></td></tr>);})}</tbody></table></div>)}
    {tab==="distributions"&&(<div style={{background:"#fff",borderRadius:14,border:"1px solid #E8ECF1",overflow:"hidden"}}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr style={{background:"#F4F4F4"}}>{["Date","Store","Litres","Source Purchase","Notes","Status","Actions"].map(h=>(<th key={h} style={th}>{h}</th>))}</tr></thead><tbody>{dieselDistributions.length===0?<tr><td colSpan={7} style={{...tc,textAlign:"center",color:"#8D8D8D",padding:30}}>No distributions recorded yet</td></tr>:dieselDistributions.map(d=>{const p=dieselPurchases.find(x=>x.id===d.purchaseId);return(<tr key={d.id}><td style={tc}>{d.date}</td><td style={{...tc,fontWeight:600}}>{d.storeLoc}</td><td style={{...tc,fontWeight:600,color:P}}>{d.litres.toLocaleString()} L</td><td style={tc}>{p?p.supplier+" ("+p.date+")":"\u2014"}</td><td style={tc}>{d.notes||"\u2014"}</td><td style={tc}><Badge label={d.confirmed?"Confirmed":"Pending"}/></td><td style={tc}><div style={{display:"flex",gap:4}}><button onClick={()=>setEditDist({...d})} style={{padding:"4px 10px",borderRadius:5,border:"1px solid "+P,background:"#D0E2FF",cursor:"pointer",fontSize:11,fontWeight:600,color:P}}>Edit</button><button onClick={()=>handleDeleteDistribution(d.id)} style={{padding:"4px 8px",borderRadius:5,border:"1px solid #E0E0E0",background:"#fff",cursor:"pointer"}}><Trash2 size={12} color="#DA1E28"/></button></div></td></tr>);})}</tbody></table></div>)}
    {tab==="stores"&&(<div style={{background:"#fff",borderRadius:14,border:"1px solid #E8ECF1",overflow:"hidden"}}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr style={{background:"#F4F4F4"}}>{["Store","Received (L)","Consumed (L)","Balance (L)","Distributions"].map(h=>(<th key={h} style={th}>{h}</th>))}</tr></thead><tbody>{storeStats.length===0?<tr><td colSpan={5} style={{...tc,textAlign:"center",color:"#8D8D8D",padding:30}}>No store data yet</td></tr>:storeStats.map(s=>(<tr key={s.loc}><td style={{...tc,fontWeight:600}}>{s.loc}</td><td style={{...tc,color:P,fontWeight:600}}>{s.received.toLocaleString()} L</td><td style={tc}>{s.consumed.toLocaleString()} L</td><td style={tc}><span style={{fontWeight:600,color:s.balance>=0?"#24A148":"#DA1E28"}}>{s.balance.toLocaleString()} L</span></td><td style={tc}>{s.distCount}</td></tr>))}</tbody></table></div>)}
    {showAddPurchase&&(<Modal title="Log Diesel Purchase" onClose={()=>{setShowAddPurchase(false);setMsg("");}}>
      <Field label="Date *"><input style={inp} type="date" value={pf.date} onChange={e=>setPf({...pf,date:e.target.value})}/></Field>
      <Field label="Supplier *"><select style={inp} value={pf.supplier} onChange={e=>setPf({...pf,supplier:e.target.value})}><option value="">-- Select Supplier --</option>{(vendors||[]).filter(v=>v.type==="Diesel Supplier"||v.type==="Fuel"||v.type==="Fuel Station").map(v=>(<option key={v.id} value={v.name}>{v.name}</option>))}</select></Field>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><Field label="Litres *"><input style={inp} type="number" placeholder="e.g. 5000" value={pf.litres} onChange={e=>setPf({...pf,litres:e.target.value})}/></Field><Field label="Price per Litre" style={inp}><input style={inp} type="number" placeholder="e.g. 1200" value={pf.pricePerL} onChange={e=>setPf({...pf,pricePerL:e.target.value})}/></Field></div>
      {pf.litres&&pf.pricePerL&&<div style={{padding:"10px 14px",borderRadius:8,background:"#D0E2FF",marginBottom:12}}><div style={{fontSize:11,color:P,fontWeight:600}}>Total Cost</div><div style={{fontSize:20,fontWeight:700,color:P}}>{fmt(parseFloat(pf.litres||0)*parseFloat(pf.pricePerL||0))}</div></div>}
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
  const canEdit=user?.role!=="Viewer"&&user?.role!=="Store Staff";
  const isStoreStaff=user?.role==="Store Staff";

  const loadAllData=useCallback(async()=>{
    try{
      const [v,g,d,wo,fl,ol,vn,p,ins,sr,loc,dt,vt,ii,pr,dr,dp,dd,gb]=await Promise.all([
        db.getVehicles(),db.getGenerators(),db.getDrivers(),db.getWorkOrders(),
        db.getFuelLogs(),db.getOdoLog(),db.getVendors(),db.getPapers(),
        db.getInspections(),db.getSvcReminders(),db.getLocations(),
        db.getDocTypes(),db.getVendorTypes(),db.getInspItems(),db.getProfiles(),
        db.getDieselReadings(),db.getDieselPurchases(),db.getDieselDistributions(),
        db.getGeneratorBaselines()
      ]);
      setVehicles(v.map(toV));setGenerators(g.map(toG));setDrivers(d);setWorkOrders(wo.map(toWO));
      setFuelLogs(fl.map(toFL));setOdoLog(ol.map(toOdo));setVendors(vn);setPapers(p.map(toP));
      setInspections(ins);setSvcReminders(sr.map(toSR));
      setLocations(loc.map(l=>l.name));setDocTypes(dt.map(d=>d.name));setVendorTypes(vt.map(t=>t.name));
      setInspItems(ii.map(i=>i.name));setUsers(pr);
      setDieselReadings(dr.map(toDR));setDieselPurchases(dp.map(toDP));
      setDieselDistributions(dd.map(toDD));setGenBaselines(gb);
      console.log("FleetPro: Data loaded",{v:v.length,g:g.length,fl:fl.length,wo:wo.length,dr:dr.length});
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
      <nav style={{padding:"10px 8px",display:"flex",flexDirection:"column",gap:2,overflowY:"auto",maxHeight:"calc(100vh - 120px)"}}>{NAV.filter(item=>isStoreStaff?["diesel","generators","settings"].includes(item.id):true).map(item=>{const active=page===item.id;const Icon=item.icon;return(<div key={item.id}>{item.id==="settings"&&<div style={{height:1,background:"rgba(255,255,255,0.06)",margin:"8px 6px"}}/>}<button onClick={()=>{setPage(item.id);if(mob)setShowNav(false);}} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:8,border:"none",cursor:"pointer",width:"100%",textAlign:"left",background:active?"rgba(15,98,254,0.15)":"transparent",color:active?"#78A9FF":"rgba(255,255,255,0.5)",fontSize:13,fontWeight:active?600:400,position:"relative"}}>{active&&<div style={{position:"absolute",left:0,top:"50%",transform:"translateY(-50%)",width:3,height:18,borderRadius:2,background:P}}/>}<Icon size={17} style={{flexShrink:0}}/>{(!col||mob)&&item.label}</button></div>);})}</nav>
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
        <Route path="/" element={isStoreStaff?<Navigate to="/diesel" replace/>:<DashPage vehicles={vehicles} generators={generators} workOrders={workOrders} go={setPage}/>}/>
        <Route path="/diesel" element={<DieselLogPage generators={generators} setGenerators={setGenerators} dieselReadings={dieselReadings} setDieselReadings={setDieselReadings} dieselDistributions={dieselDistributions} dieselPurchases={dieselPurchases} user={user} locations={locations} odoLog={odoLog} setOdoLog={setOdoLog} genBaselines={genBaselines}/>}/>
        <Route path="/diesel-mgmt" element={isStoreStaff?<Navigate to="/diesel" replace/>:<DieselMgmtPage dieselPurchases={dieselPurchases} setDieselPurchases={setDieselPurchases} dieselDistributions={dieselDistributions} setDieselDistributions={setDieselDistributions} locations={locations} vendors={vendors} user={user} dieselReadings={dieselReadings}/>}/>
        <Route path="/vehicles" element={<VehiclesPage vehicles={vehicles} setVehicles={setVehicles} locations={locations} fuelLogs={fuelLogs} workOrders={workOrders} inspections={inspections} papers={papers} svcReminders={svcReminders} canEdit={canEdit} odoLog={odoLog} setOdoLog={setOdoLog}/>}/>
        <Route path="/snap" element={<div style={{maxWidth:500,margin:"20px auto"}}><MeterSnap generators={generators} setGenerators={setGenerators} odoLog={odoLog} setOdoLog={setOdoLog}/></div>}/>
        <Route path="/generators" element={<GenPage generators={generators} setGenerators={setGenerators} locations={locations} fuelLogs={fuelLogs} canEdit={canEdit} odoLog={odoLog} setOdoLog={setOdoLog}/>}/>
        <Route path="/drivers" element={<DriversPage drivers={drivers} setDrivers={setDrivers} canEdit={canEdit}/>}/>
        <Route path="/fuel" element={<FuelPage fuelLogs={fuelLogs} setFuelLogs={setFuelLogs} vehicles={vehicles} generators={generators} canEdit={canEdit} odoLog={odoLog} setOdoLog={setOdoLog} vendors={vendors}/>}/>
        <Route path="/workorders" element={<WOPage workOrders={workOrders} setWorkOrders={setWorkOrders} vehicles={vehicles} generators={generators} vendors={vendors} canEdit={canEdit}/>}/>
        <Route path="/papers" element={<PapersPage vehicles={vehicles} papers={papers} setPapers={setPapers} canEdit={canEdit} docTypes={docTypes} setDocTypes={setDocTypes}/>}/>
        <Route path="/service" element={<ServicePage vehicles={vehicles} svcReminders={svcReminders} setSvcReminders={setSvcReminders} canEdit={canEdit}/>}/>
        <Route path="/inspections" element={<InspectionPage vehicles={vehicles} drivers={drivers} inspections={inspections} setInspections={setInspections} canEdit={canEdit} inspItems={inspItems} setInspItems={setInspItems}/>}/>
        <Route path="/vendors" element={<VendorsPage vendors={vendors} setVendors={setVendors} vendorTypes={vendorTypes} canEdit={canEdit}/>}/>
        <Route path="/reports" element={<ReportsPage vehicles={vehicles} generators={generators} drivers={drivers} workOrders={workOrders} fuelLogs={fuelLogs}/>}/>
        <Route path="/settings" element={<SettingsPage locations={locations} setLocations={setLocations} vendorTypes={vendorTypes} setVendorTypes={setVendorTypes} users={users} setUsers={setUsers} user={user} setUser={setUser}/>}/>
        <Route path="*" element={<Navigate to="/" replace/>}/>
      </Routes>
    </main>
  </div>);
}

export default function FleetProApp(){return <BrowserRouter><FleetProAppInner/></BrowserRouter>;}
