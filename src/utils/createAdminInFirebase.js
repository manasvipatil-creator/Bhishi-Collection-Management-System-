/**
 * Quick Script to Create Admin Credentials in Firebase
 * Run this once to set up admin access
 */

import { ref, set } from "firebase/database";
import { db } from "../firebase";

const createAdmin = async () => {
  try {
    console.log("🔄 Creating admin credentials in Firebase...");
    
    const adminRef = ref(db, "Admin");
    await set(adminRef, {
      email: "admin123@gmail.com",
      password: "admin123",
      name: "Admin User",
      role: "Administrator",
      createdAt: new Date().toISOString()
    });
    
    console.log("✅ SUCCESS! Admin credentials created:");
    console.log("   Email: admin123@gmail.com");
    console.log("   Password: admin123");
    console.log("\n📝 You can now login at: http://localhost:3000/login");
    
  } catch (error) {
    console.error("❌ Error creating admin:", error);
  }
};

// Auto-run when imported
createAdmin();

export default createAdmin;
