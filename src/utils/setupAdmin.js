import { ref, set } from "firebase/database";
import { db } from "../firebase";

/**
 * Setup Admin credentials in Firebase
 * This function creates an Admin node with email and password
 */
export const setupAdminCredentials = async () => {
  try {
    const adminRef = ref(db, "Admin");
    await set(adminRef, {
      email: "admin123@gmail.com",
      password: "admin123",
      name: "Admin User",
      role: "Administrator",
      createdAt: new Date().toISOString()
    });
    console.log("✅ Admin credentials created successfully!");
    return { success: true, message: "Admin credentials created successfully!" };
  } catch (error) {
    console.error("❌ Error creating admin credentials:", error);
    return { success: false, message: error.message };
  }
};

/**
 * Verify if Admin credentials exist
 */
export const verifyAdminCredentials = async () => {
  try {
    const { get } = await import("firebase/database");
    const adminRef = ref(db, "Admin");
    const snapshot = await get(adminRef);
    
    if (snapshot.exists()) {
      console.log("✅ Admin credentials exist:", snapshot.val());
      return { exists: true, data: snapshot.val() };
    } else {
      console.log("⚠️ Admin credentials not found");
      return { exists: false };
    }
  } catch (error) {
    console.error("❌ Error verifying admin credentials:", error);
    return { exists: false, error: error.message };
  }
};
