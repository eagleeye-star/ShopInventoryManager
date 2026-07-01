import { useState, useEffect, useMemo, useRef } from "react";

const STORAGE_KEY = "shopInventoryV5";
const LICENSE_KEY = "shopInventoryV5_license";

// ── LICENSE CONFIG ──────────────────────────────────────────────────────────
const TRIAL_DAYS = 14;
// Pre-issued demo / fallback keys (also accepts any SHOPINV-XXXX-XXXX-XXXX key from the generator)
const VALID_KEYS = ["SHOPINV-DEMO-TRIAL-0001", "SHOPINV-AIFARMS-VIP-002"];

function daysLeft(expiry) {
  if (!expiry) return 0;
  return Math.max(0, Math.ceil((new Date(expiry) - new Date()) / 86400000));
}
function isExpired(expiry) {
  if (!expiry) return true;
  return new Date(expiry) < new Date();
}
function loadLicense() {
  try { const r = localStorage.getItem(LICENSE_KEY); if (r) return JSON.parse(r); } catch (_) {}
  return null;
}
function saveLicense(lic) {
  try { localStorage.setItem(LICENSE_KEY, JSON.stringify(lic)); } catch (_) {}
}

const defaultShops = [
  { id:"general",  name:"General Goods",         icon:"🛒", color:"#2563eb" },
  { id:"agro",     name:"Agro-Inputs / Farm",     icon:"🌱", color:"#16a34a" },
  { id:"hardware", name:"Electronics / Hardware", icon:"🔧", color:"#d97706" },
  { id:"boutique", name:"Boutique",               icon:"👗", color:"#9333ea" },
];

// ── Seed suppliers (shared across all shops) ──────────────────────────────
const seedSuppliers = [
  { id:"sup1", name:"AquaFresh Ltd",        contact:"Mr. Mensah",   phone:"024-001-0001", email:"aquafresh@gh.com",   location:"Accra",    category:"Beverages",  notes:"Delivers Tuesdays" },
  { id:"sup2", name:"Frytol Distributors",  contact:"Ama Boateng",  phone:"054-002-0002", email:"frytol@dist.gh",    location:"Kumasi",   category:"Food",       notes:"Net 30 payment"   },
  { id:"sup3", name:"Maggi Ghana",          contact:"Kwame Asante", phone:"020-003-0003", email:"maggi@ghana.com",   location:"Accra",    category:"Food",       notes:""                 },
  { id:"sup4", name:"Agrico Ghana",         contact:"Yaw Darko",    phone:"027-004-0004", email:"agrico@ghana.com",  location:"Tema",     category:"Pesticides", notes:"COD only"         },
  { id:"sup5", name:"Yara Ghana",           contact:"Efua Mensah",  phone:"024-005-0005", email:"yara@gh.com",       location:"Accra",    category:"Fertilizers",notes:"Bulk orders only" },
  { id:"sup6", name:"Sankofa Feeds",        contact:"Kofi Tabi",    phone:"055-006-0006", email:"sankofa@feeds.gh",  location:"Kumasi",   category:"Animal Feed",notes:"Pay on delivery"  },
  { id:"sup7", name:"Philips GH",           contact:"Mr. Appiah",   phone:"020-007-0007", email:"philips@gh.com",    location:"Accra",    category:"Lighting",   notes:""                 },
  { id:"sup8", name:"ElectroHub Takoradi",  contact:"Ben Quayson",  phone:"027-008-0008", email:"electro@hub.gh",    location:"Takoradi", category:"Electrical", notes:"Weekend pickups"  },
  { id:"sup9", name:"TechLine Imports",     contact:"Sam Nkrumah",  phone:"024-009-0009", email:"techline@imp.gh",   location:"Tema",     category:"Accessories",notes:""                 },
  { id:"sup10",name:"Accra Fabric House",   contact:"Akosua Owusu", phone:"020-010-0010", email:"fabric@accra.gh",   location:"Accra",    category:"Clothing",   notes:"MOQ 5 pieces"     },
  { id:"sup11",name:"Kumasi Kente Works",   contact:"Nana Agyei",   phone:"024-011-0011", email:"kente@kumasi.gh",   location:"Kumasi",   category:"Clothing",   notes:"Handwoven only"   },
  { id:"sup12",name:"TrendLine Imports",    contact:"Cynthia Asare",phone:"055-012-0012", email:"trend@imports.gh",  location:"Accra",    category:"Fashion",    notes:""                 },
];

const seedProducts = {
  general:[
    { id:"g1", name:"Sachet Water (pack)",    category:"Beverages", qty:120, unit:"pack",      costPrice:3.5, sellPrice:5,  lowStockThreshold:20, supplierId:"sup1", size:"", color:"", lastRestocked:"2026-06-10" },
    { id:"g2", name:"Instant Noodles",        category:"Food",      qty:8,   unit:"carton",    costPrice:42,  sellPrice:55, lowStockThreshold:10, supplierId:"sup3", size:"", color:"", lastRestocked:"2026-06-05" },
    { id:"g3", name:"Canola Cooking Oil (5L)",category:"Food",      qty:18,  unit:"bottle",    costPrice:65,  sellPrice:80, lowStockThreshold:10, supplierId:"sup2", size:"", color:"", lastRestocked:"2026-06-12" },
    { id:"g4", name:"Sugar (1kg)",            category:"Food",      qty:45,  unit:"bag",       costPrice:12,  sellPrice:17, lowStockThreshold:15, supplierId:"sup2", size:"", color:"", lastRestocked:"2026-06-14" },
  ],
  agro:[
    { id:"a1", name:"Imida Super",          category:"Pesticides",  qty:30, unit:"bottle",    costPrice:28,  sellPrice:40,  lowStockThreshold:10, supplierId:"sup4", size:"", color:"", lastRestocked:"2026-06-01" },
    { id:"a2", name:"NPK 15-15-15",         category:"Fertilizers", qty:5,  unit:"bag (50kg)",costPrice:320, sellPrice:400, lowStockThreshold:8,  supplierId:"sup5", size:"", color:"", lastRestocked:"2026-05-28" },
    { id:"a3", name:"Poultry Starter Mash", category:"Animal Feed", qty:22, unit:"bag (25kg)",costPrice:140, sellPrice:175, lowStockThreshold:5,  supplierId:"sup6", size:"", color:"", lastRestocked:"2026-06-14" },
  ],
  hardware:[
    { id:"h1", name:"LED Bulb 9W",             category:"Lighting",    qty:45, unit:"piece", costPrice:8,  sellPrice:15, lowStockThreshold:15, supplierId:"sup7",  size:"", color:"", lastRestocked:"2026-06-08" },
    { id:"h2", name:"Extension Cable (3-way)", category:"Electrical",  qty:12, unit:"piece", costPrice:25, sellPrice:40, lowStockThreshold:10, supplierId:"sup8",  size:"", color:"", lastRestocked:"2026-06-02" },
    { id:"h3", name:"USB-C Cable 1m",          category:"Accessories", qty:6,  unit:"piece", costPrice:18, sellPrice:30, lowStockThreshold:10, supplierId:"sup9",  size:"", color:"", lastRestocked:"2026-05-30" },
  ],
  boutique:[
    { id:"b1", name:"Ankara Wrap Dress (M)", category:"Dresses",   qty:5, unit:"piece", costPrice:120, sellPrice:200, lowStockThreshold:3, supplierId:"sup10", size:"M",  color:"Multi",     lastRestocked:"2026-06-10" },
    { id:"b2", name:"Lace Blouse (L)",       category:"Tops",      qty:2, unit:"piece", costPrice:75,  sellPrice:130, lowStockThreshold:3, supplierId:"sup10", size:"L",  color:"White",     lastRestocked:"2026-06-08" },
    { id:"b3", name:"Kente Skirt (S)",       category:"Skirts",    qty:8, unit:"piece", costPrice:90,  sellPrice:160, lowStockThreshold:3, supplierId:"sup11", size:"S",  color:"Gold/Black", lastRestocked:"2026-06-12" },
    { id:"b4", name:"Denim Jacket (XL)",     category:"Outerwear", qty:1, unit:"piece", costPrice:180, sellPrice:290, lowStockThreshold:2, supplierId:"sup12", size:"XL", color:"Blue",       lastRestocked:"2026-05-30" },
  ],
};

const seedSales = {
  general:[
    { id:"gs1", productId:"g1", productName:"Sachet Water (pack)",    qty:10, sellPrice:5,  total:50,  date:"2026-06-25", note:"", customerId:"",  discount:0, cashier:"Gilbert", cashierId:"st1" },
    { id:"gs2", productId:"g3", productName:"Canola Cooking Oil (5L)",qty:2,  sellPrice:80, total:160, date:"2026-06-26", note:"", customerId:"",  discount:0, cashier:"Ama",     cashierId:"st2" },
  ],
  agro:[
    { id:"as1", productId:"a1", productName:"Imida Super",         qty:3, sellPrice:40,  total:120, date:"2026-06-24", note:"Bell pepper farmer", customerId:"", discount:0, cashier:"Gilbert", cashierId:"st1" },
  ],
  hardware:[
    { id:"hs1", productId:"h1", productName:"LED Bulb 9W",            qty:10, sellPrice:15, total:150, date:"2026-06-23", note:"", customerId:"", discount:0, cashier:"Kweku", cashierId:"st3" },
  ],
  boutique:[
    { id:"bs1", productId:"b1", productName:"Ankara Wrap Dress (M)", qty:1, sellPrice:200, total:200, date:"2026-06-25", note:"Walk-in", customerId:"", discount:0, cashier:"Ama", cashierId:"st2" },
    { id:"bs2", productId:"b3", productName:"Kente Skirt (S)",        qty:2, sellPrice:160, total:320, date:"2026-06-26", note:"Online", customerId:"", discount:10, cashier:"Ama", cashierId:"st2" },
  ],
};

const seedCustomers = [
  { id:"c1", name:"Akosua Mensah", phone:"0244-111-001", email:"", notes:"Regular customer", shopId:"general"  },
  { id:"c2", name:"Yaw Boateng",   phone:"0200-333-003", email:"", notes:"Bulk buyer",        shopId:"agro"     },
  { id:"c3", name:"Abena Owusu",   phone:"0244-555-005", email:"", notes:"Online customer",   shopId:"boutique" },
];

const seedStaff = [
  { id:"st1", name:"Gilbert", role:"Owner",   pin:"1234" },
  { id:"st2", name:"Ama",     role:"Cashier", pin:"2222" },
  { id:"st3", name:"Kweku",   role:"Cashier", pin:"3333" },
];

function loadData() {
  try { const r = localStorage.getItem(STORAGE_KEY); if (r) return JSON.parse(r); } catch(_) {}
  return { shops:defaultShops, products:seedProducts, sales:seedSales, customers:seedCustomers, staff:seedStaff, suppliers:seedSuppliers, wishlists:[] };
}

