import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/* ---------------------------------------------------------------------
   Auth helpers
--------------------------------------------------------------------- */

export async function signIn(email, password) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function onAuthStateChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return data.subscription;
}

/* ---------------------------------------------------------------------
   Storage helpers, scoped per workspace (e.g. "fras" or "clinic") so
   the two stock lists never mix.
--------------------------------------------------------------------- */

export async function loadProducts(workspace) {
  const { data, error } = await supabase.from("products").select("*").eq("workspace", workspace);
  if (error || !data || data.length === 0) return null;
  return data.map((p) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    tagline: p.tagline,
    category: p.category,
    price: p.price,
    cost: p.cost,
    stock: p.stock,
    reorderLevel: p.reorder_level,
    icon: p.icon,
    gradient: p.gradient,
    image: p.image,
  }));
}

export async function saveProducts(products, workspace) {
  const rows = products.map((p) => ({
    id: p.id,
    workspace,
    sku: p.sku,
    name: p.name,
    tagline: p.tagline,
    category: p.category,
    price: p.price,
    cost: p.cost,
    stock: p.stock,
    reorder_level: p.reorderLevel,
    icon: p.icon,
    gradient: p.gradient,
    image: p.image,
  }));
  if (rows.length) await supabase.from("products").upsert(rows);
  const { data: existing } = await supabase.from("products").select("id").eq("workspace", workspace);
  const currentIds = new Set(products.map((p) => p.id));
  const toDelete = (existing || []).filter((r) => !currentIds.has(r.id)).map((r) => r.id);
  if (toDelete.length) await supabase.from("products").delete().in("id", toDelete).eq("workspace", workspace);
}

export async function loadSales(workspace) {
  const { data, error } = await supabase.from("sales").select("*").eq("workspace", workspace).order("date", { ascending: true });
  if (error || !data || data.length === 0) return null;
  return data.map((s) => ({
    id: s.id,
    productId: s.product_id,
    productName: s.product_name,
    qty: s.qty,
    amount: s.amount,
    type: s.type,
    date: s.date,
  }));
}

export async function saveSales(sales, workspace) {
  const rows = sales.map((s) => ({
    id: s.id,
    workspace,
    product_id: s.productId,
    product_name: s.productName,
    qty: s.qty,
    amount: s.amount,
    type: s.type,
    date: s.date,
  }));
  if (rows.length) await supabase.from("sales").upsert(rows);
}

export async function loadSetting(key, fallback) {
  const { data, error } = await supabase.from("settings").select("value").eq("key", key).maybeSingle();
  if (error || !data) return fallback;
  return data.value;
}

export async function saveSetting(key, value) {
  await supabase.from("settings").upsert({ key, value });
}
