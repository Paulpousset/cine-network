/**
 * Simple event emitter for cross-component communication
 * Used to trigger Sidebar refresh when messages are marked as read
 */

type EventCallback = (data?: any) => void;

class EventEmitter {
  private listeners: Map<string, Set<EventCallback>> = new Map();

  on(event: string, callback: EventCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  emit(event: string, data?: any) {
    this.listeners.get(event)?.forEach((callback) => callback(data));
  }
}

// Global event emitter instance
export const appEvents = new EventEmitter();

// Event names
export const EVENTS = {
  MESSAGES_READ: "messages_read",
  NEW_MESSAGE: "new_message",
  SHOW_NOTIFICATION: "show_notification",
  CONNECTIONS_UPDATED: "connections_updated",
};
