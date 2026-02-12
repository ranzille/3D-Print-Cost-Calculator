
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, orderBy, limit, Timestamp, setDoc, getDoc } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { HistoryItem, CapitalItem, Product, Sale, CalculatorInputs } from "../types";

// --- CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyBgXHOFfHSEn5ISrZBbDEkTV_N_jx4fpj0",
  authDomain: "d-print-calculator-48dee.firebaseapp.com",
  projectId: "d-print-calculator-48dee",
  storageBucket: "d-print-calculator-48dee.firebasestorage.app",
  messagingSenderId: "465080294000",
  appId: "1:465080294000:web:b596e9b3766fe98f2b32b5",
  measurementId: "G-W1KS29P9QB"
};

// --- INITIALIZATION ---
let app;
let db: any;
let analytics;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  analytics = getAnalytics(app);
  console.log("✅ Firebase initialized successfully:", firebaseConfig.projectId);
} catch (error) {
  console.error("❌ Error initializing Firebase:", error);
}

export const getSyncStatus = () => {
    return {
        isCloud: !!db,
        projectId: firebaseConfig.projectId
    };
};

const JOBS_COLLECTION = "print_jobs";
const CAPITAL_COLLECTION = "capital_expenses";
const PRODUCTS_COLLECTION = "products";
const SALES_COLLECTION = "sales";
const SETTINGS_COLLECTION = "settings";

// --- HELPERS ---
const checkDb = () => {
  if (!db) {
    console.error("Firebase DB is not initialized. Check your configuration.");
    throw new Error("Database not initialized");
  }
  return db;
};

// --- JOBS ---

export const saveJob = async (item: Omit<HistoryItem, 'id'>): Promise<HistoryItem> => {
  const database = checkDb();
  try {
    const docRef = await addDoc(collection(database, JOBS_COLLECTION), {
      ...item,
      createdAt: Timestamp.fromMillis(item.createdAt || Date.now())
    });
    return { ...item, id: docRef.id };
  } catch (e) {
    console.error("Error saving job:", e);
    throw e;
  }
};

export const updateJob = async (id: string, updates: Partial<HistoryItem>): Promise<void> => {
  const database = checkDb();
  try {
    const docRef = doc(database, JOBS_COLLECTION, id);
    await updateDoc(docRef, updates);
  } catch (e) {
    console.error("Error updating job:", e);
  }
};

export const getJobs = async (limitCount = 50): Promise<HistoryItem[]> => {
  const database = checkDb();
  try {
    const constraints: any[] = [orderBy("createdAt", "desc")];
    if (limitCount > 0) constraints.push(limit(limitCount));

    const q = query(collection(database, JOBS_COLLECTION), ...constraints);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toMillis?.() || doc.data().createdAt || Date.now()
    })) as unknown as HistoryItem[];
  } catch (e) {
    console.error("Error fetching jobs:", e);
    return [];
  }
};

export const deleteJob = async (id: string): Promise<void> => {
  const database = checkDb();
  try {
    await deleteDoc(doc(database, JOBS_COLLECTION, id));
  } catch (e) {
    console.error("Error deleting job:", e);
  }
};

// --- CAPITAL EXPENSES ---

export const saveCapitalItem = async (item: Omit<CapitalItem, 'id'>): Promise<CapitalItem> => {
  const database = checkDb();
  try {
    const docRef = await addDoc(collection(database, CAPITAL_COLLECTION), {
      ...item,
      createdAt: Timestamp.now()
    });
    return { ...item, id: docRef.id };
  } catch (e) {
    console.error("Error saving expense:", e);
    throw e;
  }
};

export const updateCapitalItem = async (id: string, updates: Partial<CapitalItem>): Promise<void> => {
  const database = checkDb();
  try {
      await updateDoc(doc(database, CAPITAL_COLLECTION, id), updates);
  } catch(e) {
      console.error("Error updating expense:", e);
  }
};

