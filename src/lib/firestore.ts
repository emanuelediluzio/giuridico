import { db } from "./firebase";
import { collection, addDoc, query, getDocs, orderBy, Timestamp } from "firebase/firestore";

export interface HistoryItem {
    id?: string;
    name: string;
    date: string;
    timestamp: Timestamp;
    resultData?: Record<string, unknown>; // To store the full analysis result if needed
}

export const saveUserHistory = async (userId: string, itemName: string, resultData?: Record<string, unknown>) => {
    if (!db) return;
    try {
        const historyRef = collection(db, "users", userId, "history");
        await addDoc(historyRef, {
            name: itemName,
            date: new Date().toISOString().split('T')[0],
            timestamp: Timestamp.now(),
            resultData: resultData || {}
        });
        console.log("History saved to Firestore");
    } catch (error) {
        console.error("Error saving history:", error);
    }
};

export const getUserHistory = async (userId: string): Promise<HistoryItem[]> => {
    if (!db) return [];
    try {
        const historyRef = collection(db, "users", userId, "history");
        const q = query(historyRef, orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);

        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as HistoryItem));
    } catch (error) {
        console.error("Error fetching history:", error);
        return [];
    }
};
