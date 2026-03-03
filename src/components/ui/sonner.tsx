import { useTheme } from "next-themes";
import { Toaster as Sonner, toast as sonnerToast, type ExternalToast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;
type NotificationType = "success" | "error" | "info" | "warning";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  createdAt: string;
  read: boolean;
}

const STORAGE_KEY = "crm-notifications-v1";
export const NOTIFICATION_EVENT = "crm-notification-updated";

const isBrowser = () => typeof window !== "undefined";

const toText = (value: unknown) => {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
};

const readNotifications = (): AppNotification[] => {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AppNotification[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeNotifications = (notifications: AppNotification[]) => {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  window.dispatchEvent(new CustomEvent(NOTIFICATION_EVENT));
};

const pushNotification = (type: NotificationType, title: unknown, options?: ExternalToast) => {
  const titleText = toText(title).trim();
  if (!titleText) return;

  const notification: AppNotification = {
    id: crypto.randomUUID(),
    type,
    title: titleText,
    description: toText(options?.description).trim(),
    createdAt: new Date().toISOString(),
    read: false,
  };

  const existing = readNotifications();
  writeNotifications([notification, ...existing].slice(0, 120));
};

const withNotification =
  (type: NotificationType, fn: (message: unknown, options?: ExternalToast) => string | number) =>
  (message: unknown, options?: ExternalToast) => {
    pushNotification(type, message, options);
    return fn(message, options);
  };

const baseToast = ((message: unknown, options?: ExternalToast) => {
  pushNotification("info", message, options);
  return sonnerToast(message, options);
}) as typeof sonnerToast;

export const toast = Object.assign(baseToast, {
  success: withNotification("success", sonnerToast.success),
  error: withNotification("error", sonnerToast.error),
  info: withNotification("info", sonnerToast.info),
  warning: withNotification("warning", sonnerToast.warning),
  message: withNotification("info", sonnerToast.message),
  loading: sonnerToast.loading,
  promise: sonnerToast.promise,
  custom: sonnerToast.custom,
  dismiss: sonnerToast.dismiss,
});

export const getStoredNotifications = () => readNotifications();

export const markAllNotificationsAsRead = () => {
  const notifications = readNotifications();
  if (notifications.length === 0) return;
  writeNotifications(notifications.map((item) => ({ ...item, read: true })));
};

export const clearNotifications = () => {
  writeNotifications([]);
};

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