export const getCapitalItems = async (limitCount = 100): Promise<CapitalItem[]> => {
  const database = checkDb();
  try {
    const constraints: any[] = [orderBy("createdAt", "desc")];
    if (limitCount > 0) constraints.push(limit(limitCount));

    const q = query(collection(database, CAPITAL_COLLECTION), ...constraints);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          ...d,
          quantity: d.quantity ?? 1
        };
    }) as unknown as CapitalItem[];
  } catch (e) {
    console.error("Error fetching expenses:", e);
    return [];
  }
};

export const deleteCapitalItem = async (id: string): Promise<void> => {
  const database = checkDb();
  try {
    await deleteDoc(doc(database, CAPITAL_COLLECTION, id));
  } catch (e) {
    console.error("Error deleting expense:", e);
  }
};

// --- PRODUCTS (INVENTORY) ---

export const saveProduct = async (item: Omit<Product, 'id'>): Promise<Product> => {
  const database = checkDb();
  try {
    const docRef = await addDoc(collection(database, PRODUCTS_COLLECTION), item);
    return { ...item, id: docRef.id };
  } catch (e) {
    console.error("Error saving product:", e);
    throw e;
  }
};

export const getProducts = async (): Promise<Product[]> => {
  const database = checkDb();
  try {
    const q = query(collection(database, PRODUCTS_COLLECTION), orderBy("name", "asc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as unknown as Product[];
  } catch (e) {
    console.error("Error fetching products:", e);
    return [];
  }
};

export const deleteProduct = async (id: string): Promise<void> => {
  const database = checkDb();
  try {
      await deleteDoc(doc(database, PRODUCTS_COLLECTION, id));
  } catch(e) {
      console.error("Error deleting product:", e);
  }
};

export const updateProduct = async (id: string, updates: Partial<Product>): Promise<void> => {
  const database = checkDb();
  try {
      await updateDoc(doc(database, PRODUCTS_COLLECTION, id), updates);
  } catch(e) {
      console.error("Error updating product:", e);
  }
};

// --- SALES (POS) ---

export const saveSale = async (item: Omit<Sale, 'id'>): Promise<Sale> => {
  const database = checkDb();
  try {
    const docRef = await addDoc(collection(database, SALES_COLLECTION), {
      ...item,
      createdAt: Timestamp.fromMillis(item.timestamp)
    });
    return { ...item, id: docRef.id };
  } catch (e) {
    console.error("Error saving sale:", e);
    throw e;
  }
};

export const updateSale = async (id: string, updates: Partial<Sale>): Promise<void> => {
  const database = checkDb();
  try {
      await updateDoc(doc(database, SALES_COLLECTION, id), updates);
  } catch (e) {
      console.error("Error updating sale:", e);
  }
};

export const deleteSale = async (id: string): Promise<void> => {
  const database = checkDb();
  try {
    await deleteDoc(doc(database, SALES_COLLECTION, id));
  } catch (e) {
    console.error("Error deleting sale:", e);
  }
};

export const getSales = async (limitCount = 100): Promise<Sale[]> => {
  const database = checkDb();
  try {
    const constraints: any[] = [orderBy("createdAt", "desc")];
    if (limitCount > 0) constraints.push(limit(limitCount));

    const q = query(collection(database, SALES_COLLECTION), ...constraints);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // @ts-ignore
      timestamp: doc.data().timestamp || doc.data().createdAt?.toMillis?.() || Date.now()
    })) as unknown as Sale[];
  } catch (e) {
    console.error("Error fetching sales:", e);
    return [];
  }
};

// --- GLOBAL SETTINGS ---

export const saveGlobalSettings = async (settings: Partial<CalculatorInputs>): Promise<void> => {
    const database = checkDb();
    try {
        await setDoc(doc(database, SETTINGS_COLLECTION, "global_defaults"), settings);
    } catch(e) {
        console.error("Error saving global settings", e);
        throw e;
    }
}

export const getGlobalSettings = async (): Promise<Partial<CalculatorInputs> | null> => {
    const database = checkDb();
    try {
        const docRef = doc(database, SETTINGS_COLLECTION, "global_defaults");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data() as Partial<CalculatorInputs>;
        }
        return null;
    } catch(e) {
        console.error("Error fetching global settings", e);
        return null;
    }
}
