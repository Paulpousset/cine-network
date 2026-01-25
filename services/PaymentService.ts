// Service de simulation de paiement
// À remplacer par Stripe ou RevenueCat en production

export const PaymentService = {
  simulatePayment: async (amount: number, label: string): Promise<boolean> => {
    return new Promise((resolve) => {
      console.log(`Processing payment of ${amount}€ for: ${label}`);
      setTimeout(() => {
        // Simulation: 90% de succès
        const success = Math.random() > 0.1;
        resolve(success);
      }, 2000);
    });
  },
};
