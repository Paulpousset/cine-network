// Service de simulation de paiement
// À remplacer par Stripe ou RevenueCat en production

export const PaymentService = {
  simulatePayment: async (amount: number, label: string): Promise<boolean> => {
    return true; // Toujours gratuit pour le moment
  },
};
