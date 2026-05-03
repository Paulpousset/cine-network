import React, { createContext, ReactNode, useCallback, useContext, useState } from 'react';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';

interface ModalConfig {
  visible: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
  onSave?: () => void;
  confirmLabel?: string;
  isDestructive?: boolean;
}

interface ModalContextType {
  showAlert: (config: Omit<ModalConfig, 'visible'>) => void;
  hideAlert: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider = ({ children }: { children: ReactNode }) => {
  const [modalConfig, setModalConfig] = useState<ModalConfig>({
    visible: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const showAlert = useCallback((config: Omit<ModalConfig, 'visible'>) => {
    setModalConfig({ ...config, visible: true });
  }, []);

  const hideAlert = useCallback(() => {
    setModalConfig((prev) => ({ ...prev, visible: false }));
    if (modalConfig.onCancel) {
      modalConfig.onCancel();
    }
  }, [modalConfig]);

  const handleConfirm = useCallback(() => {
    setModalConfig((prev) => ({ ...prev, visible: false }));
    modalConfig.onConfirm();
  }, [modalConfig]);

  const handleSave = useCallback(() => {
    if (modalConfig.onSave) {
      setModalConfig((prev) => ({ ...prev, visible: false }));
      modalConfig.onSave();
    }
  }, [modalConfig]);

  return (
    <ModalContext.Provider value={{ showAlert, hideAlert }}>
      {children}
      <ConfirmationModal
        visible={modalConfig.visible}
        title={modalConfig.title}
        message={modalConfig.message}
        onConfirm={handleConfirm}
        onCancel={hideAlert}
        onSave={modalConfig.onSave ? handleSave : undefined}
        confirmLabel={modalConfig.confirmLabel}
        isDestructive={modalConfig.isDestructive}
      />
    </ModalContext.Provider>
  );
};

export const useAlert = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useAlert must be used within a ModalProvider');
  }
  return context;
};
