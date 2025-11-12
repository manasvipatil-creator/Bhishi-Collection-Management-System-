import { ref, set } from "firebase/database";
import { db } from "../firebase";

/**
 * Quick utility to add customers with IDs 1, 2, 3 to agent AGTMAY8746
 */

export const addCustomersToAGTMAY8746 = async () => {
  const agentId = "AGTMAY8746";
  
  const customers = [
    {
      customerId: "1",
      customerName: "Rajesh Kumar",
      mobileNumber: "9876543210",
      address: "123 Main Street, Mumbai",
      joinDate: "2024-10-13",
      monthlyDue: 5000,
      weeklyAmount: 1250,
      balance: 0,
      status: "active",
      agentId: agentId,
      createdAt: new Date().toISOString(),
      timestamp: Date.now(),
      totalSubmitted: 0,
      missedPayments: 0,
      lastPaymentDate: null
    },
    {
      customerId: "2",
      customerName: "Priya Sharma",
      mobileNumber: "9876543211",
      address: "456 Park Avenue, Mumbai",
      joinDate: "2024-10-13",
      monthlyDue: 3000,
      weeklyAmount: 750,
      balance: 0,
      status: "active",
      agentId: agentId,
      createdAt: new Date().toISOString(),
      timestamp: Date.now(),
      totalSubmitted: 0,
      missedPayments: 0,
      lastPaymentDate: null
    },
    {
      customerId: "3",
      customerName: "Amit Patel",
      mobileNumber: "9876543212",
      address: "789 Garden Road, Mumbai",
      joinDate: "2024-10-13",
      monthlyDue: 4000,
      weeklyAmount: 1000,
      balance: 0,
      status: "active",
      agentId: agentId,
      createdAt: new Date().toISOString(),
      timestamp: Date.now(),
      totalSubmitted: 0,
      missedPayments: 0,
      lastPaymentDate: null
    }
  ];

  try {
    console.log("Adding customers to agent:", agentId);
    
    for (const customer of customers) {
      const customerRef = ref(db, `agents/${agentId}/customers/${customer.customerId}`);
      await set(customerRef, customer);
      console.log(`Added customer ${customer.customerId}: ${customer.customerName}`);
    }
    
    console.log("All customers added successfully!");
    return {
      success: true,
      message: "Successfully added 3 customers with IDs 1, 2, 3"
    };
    
  } catch (error) {
    console.error("Error adding customers:", error);
    return {
      success: false,
      message: "Error adding customers: " + error.message
    };
  }
};

// Call this function to add the customers
// addCustomersToAGTMAY8746();

export default addCustomersToAGTMAY8746;
