import Colors from "@/constants/Colors";
import { GlobalStyles } from "@/constants/Styles";
import { PaymentService } from "@/services/PaymentService";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Modal, StyleSheet, Text, View } from "react-native";
import ClapLoading from "./ClapLoading";
import { Hoverable } from "./Hoverable";

type PaymentModalProps = {
  visible: boolean;
  amount: number;
  label: string;
  onClose: () => void;
  onSuccess: () => void;
};

export default function PaymentModal({
  visible,
  amount,
  label,
  onClose,
  onSuccess,
}: PaymentModalProps) {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePayment = async () => {
    setProcessing(true);
    setError(null);
    try {
      const success = await PaymentService.simulatePayment(amount, label);
      if (success) {
        onSuccess();
        onClose();
      } else {
        setError("Le paiement a échoué. Veuillez réessayer.");
      }
    } catch (e) {
      setError("Une erreur est survenue.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Hoverable
            style={styles.closeButton}
            onPress={onClose}
            hoverStyle={{ backgroundColor: "#f0f0f0" }}
          >
            <Ionicons name="close" size={24} color="#333" />
          </Hoverable>

          <View style={styles.header}>
            <Ionicons
              name="card-outline"
              size={40}
              color={Colors.light.primary}
            />
            <Text style={styles.title}>Paiement Sécurisé</Text>
          </View>

          <View style={styles.details}>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.amount}>{amount.toFixed(2)} €</Text>
          </View>

          <Text style={styles.info}>
            Ceci est une simulation de paiement. Aucune carte bancaire n'est
            requise.
          </Text>

          {error && <Text style={styles.error}>{error}</Text>}

          <Hoverable
            style={[GlobalStyles.primaryButton, styles.payButton]}
            onPress={handlePayment}
            disabled={processing}
            hoverStyle={{ opacity: 0.9, transform: [{ scale: 1.02 }] }}
          >
            {processing ? (
              <ClapLoading color="white" size={24} />
            ) : (
              <Text style={GlobalStyles.buttonText}>
                Payer {amount.toFixed(2)} €
              </Text>
            )}
          </Hoverable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  content: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 25,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  closeButton: {
    position: "absolute",
    top: 15,
    right: 15,
    padding: 5,
  },
  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.light.text,
    marginTop: 10,
  },
  details: {
    width: "100%",
    backgroundColor: Colors.light.backgroundSecondary,
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: Colors.light.text,
    marginBottom: 5,
    textAlign: "center",
  },
  amount: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.light.primary,
  },
  info: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
    fontStyle: "italic",
  },
  error: {
    color: Colors.light.danger,
    marginBottom: 15,
    textAlign: "center",
  },
  payButton: {
    width: "100%",
  },
});
