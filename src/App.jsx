import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import {
  LayoutDashboard, Package, BarChart3, ShieldCheck, X, Plus, Minus,
  Trash2, Pencil, Upload, Lock, Unlock, TrendingUp, Search,
  ChevronRight, RotateCcw, Wallet, Boxes, Leaf, Sun, Zap, Droplet,
  FlaskConical, Sparkles, HeartPulse, ArrowUpRight, ArrowDownRight, ChevronDown
} from "lucide-react";
import { loadProducts, saveProducts, loadSales, saveSales, loadSetting, saveSetting } from "./supabaseClient";

/* ---------------------------------------------------------------------
   FRAS NUTRAYU — Stock Management Console
   All styling lives in the <style> block below as real CSS (fn- prefixed
   classes) rather than arbitrary Tailwind, since this renderer only ships
   Tailwind's default preset and cannot compile bracket/opacity-slash values.
--------------------------------------------------------------------- */

const LOGO_SRC = "/logo.png";

const ICONS = { Leaf, Sun, Zap, Droplet, FlaskConical, Sparkles, HeartPulse };

// Seed list used only the very first time the app runs (before any
// categories have been saved). After that, the live list always comes from
// the "categories" state, which is editable from Admin → Manage categories.
const DEFAULT_CATEGORIES = [
  "Multivitamin", "Immunity", "Energy & Metabolism", "Vitamin B12",
  "Digestive Health", "Beauty & Skin", "Joint & Recovery"
];

const DEFAULT_PRODUCTS = [];

function genDemoSales(products) {
  const sales = [];
  const now = new Date();
  let counter = 0;
  for (let d = 59; d >= 0; d--) {
    const day = new Date(now);
    day.setDate(day.getDate() - d);
    const numSales = Math.floor(Math.random() * 4);
    for (let i = 0; i < numSales; i++) {
      const product = products[Math.floor(Math.random() * products.length)];
      const qty = 1 + Math.floor(Math.random() * 3);
      const hour = 9 + Math.floor(Math.random() * 10);
      const date = new Date(day);
      date.setHours(hour, Math.floor(Math.random() * 60));
      counter += 1;
      sales.push({
        id: "s" + Date.now().toString(36) + counter,
        productId: product.id,
        productName: product.name,
        qty,
        amount: qty * product.price,
        type: "sale",
        date: date.toISOString(),
      });
    }
  }
  return sales.sort((a, b) => new Date(a.date) - new Date(b.date));
}

function formatINR(n) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