const uid  = () => Math.random().toString(36).slice(2,9);
const fmt  = n  => `GH₵ ${Number(n).toFixed(2)}`;
const today= () => new Date().toISOString().slice(0,10);
const mgn  = (c,s) => s===0?0:Math.round(((s-c)/s)*100);

const iStyle = { width:"100%", padding:"8px 10px", border:"1.5px solid #d1d5db", borderRadius:8, fontSize:14, boxSizing:"border-box", outline:"none", background:"#fff", color:"#111" };

function Bdg({bg,tc,children}){ return <span style={{background:bg,color:tc,borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:700,whiteSpace:"nowrap"}}>{children}</span>; }
function SBar({qty,threshold}){
  const p=Math.min(100,threshold>0?(qty/(threshold*3))*100:100);
  const c=qty===0?"#ef4444":qty<=threshold?"#f59e0b":"#22c55e";
  return <div style={{height:5,background:"#e5e7eb",borderRadius:3,overflow:"hidden",width:60,display:"inline-block"}}><div style={{width:`${p}%`,height:"100%",background:c}}/></div>;
}
function Modal({title,onClose,wide,children}){
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200}} onClick={onClose}>
      <div style={{background:"#fff",borderRadius:14,padding:"24px 28px",width:`min(95vw,${wide?"680px":"500px"})`,maxHeight:"90vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <h3 style={{margin:0,fontSize:16,fontWeight:800}}>{title}</h3>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:24,cursor:"pointer",color:"#9ca3af"}}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
function Row({label,children}){ return <div style={{marginBottom:12}}><label style={{display:"block",fontSize:12,fontWeight:600,color:"#374151",marginBottom:4}}>{label}</label>{children}</div>; }

function generateReceipt(sale,product,customer,shopName,shopColor){
  const discAmt=sale.discount?(sale.total*(sale.discount/100)):0;
  const final=sale.total-discAmt;
  const w=window.open("","_blank","width=400,height=600");
  w.document.write(`<!DOCTYPE html><html><head><title>Receipt</title><style>
    body{font-family:'Courier New',monospace;padding:20px;max-width:320px;margin:0 auto;font-size:13px;color:#111}
    .c{text-align:center}.b{font-weight:bold}.d{border:none;border-top:1px dashed #999;margin:10px 0}
    table{width:100%;border-collapse:collapse}td{padding:3px 0}
  </style></head><body>
  <div class="c b" style="font-size:18px">${shopName}</div>
  <div class="c" style="font-size:11px;color:#666">${sale.date} · Ref: ${sale.id?.toUpperCase()}</div>
  <div class="c" style="font-size:11px;color:#666">Served by: ${sale.cashier||"—"} · ${customer?customer.name:"Walk-in"}</div>
  <hr class="d"/>
  <table>
    <tr><td>${sale.productName}</td><td style="text-align:right">${sale.qty} × ${fmt(sale.sellPrice)}</td></tr>
  </table>
  <hr class="d"/>
  <table>
    <tr><td>Subtotal</td><td style="text-align:right">${fmt(sale.total)}</td></tr>
    ${sale.discount?`<tr><td>Discount (${sale.discount}%)</td><td style="text-align:right;color:red">-${fmt(discAmt)}</td></tr>`:""}
    <tr><td class="b" style="font-size:15px">TOTAL</td><td class="b" style="text-align:right;font-size:15px;color:${shopColor}">${fmt(final)}</td></tr>
  </table>
  <hr class="d"/>
  <div class="c" style="font-size:11px;color:#666">Thank you for your business! 🙏</div>
  <script>window.onload=()=>window.print();</script>
  </body></html>`);
  w.document.close();
}

function exportCSV(products,sales,shopName){
  const rows=[
    ["--- INVENTORY ---"],
    ["Name","Category","Qty","Unit","Cost","Sell","Margin%","Profit/Unit","Supplier","Phone"],
    ...products.map(p=>[p.name,p.category,p.qty,p.unit,p.costPrice,p.sellPrice,mgn(p.costPrice,p.sellPrice)+"%",(p.sellPrice-p.costPrice).toFixed(2),p._supplierName||"",p._supplierPhone||""]),
    [""],["--- SALES ---"],
    ["Date","Product","Qty","Unit Price","Disc%","Total","Cashier","Note"],
    ...[...sales].reverse().map(s=>[s.date,s.productName,s.qty,s.sellPrice,s.discount||0,s.total,s.cashier||"",s.note||""]),
  ];
  const csv=rows.map(r=>r.map(c=>`"${String(c??"")}"`).join(",")).join("\n");
  const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"})); a.download=`${shopName.replace(/\s+/g,"_")}_${today()}.csv`; a.click();
}

// ── LICENSE SCREEN ───────────────────────────────────────────────────────────
function LicenseScreen({ onActivate }) {
  const [mode, setMode] = useState("trial"); // trial | activate
  const [key, setKey] = useState("");
  const [err, setErr] = useState("");

  const startTrial = () => {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + TRIAL_DAYS);
    const lic = { type: "trial", key: null, expiry: expiry.toISOString(), issued: new Date().toISOString() };
    saveLicense(lic);
    onActivate(lic);
  };

  const activateKey = () => {
    const k = key.toUpperCase().trim();
    if (!k) { setErr("Enter a license key."); return; }
    const validFormat = /^SHOPINV-[A-Z0-9]{2,8}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(k) || VALID_KEYS.includes(k);
    if (!validFormat) { setErr("Invalid license key. Format: SHOPINV-XXXX-XXXX-XXXX"); return; }

    // Decode plan from key segment (TRIAL / 1M / 6M / 12M / NY)
    const planSeg = k.split("-")[1] || "";
    let days = 365;
    if (planSeg === "TRIAL") days = TRIAL_DAYS;
    else if (planSeg === "1M") days = 30;
    else if (planSeg === "6M") days = 182;
    else if (planSeg === "12M") days = 365;
    else if (/^\d+Y$/.test(planSeg)) days = Math.round(parseInt(planSeg) * 365);

    const expiry = new Date();
    expiry.setDate(expiry.getDate() + days);
    const lic = { type: "licensed", key: k, expiry: expiry.toISOString(), issued: new Date().toISOString() };
    saveLicense(lic);
    onActivate(lic);
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#1e3a8a 0%,#2563eb 60%,#0ea5e9 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter','Segoe UI',sans-serif", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "32px 30px", width: "min(94vw,420px)", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🛒</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#1e3a8a" }}>Shop Inventory</div>
          <div style={{ color: "#6b7280", fontSize: 13, marginTop: 2 }}>Multi-Shop Inventory Manager</div>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          <button onClick={() => { setMode("trial"); setErr(""); }} style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: "2px solid #e5e7eb", background: mode === "trial" ? "#1e3a8a" : "#fff", color: mode === "trial" ? "#fff" : "#374151", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>Free Trial</button>
          <button onClick={() => { setMode("activate"); setErr(""); }} style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: "2px solid #e5e7eb", background: mode === "activate" ? "#1e3a8a" : "#fff", color: mode === "activate" ? "#fff" : "#374151", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>Activate License</button>
        </div>

        {mode === "trial" && (
          <div>
            <p style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6, margin: "0 0 14px" }}>
              Start a <strong>{TRIAL_DAYS}-day free trial</strong>. All features are available, across all shops. No credit card required.
            </p>
            <div style={{ background: "#fef3c7", border: "1px solid #f59e0b", borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 12, color: "#92400e" }}>
              Trial includes full access. Purchase a license before expiry to retain your data.
            </div>
            <button onClick={startTrial} style={{ width: "100%", padding: "13px 0", background: "linear-gradient(135deg,#1e3a8a,#0ea5e9)", color: "#fff", border: "none", borderRadius: 9, fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
              Start Free Trial
            </button>
          </div>
        )}

        {mode === "activate" && (
          <div>
            <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 10px" }}>Enter your license key to activate.</p>
            <input
              value={key}
              onChange={e => { setKey(e.target.value.toUpperCase()); setErr(""); }}
              onKeyDown={e => e.key === "Enter" && activateKey()}
              placeholder="SHOPINV-XXXX-XXXX-XXXX"
              style={{ width: "100%", padding: 11, border: "2px solid #e5e7eb", borderRadius: 8, fontSize: 14, textAlign: "center", boxSizing: "border-box", letterSpacing: 2, marginBottom: 8, fontFamily: "monospace" }}
            />
            {err && <div style={{ color: "#ef4444", fontSize: 12, marginBottom: 8 }}>{err}</div>}
            <button onClick={activateKey} style={{ width: "100%", padding: "13px 0", background: "linear-gradient(135deg,#1e3a8a,#0ea5e9)", color: "#fff", border: "none", borderRadius: 9, fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
              Activate
            </button>
            <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 12, textAlign: "center" }}>
              To purchase a license, contact: gilbert@aifarms.gh
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function LicenseExpiredScreen({ license, onRenew }) {
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#7f1d1d 0%,#991b1b 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter','Segoe UI',sans-serif", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "32px 30px", width: "min(94vw,420px)", textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>⏰</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: "#991b1b", marginBottom: 6 }}>
          {license.type === "trial" ? "Trial Expired" : "License Expired"}
        </div>
        <p style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6, marginBottom: 20 }}>
          Your {license.type === "trial" ? "free trial" : "license"} ended on {new Date(license.expiry).toLocaleDateString()}.
          Activate a new license key to keep using Shop Inventory.
        </p>
        <button onClick={onRenew} style={{ width: "100%", padding: "13px 0", background: "#991b1b", color: "#fff", border: "none", borderRadius: 9, fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
          Activate License
        </button>
      </div>
    </div>
  );
}

// ── PIN gate ──────────────────────────────────────────────────────────────
function PinGate({staff,onSuccess,onCancel}){
  const [pin,setPin]=useState(""); const [err,setErr]=useState("");
  const check=()=>{ const f=staff.find(s=>s.pin===pin); if(f) onSuccess(f); else { setErr("Wrong PIN."); setPin(""); } };
  return(
    <div style={{textAlign:"center"}}>
      <div style={{fontSize:13,color:"#6b7280",marginBottom:12}}>Enter your staff PIN</div>
      <input autoFocus style={{...iStyle,textAlign:"center",fontSize:22,letterSpacing:8,maxWidth:160}} type="password" maxLength={6} value={pin} onChange={e=>{setPin(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&check()}/>
      {err&&<div style={{color:"#ef4444",fontSize:12,marginTop:6}}>{err}</div>}
      <div style={{display:"flex",gap:8,marginTop:14}}>
        <button onClick={onCancel} style={{flex:1,background:"#f1f5f9",color:"#374151",border:"none",borderRadius:8,padding:"9px",fontWeight:700,cursor:"pointer"}}>Cancel</button>
        <button onClick={check} style={{flex:1,background:"#2563eb",color:"#fff",border:"none",borderRadius:8,padding:"9px",fontWeight:700,cursor:"pointer"}}>Confirm</button>
      </div>
    </div>
  );
}

// ── MiniBarChart ──────────────────────────────────────────────────────────
function MiniBarChart({data,color,height=120}){
  if(!data||!data.length) return null;
  const max=Math.max(...data.map(d=>d.v),1);
  return(
    <div style={{display:"flex",alignItems:"flex-end",gap:4,height,paddingBottom:20}}>
      {data.map((d,i)=>{ const h=Math.max(4,(d.v/max)*(height-24)); return(
        <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
          <div title={fmt(d.v)} style={{width:"100%",height:h,background:color,borderRadius:"3px 3px 0 0",opacity:0.85}}/>
          <div style={{fontSize:9,color:"#9ca3af",transform:"rotate(-30deg)",transformOrigin:"top center",whiteSpace:"nowrap"}}>{d.l}</div>
        </div>
      ); })}
    </div>
  );
}

// ── MAIN ─────────────────────────────────────────────────────────────────
export default function App(){
  const [license,setLicense]=useState(loadLicense);
  const [db,setDb]=useState(loadData);
  const [activeShop,setActiveShop]=useState("general");
  const [view,setView]=useState("inventory");
  const [search,setSearch]=useState("");
  const [modal,setModal]=useState(null);
  const [editing,setEditing]=useState(null);
  const [form,setForm]=useState({});
  const [toast,setToast]=useState(null);
  const [reportPeriod,setReportPeriod]=useState("week");
  const [pendingSale,setPendingSale]=useState(null);
  const [activeStaff,setActiveStaff]=useState(null);

  useEffect(()=>{ try{localStorage.setItem(STORAGE_KEY,JSON.stringify(db));}catch(_){} },[db]);

  // ── LICENSE GATE ──────────────────────────────────────────────────────────
  if (!license) {
    return <LicenseScreen onActivate={setLicense} />;
  }
  if (isExpired(license.expiry)) {
    return <LicenseExpiredScreen license={license} onRenew={() => setLicense(null)} />;
  }


  const shop   = db.shops.find(s=>s.id===activeShop)||db.shops[0];
  const products= db.products[activeShop]||[];
  const sales   = db.sales[activeShop]||[];
  const customers=(db.customers||[]).filter(c=>c.shopId===activeShop);
  const allCustomers=db.customers||[];
  const staff   = db.staff||[];
  const suppliers=db.suppliers||[];
  const wishlists=(db.wishlists||[]).filter(w=>w.shopId===activeShop);
  const isBoutique=activeShop==="boutique";
  const lowStock=products.filter(p=>p.qty<=p.lowStockThreshold);

  // helper: get supplier object for a product
  const getSupplier = supplierId => suppliers.find(s=>s.id===supplierId);

  const showToast=(msg,type="ok")=>{ setToast({msg,type}); setTimeout(()=>setToast(null),2700); };
  const close=()=>{ setModal(null); setEditing(null); setForm({}); setPendingSale(null); };
  const fld=k=>e=>setForm(p=>({...p,[k]:e.target.value}));

  const todayStr=today();
  const todaySalesList=sales.filter(x=>x.date===todayStr);
  const todayRevenue=todaySalesList.reduce((s,x)=>s+x.total,0);
  const todayCost=todaySalesList.reduce((s,x)=>{ const p=products.find(pr=>pr.id===x.productId); return s+(p?p.costPrice*x.qty:0); },0);
  const todayProfit=todayRevenue-todayCost;
  const totalSalesValue=sales.reduce((s,x)=>s+x.total,0);
  const totalStockValue=products.reduce((s,p)=>s+p.qty*p.costPrice,0);

  const bestSellers=useMemo(()=>{ const map={}; sales.forEach(s=>{map[s.productName]=(map[s.productName]||0)+s.qty;}); return Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,5); },[sales]);

  const chartData=useMemo(()=>{
    const now=new Date("2026-06-26"); let days=reportPeriod==="month"?30:reportPeriod==="day"?1:7;
    return Array.from({length:days},(_,i)=>{ const d=new Date(now); d.setDate(d.getDate()-(days-1-i)); const ds=d.toISOString().slice(0,10); return {l:ds.slice(5),v:sales.filter(s=>s.date===ds).reduce((a,s)=>a+s.total,0)}; });
  },[sales,reportPeriod]);

  const filtered=products.filter(p=>
    p.name.toLowerCase().includes(search.toLowerCase())||
    (p.category||"").toLowerCase().includes(search.toLowerCase())||
    (p.size||"").toLowerCase().includes(search.toLowerCase())||
    (p.color||"").toLowerCase().includes(search.toLowerCase())
  );

  // ── Product CRUD ──────────────────────────────────────────────────────
  const saveProduct=()=>{
    const p={
      id:editing?editing.id:uid(), name:form.name||"Unnamed", category:form.category||"General",
      qty:Number(form.qty)||0, unit:form.unit||"piece",
      costPrice:Number(form.costPrice)||0, sellPrice:Number(form.sellPrice)||0,
      lowStockThreshold:Number(form.lowStockThreshold)||3,
      supplierId:form.supplierId||"",
      lastRestocked:form.lastRestocked||today(),
      ...(isBoutique?{size:form.size||"",color:form.color||""}:{size:"",color:""}),
    };
    setDb(prev=>{ const list=prev.products[activeShop]||[]; return {...prev,products:{...prev.products,[activeShop]:editing?list.map(x=>x.id===editing.id?p:x):[...list,p]}}; });
    showToast(editing?"Product updated.":"Product added."); close();
  };

  const deleteProduct=id=>{ setDb(prev=>({...prev,products:{...prev.products,[activeShop]:(prev.products[activeShop]||[]).filter(p=>p.id!==id)}})); showToast("Removed.","warn"); close(); };

  // ── Sale ──────────────────────────────────────────────────────────────
  const initSale=()=>{
    const product=products.find(p=>p.id===form.productId); if(!product) return;
    if(Number(form.qty||1)>product.qty){ showToast("Not enough stock!","err"); return; }
    if(staff.length>0){ setPendingSale({...form}); setModal("pinGate"); }
    else commitSale(form,null);
  };

  const commitSale=(saleForm,staffMember)=>{
    const product=products.find(p=>p.id===saleForm.productId); if(!product) return;
    const qty=Number(saleForm.qty)||1;
    const sp=Number(saleForm.sellPrice)||product.sellPrice;
    const disc=Number(saleForm.discount)||0;
    const subtotal=qty*sp; const discAmt=subtotal*(disc/100); const total=subtotal-discAmt;
    const customer=allCustomers.find(c=>c.id===saleForm.customerId);
    const sale={id:uid(),productId:product.id,productName:product.name,qty,sellPrice:sp,discount:disc,total,date:saleForm.date||today(),note:saleForm.note||"",customerId:saleForm.customerId||"",customerName:customer?.name||"",cashier:staffMember?.name||"",cashierId:staffMember?.id||""};
    setDb(prev=>({
      ...prev,
      products:{...prev.products,[activeShop]:(prev.products[activeShop]||[]).map(p=>p.id===product.id?{...p,qty:p.qty-qty}:p)},
      sales:{...prev.sales,[activeShop]:[...(prev.sales[activeShop]||[]),sale]},
    }));
    showToast(`Sale saved — ${fmt(total)}`); setActiveStaff(staffMember); close();
  };

  const restock=()=>{ const add=Number(form.addQty)||0; setDb(prev=>({...prev,products:{...prev.products,[activeShop]:(prev.products[activeShop]||[]).map(p=>p.id===editing.id?{...p,qty:p.qty+add,lastRestocked:today()}:p)}})); showToast(`Restocked +${add} ${editing.unit}`); close(); };

  // ── Supplier CRUD ─────────────────────────────────────────────────────
  const saveSupplier=()=>{
    const s={
      id:editing?editing.id:uid(),
      name:form.supName||"",
      contact:form.supContact||"",
      phone:form.supPhone||"",
      email:form.supEmail||"",
      location:form.supLocation||"",
      category:form.supCategory||"",
      notes:form.supNotes||"",
    };
    setDb(prev=>({...prev,suppliers:editing?prev.suppliers.map(x=>x.id===editing.id?s:x):[...prev.suppliers,s]}));
    showToast(editing?"Supplier updated.":"Supplier added."); close();
  };

  const deleteSupplier=id=>{
    // unlink products
    setDb(prev=>({
      ...prev,
      suppliers:prev.suppliers.filter(s=>s.id!==id),
      products:Object.fromEntries(Object.entries(prev.products).map(([shopId,prods])=>[shopId,prods.map(p=>p.supplierId===id?{...p,supplierId:""}:p)])),
    }));
    showToast("Supplier removed.","warn"); close();
  };

  // ── Customer CRUD ─────────────────────────────────────────────────────
  const saveCustomer=()=>{ const c={id:editing?editing.id:uid(),name:form.cname||"",phone:form.cphone||"",email:form.cemail||"",notes:form.cnotes||"",shopId:activeShop}; setDb(prev=>({...prev,customers:editing?prev.customers.map(x=>x.id===editing.id?c:x):[...(prev.customers||[]),c]})); showToast(editing?"Customer updated.":"Customer added."); close(); };
  const deleteCustomer=id=>{ setDb(prev=>({...prev,customers:(prev.customers||[]).filter(c=>c.id!==id)})); showToast("Customer removed.","warn"); close(); };

  // ── Staff CRUD ────────────────────────────────────────────────────────
  const saveStaff=()=>{ const s={id:editing?editing.id:uid(),name:form.sname||"",pin:form.spin||"0000",role:form.srole||"Cashier"}; setDb(prev=>({...prev,staff:editing?prev.staff.map(x=>x.id===editing.id?s:x):[...(prev.staff||[]),s]})); showToast(editing?"Updated.":"Staff added."); close(); };

  // ── Wishlist ──────────────────────────────────────────────────────────
  const saveWishlist=()=>{ const w={id:uid(),customerName:form.wCustomer||"",phone:form.wPhone||"",productName:form.wProduct||"",size:form.wSize||"",color:form.wColor||"",notes:form.wNotes||"",date:today(),shopId:activeShop,fulfilled:false}; setDb(prev=>({...prev,wishlists:[...(prev.wishlists||[]),w]})); showToast("Wishlist entry saved."); close(); };
  const toggleWishlist=id=>{ setDb(prev=>({...prev,wishlists:(prev.wishlists||[]).map(w=>w.id===id?{...w,fulfilled:!w.fulfilled}:w)})); };

  // ── Add shop ──────────────────────────────────────────────────────────
  const addShop=()=>{ const id=(form.shopName||"shop").toLowerCase().replace(/\s+/g,"_")+"_"+uid(); const s={id,name:form.shopName||"New Shop",icon:form.shopIcon||"🏪",color:form.shopColor||"#6366f1"}; setDb(prev=>({...prev,shops:[...prev.shops,s],products:{...prev.products,[id]:[]},sales:{...prev.sales,[id]:[]}})); setActiveShop(id); showToast("Shop created!"); close(); };

  const toastBg={ok:"#22c55e",warn:"#f59e0b",err:"#ef4444"};

  // Suppliers for current shop's products
  const shopSupplierIds=[...new Set(products.map(p=>p.supplierId).filter(Boolean))];
  const shopSuppliers=suppliers.filter(s=>shopSupplierIds.includes(s.id));

  const navItems=[
    {id:"inventory",  label:"📦 Inventory"},
    {id:"sales",      label:"🧾 Sales"},
    {id:"reports",    label:"📊 Reports"},
    {id:"customers",  label:`👤 Customers (${customers.length})`},
    ...(isBoutique?[{id:"wishlist",label:`💌 Wishlist (${wishlists.filter(w=>!w.fulfilled).length})`}]:[]),
    {id:"alerts",     label:`⚠️ Alerts${lowStock.length?` (${lowStock.length})`:""}`},
    {id:"suppliers",  label:`🚚 Suppliers`},
    {id:"staff",      label:`👥 Staff (${staff.length})`},
    {id:"backup",     label:"💾 Backup"},
  ];

  // sale live calc
  const saleProd=products.find(p=>p.id===form.productId);
  const saleSubtotal=(Number(form.qty)||1)*(Number(form.sellPrice)||saleProd?.sellPrice||0);
  const saleDisc=Number(form.discount)||0;
  const saleFinal=saleSubtotal*(1-saleDisc/100);
  const saleCost=saleProd?(saleProd.costPrice*(Number(form.qty)||1)):0;
  const saleProfit=saleFinal-saleCost;

  return(
    <div style={{fontFamily:"'Inter','Segoe UI',sans-serif",background:"#f8fafc",minHeight:"100vh",color:"#111827"}}>

      {toast&&<div style={{position:"fixed",top:16,right:16,zIndex:999,background:toastBg[toast.type],color:"#fff",padding:"10px 18px",borderRadius:10,fontWeight:700,fontSize:13,boxShadow:"0 4px 16px rgba(0,0,0,0.18)"}}>{toast.msg}</div>}

      {/* HEADER */}
      <div style={{background:shop.color,padding:"18px 20px 0",color:"#fff"}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:14,flexWrap:"wrap"}}>
          <div>
            <div style={{fontSize:11,opacity:0.75,fontWeight:600,letterSpacing:1}}>SHOP MANAGER</div>
            <div style={{fontSize:20,fontWeight:800}}>{shop.icon} {shop.name}</div>
            {activeStaff&&<div style={{fontSize:12,opacity:0.85}}>Logged in: {activeStaff.name} ({activeStaff.role})</div>}
            {license.type==="trial"&&<div style={{fontSize:11,marginTop:4,background:"rgba(255,255,255,0.2)",borderRadius:6,padding:"2px 8px",display:"inline-block"}}>Trial: {daysLeft(license.expiry)} days left</div>}
          </div>
          <div style={{marginLeft:"auto",display:"flex",gap:6,flexWrap:"wrap"}}>
            {db.shops.map(s=>(
              <button key={s.id} onClick={()=>{setActiveShop(s.id);setView("inventory");setSearch("");}}
                style={{background:s.id===activeShop?"#fff":"rgba(255,255,255,0.18)",color:s.id===activeShop?s.color:"#fff",border:"none",borderRadius:20,padding:"5px 12px",fontWeight:700,fontSize:12,cursor:"pointer"}}>
                {s.icon} {s.name}
              </button>
            ))}
            <button onClick={()=>{setForm({shopIcon:"🏪",shopColor:"#6366f1"});setModal("addShop");}}
              style={{background:"rgba(255,255,255,0.15)",color:"#fff",border:"1.5px dashed rgba(255,255,255,0.5)",borderRadius:20,padding:"5px 12px",fontWeight:700,fontSize:12,cursor:"pointer"}}>+ Shop</button>
          </div>
        </div>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          {[{l:"Products",v:products.length},{l:"Stock Value",v:fmt(totalStockValue)},{l:"Today's Sales",v:fmt(todayRevenue)},{l:"Today's Profit",v:fmt(todayProfit),green:todayProfit>0},{l:"Low Stock",v:lowStock.length,warn:lowStock.length>0}].map(s=>(
            <div key={s.l} style={{background:"rgba(255,255,255,0.15)",borderRadius:"8px 8px 0 0",padding:"8px 14px"}}>
              <div style={{fontSize:11,opacity:0.8}}>{s.l}</div>
              <div style={{fontSize:17,fontWeight:900,color:s.warn?"#fde68a":s.green?"#bbf7d0":"#fff"}}>{s.v}</div>
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:2,marginTop:8,flexWrap:"wrap"}}>
          {navItems.map(n=>(
            <button key={n.id} onClick={()=>setView(n.id)}
              style={{background:view===n.id?"#fff":"transparent",color:view===n.id?shop.color:"rgba(255,255,255,0.85)",border:"none",borderRadius:"8px 8px 0 0",padding:"7px 12px",fontWeight:700,fontSize:12,cursor:"pointer"}}>
              {n.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{padding:"18px 20px",maxWidth:1100,margin:"0 auto"}}>

        {/* ── INVENTORY ── */}
        {view==="inventory"&&(
          <>
            <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search products…" style={{...iStyle,maxWidth:260,flex:1}}/>
              <button onClick={()=>exportCSV(products.map(p=>({...p,_supplierName:getSupplier(p.supplierId)?.name||"",_supplierPhone:getSupplier(p.supplierId)?.phone||""})),sales,shop.name)} style={{background:"#fff",color:shop.color,border:`2px solid ${shop.color}`,borderRadius:8,padding:"8px 14px",fontWeight:700,cursor:"pointer",fontSize:13}}>⬇ Export</button>
              <button onClick={()=>{setForm({});setModal("addProduct");}} style={{background:shop.color,color:"#fff",border:"none",borderRadius:8,padding:"8px 16px",fontWeight:700,cursor:"pointer",fontSize:13}}>+ Add Product</button>
              <button onClick={()=>{setForm({productId:products[0]?.id,sellPrice:products[0]?.sellPrice,date:today(),qty:1,discount:0});setModal("recordSale");}} style={{background:"#fff",color:shop.color,border:`2px solid ${shop.color}`,borderRadius:8,padding:"8px 14px",fontWeight:700,cursor:"pointer",fontSize:13}}>🧾 Record Sale</button>
            </div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",background:"#fff",borderRadius:12,overflow:"hidden",boxShadow:"0 1px 6px rgba(0,0,0,0.07)"}}>
                <thead><tr style={{background:"#f1f5f9"}}>
                  {["Product","Category",...(isBoutique?["Size","Color"]:[]),"Stock","Level","Cost","Price","Margin","Profit/Unit","Supplier",""].map(h=>(
                    <th key={h} style={{padding:"9px 10px",textAlign:"left",fontSize:11,fontWeight:700,color:"#6b7280",whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {filtered.length===0&&<tr><td colSpan={13} style={{padding:28,textAlign:"center",color:"#9ca3af"}}>No products yet.</td></tr>}
                  {filtered.map((p,i)=>{
                    const isLow=p.qty<=p.lowStockThreshold,isOut=p.qty===0;
                    const m=mgn(p.costPrice,p.sellPrice),prof=p.sellPrice-p.costPrice;
                    const sup=getSupplier(p.supplierId);
                    return(
                      <tr key={p.id} style={{borderTop:"1px solid #f1f5f9",background:i%2===0?"#fff":"#fafafa"}}>
                        <td style={{padding:"9px 10px",fontWeight:600,fontSize:13}}>{p.name}</td>
                        <td style={{padding:"9px 10px"}}><span style={{background:"#f1f5f9",color:"#374151",borderRadius:6,padding:"2px 7px",fontSize:11,fontWeight:700}}>{p.category}</span></td>
                        {isBoutique&&<td style={{padding:"9px 10px",fontSize:13}}>{p.size||"—"}</td>}
                        {isBoutique&&<td style={{padding:"9px 10px",fontSize:13}}>{p.color||"—"}</td>}
                        <td style={{padding:"9px 10px"}}><span style={{fontWeight:800,fontSize:14,color:isOut?"#ef4444":isLow?"#f59e0b":"#111"}}>{p.qty}</span><span style={{fontSize:11,color:"#9ca3af",marginLeft:3}}>{p.unit}</span></td>
                        <td style={{padding:"9px 10px"}}>
                          <div style={{display:"flex",gap:4,alignItems:"center"}}>
                            <SBar qty={p.qty} threshold={p.lowStockThreshold}/>
                            {isOut&&<Bdg bg="#fef2f2" tc="#ef4444">OUT</Bdg>}
                            {!isOut&&isLow&&<Bdg bg="#fffbeb" tc="#d97706">LOW</Bdg>}
                          </div>
                        </td>
                        <td style={{padding:"9px 10px",fontSize:12,color:"#6b7280"}}>{fmt(p.costPrice)}</td>
                        <td style={{padding:"9px 10px",fontWeight:700,fontSize:13,color:shop.color}}>{fmt(p.sellPrice)}</td>
                        <td style={{padding:"9px 10px"}}><Bdg bg={m>=30?"#f0fdf4":m>=15?"#fffbeb":"#fef2f2"} tc={m>=30?"#166534":m>=15?"#92400e":"#991b1b"}>{m}%</Bdg></td>
                        <td style={{padding:"9px 10px",fontSize:13,fontWeight:700,color:prof>0?"#16a34a":"#ef4444"}}>{fmt(prof)}</td>
                        <td style={{padding:"9px 10px",fontSize:12}}>
                          {sup
                            ? <div><div style={{fontWeight:600,color:"#374151"}}>{sup.name}</div><div style={{color:"#9ca3af",fontSize:11}}>{sup.phone}</div></div>
                            : <span style={{color:"#d1d5db"}}>—</span>
                          }
                        </td>
                        <td style={{padding:"9px 10px"}}>
                          <div style={{display:"flex",gap:5}}>
                            <button onClick={()=>{setEditing(p);setForm({});setModal("restock");}} style={{background:"#dcfce7",color:"#16a34a",border:"none",borderRadius:6,padding:"3px 9px",fontSize:11,fontWeight:700,cursor:"pointer"}}>+Stock</button>
                            <button onClick={()=>{setEditing(p);setForm({name:p.name,category:p.category,qty:p.qty,unit:p.unit,costPrice:p.costPrice,sellPrice:p.sellPrice,lowStockThreshold:p.lowStockThreshold,supplierId:p.supplierId||"",size:p.size||"",color:p.color||""});setModal("addProduct");}} style={{background:"#dbeafe",color:"#2563eb",border:"none",borderRadius:6,padding:"3px 9px",fontSize:11,fontWeight:700,cursor:"pointer"}}>Edit</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── SALES ── */}
        {view==="sales"&&(
          <>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
              <div><div style={{fontWeight:800,fontSize:17}}>Sales History</div><div style={{fontSize:13,color:"#6b7280"}}>Total: <b>{fmt(totalSalesValue)}</b> · {sales.length} transactions</div></div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>exportCSV(products,sales,shop.name)} style={{background:"#fff",color:shop.color,border:`2px solid ${shop.color}`,borderRadius:8,padding:"8px 14px",fontWeight:700,cursor:"pointer",fontSize:13}}>⬇ Export</button>
                <button onClick={()=>{setForm({productId:products[0]?.id,sellPrice:products[0]?.sellPrice,date:today(),qty:1,discount:0});setModal("recordSale");}} style={{background:shop.color,color:"#fff",border:"none",borderRadius:8,padding:"8px 16px",fontWeight:700,cursor:"pointer",fontSize:13}}>🧾 Record Sale</button>
              </div>
            </div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",background:"#fff",borderRadius:12,overflow:"hidden",boxShadow:"0 1px 6px rgba(0,0,0,0.07)"}}>
                <thead><tr style={{background:"#f1f5f9"}}>
                  {["Date","Product","Qty","Unit Price","Disc%","Total","Profit","Customer","Cashier","Note",""].map(h=>(
                    <th key={h} style={{padding:"9px 10px",textAlign:"left",fontSize:11,fontWeight:700,color:"#6b7280",whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {sales.length===0&&<tr><td colSpan={11} style={{padding:28,textAlign:"center",color:"#9ca3af"}}>No sales yet.</td></tr>}
                  {[...sales].reverse().map((s,i)=>{
                    const p=products.find(pr=>pr.id===s.productId);
                    const profit=p?(s.sellPrice-p.costPrice)*s.qty*(1-(s.discount||0)/100):null;
                    const customer=allCustomers.find(c=>c.id===s.customerId);
                    return(
                      <tr key={s.id} style={{borderTop:"1px solid #f1f5f9",background:i%2===0?"#fff":"#fafafa"}}>
                        <td style={{padding:"9px 10px",fontSize:12,color:"#6b7280"}}>{s.date}</td>
                        <td style={{padding:"9px 10px",fontWeight:600,fontSize:13}}>{s.productName}</td>
                        <td style={{padding:"9px 10px",fontSize:13}}>{s.qty}</td>
                        <td style={{padding:"9px 10px",fontSize:13}}>{fmt(s.sellPrice)}</td>
                        <td style={{padding:"9px 10px",fontSize:13}}>{s.discount?`${s.discount}%`:"—"}</td>
                        <td style={{padding:"9px 10px",fontWeight:700,color:shop.color,fontSize:13}}>{fmt(s.total)}</td>
                        <td style={{padding:"9px 10px",fontSize:13,fontWeight:700,color:profit>0?"#16a34a":"#9ca3af"}}>{profit!==null?fmt(profit):"—"}</td>
                        <td style={{padding:"9px 10px",fontSize:12}}>{customer?.name||s.customerName||"—"}</td>
                        <td style={{padding:"9px 10px",fontSize:12}}>{s.cashier||"—"}</td>
                        <td style={{padding:"9px 10px",fontSize:12,color:"#9ca3af"}}>{s.note||"—"}</td>
                        <td style={{padding:"9px 10px"}}>
                          <button onClick={()=>generateReceipt(s,products.find(pr=>pr.id===s.productId),customer,shop.name,shop.color)}
                            style={{background:"#f1f5f9",color:"#374151",border:"none",borderRadius:6,padding:"3px 9px",fontSize:11,fontWeight:700,cursor:"pointer"}}>🖨 Receipt</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── REPORTS ── */}
        {view==="reports"&&(
          <>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}}>
              <div style={{fontWeight:800,fontSize:17}}>📊 Reports</div>
              <div style={{display:"flex",gap:6}}>
                {[["day","Today"],["week","7 Days"],["month","30 Days"]].map(([k,l])=>(
                  <button key={k} onClick={()=>setReportPeriod(k)} style={{background:reportPeriod===k?shop.color:"#fff",color:reportPeriod===k?"#fff":shop.color,border:`2px solid ${shop.color}`,borderRadius:8,padding:"5px 14px",fontWeight:700,cursor:"pointer",fontSize:12}}>{l}</button>
                ))}
              </div>
            </div>
            <div style={{background:"#fff",borderRadius:12,padding:18,marginBottom:14,boxShadow:"0 1px 6px rgba(0,0,0,0.07)"}}>
              <div style={{fontWeight:700,fontSize:14,marginBottom:12}}>🌅 Today — {todayStr}</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:10}}>
                {[{l:"Transactions",v:todaySalesList.length},{l:"Revenue",v:fmt(todayRevenue)},{l:"Cost",v:fmt(todayCost)},{l:"Gross Profit",v:fmt(todayProfit),green:todayProfit>0},{l:"Margin",v:todayRevenue>0?Math.round((todayProfit/todayRevenue)*100)+"%":"0%",green:todayProfit>0}].map(s=>(
                  <div key={s.l} style={{background:"#f8fafc",borderRadius:10,padding:"12px 14px",border:"1px solid #e5e7eb"}}>
                    <div style={{fontSize:11,color:"#6b7280",marginBottom:4}}>{s.l}</div>
                    <div style={{fontSize:17,fontWeight:900,color:s.green?"#16a34a":s.l==="Cost"?"#ef4444":"#111"}}>{s.v}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{background:"#fff",borderRadius:12,padding:18,marginBottom:14,boxShadow:"0 1px 6px rgba(0,0,0,0.07)"}}>
              <div style={{fontWeight:700,fontSize:14,marginBottom:4}}>📈 Revenue</div>
              <div style={{fontSize:13,color:"#6b7280",marginBottom:12}}>Total: <b style={{color:shop.color}}>{fmt(chartData.reduce((a,d)=>a+d.v,0))}</b></div>
              {chartData.every(d=>d.v===0)?<div style={{textAlign:"center",color:"#9ca3af",padding:24}}>No sales in this period.</div>:<MiniBarChart data={chartData} color={shop.color} height={140}/>}
            </div>
            <div style={{background:"#fff",borderRadius:12,padding:18,boxShadow:"0 1px 6px rgba(0,0,0,0.07)"}}>
              <div style={{fontWeight:700,fontSize:14,marginBottom:12}}>🏆 Best Sellers</div>
              {bestSellers.length===0?<div style={{color:"#9ca3af",textAlign:"center",padding:16}}>No data.</div>
                :bestSellers.map(([name,qty],i)=>{ const max=bestSellers[0][1]; return(
                  <div key={name} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                    <div style={{width:22,fontSize:13,fontWeight:700,color:i===0?"#f59e0b":"#9ca3af",textAlign:"center"}}>{i===0?"🥇":i===1?"🥈":i===2?"🥉":i+1}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{name}</div>
                      <div style={{height:6,background:"#e5e7eb",borderRadius:3,marginTop:3}}><div style={{width:`${(qty/max)*100}%`,height:"100%",background:shop.color,borderRadius:3}}/></div>
                    </div>
                    <div style={{fontSize:13,fontWeight:700,color:shop.color,whiteSpace:"nowrap"}}>{qty} units</div>
                  </div>
                );})
              }
            </div>
          </>
        )}

        {/* ── CUSTOMERS ── */}
        {view==="customers"&&(
          <>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
              <div style={{fontWeight:800,fontSize:17}}>👤 Customers — {shop.name}</div>
              <button onClick={()=>{setForm({});setModal("addCustomer");}} style={{background:shop.color,color:"#fff",border:"none",borderRadius:8,padding:"8px 16px",fontWeight:700,cursor:"pointer",fontSize:13}}>+ Add Customer</button>
            </div>
            {customers.length===0&&<div style={{textAlign:"center",color:"#9ca3af",padding:32,background:"#fff",borderRadius:12}}>No customers yet.</div>}
            <div style={{display:"grid",gap:10,gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))"}}>
              {customers.map(c=>{ const cSales=sales.filter(s=>s.customerId===c.id); const spent=cSales.reduce((a,s)=>a+s.total,0); return(
                <div key={c.id} style={{background:"#fff",borderRadius:12,padding:18,boxShadow:"0 1px 6px rgba(0,0,0,0.07)"}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                    <div><div style={{fontWeight:800,fontSize:15}}>{c.name}</div><div style={{fontSize:13,color:"#6b7280"}}>📞 {c.phone||"—"}</div></div>
                    <button onClick={()=>{setEditing(c);setForm({cname:c.name,cphone:c.phone,cemail:c.email,cnotes:c.notes});setModal("addCustomer");}} style={{background:"#dbeafe",color:"#2563eb",border:"none",borderRadius:6,padding:"4px 10px",fontSize:11,fontWeight:700,cursor:"pointer"}}>Edit</button>
                  </div>
                  {c.notes&&<div style={{fontSize:12,color:"#6b7280",marginBottom:8,fontStyle:"italic"}}>"{c.notes}"</div>}
                  <div style={{display:"flex",gap:8,borderTop:"1px solid #f1f5f9",paddingTop:10}}>
                    <div style={{flex:1,textAlign:"center"}}><div style={{fontSize:11,color:"#9ca3af"}}>Purchases</div><div style={{fontSize:16,fontWeight:800,color:shop.color}}>{cSales.length}</div></div>
                    <div style={{flex:1,textAlign:"center"}}><div style={{fontSize:11,color:"#9ca3af"}}>Total Spent</div><div style={{fontSize:14,fontWeight:800,color:shop.color}}>{fmt(spent)}</div></div>
                  </div>
                </div>
              ); })}
            </div>
          </>
        )}

        {/* ── WISHLIST ── */}
        {view==="wishlist"&&(
          <>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
              <div style={{fontWeight:800,fontSize:17}}>💌 Customer Wishlist</div>
              <button onClick={()=>{setForm({});setModal("addWishlist");}} style={{background:shop.color,color:"#fff",border:"none",borderRadius:8,padding:"8px 16px",fontWeight:700,cursor:"pointer",fontSize:13}}>+ Add Entry</button>
            </div>
            <div style={{display:"grid",gap:10,gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))"}}>
              {wishlists.length===0&&<div style={{gridColumn:"1/-1",textAlign:"center",color:"#9ca3af",padding:32,background:"#fff",borderRadius:12}}>No wishlist entries yet.</div>}
              {wishlists.map(w=>(
                <div key={w.id} style={{background:"#fff",borderRadius:12,padding:16,boxShadow:"0 1px 6px rgba(0,0,0,0.07)",border:`1px solid ${w.fulfilled?"#86efac":"#e9d5ff"}`,opacity:w.fulfilled?0.65:1}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                    <div style={{fontWeight:700,fontSize:14}}>{w.productName}</div>
                    <Bdg bg={w.fulfilled?"#f0fdf4":"#f3e8ff"} tc={w.fulfilled?"#166534":"#6b21a8"}>{w.fulfilled?"Fulfilled":"Pending"}</Bdg>
                  </div>
                  {w.size&&<div style={{fontSize:12,color:"#6b7280",marginBottom:2}}>Size: {w.size} · {w.color}</div>}
                  <div style={{fontSize:13,fontWeight:600,marginBottom:2}}>👤 {w.customerName}</div>
                  <div style={{fontSize:12,color:"#6b7280",marginBottom:8}}>📞 {w.phone}</div>
                  <button onClick={()=>toggleWishlist(w.id)} style={{width:"100%",background:w.fulfilled?"#f1f5f9":shop.color,color:w.fulfilled?"#374151":"#fff",border:"none",borderRadius:8,padding:"7px 0",fontWeight:700,cursor:"pointer",fontSize:13}}>
                    {w.fulfilled?"Mark as Pending":"Mark Fulfilled ✓"}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── ALERTS ── */}
        {view==="alerts"&&(
          <>
            <div style={{fontWeight:800,fontSize:17,marginBottom:14}}>⚠️ Stock Alerts</div>
            {lowStock.length===0
              ?<div style={{background:"#f0fdf4",border:"1.5px solid #86efac",borderRadius:12,padding:24,color:"#166534",fontWeight:600,textAlign:"center"}}>✅ All products are well stocked!</div>
              :<div style={{display:"grid",gap:10,gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))"}}>
                {lowStock.map(p=>{ const sup=getSupplier(p.supplierId); return(
                  <div key={p.id} style={{background:"#fff",borderRadius:12,padding:16,boxShadow:"0 1px 6px rgba(0,0,0,0.07)",borderLeft:`4px solid ${p.qty===0?"#ef4444":"#f59e0b"}`}}>
                    <div style={{fontWeight:700,fontSize:14}}>{p.name}</div>
                    {isBoutique&&p.size&&<div style={{fontSize:12,color:"#6b7280"}}>Size {p.size} · {p.color}</div>}
                    <div style={{fontSize:12,color:"#6b7280",marginBottom:8}}>{p.category}</div>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                      <div><span style={{fontSize:26,fontWeight:900,color:p.qty===0?"#ef4444":"#f59e0b"}}>{p.qty}</span><span style={{fontSize:11,color:"#9ca3af",marginLeft:3}}>{p.unit} left</span></div>
                      <div style={{textAlign:"right",fontSize:11,color:"#6b7280"}}><div>Alert at: {p.lowStockThreshold}</div></div>
                    </div>
                    {sup&&(
                      <div style={{background:"#f8fafc",borderRadius:8,padding:"8px 10px",marginBottom:10,fontSize:12}}>
                        <div style={{fontWeight:600,color:"#374151"}}>🏢 {sup.name}</div>
                        <div style={{color:"#6b7280"}}>📞 {sup.phone}</div>
                        {sup.phone&&<a href={`https://wa.me/233${sup.phone.replace(/^0/,"").replace(/[-\s]/g,"")}`} target="_blank" rel="noreferrer"
                          style={{display:"inline-block",marginTop:4,background:"#25D366",color:"#fff",borderRadius:5,padding:"2px 10px",fontSize:11,fontWeight:700,textDecoration:"none"}}>💬 WhatsApp Supplier</a>}
                      </div>
                    )}
                    <button onClick={()=>{setEditing(p);setForm({});setModal("restock");}} style={{width:"100%",background:shop.color,color:"#fff",border:"none",borderRadius:8,padding:"7px 0",fontWeight:700,cursor:"pointer",fontSize:13}}>Restock Now</button>
                  </div>
                ); })}
              </div>
            }
          </>
        )}

        {/* ══ SUPPLIERS TAB ══════════════════════════════════════════════ */}
        {view==="suppliers"&&(
          <>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}}>
              <div>
                <div style={{fontWeight:800,fontSize:17}}>🚚 Supplier Directory</div>
                <div style={{fontSize:13,color:"#6b7280"}}>All suppliers are shared across shops. Assign them to products in Inventory.</div>
              </div>
              <button onClick={()=>{setEditing(null);setForm({});setModal("editSupplier");}}
                style={{background:shop.color,color:"#fff",border:"none",borderRadius:8,padding:"8px 18px",fontWeight:700,cursor:"pointer",fontSize:13}}>+ Add Supplier</button>
            </div>

            {/* Quick filter — show shop's suppliers or all */}
            <div style={{display:"flex",gap:6,marginBottom:14}}>
              <Bdg bg={shop.color+"22"} tc={shop.color}>This shop: {shopSuppliers.length} supplier{shopSuppliers.length!==1?"s":""}</Bdg>
              <Bdg bg="#f1f5f9" tc="#374151">Total in directory: {suppliers.length}</Bdg>
            </div>

            <div style={{display:"grid",gap:12,gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))"}}>
              {suppliers.length===0&&<div style={{gridColumn:"1/-1",textAlign:"center",color:"#9ca3af",padding:32,background:"#fff",borderRadius:12}}>No suppliers yet. Add your first one.</div>}
              {suppliers.map(s=>{
                const sProds=Object.values(db.products).flat().filter(p=>p.supplierId===s.id);
                const sLow=sProds.filter(p=>p.qty<=p.lowStockThreshold);
                const isUsedHere=shopSupplierIds.includes(s.id);
                return(
                  <div key={s.id} style={{background:"#fff",borderRadius:12,padding:18,boxShadow:"0 1px 6px rgba(0,0,0,0.07)",border:`1.5px solid ${sLow.length>0?"#fde68a":isUsedHere?shop.color+"55":"#e5e7eb"}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                      <div style={{flex:1,minWidth:0,paddingRight:8}}>
                        <div style={{fontWeight:800,fontSize:15,marginBottom:2}}>{s.name}</div>
                        <div style={{fontSize:13,color:"#374151"}}>👤 {s.contact||"—"}</div>
                      </div>
                      <div style={{display:"flex",gap:6,flexDirection:"column",alignItems:"flex-end"}}>
                        {isUsedHere&&<Bdg bg={shop.color+"22"} tc={shop.color}>This shop</Bdg>}
                        {sLow.length>0&&<Bdg bg="#fffbeb" tc="#d97706">⚠️ {sLow.length} low</Bdg>}
                      </div>
                    </div>

                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:12}}>
                      <div style={{fontSize:13,color:"#374151"}}>📞 <a href={`tel:${s.phone}`} style={{color:"#2563eb",textDecoration:"none"}}>{s.phone||"—"}</a></div>
                      {s.email&&<div style={{fontSize:12,color:"#6b7280",overflow:"hidden",textOverflow:"ellipsis"}}>✉️ {s.email}</div>}
                      {s.location&&<div style={{fontSize:12,color:"#6b7280"}}>📍 {s.location}</div>}
                      {s.category&&<div style={{fontSize:12,color:"#6b7280"}}>📦 {s.category}</div>}
                    </div>

                    {s.notes&&<div style={{fontSize:12,color:"#6b7280",fontStyle:"italic",marginBottom:12,padding:"6px 10px",background:"#f8fafc",borderRadius:7}}>"{s.notes}"</div>}

                    {/* Products this supplier covers */}
                    {sProds.length>0&&(
                      <div style={{marginBottom:12}}>
                        <div style={{fontSize:11,fontWeight:700,color:"#9ca3af",marginBottom:6}}>PRODUCTS SUPPLIED ({sProds.length})</div>
                        <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                          {sProds.slice(0,5).map(p=>(
                            <span key={p.id} style={{background:"#f1f5f9",borderRadius:5,padding:"2px 8px",fontSize:11,color:p.qty<=p.lowStockThreshold?"#d97706":"#374151",fontWeight:600}}>
                              {p.name.length>20?p.name.slice(0,18)+"…":p.name}
                              {p.qty<=p.lowStockThreshold&&" ⚠️"}
                            </span>
                          ))}
                          {sProds.length>5&&<span style={{background:"#f1f5f9",borderRadius:5,padding:"2px 8px",fontSize:11,color:"#9ca3af"}}>+{sProds.length-5} more</span>}
                        </div>
                      </div>
                    )}

                    <div style={{display:"flex",gap:6}}>
                      {s.phone&&<a href={`https://wa.me/233${s.phone.replace(/^0/,"").replace(/[-\s]/g,"")}`} target="_blank" rel="noreferrer"
                        style={{flex:1,textAlign:"center",background:"#25D366",color:"#fff",borderRadius:7,padding:"7px 0",fontSize:12,fontWeight:700,textDecoration:"none"}}>💬 WhatsApp</a>}
                      <button onClick={()=>{setEditing(s);setForm({supName:s.name,supContact:s.contact,supPhone:s.phone,supEmail:s.email,supLocation:s.location,supCategory:s.category,supNotes:s.notes});setModal("editSupplier");}}
                        style={{flex:1,background:"#dbeafe",color:"#2563eb",border:"none",borderRadius:7,padding:"7px 0",fontSize:12,fontWeight:700,cursor:"pointer"}}>✏️ Edit</button>
                      <button onClick={()=>{if(window.confirm(`Remove ${s.name}? They will be unlinked from all products.`)) deleteSupplier(s.id);}}
                        style={{background:"#fef2f2",color:"#ef4444",border:"none",borderRadius:7,padding:"7px 10px",fontSize:12,fontWeight:700,cursor:"pointer"}}>🗑</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ── STAFF ── */}
        {view==="staff"&&(
          <>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
              <div><div style={{fontWeight:800,fontSize:17}}>👥 Staff & Cashiers</div><div style={{fontSize:13,color:"#6b7280"}}>Staff log in with their PIN when recording sales.</div></div>
              <button onClick={()=>{setEditing(null);setForm({srole:"Cashier"});setModal("addStaff");}} style={{background:shop.color,color:"#fff",border:"none",borderRadius:8,padding:"8px 16px",fontWeight:700,cursor:"pointer",fontSize:13}}>+ Add Staff</button>
            </div>
            <div style={{display:"grid",gap:10,gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))"}}>
              {staff.map(s=>{ const sSales=Object.values(db.sales).flat().filter(x=>x.cashierId===s.id); const sTotal=sSales.reduce((a,x)=>a+x.total,0); return(
                <div key={s.id} style={{background:"#fff",borderRadius:12,padding:18,boxShadow:"0 1px 6px rgba(0,0,0,0.07)"}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                    <div><div style={{fontWeight:800,fontSize:16}}>{s.name}</div><Bdg bg={s.role==="Owner"?"#fef9c3":"#dbeafe"} tc={s.role==="Owner"?"#92400e":"#1d4ed8"}>{s.role}</Bdg></div>
                    <button onClick={()=>{setEditing(s);setForm({sname:s.name,spin:s.pin,srole:s.role});setModal("addStaff");}} style={{background:"#f1f5f9",color:"#374151",border:"none",borderRadius:6,padding:"4px 10px",fontSize:11,fontWeight:700,cursor:"pointer"}}>Edit</button>
                  </div>
                  <div style={{fontSize:12,color:"#9ca3af",marginBottom:10}}>PIN: {"•".repeat(s.pin?.length||4)}</div>
                  <div style={{display:"flex",gap:8,borderTop:"1px solid #f1f5f9",paddingTop:10}}>
                    <div style={{flex:1,textAlign:"center"}}><div style={{fontSize:11,color:"#9ca3af"}}>Sales</div><div style={{fontSize:16,fontWeight:800,color:shop.color}}>{sSales.length}</div></div>
                    <div style={{flex:1,textAlign:"center"}}><div style={{fontSize:11,color:"#9ca3af"}}>Revenue</div><div style={{fontSize:12,fontWeight:800,color:shop.color}}>{fmt(sTotal)}</div></div>
                  </div>
                </div>
              ); })}
            </div>
          </>
        )}

        {/* ── BACKUP & RESTORE ── */}
        {view==="backup"&&(()=>{
          const [confirmRestore,setConfirmRestore]=useState(null);
          const [backupMsg,setBackupMsg]=useState(null);
          const fileRef=useRef(null);
          const showMsg=(type,text)=>{setBackupMsg({type,text});setTimeout(()=>setBackupMsg(null),5000);};
          const allProducts=Object.values(db.products||{}).flat();
          const allSales=Object.values(db.sales||{}).flat();
          const download=()=>{
            const blob=new Blob([JSON.stringify({app:"Shop Inventory Manager",exportedAt:new Date().toISOString(),version:5,data:db},null,2)],{type:"application/json"});
            const a=document.createElement("a");a.href=URL.createObjectURL(blob);
            a.download=`ShopInventory-backup-${new Date().toISOString().slice(0,10)}.json`;
            document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(a.href);
            showMsg("ok",`Backup downloaded — ${allProducts.length} products, ${allSales.length} sales across ${db.shops?.length||0} shops.`);
          };
          const onFile=(e)=>{
            const file=e.target.files[0];if(!file)return;
            const reader=new FileReader();
            reader.onload=()=>{try{
              const p=JSON.parse(reader.result);
              if(!p.data?.shops){showMsg("err","Not a valid Shop Inventory backup file.");return;}
              setConfirmRestore(p);
            }catch{showMsg("err","Could not read file.");}};
            reader.readAsText(file);e.target.value="";
          };
          const exportCSV=()=>{
            const rows=[["Shop","Product","Category","Unit","Qty","Cost (GH₵)","Sell Price (GH₵)","Low Stock Alert","Supplier"]];
            db.shops?.forEach(sh=>{
              (db.products?.[sh.id]||[]).forEach(p=>rows.push([sh.name,p.name,p.category||"",p.unit||"",p.qty,p.costPrice,p.sellPrice,p.lowStockThreshold||"",p.supplierId||""]));
            });
            const csv=rows.map(r=>r.map(c=>`"${String(c||"").replace(/"/g,'""')}"`).join(",")).join("\n");
            const a=document.createElement("a");a.href="data:text/csv;charset=utf-8,"+encodeURIComponent(csv);
            a.download=`ShopInventory-products-${new Date().toISOString().slice(0,10)}.csv`;
            document.body.appendChild(a);a.click();a.remove();
            showMsg("ok","Products CSV exported.");
          };
          return(
            <div style={{maxWidth:720}}>
              <div style={{fontWeight:800,fontSize:18,marginBottom:6}}>💾 Backup & Restore</div>
              <p style={{color:"#6b7280",fontSize:13,marginBottom:20,lineHeight:1.7}}>All your shop data — products, sales, customers, suppliers, staff — is saved in this browser's localStorage. Download a backup regularly and store it in Google Drive, email, or USB so you never lose years of records.</p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
                <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:20}}>
                  <div style={{fontWeight:800,fontSize:15,marginBottom:8}}>⬇️ Export Backup</div>
                  <p style={{fontSize:12,color:"#6b7280",marginBottom:14,lineHeight:1.6}}>Downloads all shops, products, sales, customers and suppliers as a single JSON file.</p>
                  <button onClick={download} style={{width:"100%",background:shop.color,color:"#fff",border:"none",borderRadius:8,padding:"10px 0",fontWeight:700,cursor:"pointer",fontSize:13}}>⬇️ Download Backup (.json)</button>
                </div>
                <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:20}}>
                  <div style={{fontWeight:800,fontSize:15,marginBottom:8}}>⬆️ Restore from Backup</div>
                  <p style={{fontSize:12,color:"#6b7280",marginBottom:14,lineHeight:1.6}}>Select a previously downloaded .json backup file to restore all shop data.</p>
                  <label style={{display:"block",textAlign:"center",padding:"10px 0",background:"#f1f5f9",border:"1px solid #e5e7eb",borderRadius:8,cursor:"pointer",fontWeight:600,fontSize:13,color:"#6b7280"}}>
                    📂 Choose Backup File…
                    <input ref={fileRef} type="file" accept="application/json" style={{display:"none"}} onChange={onFile}/>
                  </label>
                </div>
              </div>
              <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:20,marginBottom:14}}>
                <div style={{fontWeight:800,fontSize:15,marginBottom:8}}>📊 Export Products to CSV</div>
                <p style={{fontSize:12,color:"#6b7280",marginBottom:14}}>Export all products across all shops as a spreadsheet for stock-take or reporting.</p>
                <button onClick={exportCSV} style={{background:"#16a34a",color:"#fff",border:"none",borderRadius:8,padding:"10px 20px",fontWeight:700,cursor:"pointer",fontSize:13}}>📊 Export Products CSV</button>
              </div>
              {backupMsg&&<div style={{padding:"12px 16px",borderRadius:8,marginBottom:14,background:backupMsg.type==="ok"?"#f0fdf4":"#fef2f2",color:backupMsg.type==="ok"?"#15803d":"#dc2626",fontSize:13,fontWeight:600,border:`1px solid ${backupMsg.type==="ok"?"#bbf7d0":"#fecaca"}`}}>{backupMsg.type==="ok"?"✅ ":"❌ "}{backupMsg.text}</div>}
              <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:18}}>
                <div style={{fontSize:11,color:"#9ca3af",textTransform:"uppercase",letterSpacing:1,marginBottom:12}}>Current Data Summary</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
                  {[["Shops",db.shops?.length||0],["Products",allProducts.length],["Sales",allSales.length],["Suppliers",db.suppliers?.length||0]].map(([l,v])=>(
                    <div key={l} style={{textAlign:"center",background:"#f8fafc",borderRadius:8,padding:"12px 0"}}>
                      <div style={{fontSize:22,fontWeight:800,color:shop.color}}>{v}</div>
                      <div style={{fontSize:11,color:"#6b7280"}}>{l}</div>
                    </div>
                  ))}
                </div>
              </div>
              {confirmRestore&&(
                <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:400}} onClick={()=>setConfirmRestore(null)}>
                  <div style={{background:"#fff",borderRadius:14,padding:28,maxWidth:440,width:"90%",boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}} onClick={e=>e.stopPropagation()}>
                    <div style={{fontSize:17,fontWeight:800,marginBottom:10}}>⚠️ Confirm Restore</div>
                    <p style={{fontSize:13,color:"#6b7280",marginBottom:8}}>Backup from <strong>{new Date(confirmRestore.exportedAt).toLocaleString()}</strong></p>
                    <p style={{fontSize:13,color:"#6b7280",marginBottom:20}}>This replaces ALL current shop data with the backup. This cannot be undone.</p>
                    <div style={{display:"flex",gap:10}}>
                      <button onClick={()=>setConfirmRestore(null)} style={{flex:1,background:"#f1f5f9",border:"1px solid #e5e7eb",borderRadius:8,padding:"10px 0",color:"#6b7280",fontWeight:600,cursor:"pointer"}}>Cancel</button>
                      <button onClick={()=>{setDb(confirmRestore.data);setConfirmRestore(null);showMsg("ok","All shop data restored successfully.");}} style={{flex:1,background:"#dc2626",color:"#fff",border:"none",borderRadius:8,padding:"10px 0",fontWeight:700,cursor:"pointer"}}>✅ Yes, Restore</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* ══ MODALS ══════════════════════════════════════════════════════ */}

      {/* ADD / EDIT PRODUCT */}
      {modal==="addProduct"&&(
        <Modal title={editing?"Edit Product":`Add Product — ${shop.name}`} onClose={close}>
          {[["Product Name","name","text"],["Category","category","text"],["Quantity","qty","number"],["Unit (e.g. pack, bottle)","unit","text"],["Cost Price (GH₵)","costPrice","number"],["Selling Price (GH₵)","sellPrice","number"],["Low Stock Alert (qty)","lowStockThreshold","number"]].map(([l,k,t])=>(
            <Row key={k} label={l}><input style={iStyle} type={t} value={form[k]??""} onChange={fld(k)}/></Row>
          ))}
          {/* Supplier dropdown — central directory */}
          <Row label="Supplier">
            <select style={iStyle} value={form.supplierId||""} onChange={fld("supplierId")}>
              <option value="">— No supplier assigned —</option>
              {suppliers.map(s=><option key={s.id} value={s.id}>{s.name}{s.location?` (${s.location})`:""}</option>)}
            </select>
            {suppliers.length===0&&<div style={{fontSize:11,color:"#9ca3af",marginTop:4}}>No suppliers yet. Add suppliers in the Suppliers tab first.</div>}
          </Row>
          {isBoutique&&<><Row label="Size"><input style={iStyle} type="text" value={form.size||""} onChange={fld("size")}/></Row><Row label="Color"><input style={iStyle} type="text" value={form.color||""} onChange={fld("color")}/></Row></>}
          {form.costPrice&&form.sellPrice&&<div style={{background:"#f0fdf4",borderRadius:8,padding:"9px 14px",marginBottom:12,fontSize:13}}>Margin: <b style={{color:"#16a34a"}}>{mgn(Number(form.costPrice),Number(form.sellPrice))}%</b> · Profit/unit: <b style={{color:"#16a34a"}}>{fmt(Number(form.sellPrice)-Number(form.costPrice))}</b></div>}
          <div style={{display:"flex",gap:8,marginTop:6}}>
            <button onClick={saveProduct} style={{flex:1,background:shop.color,color:"#fff",border:"none",borderRadius:8,padding:"10px 0",fontWeight:700,cursor:"pointer"}}>{editing?"Save Changes":"Add Product"}</button>
            {editing&&<button onClick={()=>{if(window.confirm("Delete?")) deleteProduct(editing.id);}} style={{background:"#fee2e2",color:"#ef4444",border:"none",borderRadius:8,padding:"10px 14px",fontWeight:700,cursor:"pointer"}}>Delete</button>}
          </div>
        </Modal>
      )}

      {/* EDIT SUPPLIER */}
      {modal==="editSupplier"&&(
        <Modal title={editing?"Edit Supplier":"Add New Supplier"} onClose={close} wide>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div style={{gridColumn:"span 2"}}><Row label="Company / Supplier Name"><input style={iStyle} type="text" placeholder="e.g. AquaFresh Ltd" value={form.supName||""} onChange={fld("supName")}/></Row></div>
            <Row label="Contact Person"><input style={iStyle} type="text" placeholder="e.g. Mr. Mensah" value={form.supContact||""} onChange={fld("supContact")}/></Row>
            <Row label="Phone Number"><input style={iStyle} type="text" placeholder="e.g. 024-000-0001" value={form.supPhone||""} onChange={fld("supPhone")}/></Row>
            <Row label="Email (optional)"><input style={iStyle} type="email" placeholder="supplier@email.com" value={form.supEmail||""} onChange={fld("supEmail")}/></Row>
            <Row label="Location / City"><input style={iStyle} type="text" placeholder="e.g. Accra" value={form.supLocation||""} onChange={fld("supLocation")}/></Row>
            <Row label="Product Category (what they supply)"><input style={iStyle} type="text" placeholder="e.g. Beverages, Fertilizers" value={form.supCategory||""} onChange={fld("supCategory")}/></Row>
            <Row label="Payment Terms"><select style={iStyle} value={form.supNotes?.includes("Net")?form.supNotes:"COD"} onChange={e=>setForm(p=>({...p,supNotes:e.target.value}))}>
              {["COD","Net 7","Net 15","Net 30","Net 60","Prepay"].map(t=><option key={t}>{t}</option>)}
            </select></Row>
            <div style={{gridColumn:"span 2"}}><Row label="Notes (delivery days, MOQ, special terms…)"><textarea style={{...iStyle,height:70,resize:"vertical"}} value={form.supNotes||""} onChange={fld("supNotes")}/></Row></div>
          </div>
          <div style={{display:"flex",gap:8,marginTop:6}}>
            <button onClick={saveSupplier} style={{flex:1,background:shop.color,color:"#fff",border:"none",borderRadius:8,padding:"11px 0",fontWeight:700,cursor:"pointer"}}>{editing?"Save Changes":"Add Supplier"}</button>
            {editing&&<button onClick={()=>{if(window.confirm(`Remove ${editing.name}?`)) deleteSupplier(editing.id);}} style={{background:"#fee2e2",color:"#ef4444",border:"none",borderRadius:8,padding:"11px 14px",fontWeight:700,cursor:"pointer"}}>Delete</button>}
          </div>
        </Modal>
      )}

      {/* RECORD SALE */}
      {modal==="recordSale"&&(
        <Modal title="Record a Sale" onClose={close}>
          <Row label="Product"><select style={iStyle} value={form.productId||""} onChange={e=>{const p=products.find(x=>x.id===e.target.value);setForm(prev=>({...prev,productId:e.target.value,sellPrice:p?.sellPrice||0}));}}>
            {products.map(p=><option key={p.id} value={p.id}>{p.name}{isBoutique&&p.size?` (${p.size}/${p.color})`:""} — {p.qty} left</option>)}
          </select></Row>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Row label="Qty Sold"><input style={iStyle} type="number" min="1" value={form.qty??1} onChange={fld("qty")}/></Row>
            <Row label="Selling Price (GH₵)"><input style={iStyle} type="number" value={form.sellPrice??""} onChange={fld("sellPrice")}/></Row>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Row label="Discount %"><input style={iStyle} type="number" min="0" max="100" placeholder="0" value={form.discount??0} onChange={fld("discount")}/></Row>
            <Row label="Date"><input style={iStyle} type="date" value={form.date||today()} onChange={fld("date")}/></Row>
          </div>
          <Row label="Customer (optional)"><select style={iStyle} value={form.customerId||""} onChange={fld("customerId")}><option value="">— Walk-in —</option>{allCustomers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></Row>
          <Row label="Note"><input style={iStyle} type="text" placeholder="order note…" value={form.note||""} onChange={fld("note")}/></Row>
          {form.productId&&<div style={{background:"#f0fdf4",borderRadius:8,padding:"9px 14px",marginBottom:12,fontSize:13}}>
            Total: <b>{fmt(saleFinal)}</b>{saleDisc>0&&<span style={{color:"#9ca3af"}}> (after {saleDisc}% off)</span>} · <span style={{color:"#16a34a",fontWeight:700}}>Profit: {fmt(saleProfit)}</span>
          </div>}
          <button onClick={initSale} style={{width:"100%",background:shop.color,color:"#fff",border:"none",borderRadius:8,padding:"10px 0",fontWeight:700,cursor:"pointer"}}>{staff.length>0?"Enter PIN to Save":"Save Sale"}</button>
        </Modal>
      )}

      {modal==="pinGate"&&(<Modal title="Staff Verification" onClose={close}><PinGate staff={staff} onSuccess={s=>commitSale(pendingSale,s)} onCancel={close}/></Modal>)}

      {modal==="restock"&&editing&&(
        <Modal title={`Restock — ${editing.name}`} onClose={close}>
          <div style={{background:"#f1f5f9",borderRadius:8,padding:"9px 14px",marginBottom:14,fontSize:14}}>Current: <b>{editing.qty} {editing.unit}</b></div>
          <Row label={`Add Qty (${editing.unit})`}><input style={iStyle} type="number" min="1" value={form.addQty||""} onChange={fld("addQty")}/></Row>
          <button onClick={restock} style={{width:"100%",background:"#16a34a",color:"#fff",border:"none",borderRadius:8,padding:"10px 0",fontWeight:700,cursor:"pointer"}}>Confirm Restock</button>
        </Modal>
      )}

      {modal==="addCustomer"&&(
        <Modal title={editing?"Edit Customer":"Add Customer"} onClose={close}>
          <Row label="Full Name"><input style={iStyle} type="text" value={form.cname||""} onChange={fld("cname")}/></Row>
          <Row label="Phone"><input style={iStyle} type="text" value={form.cphone||""} onChange={fld("cphone")}/></Row>
          <Row label="Email (optional)"><input style={iStyle} type="email" value={form.cemail||""} onChange={fld("cemail")}/></Row>
          <Row label="Notes"><input style={iStyle} type="text" placeholder="e.g. Buys in bulk, repeat customer…" value={form.cnotes||""} onChange={fld("cnotes")}/></Row>
          <div style={{display:"flex",gap:8,marginTop:6}}>
            <button onClick={saveCustomer} style={{flex:1,background:shop.color,color:"#fff",border:"none",borderRadius:8,padding:"10px 0",fontWeight:700,cursor:"pointer"}}>{editing?"Save Changes":"Add Customer"}</button>
            {editing&&<button onClick={()=>{if(window.confirm("Delete?")) deleteCustomer(editing.id);}} style={{background:"#fee2e2",color:"#ef4444",border:"none",borderRadius:8,padding:"10px 14px",fontWeight:700,cursor:"pointer"}}>Delete</button>}
          </div>
        </Modal>
      )}

      {modal==="addStaff"&&(
        <Modal title={editing?"Edit Staff":"Add Staff"} onClose={close}>
          <Row label="Name"><input style={iStyle} type="text" value={form.sname||""} onChange={fld("sname")}/></Row>
          <Row label="Role"><select style={iStyle} value={form.srole||"Cashier"} onChange={fld("srole")}>{["Owner","Manager","Cashier","Sales Rep","Stock Keeper"].map(r=><option key={r}>{r}</option>)}</select></Row>
          <Row label="PIN (4–6 digits)"><input style={iStyle} type="password" maxLength={6} value={form.spin||""} onChange={fld("spin")}/></Row>
          <div style={{display:"flex",gap:8,marginTop:6}}>
            <button onClick={saveStaff} style={{flex:1,background:shop.color,color:"#fff",border:"none",borderRadius:8,padding:"10px 0",fontWeight:700,cursor:"pointer"}}>{editing?"Save Changes":"Add Staff"}</button>
            {editing&&<button onClick={()=>{setDb(prev=>({...prev,staff:prev.staff.filter(s=>s.id!==editing.id)})); showToast("Removed.","warn"); close();}} style={{background:"#fee2e2",color:"#ef4444",border:"none",borderRadius:8,padding:"10px 14px",fontWeight:700,cursor:"pointer"}}>Remove</button>}
          </div>
        </Modal>
      )}

      {modal==="addWishlist"&&(
        <Modal title="Add Wishlist Entry" onClose={close}>
          <Row label="Customer Name"><input style={iStyle} type="text" value={form.wCustomer||""} onChange={fld("wCustomer")}/></Row>
          <Row label="Customer Phone"><input style={iStyle} type="text" value={form.wPhone||""} onChange={fld("wPhone")}/></Row>
          <Row label="Item They Want"><input style={iStyle} type="text" value={form.wProduct||""} onChange={fld("wProduct")}/></Row>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Row label="Size"><input style={iStyle} type="text" value={form.wSize||""} onChange={fld("wSize")}/></Row>
            <Row label="Color"><input style={iStyle} type="text" value={form.wColor||""} onChange={fld("wColor")}/></Row>
          </div>
          <Row label="Notes"><input style={iStyle} type="text" value={form.wNotes||""} onChange={fld("wNotes")}/></Row>
          <button onClick={saveWishlist} style={{width:"100%",background:shop.color,color:"#fff",border:"none",borderRadius:8,padding:"10px 0",fontWeight:700,cursor:"pointer",marginTop:6}}>Save Entry</button>
        </Modal>
      )}

      {modal==="addShop"&&(
        <Modal title="Add New Shop" onClose={close}>
          <Row label="Shop Name"><input style={iStyle} type="text" placeholder="e.g. Phone Accessories" value={form.shopName||""} onChange={fld("shopName")}/></Row>
          <Row label="Icon (emoji)"><input style={iStyle} type="text" maxLength={2} placeholder="🏪" value={form.shopIcon||""} onChange={fld("shopIcon")}/></Row>
          <Row label="Accent Color"><input style={{...iStyle,height:40}} type="color" value={form.shopColor||"#6366f1"} onChange={fld("shopColor")}/></Row>
          <button onClick={addShop} style={{width:"100%",background:form.shopColor||"#6366f1",color:"#fff",border:"none",borderRadius:8,padding:"10px 0",fontWeight:700,cursor:"pointer"}}>Create Shop</button>
        </Modal>
      )}
    </div>
  );
}
