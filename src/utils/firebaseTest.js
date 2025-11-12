// Firebase connection test utility
import { ref, set, get } from "firebase/database";
import { db } from "../firebase";

// Test Firebase connection
export const testFirebaseConnection = async () => {
  try {
    console.log("Testing Firebase connection...");
    
    // Test write operation
    const testRef = ref(db, "test/connection");
    await set(testRef, {
      timestamp: Date.now(),
      message: "Firebase connection test successful",
      project: "Bishi Collection Management System"
    });
    
    // Test read operation
    const snapshot = await get(testRef);
    if (snapshot.exists()) {
      console.log("✅ Firebase connection successful!");
      console.log("Test data:", snapshot.val());
      return { success: true, data: snapshot.val() };
    } else {
      console.log("❌ No data found in test");
      return { success: false, error: "No data found" };
    }
    
  } catch (error) {
    console.error("❌ Firebase connection failed:", error);
    return { success: false, error: error.message };
  }
};

// Test database rules (optional)
export const testDatabaseRules = async () => {
  try {
    // Test if we can write to agents collection
    const agentTestRef = ref(db, "agents/test");
    await set(agentTestRef, {
      testAgent: true,
      timestamp: Date.now()
    });
    
    console.log("✅ Database rules allow write operations");
    return { success: true };
    
  } catch (error) {
    console.error("❌ Database rules test failed:", error);
    return { success: false, error: error.message };
  }
};
