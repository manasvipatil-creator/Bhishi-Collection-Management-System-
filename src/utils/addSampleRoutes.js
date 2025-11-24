import { ref, set, push } from "firebase/database";
import { db } from "../firebase";

/**
 * Add sample routes to Firebase
 * Run this once to populate the routes collection
 */
export const addSampleRoutes = async () => {
  const sampleRoutes = [
    {
      name: "North Route",
      villages: ["Village A", "Village B", "Village C"],
      status: "active",
      createdAt: new Date().toISOString(),
      timestamp: Date.now()
    },
    {
      name: "South Route",
      villages: ["Village X", "Village Y", "Village Z"],
      status: "active",
      createdAt: new Date().toISOString(),
      timestamp: Date.now()
    },
    {
      name: "East Route",
      villages: ["Village 1", "Village 2", "Village 3"],
      status: "active",
      createdAt: new Date().toISOString(),
      timestamp: Date.now()
    },
    {
      name: "West Route",
      villages: ["Village P", "Village Q", "Village R"],
      status: "active",
      createdAt: new Date().toISOString(),
      timestamp: Date.now()
    }
  ];

  try {
    const routesRef = ref(db, 'routes');
    
    for (const route of sampleRoutes) {
      const newRouteRef = push(routesRef);
      await set(newRouteRef, route);
      console.log(`✅ Added route: ${route.name}`);
    }
    
    console.log("🎉 All sample routes added successfully!");
    alert("Sample routes added successfully! You can now assign them to agents.");
    return true;
  } catch (error) {
    console.error("Error adding sample routes:", error);
    alert("Error adding routes: " + error.message);
    return false;
  }
};
