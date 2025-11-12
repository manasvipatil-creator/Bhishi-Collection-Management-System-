import { ref, get, set, push } from "firebase/database";
import { db } from "../firebase";

/**
 * Utility to manage customer IDs under agents
 * This will add customers with sequential IDs like 1, 2, 3 under specific agents
 */

// Get next customer ID for an agent
export const getNextCustomerId = async (agentId) => {
  try {
    const customersRef = ref(db, `agents/${agentId}/customers`);
    const snapshot = await get(customersRef);
    
    if (snapshot.exists()) {
      const customers = snapshot.val();
      const existingIds = Object.keys(customers).map(id => parseInt(id)).filter(id => !isNaN(id));
      
      if (existingIds.length === 0) {
        return 1; // First customer
      }
      
      // Return next sequential ID
      return Math.max(...existingIds) + 1;
    }
    
    return 1; // First customer for this agent
  } catch (error) {
    console.error("Error getting next customer ID:", error);
    return 1;
  }
};

// Add customer with sequential ID under agent
export const addCustomerWithSequentialId = async (agentId, customerData) => {
  try {
    // Get next customer ID
    const customerId = await getNextCustomerId(agentId);
    
    // Create customer data structure
    const newCustomerData = {
      customerId: customerId.toString(),
      customerName: customerData.customerName || "",
      mobileNumber: customerData.mobileNumber || "",
      address: customerData.address || "",
      joinDate: customerData.joinDate || new Date().toISOString().split('T')[0],
      monthlyDue: customerData.monthlyDue || 0,
      weeklyAmount: customerData.weeklyAmount || 0,
      balance: 0,
      status: customerData.status || "active",
      agentId: agentId,
      createdAt: new Date().toISOString(),
      timestamp: Date.now(),
      totalSubmitted: 0,
      missedPayments: 0,
      lastPaymentDate: null
    };
    
    // Save customer with sequential ID as key
    const customerRef = ref(db, `agents/${agentId}/customers/${customerId}`);
    await set(customerRef, newCustomerData);
    
    console.log(`Customer added successfully with ID: ${customerId} under agent: ${agentId}`);
    return {
      success: true,
      customerId: customerId,
      agentId: agentId,
      message: "Customer added successfully"
    };
    
  } catch (error) {
    console.error("Error adding customer:", error);
    return {
      success: false,
      message: "Error adding customer: " + error.message
    };
  }
};

// Add multiple customers with sequential IDs
export const addMultipleCustomers = async (agentId, customersArray) => {
  try {
    const results = [];
    
    for (const customerData of customersArray) {
      const result = await addCustomerWithSequentialId(agentId, customerData);
      results.push(result);
      
      if (!result.success) {
        console.error(`Failed to add customer: ${customerData.customerName}`);
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    return {
      success: failCount === 0,
      message: `Added ${successCount} customers successfully${failCount > 0 ? `, ${failCount} failed` : ''}`,
      results: results
    };
    
  } catch (error) {
    console.error("Error adding multiple customers:", error);
    return {
      success: false,
      message: "Error adding customers: " + error.message
    };
  }
};

// Get all customers for an agent
export const getAgentCustomers = async (agentId) => {
  try {
    const customersRef = ref(db, `agents/${agentId}/customers`);
    const snapshot = await get(customersRef);
    
    if (snapshot.exists()) {
      const customers = snapshot.val();
      return Object.entries(customers).map(([id, data]) => ({
        id: id,
        ...data
      })).sort((a, b) => parseInt(a.id) - parseInt(b.id)); // Sort by ID
    }
    
    return [];
  } catch (error) {
    console.error("Error fetching agent customers:", error);
    return [];
  }
};

// Check if agent exists
export const checkAgentExists = async (agentId) => {
  try {
    const agentRef = ref(db, `agents/${agentId}`);
    const snapshot = await get(agentRef);
    return snapshot.exists();
  } catch (error) {
    console.error("Error checking agent:", error);
    return false;
  }
};

// Sample customers data for testing
export const sampleCustomersData = [
  {
    customerName: "Rajesh Kumar",
    mobileNumber: "9876543210",
    address: "123 Main Street, Mumbai",
    monthlyDue: 5000,
    weeklyAmount: 1250
  },
  {
    customerName: "Priya Sharma",
    mobileNumber: "9876543211",
    address: "456 Park Avenue, Mumbai",
    monthlyDue: 3000,
    weeklyAmount: 750
  },
  {
    customerName: "Amit Patel",
    mobileNumber: "9876543212",
    address: "789 Garden Road, Mumbai",
    monthlyDue: 4000,
    weeklyAmount: 1000
  }
];

export default {
  getNextCustomerId,
  addCustomerWithSequentialId,
  addMultipleCustomers,
  getAgentCustomers,
  checkAgentExists,
  sampleCustomersData
};
