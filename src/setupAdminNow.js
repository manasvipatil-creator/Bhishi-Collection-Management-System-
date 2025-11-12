// Run this file once to create admin credentials in Firebase
// Usage: node src/setupAdminNow.js (won't work in browser)
// OR: Import this in your app temporarily

import { ref, set } from "firebase/database";
import { db } from "./firebase";

const setupAdmin = async () => {
  try {
    console.log("🔄 Creating Admin credentials in Firebase...");
    
    const adminRef = ref(db, "Admin");
    await set(adminRef, {
      email: "admin123@gmail.com",
      password: "admin123",
      name: "Admin User",
      role: "Administrator",
      createdAt: new Date().toISOString()
    });
    
    console.log("✅ SUCCESS! Admin credentials created!");
    console.log("📧 Email: admin123@gmail.com");
    console.log("🔑 Password: admin123");
    alert("Admin credentials created successfully! You can now login.");
    
  } catch (error) {
    console.error("❌ Error:", error);
    alert("Error creating admin credentials: " + error.message);
  }
};

// Auto-run
setupAdmin();

export default setupAdmin;
