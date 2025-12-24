import { db } from "./firebase";
import { collection, addDoc, query, getDocs, orderBy, Timestamp, doc, updateDoc } from "firebase/firestore";

export interface Message {
    id?: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: number;
}

export interface HistoryItem {
    id?: string;
    name: string;
    date: string;
    timestamp: Timestamp;
    resultData?: Record<string, unknown>; // To store the full analysis result
    chatMessages?: Message[];
}

export const saveUserHistory = async (userId: string, itemName: string, resultData?: Record<string, unknown>, chatMessages?: Message[]): Promise<string | null> => {
    if (!db) return null;
    try {
        const historyRef = collection(db, "users", userId, "history");
        const docRef = await addDoc(historyRef, {
            name: itemName,
            date: new Date().toISOString().split('T')[0],
            timestamp: Timestamp.now(),
            resultData: resultData || {},
            chatMessages: chatMessages || []
        });
        console.log("History saved to Firestore with ID:", docRef.id);
        return docRef.id;
    } catch (error) {
        console.error("Error saving history:", error);
        return null;
    }
};

export const updateUserHistory = async (userId: string, docId: string, data: Partial<HistoryItem>) => {
    if (!db) return;
    try {
        const docRef = doc(db, "users", userId, "history", docId);
        await updateDoc(docRef, data);
        console.log("History updated:", docId);
    } catch (error) {
        console.error("Error updating history:", error);
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