function relTime(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return Math.floor(diff / 60) + "m ago";
  if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
  const d = Math.floor(diff / 86400);
  if (d < 30) return d + "d ago";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function stockStatus(p) {
  if (p.stock <= 0) return { label: "Out of stock", tone: "bad" };
  if (p.stock <= p.reorderLevel) return { label: "Low stock", tone: "warn" };
  return { label: "In stock", tone: "ok" };
}

const TONE_HEX = { ok: "#4C7A3D", warn: "#C08A2E", bad: "#B4472F" };

/* ---------- global stylesheet ---------- */

function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
      *{box-sizing:border-box;}
      .fn-app{min-height:100vh;background:#FBF7EE;display:flex;font-family:'Inter',sans-serif;color:#1B1F17;}
      .fn-main{flex:1;min-width:0;}
      .fn-page{padding:20px 16px 100px;max-width:1120px;}
      @media(min-width:1024px){.fn-page{padding:32px 32px 48px;}}

      .fn-sidebar{display:none;}
      @media(min-width:1024px){.fn-sidebar{display:flex;flex-direction:column;width:240px;flex-shrink:0;border-right:1px solid rgba(0,0,0,.08);background:#F4EFE2;padding:24px 16px;position:sticky;top:0;height:100vh;}}
      .fn-brand{display:flex;align-items:center;gap:10px;padding:0 8px;margin-bottom:32px;}
      .fn-brand img{width:40px;height:40px;object-fit:contain;}
      .fn-brand-name{font-family:'Fraunces',serif;font-weight:600;font-size:15px;color:#1F3D2B;letter-spacing:-0.01em;}
      .fn-brand-sub{font-family:'IBM Plex Mono',monospace;font-size:10.5px;color:rgba(31,61,43,.55);letter-spacing:.06em;}
      .fn-nav{display:flex;flex-direction:column;gap:4px;}
      .fn-nav-item{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:12px;font-size:14px;font-weight:500;color:rgba(31,61,43,.7);background:transparent;border:none;cursor:pointer;width:100%;text-align:left;font-family:'Inter',sans-serif;}
      .fn-nav-item:hover{background:rgba(0,0,0,.04);}
      .fn-nav-item.active{background:#1F3D2B;color:#fff;box-shadow:0 1px 2px rgba(0,0,0,.08);}
      .fn-nav-note{margin-top:auto;padding:12px;border-radius:12px;background:rgba(255,255,255,.6);border:1px solid rgba(0,0,0,.05);font-size:11px;color:rgba(31,61,43,.6);line-height:1.5;}

      .fn-topbar{position:sticky;top:0;z-index:30;background:rgba(251,247,238,.95);backdrop-filter:blur(6px);border-bottom:1px solid rgba(0,0,0,.1);padding:14px 16px;display:flex;align-items:center;gap:10px;}
      @media(min-width:1024px){.fn-topbar{display:none;}}
      .fn-topbar img{width:32px;height:32px;object-fit:contain;}
      .fn-topbar-title{font-family:'Fraunces',serif;font-size:16px;font-weight:600;color:#1F3D2B;}

      .fn-bottomnav{display:grid;grid-template-columns:repeat(4,1fr);position:fixed;bottom:0;left:0;right:0;z-index:40;background:rgba(251,247,238,.97);backdrop-filter:blur(6px);border-top:1px solid rgba(0,0,0,.1);padding-bottom:env(safe-area-inset-bottom);}
      @media(min-width:1024px){.fn-bottomnav{display:none;}}
      .fn-bottomnav button{display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 0;background:none;border:none;font-family:'Inter',sans-serif;}
      .fn-bottomnav .label{font-size:10px;color:rgba(31,61,43,.6);}
      .fn-bottomnav .label.active{color:#1F3D2B;font-weight:600;}

      .fn-h1{font-family:'Fraunces',serif;font-weight:600;font-size:22px;color:#1B1F17;letter-spacing:-0.01em;}
      @media(min-width:1024px){.fn-h1{font-size:28px;}}
      .fn-h2{font-family:'Fraunces',serif;font-weight:600;font-size:16px;color:#1B1F17;}
      .fn-sub{color:rgba(31,61,43,.6);font-size:14px;margin-top:4px;}
      .fn-desktop-only{display:none;}
      @media(min-width:1024px){.fn-desktop-only{display:block;margin-bottom:24px;}}

      .fn-stat-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:24px;}
      @media(min-width:1024px){.fn-stat-grid{grid-template-columns:repeat(4,1fr);gap:16px;}}
      .fn-card{background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:16px;padding:16px;}
      @media(min-width:1024px){.fn-card{padding:20px;}}
      .fn-stat-top{display:flex;align-items:center;justify-content:space-between;}
      .fn-stat-label{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:rgba(31,61,43,.55);}
      .fn-stat-value{font-family:'IBM Plex Mono',monospace;font-size:24px;font-weight:600;color:#1B1F17;margin-top:8px;}
      @media(min-width:1024px){.fn-stat-value{font-size:28px;}}
      .fn-stat-sub{font-size:12px;color:rgba(31,61,43,.55);margin-top:4px;}

      .fn-dash-grid{display:grid;grid-template-columns:1fr;gap:16px;}
      @media(min-width:1024px){.fn-dash-grid{grid-template-columns:2fr 3fr;}}
      .fn-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;}

      .fn-badge{display:inline-flex;align-items:center;gap:4px;padding:5px 10px;border-radius:999px;font-size:11px;font-family:'IBM Plex Mono',monospace;border:1px solid;white-space:nowrap;}
      .fn-badge.ok{background:#EAF2E5;color:#3E6432;border-color:#C9DEC0;}
      .fn-badge.warn{background:#FBF0DC;color:#8A5F17;border-color:#F0DBA8;}
      .fn-badge.bad{background:#FBE7E1;color:#8C3620;border-color:#F1C2B2;}

      .fn-gauge-track{width:100%;height:14px;border-radius:999px;background:rgba(0,0,0,.08);overflow:hidden;border:1px solid rgba(0,0,0,.05);}
      .fn-gauge-track.sm{height:10px;}
      .fn-gauge-fill{height:100%;border-radius:999px;transition:width .5s ease;}

      .fn-glyph{border-radius:16px;display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden;}
      .fn-glyph img{width:100%;height:100%;object-fit:cover;}

      .fn-lowstock-item{display:flex;align-items:center;gap:12px;width:100%;background:none;border:none;text-align:left;padding:6px 0;cursor:pointer;font-family:'Inter',sans-serif;}
      .fn-lowstock-name{font-size:14px;font-weight:500;color:#1B1F17;}
      .fn-empty{text-align:center;padding:32px 0;color:rgba(31,61,43,.5);font-size:14px;}

      .fn-activity-row{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid rgba(0,0,0,.05);}
      .fn-activity-row:last-child{border-bottom:none;}
      .fn-activity-icon{width:28px;height:28px;border-radius:999px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
      .fn-activity-icon.sale{background:#FBF0DC;}
      .fn-activity-icon.restock{background:#EAF2E5;}
      .fn-activity-title{font-size:14px;color:#1B1F17;}
      .fn-activity-amount{font-family:'IBM Plex Mono',monospace;font-size:14px;font-weight:500;text-align:right;}
      .fn-activity-time{font-size:11px;color:rgba(31,61,43,.45);text-align:right;}

      .fn-link-btn{display:flex;align-items:center;gap:4px;font-size:12px;color:rgba(31,61,43,.6);background:none;border:none;cursor:pointer;font-family:'Inter',sans-serif;}
      .fn-link-btn:hover{color:#1F3D2B;}

      .fn-toolbar{display:flex;flex-direction:column;gap:10px;margin-bottom:20px;}
      @media(min-width:640px){.fn-toolbar{flex-direction:row;}}
      .fn-search{position:relative;flex:1;}
      .fn-search svg{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:rgba(31,61,43,.4);}
      .fn-input,.fn-select{width:100%;height:44px;border-radius:12px;border:1px solid rgba(0,0,0,.12);background:#fff;font-size:14px;font-family:'Inter',sans-serif;outline:none;padding:0 14px;}
      .fn-input:focus,.fn-select:focus{border-color:rgba(31,61,43,.4);}
      .fn-search .fn-input{padding-left:40px;}
      .fn-select-wrap{position:relative;}
      .fn-select{appearance:none;padding-right:36px;}
      .fn-select-wrap svg{position:absolute;right:14px;top:50%;transform:translateY(-50%);color:rgba(31,61,43,.4);pointer-events:none;}

      .fn-product-grid{display:grid;grid-template-columns:1fr;gap:14px;}
      @media(min-width:640px){.fn-product-grid{grid-template-columns:repeat(2,1fr);}}
      @media(min-width:1280px){.fn-product-grid{grid-template-columns:repeat(3,1fr);}}

      .fn-pcard{background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:12px;text-align:left;cursor:pointer;transition:box-shadow .15s,border-color .15s;font-family:'Inter',sans-serif;}
      .fn-pcard:hover{border-color:rgba(31,61,43,.25);box-shadow:0 4px 16px rgba(0,0,0,.06);}
      .fn-pcard-top{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;}
      .fn-pname{font-family:'Fraunces',serif;font-size:16px;font-weight:600;color:#1B1F17;}
      .fn-ptagline{font-size:12.5px;color:rgba(31,61,43,.55);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
      .fn-pfooter{display:flex;align-items:center;justify-content:space-between;}
      .fn-punits{font-family:'IBM Plex Mono',monospace;font-size:13px;color:rgba(31,61,43,.55);}
      .fn-pprice{font-family:'IBM Plex Mono',monospace;font-size:16px;font-weight:600;color:#1B1F17;}

      .fn-modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:50;display:flex;align-items:flex-end;justify-content:center;}
      @media(min-width:1024px){.fn-modal-backdrop{align-items:center;padding:24px;}}
      .fn-modal-panel{background:#FBF7EE;width:100%;max-height:92vh;overflow-y:auto;border-radius:24px 24px 0 0;box-shadow:0 -8px 40px rgba(0,0,0,.2);}
      @media(min-width:1024px){.fn-modal-panel{max-width:520px;border-radius:24px;box-shadow:0 20px 60px rgba(0,0,0,.25);}}
      .fn-modal-inner{padding:20px;}
      @media(min-width:1024px){.fn-modal-inner{padding:24px;}}
      .fn-modal-head{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16px;}
      .fn-modal-title-row{display:flex;align-items:center;gap:12px;}
      .fn-modal-name{font-family:'Fraunces',serif;font-size:19px;font-weight:600;color:#1B1F17;}
      .fn-modal-sku{font-family:'IBM Plex Mono',monospace;font-size:12px;color:rgba(31,61,43,.55);}
      .fn-close-btn{width:32px;height:32px;border-radius:999px;display:flex;align-items:center;justify-content:center;background:none;border:none;cursor:pointer;flex-shrink:0;}
      .fn-close-btn:hover{background:rgba(0,0,0,.05);}
      .fn-modal-desc{font-size:14px;color:rgba(31,61,43,.7);margin-bottom:16px;}

      .fn-mini-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px;}
      .fn-mini-card{background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:12px;padding:12px;}
      .fn-mini-label{font-size:10.5px;text-transform:uppercase;color:rgba(31,61,43,.5);margin-bottom:2px;}
      .fn-mini-value{font-family:'IBM Plex Mono',monospace;font-size:14px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}

      .fn-action-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:20px;}
      .fn-action-card{background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:12px;padding:14px;}
      .fn-action-label{font-size:11px;color:rgba(31,61,43,.55);margin-bottom:8px;}

      .fn-stepper{display:flex;align-items:center;border:1px solid rgba(0,0,0,.12);border-radius:12px;overflow:hidden;width:fit-content;}
      .fn-stepper button{width:34px;height:34px;display:flex;align-items:center;justify-content:center;background:none;border:none;cursor:pointer;}
      .fn-stepper button:hover{background:rgba(0,0,0,.05);}
      .fn-stepper input{width:46px;text-align:center;font-family:'IBM Plex Mono',monospace;font-size:14px;border:none;outline:none;background:none;}

      .fn-btn{height:36px;border-radius:10px;border:none;font-size:13px;font-weight:500;font-family:'Inter',sans-serif;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;width:100%;padding:0 12px;}
      .fn-btn:disabled{opacity:.35;cursor:not-allowed;}
      .fn-btn.primary{background:#1F3D2B;color:#fff;}
      .fn-btn.gold{background:#C9962B;color:#fff;}
      .fn-btn.outline{background:transparent;border:1px solid rgba(0,0,0,.15);color:#1B1F17;}
      .fn-btn.outline:hover{background:rgba(0,0,0,.04);}
      .fn-btn.danger{background:transparent;border:1px solid rgba(180,71,47,.3);color:#B4472F;}
      .fn-btn.danger:hover{background:#FBE7E1;}
      .fn-btn.lg{height:44px;font-size:14px;border-radius:12px;}
      .fn-btn.auto-w{width:auto;}

      .fn-history-row{display:flex;align-items:center;justify-content:space-between;padding:6px 0;font-size:12.5px;border-bottom:1px solid rgba(0,0,0,.05);}
      .fn-history-row:last-child{border-bottom:none;}
      .fn-history-row .l{color:rgba(31,61,43,.7);}
      .fn-history-row .r{color:rgba(31,61,43,.45);}

      .fn-edit-actions{display:flex;gap:8px;margin-top:20px;padding-top:16px;border-top:1px solid rgba(0,0,0,.08);}

      .fn-field{display:flex;flex-direction:column;gap:5px;font-size:12px;color:rgba(31,61,43,.6);margin-bottom:12px;}
      .fn-field-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;}

      .fn-upload-row{display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap;}
      .fn-upload-btn{font-size:12.5px;display:flex;align-items:center;gap:6px;padding:8px 12px;border-radius:10px;border:1px solid rgba(0,0,0,.12);background:none;cursor:pointer;font-family:'Inter',sans-serif;}
      .fn-upload-btn:hover{background:rgba(0,0,0,.04);}
      .fn-remove-img{font-size:12px;color:#B4472F;background:none;border:none;cursor:pointer;}

      .fn-chip-group{display:inline-flex;gap:6px;background:#fff;border:1px solid rgba(0,0,0,.1);border-radius:999px;padding:4px;}
      .fn-chip{padding:6px 14px;border-radius:999px;font-size:12.5px;font-weight:500;background:none;border:none;cursor:pointer;color:rgba(31,61,43,.6);font-family:'Inter',sans-serif;}
      .fn-chip.active{background:#1F3D2B;color:#fff;}

      .fn-table-wrap{overflow-x:auto;}
      .fn-table{width:100%;border-collapse:collapse;font-size:14px;font-family:'Inter',sans-serif;}
      .fn-table th{text-align:left;font-size:11px;text-transform:uppercase;color:rgba(31,61,43,.45);padding:10px 12px;border-bottom:1px solid rgba(0,0,0,.08);background:rgba(244,239,226,.5);}
      .fn-table td{padding:10px 12px;border-bottom:1px solid rgba(0,0,0,.05);}
      .fn-table tr:last-child td{border-bottom:none;}
      .fn-table-name{display:flex;align-items:center;gap:10px;}
      .fn-table-name .n{font-weight:500;color:#1B1F17;}
      .fn-table-name .s{font-family:'IBM Plex Mono',monospace;font-size:11px;color:rgba(31,61,43,.45);}
      .fn-mono{font-family:'IBM Plex Mono',monospace;}
      .fn-actions-cell{display:flex;align-items:center;justify-content:flex-end;gap:6px;}
      .fn-icon-btn{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;background:none;border:none;cursor:pointer;}
      .fn-icon-btn:hover{background:rgba(0,0,0,.05);}
      .fn-icon-btn.danger{color:#B4472F;}
      .fn-icon-btn.danger:hover{background:#FBE7E1;}

      .fn-legend{display:flex;flex-wrap:wrap;gap:6px 12px;margin-top:8px;}
      .fn-legend-item{display:flex;align-items:center;gap:6px;font-size:11px;color:rgba(31,61,43,.6);}
      .fn-legend-dot{width:8px;height:8px;border-radius:999px;flex-shrink:0;}

      .fn-toast{position:fixed;bottom:84px;left:50%;transform:translateX(-50%);z-index:100;background:#1B1F17;color:#fff;padding:10px 18px;border-radius:999px;font-size:14px;font-family:'Inter',sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.2);animation:fnFadeUp .25s cubic-bezier(.16,1,.3,1) both;}
      @media(min-width:1024px){.fn-toast{bottom:24px;}}
      @keyframes fnFadeUp{from{opacity:0;transform:translate(-50%,8px);}to{opacity:1;transform:translate(-50%,0);}}

      .fn-lock-wrap{max-width:420px;margin:0 auto;padding-top:24px;}
      .fn-lock-icon{width:48px;height:48px;border-radius:999px;background:#F4EFE2;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;}
      .fn-pin-input{width:100%;height:44px;text-align:center;letter-spacing:.4em;border-radius:12px;border:1px solid rgba(0,0,0,.15);outline:none;font-family:'IBM Plex Mono',monospace;margin-bottom:12px;}
      .fn-pin-input.error{border-color:#B4472F;}
      .fn-error-text{font-size:12px;color:#B4472F;margin-bottom:12px;}
      .fn-hint{font-size:11px;color:rgba(31,61,43,.4);margin-top:16px;text-align:center;}

      .fn-admin-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px;}
      .fn-admin-grid{display:grid;grid-template-columns:1fr;gap:16px;}
      @media(min-width:640px){.fn-admin-grid{grid-template-columns:1fr 1fr;}}
      .fn-pin-row{display:flex;gap:8px;}

      .fn-center{display:flex;align-items:center;justify-content:center;}
      .fn-fade{animation:fnFade .3s ease both;}
      @keyframes fnFade{from{opacity:0;}to{opacity:1;}}

      input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0;}
      input[type=number]{-moz-appearance:textfield;}
      ::selection{background:#C9962B55;}
    `}</style>
  );
}

/* ---------- small UI atoms ---------- */

function CapsuleGauge({ value, max, tone = "ok", size = "md" }) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(max, 1)) * 100));
  const color = TONE_HEX[tone];
  return (
    <div className={`fn-gauge-track${size === "sm" ? " sm" : ""}`}>
      <div className="fn-gauge-fill" style={{ width: pct + "%", background: `linear-gradient(90deg, ${color}cc, ${color})` }} />
    </div>
  );
}

function Badge({ tone = "ok", children }) {
  return <span className={`fn-badge ${tone}`}>{children}</span>;
}

function ProductGlyph({ product, size = 56 }) {
  if (product.image) {
    return (
      <div className="fn-glyph" style={{ width: size, height: size, background: "#fff", border: "1px solid rgba(0,0,0,.1)" }}>
        <img src={product.image} alt={product.name} />
      </div>
    );
  }
  const Icon = ICONS[product.icon] || Leaf;
  const [c1, c2] = product.gradient || ["#2F5233", "#7CB342"];
  return (
    <div className="fn-glyph" style={{ width: size, height: size, background: `linear-gradient(135deg, ${c1}, ${c2})` }}>
      <Icon size={size * 0.46} strokeWidth={1.6} color="#fff" />
    </div>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  return <div className="fn-toast">{toast}</div>;
}

/* ---------- Nav ---------- */

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "inventory", label: "Inventory", icon: Package },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "admin", label: "Admin", icon: ShieldCheck },
];

function Sidebar({ tab, setTab, adminUnlocked, workspaceLabel, onSwitchWorkspace, onLogout }) {
  return (
    <aside className="fn-sidebar">
      <div className="fn-brand">
        <img src={LOGO_SRC} alt="FRAS Nutrayu" />
        <div>
          <div className="fn-brand-name">{workspaceLabel || "FRAS Nutrayu"}</div>
          <div className="fn-brand-sub">STOCK CONSOLE</div>
        </div>
      </div>
      <nav className="fn-nav">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button key={item.id} onClick={() => setTab(item.id)} className={`fn-nav-item${active ? " active" : ""}`}>
              <Icon size={17} strokeWidth={1.8} />
              {item.label}
              {item.id === "admin" && adminUnlocked && <Unlock size={13} style={{ marginLeft: "auto", opacity: .7 }} />}
            </button>
          );
        })}
      </nav>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "0 8px" }}>
        <button onClick={onSwitchWorkspace} className="fn-btn outline" style={{ fontSize: 12.5 }}>Switch stock</button>
        <button onClick={onLogout} className="fn-btn outline" style={{ fontSize: 12.5 }}>Log out</button>
      </div>
      <div className="fn-nav-note">Data syncs to Supabase — visible on every device that logs in.</div>
    </aside>
  );
}

function BottomNav({ tab, setTab }) {
  return (
    <nav className="fn-bottomnav">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = tab === item.id;
        return (
          <button key={item.id} onClick={() => setTab(item.id)}>
            <Icon size={19} strokeWidth={active ? 2.2 : 1.7} color={active ? "#1F3D2B" : "rgba(31,61,43,.6)"} />
            <span className={`label${active ? " active" : ""}`}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function TopBar({ tab }) {
  const titles = { dashboard: "Dashboard", inventory: "Inventory", analytics: "Analytics", admin: "Admin" };
  return (
    <div className="fn-topbar">
      <img src={LOGO_SRC} alt="FRAS Nutrayu" />
      <div className="fn-topbar-title">{titles[tab]}</div>
    </div>
  );
}

/* ---------- Dashboard ---------- */

function StatCard({ label, value, sub, icon: Icon }) {
  return (
    <div className="fn-card">
      <div className="fn-stat-top">
        <span className="fn-stat-label">{label}</span>
        <Icon size={16} strokeWidth={1.7} color="rgba(31,61,43,.4)" />
      </div>
      <div className="fn-stat-value">{value}</div>
      {sub && <div className="fn-stat-sub">{sub}</div>}
    </div>
  );
}

function Dashboard({ products, sales, openProduct, setTab }) {
  const totalUnits = products.reduce((a, p) => a + p.stock, 0);
  const invValue = products.reduce((a, p) => a + p.stock * p.price, 0);
  const now = new Date();
  const monthSales = sales.filter((s) => {
    const d = new Date(s.date);
    return s.type === "sale" && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const monthRevenue = monthSales.reduce((a, s) => a + s.amount, 0);
  const lowStock = products.filter((p) => p.stock <= p.reorderLevel).sort((a, b) => a.stock - b.stock);
  const recent = [...sales].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8);

  return (
    <div className="fn-page">
      <div className="fn-desktop-only">
        <h1 className="fn-h1">Good day — here's the shop floor</h1>
        <p className="fn-sub">{now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
      </div>

      <div className="fn-stat-grid">
        <StatCard label="SKUs listed" value={products.length} icon={Boxes} />
        <StatCard label="Units in stock" value={totalUnits.toLocaleString("en-IN")} icon={Package} />
        <StatCard label="Inventory value" value={formatINR(invValue)} icon={Wallet} />
        <StatCard label="Revenue this month" value={formatINR(monthRevenue)} sub={monthSales.length + " orders"} icon={TrendingUp} />
      </div>

      <div className="fn-dash-grid">
        <div className="fn-card">
          <div className="fn-row" style={{ marginBottom: 8 }}>
            <h2 className="fn-h2">Reorder soon</h2>
            {lowStock.length > 0 && <Badge tone="warn">{lowStock.length} SKU{lowStock.length > 1 ? "s" : ""}</Badge>}
          </div>
          {lowStock.length === 0 ? (
            <p className="fn-empty">Every product is above its reorder level.</p>
          ) : (
            <div>
              {lowStock.slice(0, 5).map((p) => {
                const st = stockStatus(p);
                return (
                  <button key={p.id} onClick={() => openProduct(p)} className="fn-lowstock-item">
                    <ProductGlyph product={p} size={38} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="fn-lowstock-name" style={{ marginBottom: 4 }}>{p.name}</div>
                      <CapsuleGauge value={p.stock} max={p.reorderLevel * 2 || 10} tone={st.tone} size="sm" />
                    </div>
                    <span className="fn-mono" style={{ fontSize: 12, color: "rgba(31,61,43,.6)", flexShrink: 0 }}>{p.stock} left</span>
                    <ChevronRight size={15} color="rgba(31,61,43,.3)" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="fn-card">
          <div className="fn-row" style={{ marginBottom: 4 }}>
            <h2 className="fn-h2">Recent activity</h2>
            <button onClick={() => setTab("analytics")} className="fn-link-btn">Full history <ChevronRight size={13} /></button>
          </div>
          {recent.length === 0 ? (
            <p className="fn-empty">No sales recorded yet.</p>
          ) : (
            <div>
              {recent.map((s) => (
                <div key={s.id} className="fn-activity-row">
                  <div className={`fn-activity-icon ${s.type}`}>
                    {s.type === "restock" ? <ArrowDownRight size={13} color="#4C7A3D" /> : <ArrowUpRight size={13} color="#C08A2E" />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="fn-activity-title">{s.type === "restock" ? "Restocked" : "Sold"} {s.qty}× {s.productName}</div>
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    <div className="fn-activity-amount">{s.type === "restock" ? "—" : formatINR(s.amount)}</div>
                    <div className="fn-activity-time">{relTime(s.date)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Inventory ---------- */

function ProductCard({ product, onOpen }) {
  const st = stockStatus(product);
  return (
    <button onClick={() => onOpen(product)} className="fn-pcard">
      <div className="fn-pcard-top">
        <ProductGlyph product={product} size={50} />
        <Badge tone={st.tone}>{st.label}</Badge>
      </div>
      <div>
        <div className="fn-pname">{product.name}</div>
        <div className="fn-ptagline">{product.tagline}</div>
      </div>
      <CapsuleGauge value={product.stock} max={Math.max(product.reorderLevel * 3, product.stock)} tone={st.tone} />
      <div className="fn-pfooter">
        <span className="fn-punits">{product.stock} units</span>
        <span className="fn-pprice">{formatINR(product.price)}</span>
      </div>
    </button>
  );
}

function QtyStepper({ value, setValue, min = 1, max = 9999 }) {
  return (
    <div className="fn-stepper">
      <button onClick={() => setValue(Math.max(min, value - 1))}><Minus size={14} /></button>
      <input type="number" value={value} onChange={(e) => setValue(Math.max(min, Math.min(max, Number(e.target.value) || min)))} />
      <button onClick={() => setValue(Math.min(max, value + 1))}><Plus size={14} /></button>
    </div>
  );
}

function ProductModal({ product, onClose, onSell, onRestock, sales, adminUnlocked, onEdit, onDelete }) {
  const [sellQty, setSellQty] = useState(1);
  const [restockQty, setRestockQty] = useState(10);
  if (!product) return null;
  const st = stockStatus(product);
  const history = sales.filter((s) => s.productId === product.id).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6);

  return (
    <div className="fn-modal-backdrop" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="fn-modal-panel fn-fade">
        <div className="fn-modal-inner">
          <div className="fn-modal-head">
            <div className="fn-modal-title-row">
              <ProductGlyph product={product} size={56} />
              <div>
                <div className="fn-modal-name">{product.name}</div>
                <div className="fn-modal-sku">{product.sku}</div>
              </div>
            </div>
            <button onClick={onClose} className="fn-close-btn"><X size={17} /></button>
          </div>

          <p className="fn-modal-desc">{product.tagline}</p>

          <div className="fn-mini-stats">
            <div className="fn-mini-card">
              <div className="fn-mini-label">Price</div>
              <div className="fn-mini-value">{formatINR(product.price)}</div>
            </div>
            <div className="fn-mini-card">
              <div className="fn-mini-label">Margin</div>
              <div className="fn-mini-value">{formatINR(product.price - product.cost)}</div>
            </div>
            <div className="fn-mini-card">
              <div className="fn-mini-label">Category</div>
              <div className="fn-mini-value" style={{ fontFamily: "Inter", fontWeight: 500, fontSize: 12 }}>{product.category}</div>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div className="fn-stock-row">
              <span>Stock level</span>
              <Badge tone={st.tone}>{product.stock} units — {st.label}</Badge>
            </div>
            <CapsuleGauge value={product.stock} max={Math.max(product.reorderLevel * 3, product.stock)} tone={st.tone} />
          </div>

          <div className="fn-action-grid">
            <div className="fn-action-card">
              <div className="fn-action-label">Record a sale</div>
              <QtyStepper value={sellQty} setValue={setSellQty} min={1} max={product.stock || 1} />
              <div style={{ marginTop: 10 }}>
                <button disabled={product.stock <= 0} onClick={() => { onSell(product, sellQty); setSellQty(1); }} className="fn-btn primary">
                  Sell {sellQty} · {formatINR(product.price * sellQty)}
                </button>
              </div>
            </div>
            <div className="fn-action-card">
              <div className="fn-action-label">Restock</div>
              <QtyStepper value={restockQty} setValue={setRestockQty} min={1} max={99999} />
              <div style={{ marginTop: 10 }}>
                <button onClick={() => { onRestock(product, restockQty); setRestockQty(10); }} className="fn-btn gold">
                  Add {restockQty} units
                </button>
              </div>
            </div>
          </div>

          <div>
            <div className="fn-action-label" style={{ marginBottom: 8 }}>Recent movement</div>
            {history.length === 0 ? (
              <p style={{ fontSize: 12.5, color: "rgba(31,61,43,.45)" }}>No movement yet.</p>
            ) : (
              <div>
                {history.map((s) => (
                  <div key={s.id} className="fn-history-row">
                    <span className="l">{s.type === "restock" ? "Restocked" : "Sold"} {s.qty} units</span>
                    <span className="r">{relTime(s.date)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {adminUnlocked && (
            <div className="fn-edit-actions">
              <button onClick={() => onEdit(product)} className="fn-btn outline"><Pencil size={14} /> Edit product</button>
              <button onClick={() => onDelete(product)} className="fn-btn danger auto-w" style={{ paddingLeft: 16, paddingRight: 16 }}><Trash2 size={14} /></button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Inventory({ products, categories, openProduct }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const filtered = products.filter((p) => {
    const matchQ = (p.name + p.tagline + p.sku).toLowerCase().includes(q.toLowerCase());
    const matchCat = cat === "All" || p.category === cat;
    return matchQ && matchCat;
  });
  // include any category still referenced by a product even if it was
  // since renamed/removed from the managed list, so nothing gets hidden
  const allCats = Array.from(new Set([...categories, ...products.map((p) => p.category)])).filter(Boolean);

  return (
    <div className="fn-page">
      <div className="fn-desktop-only">
        <h1 className="fn-h1">Inventory</h1>
        <p className="fn-sub">{products.length} products across {new Set(products.map(p => p.category)).size} categories</p>
      </div>

      <div className="fn-toolbar">
        <div className="fn-search">
          <Search size={16} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products or SKU…" className="fn-input" />
        </div>
        <div className="fn-select-wrap" style={{ width: "100%", maxWidth: 220 }}>
          <select value={cat} onChange={(e) => setCat(e.target.value)} className="fn-select">
            <option>All</option>
            {allCats.map((c) => <option key={c}>{c}</option>)}
          </select>
          <ChevronDown size={15} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="fn-empty">No products match your search.</div>
      ) : (
        <div className="fn-product-grid">
          {filtered.map((p) => <ProductCard key={p.id} product={p} onOpen={openProduct} />)}
        </div>
      )}
    </div>
  );
}

/* ---------- Analytics ---------- */

const PIE_COLORS = ["#1F3D2B", "#C9962B", "#28497D", "#5B8C3E", "#B4472F", "#0F6B5C", "#8A5F17"];

function Analytics({ products, sales }) {
  const [range, setRange] = useState(30);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - range);
  const filtered = sales.filter((s) => s.type === "sale" && (range === 0 || new Date(s.date) >= cutoff));

  const byDay = useMemo(() => {
    const map = {};
    filtered.forEach((s) => {
      const key = new Date(s.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
      map[key] = (map[key] || 0) + s.amount;
    });
    return Object.entries(map).map(([date, revenue]) => ({ date, revenue }));
  }, [filtered]);

  const byProduct = useMemo(() => {
    const map = {};
    filtered.forEach((s) => { map[s.productName] = (map[s.productName] || 0) + s.qty; });
    return Object.entries(map).map(([name, units]) => ({ name, units })).sort((a, b) => b.units - a.units);
  }, [filtered]);

  const stockValueDist = products.map((p) => ({ name: p.name, value: p.stock * p.price }));

  const totalRevenue = filtered.reduce((a, s) => a + s.amount, 0);
  const totalUnits = filtered.reduce((a, s) => a + s.qty, 0);
  const avgOrder = filtered.length ? totalRevenue / filtered.length : 0;
  const revenueByProduct = useMemo(() => {
    const map = {};
    filtered.forEach((s) => { map[s.productName] = (map[s.productName] || 0) + s.amount; });
    const arr = Object.entries(map).map(([name, revenue]) => ({ name, revenue }));
    arr.sort((a, b) => b.revenue - a.revenue);
    return arr;
  }, [filtered]);
  const bestSeller = revenueByProduct[0]?.name || "—";

  return (
    <div className="fn-page">
      <div className="fn-row" style={{ marginBottom: 20, flexWrap: "wrap" }}>
        <div className="fn-desktop-only" style={{ marginBottom: 0 }}>
          <h1 className="fn-h1">Analytics</h1>
          <p className="fn-sub">Sales history and stock value at a glance</p>
        </div>
        <div className="fn-chip-group">
          {[{ l: "7D", v: 7 }, { l: "30D", v: 30 }, { l: "90D", v: 90 }, { l: "All", v: 0 }].map((r) => (
            <button key={r.l} onClick={() => setRange(r.v)} className={`fn-chip${range === r.v ? " active" : ""}`}>{r.l}</button>
          ))}
        </div>
      </div>

      <div className="fn-stat-grid">
        <StatCard label="Revenue" value={formatINR(totalRevenue)} icon={Wallet} />
        <StatCard label="Units sold" value={totalUnits} icon={Package} />
        <StatCard label="Avg. order value" value={formatINR(avgOrder)} icon={TrendingUp} />
        <StatCard label="Best seller" value={bestSeller} icon={Sparkles} />
      </div>

      <div className="fn-card" style={{ marginBottom: 16 }}>
        <h2 className="fn-h2" style={{ marginBottom: 12 }}>Revenue over time</h2>
        <div style={{ height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={byDay} margin={{ left: -20, right: 10, top: 5 }}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1F3D2B" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#1F3D2B" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,.08)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fontFamily: "Inter" }} tickLine={false} axisLine={{ stroke: "rgba(0,0,0,.1)" }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11, fontFamily: "Inter" }} tickLine={false} axisLine={false} tickFormatter={(v) => "₹" + v / 1000 + "k"} />
              <Tooltip formatter={(v) => formatINR(v)} contentStyle={{ fontFamily: "Inter", fontSize: 12, borderRadius: 10, border: "1px solid rgba(0,0,0,.1)" }} />
              <Area type="monotone" dataKey="revenue" stroke="#1F3D2B" strokeWidth={2} fill="url(#rev)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="fn-dash-grid">
        <div className="fn-card">
          <h2 className="fn-h2" style={{ marginBottom: 12 }}>Units sold by product</h2>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byProduct} margin={{ left: -20, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,.08)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10.5, fontFamily: "Inter" }} tickLine={false} axisLine={{ stroke: "rgba(0,0,0,.1)" }} />
                <YAxis tick={{ fontSize: 11, fontFamily: "Inter" }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ fontFamily: "Inter", fontSize: 12, borderRadius: 10, border: "1px solid rgba(0,0,0,.1)" }} />
                <Bar dataKey="units" radius={[6, 6, 0, 0]} fill="#C9962B" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="fn-card">
          <h2 className="fn-h2" style={{ marginBottom: 12 }}>Stock value distribution</h2>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stockValueDist} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2}>
                  {stockValueDist.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => formatINR(v)} contentStyle={{ fontFamily: "Inter", fontSize: 12, borderRadius: 10, border: "1px solid rgba(0,0,0,.1)" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="fn-legend">
            {stockValueDist.map((s, i) => (
              <div key={s.name} className="fn-legend-item">
                <span className="fn-legend-dot" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />{s.name}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="fn-card" style={{ marginTop: 16 }}>
        <h2 className="fn-h2" style={{ marginBottom: 12 }}>Top products</h2>
        <div className="fn-table-wrap">
          <table className="fn-table">
            <thead>
              <tr><th>Product</th><th>Units sold</th><th>Revenue</th><th>Share</th></tr>
            </thead>
            <tbody>
              {revenueByProduct.map((r) => (
                <tr key={r.name}>
                  <td>{r.name}</td>
                  <td className="fn-mono">{byProduct.find((b) => b.name === r.name)?.units || 0}</td>
                  <td className="fn-mono">{formatINR(r.revenue)}</td>
                  <td style={{ color: "rgba(31,61,43,.55)" }}>{totalRevenue ? Math.round((r.revenue / totalRevenue) * 100) : 0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ---------- Admin ---------- */

function ProductForm({ initial, categories, onSave, onCancel }) {
  const blank = { id: "", sku: "", name: "", tagline: "", category: categories[0] || "", price: "", cost: "", stock: "", reorderLevel: "", icon: "Leaf", gradient: ["#2F5233", "#7CB342"], image: null };
  const [form, setForm] = useState(initial || blank);
  const fileRef = useRef(null);

  const handleImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const maxW = 300;
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setForm((f) => ({ ...f, image: canvas.toDataURL("image/jpeg", 0.82) }));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = () => {
    if (!form.name || !form.sku || form.price === "" || form.stock === "") return;
    onSave({
      ...form,
      id: form.id || "p" + Date.now().toString(36),
      price: Number(form.price),
      cost: Number(form.cost) || 0,
      stock: Number(form.stock),
      reorderLevel: Number(form.reorderLevel) || 10,
    });
  };

  return (
    <div className="fn-modal-backdrop" onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()} className="fn-modal-panel fn-fade">
        <div className="fn-modal-inner">
          <div className="fn-row" style={{ marginBottom: 16 }}>
            <h2 className="fn-h2" style={{ fontSize: 18 }}>{initial ? "Edit product" : "Add product"}</h2>
            <button onClick={onCancel} className="fn-close-btn"><X size={17} /></button>
          </div>

          <div className="fn-upload-row">
            <ProductGlyph product={form} size={56} />
            <button onClick={() => fileRef.current?.click()} className="fn-upload-btn"><Upload size={13} /> Upload image</button>
            {form.image && <button onClick={() => setForm((f) => ({ ...f, image: null }))} className="fn-remove-img">Remove</button>}
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImage} />
          </div>

          <div className="fn-field-row">
            <label className="fn-field">Product name
              <input value={form.name} onChange={set("name")} className="fn-input" />
            </label>
            <label className="fn-field">SKU
              <input value={form.sku} onChange={set("sku")} className="fn-input fn-mono" />
            </label>
          </div>

          <label className="fn-field">Tagline / description
            <input value={form.tagline} onChange={set("tagline")} className="fn-input" />
          </label>

          <div className="fn-field-row">
            <label className="fn-field">Category
              <select value={form.category} onChange={set("category")} className="fn-select">
                {categories.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label className="fn-field">Icon (used if no image)
              <select value={form.icon} onChange={set("icon")} className="fn-select">
                {Object.keys(ICONS).map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </label>
          </div>

          <div className="fn-field-row">
            <label className="fn-field">Price (₹)
              <input type="number" value={form.price} onChange={set("price")} className="fn-input fn-mono" />
            </label>
            <label className="fn-field">Cost (₹)
              <input type="number" value={form.cost} onChange={set("cost")} className="fn-input fn-mono" />
            </label>
          </div>

          <div className="fn-field-row" style={{ marginBottom: 20 }}>
            <label className="fn-field">Current stock
              <input type="number" value={form.stock} onChange={set("stock")} className="fn-input fn-mono" />
            </label>
            <label className="fn-field">Reorder level
              <input type="number" value={form.reorderLevel} onChange={set("reorderLevel")} className="fn-input fn-mono" />
            </label>
          </div>

          <button onClick={submit} className="fn-btn primary lg">{initial ? "Save changes" : "Add product"}</button>
        </div>
      </div>
    </div>
  );
}

function Admin({ products, unlocked, onUnlock, pin, setPin, categories, setCategories, onAdd, onEdit, onDelete, onResetDemo }) {
  const [entered, setEntered] = useState("");
  const [error, setError] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [newPin, setNewPin] = useState("");
  const [newCat, setNewCat] = useState("");

  if (!unlocked) {
    return (
      <div className="fn-page">
        <div className="fn-lock-wrap">
          <div className="fn-card" style={{ textAlign: "center" }}>
            <div className="fn-lock-icon"><Lock size={20} color="#1F3D2B" /></div>
            <h2 className="fn-h2" style={{ fontSize: 19, marginBottom: 6 }}>Admin access</h2>
            <p style={{ fontSize: 13, color: "rgba(31,61,43,.55)", marginBottom: 20 }}>Enter the PIN to manage products, prices and images. This is a soft lock for internal use, not a secure login.</p>
            <input
              value={entered}
              onChange={(e) => { setEntered(e.target.value); setError(false); }}
              type="password"
              inputMode="numeric"
              placeholder="PIN"
              className={`fn-pin-input${error ? " error" : ""}`}
            />
            {error && <p className="fn-error-text">Incorrect PIN, try again.</p>}
            <button onClick={() => (entered === pin ? onUnlock() : setError(true))} className="fn-btn primary lg">Unlock admin</button>
            <p className="fn-hint">Default PIN is 1234 until changed below.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fn-page">
      <div className="fn-admin-head">
        <div>
          <h1 className="fn-h1" style={{ display: "flex", alignItems: "center", gap: 8 }}>Admin <Unlock size={16} color="rgba(31,61,43,.5)" /></h1>
          <p className="fn-sub">Add, edit and price your catalog</p>
        </div>
        <button onClick={() => { setEditing(null); setFormOpen(true); }} className="fn-btn primary auto-w" style={{ paddingLeft: 16, paddingRight: 16 }}>
          <Plus size={15} /> Add product
        </button>
      </div>

      <div className="fn-card" style={{ padding: 0, marginBottom: 20, overflow: "hidden" }}>
        <div className="fn-table-wrap">
          <table className="fn-table">
            <thead>
              <tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th style={{ textAlign: "right" }}>Actions</th></tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="fn-table-name">
                      <ProductGlyph product={p} size={32} />
                      <div>
                        <div className="n">{p.name}</div>
                        <div className="s">{p.sku}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ color: "rgba(31,61,43,.7)" }}>{p.category}</td>
                  <td className="fn-mono">{formatINR(p.price)}</td>
                  <td className="fn-mono">{p.stock}</td>
                  <td>
                    <div className="fn-actions-cell">
                      <button onClick={() => { setEditing(p); setFormOpen(true); }} className="fn-icon-btn"><Pencil size={14} /></button>
                      <button onClick={() => onDelete(p)} className="fn-icon-btn danger"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="fn-admin-grid">
        <div className="fn-card">
          <h3 className="fn-h2" style={{ fontSize: 15, marginBottom: 12 }}>Change admin PIN</h3>
          <div className="fn-pin-row">
            <input value={newPin} onChange={(e) => setNewPin(e.target.value)} placeholder="New PIN" className="fn-input fn-mono" />
            <button onClick={() => { if (newPin.length >= 4) { setPin(newPin); setNewPin(""); } }} className="fn-btn primary auto-w" style={{ paddingLeft: 16, paddingRight: 16 }}>Save</button>
          </div>
        </div>
        <div className="fn-card">
          <h3 className="fn-h2" style={{ fontSize: 15, marginBottom: 12 }}>Manage categories</h3>
          <div className="fn-pin-row">
            <input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="New category name" className="fn-input" />
            <button onClick={() => { const v = newCat.trim(); if (v && !categories.includes(v)) { setCategories([...categories, v]); setNewCat(""); } }} className="fn-btn primary auto-w" style={{ paddingLeft: 16, paddingRight: 16 }}>Add</button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            {categories.map((c) => (
              <span key={c} className="fn-chip" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                {c}
                <button
                  onClick={() => setCategories(categories.filter((x) => x !== c))}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", lineHeight: 1 }}
                  title="Remove category"
                >×</button>
              </span>
            ))}
          </div>
        </div>
        <div className="fn-card">
          <h3 className="fn-h2" style={{ fontSize: 15, marginBottom: 12 }}>Data</h3>
          <p style={{ fontSize: 12.5, color: "rgba(31,61,43,.55)", marginBottom: 12 }}>Wipe all products and sales history and start fresh.</p>
          <button onClick={onResetDemo} className="fn-btn outline auto-w" style={{ paddingLeft: 16, paddingRight: 16 }}><RotateCcw size={14} /> Clear all data</button>
        </div>
      </div>

      {formOpen && (
        <ProductForm initial={editing} categories={categories} onCancel={() => setFormOpen(false)} onSave={(p) => { (editing ? onEdit : onAdd)(p); setFormOpen(false); }} />
      )}
    </div>
  );
}

/* ---------- App ---------- */

function StockApp({ workspace, workspaceLabel, onSwitchWorkspace, onLogout }) {
  const [tab, setTab] = useState("dashboard");
  const [products, setProducts] = useState(DEFAULT_PRODUCTS);
  const [sales, setSales] = useState([]);
  const [categories, setCategoriesState] = useState(DEFAULT_CATEGORIES);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState(null);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [pin, setPinState] = useState("1234");
  const [toast, setToast] = useState(null);
  const [editTarget, setEditTarget] = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2200); };

  useEffect(() => {
    setLoaded(false);
    (async () => {
      let p = DEFAULT_PRODUCTS;
      let s = null;
      let pn = "1234";
      let cats = null;
      try { const loaded = await loadProducts(workspace); if (loaded) p = loaded; } catch (e) {}
      try { const loaded = await loadSales(workspace); if (loaded) s = loaded; } catch (e) {}
      try { const loaded = await loadSetting(`${workspace}_pin`, "1234"); if (loaded) pn = loaded; } catch (e) {}
      try { const loaded = await loadSetting(`${workspace}_categories`, null); if (loaded) cats = JSON.parse(loaded); } catch (e) {}

      setProducts(p);
      const finalSales = s || [];
      setSales(finalSales);
      setPinState(pn);
      const finalCats = cats && cats.length ? cats : DEFAULT_CATEGORIES;
      setCategoriesState(finalCats);

      try { await saveProducts(p, workspace); } catch (e) {}
      if (!s) { try { await saveSales(finalSales, workspace); } catch (e) {} }
      try { await saveSetting(`${workspace}_pin`, pn); } catch (e) {}
      if (!cats) { try { await saveSetting(`${workspace}_categories`, JSON.stringify(finalCats)); } catch (e) {} }

      setLoaded(true);
    })();
  }, [workspace]);

  const setCategories = useCallback(async (next) => {
    setCategoriesState(next);
    try { await saveSetting(`${workspace}_categories`, JSON.stringify(next)); } catch (e) {}

  }, []);

  const persistProducts = useCallback(async (next) => {
    setProducts(next);
    try { await saveProducts(next, workspace); } catch (e) {}
  }, []);

  const persistSales = useCallback(async (next) => {
    setSales(next);
    try { await saveSales(next, workspace); } catch (e) {}
  }, []);

  const setPin = useCallback(async (p) => {
    setPinState(p);
    try { await saveSetting(`${workspace}_pin`, p); } catch (e) {}
    showToast("PIN updated");
  }, []);

  const handleSell = (product, qty) => {
    const next = products.map((p) => p.id === product.id ? { ...p, stock: Math.max(0, p.stock - qty) } : p);
    persistProducts(next);
    const entry = { id: "s" + Date.now().toString(36), productId: product.id, productName: product.name, qty, amount: qty * product.price, type: "sale", date: new Date().toISOString() };
    persistSales([...sales, entry]);
    setSelected(next.find((p) => p.id === product.id));
    showToast(`Sold ${qty}× ${product.name}`);
  };

  const handleRestock = (product, qty) => {
    const next = products.map((p) => p.id === product.id ? { ...p, stock: p.stock + qty } : p);
    persistProducts(next);
    const entry = { id: "s" + Date.now().toString(36), productId: product.id, productName: product.name, qty, amount: 0, type: "restock", date: new Date().toISOString() };
    persistSales([...sales, entry]);
    setSelected(next.find((p) => p.id === product.id));
    showToast(`Restocked ${qty}× ${product.name}`);
  };

  const handleAddProduct = (p) => { persistProducts([...products, p]); showToast(`${p.name} added`); };

  const handleEditProduct = (p) => {
    persistProducts(products.map((x) => x.id === p.id ? p : x));
    if (selected?.id === p.id) setSelected(p);
    showToast(`${p.name} updated`);
  };

  const handleDeleteProduct = (p) => {
    if (!window.confirm(`Remove ${p.name} from the catalog?`)) return;
    persistProducts(products.filter((x) => x.id !== p.id));
    setSelected(null);
    showToast(`${p.name} removed`);
  };

  const handleResetDemo = async () => {
    if (!window.confirm("Clear all products and sales data? This cannot be undone.")) return;
    await persistProducts([]);
    await persistSales([]);
    showToast("All data cleared");
  };

  if (!loaded) {
    return (
      <div className="fn-center" style={{ minHeight: 500, background: "#FBF7EE" }}>
        <GlobalStyle />
        <img src={LOGO_SRC} alt="" style={{ width: 56, height: 56, objectFit: "contain", opacity: .6 }} />
      </div>
    );
  }

  return (
    <div className="fn-app">
      <GlobalStyle />
      <Sidebar tab={tab} setTab={setTab} adminUnlocked={adminUnlocked} workspaceLabel={workspaceLabel} onSwitchWorkspace={onSwitchWorkspace} onLogout={onLogout} />

      <div className="fn-main">
        <TopBar tab={tab} />

        {tab === "dashboard" && <Dashboard products={products} sales={sales} openProduct={setSelected} setTab={setTab} />}
        {tab === "inventory" && <Inventory products={products} categories={categories} openProduct={setSelected} />}
        {tab === "analytics" && <Analytics products={products} sales={sales} />}
        {tab === "admin" && (
          <Admin
            products={products}
            unlocked={adminUnlocked}
            onUnlock={() => { setAdminUnlocked(true); showToast("Admin unlocked"); }}
            pin={pin}
            setPin={setPin}
            categories={categories}
            setCategories={setCategories}
            onAdd={handleAddProduct}
            onEdit={handleEditProduct}
            onDelete={handleDeleteProduct}
            onResetDemo={handleResetDemo}
          />
        )}
      </div>

      <BottomNav tab={tab} setTab={setTab} />

      {selected && (
        <ProductModal
          product={selected}
          onClose={() => setSelected(null)}
          onSell={handleSell}
          onRestock={handleRestock}
          sales={sales}
          adminUnlocked={adminUnlocked}
          onEdit={(p) => { setSelected(null); setEditTarget(p); }}
          onDelete={handleDeleteProduct}
        />
      )}

      {editTarget && (
        <ProductForm initial={editTarget} categories={categories} onCancel={() => setEditTarget(null)} onSave={(p) => { handleEditProduct(p); setEditTarget(null); }} />
      )}

      <Toast toast={toast} />
    </div>
  );
}

export default StockApp;
