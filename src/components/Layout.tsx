import { ReactNode, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Bell,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  House,
  Kanban,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Monitor,
  Moon,
  Search,
  Settings,
  SlidersHorizontal,
  Sun,
  TrendingUp,
  UserRound,
  Users,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { DEFAULT_CRM_SETTINGS, type CrmSettings } from "@/lib/crm-settings";
import { fetchCrmSettings } from "@/lib/crm-db";
import { hasSupabaseConfig } from "@/lib/supabase";
import {
  clearNotifications,
  getStoredNotifications,
  markAllNotificationsAsRead,
  NOTIFICATION_EVENT,
  toast,
  type AppNotification,
} from "@/components/ui/sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface LayoutProps {
  children: ReactNode;
}

type ThemeMode = "light" | "dark" | "system";

const navItems: Array<{
  icon: typeof House;
  label: string;
  path: string;
  exact?: boolean;
}> = [
  { icon: House, label: "Início", path: "/", exact: true },
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Users, label: "Clientes", path: "/clientes" },
  { icon: Kanban, label: "Funil de vendas", path: "/pipeline" },
  { icon: CalendarCheck, label: "Atividades", path: "/atividades" },
  { icon: BarChart3, label: "Análises", path: "/analises" },
  { icon: TrendingUp, label: "Melhorias", path: "/melhorias" },
  { icon: Settings, label: "Configurações", path: "/configuracoes" },
];

const notificationTone: Record<AppNotification["type"], string> = {
  success: "bg-success/15 text-success",
  error: "bg-destructive/15 text-destructive",
  info: "bg-info/15 text-info",
  warning: "bg-warning/15 text-warning",
};

const notificationLabel: Record<AppNotification["type"], string> = {
  success: "Sucesso",
  error: "Erro",
  info: "Informação",
  warning: "Alerta",
};

const formatNotificationDate = (isoDate: string) => {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const Layout = ({ children }: LayoutProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const [crmSettings, setCrmSettings] = useState(DEFAULT_CRM_SETTINGS);
  const [mounted, setMounted] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!hasSupabaseConfig) {
      toast.error("Configuração do banco ausente", {
        description:
          "Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (ou VITE_SUPABASE_PUBLISHABLE_KEY) na Vercel para carregar os dados.",
        duration: 7000,
      });
    }
  }, []);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await fetchCrmSettings();
        setCrmSettings(settings);
      } catch {
        setCrmSettings(DEFAULT_CRM_SETTINGS);
      }
    };

    const handleSettingsUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<CrmSettings>;
      if (customEvent.detail) {
        setCrmSettings(customEvent.detail);
      } else {
        loadSettings();
      }
    };

    loadSettings();
    window.addEventListener("crm-settings-updated", handleSettingsUpdated as EventListener);

    return () => {
      window.removeEventListener("crm-settings-updated", handleSettingsUpdated as EventListener);
    };
  }, []);

  useEffect(() => {
    const syncNotifications = () => {
      setNotifications(getStoredNotifications());
    };

    syncNotifications();
    window.addEventListener(NOTIFICATION_EVENT, syncNotifications as EventListener);
    return () => {
      window.removeEventListener(NOTIFICATION_EVENT, syncNotifications as EventListener);
    };
  }, []);

  useEffect(() => {
    document.title = crmSettings.companyName || "CRM Vendas";
  }, [crmSettings.companyName]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const selectedTheme: ThemeMode = mounted && theme ? (theme as ThemeMode) : "system";
  const currentPath = useMemo(() => location.pathname, [location.pathname]);
  const unreadCount = useMemo(() => notifications.filter((item) => !item.read).length, [notifications]);
  const recentNotifications = useMemo(() => notifications.slice(0, 12), [notifications]);

  const onChangeTheme = (value: ThemeMode) => {
    setTheme(value);
    const label = value === "light" ? "claro" : value === "dark" ? "escuro" : "sistema";
    toast.success(`Tema alterado para ${label}`);
  };

  const onOpenNotificationMenu = (open: boolean) => {
    if (!open) return;
    markAllNotificationsAsRead();
    setNotifications(getStoredNotifications());
  };

  const onClearNotifications = () => {
    clearNotifications();
    setNotifications([]);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <aside
        className={cn(
          "relative flex flex-col bg-sidebar text-sidebar-foreground transition-all duration-300",
          collapsed ? "w-[74px]" : "w-[280px]"
        )}
      >
        <Link to="/" className="flex h-16 items-center gap-3 border-b border-sidebar-border px-5">
          <div className="h-9 w-9 overflow-hidden rounded-lg border border-sidebar-border/50 bg-sidebar-accent flex-shrink-0">
            <img src="/icon-CRM-vendas.png" alt="CRM Vendas" className="h-full w-full object-cover" />
          </div>
          {!collapsed && (
            <div className="min-w-0 animate-soft-in">
              <p className="truncate font-display text-sm font-bold tracking-wide text-sidebar-primary-foreground">
                {crmSettings.companyName}
              </p>
              <p className="truncate text-[11px] text-sidebar-foreground">Pipeline comercial</p>
            </div>
          )}
        </Link>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item, index) => {
            const isActive = item.exact ? currentPath === item.path : currentPath.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{ animationDelay: `${index * 35}ms` }}
                className={cn(
                  "motion-surface animate-soft-in flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-primary-glow"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={() => setCollapsed((prev) => !prev)}
          className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-card transition-colors hover:text-foreground"
          aria-label={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>

        <div className="border-t border-sidebar-border p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "motion-surface flex w-full items-center gap-3 rounded-lg border border-transparent px-1.5 py-1.5 text-left hover:border-sidebar-border hover:bg-sidebar-accent/80",
                  collapsed && "justify-center"
                )}
              >
                <div className="h-9 w-9 overflow-hidden rounded-full border border-sidebar-border bg-sidebar-accent flex-shrink-0">
                  <img src="/luiz-felipe-pacifico.png" alt={crmSettings.adminName} className="h-full w-full object-cover" />
                </div>
                {!collapsed && (
                  <>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-sidebar-accent-foreground">{crmSettings.adminName}</p>
                      <p className="truncate text-xs text-sidebar-foreground">Administrador</p>
                    </div>
                    <ChevronsUpDown className="h-4 w-4 text-sidebar-foreground" />
                  </>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side={collapsed ? "right" : "top"}
              align={collapsed ? "center" : "start"}
              className="w-56"
            >
              <DropdownMenuLabel>Perfil</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => navigate("/melhorias")}>
                  <UserRound className="mr-2 h-4 w-4" />
                  Minha conta
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/feedback")}>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Feedback
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/configuracoes")}>
                  <SlidersHorizontal className="mr-2 h-4 w-4" />
                  Preferências
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCollapsed((value) => !value)}>
                  {collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => toast.success("Sessão encerrada (demo)")}>
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-border bg-card/95 px-6 backdrop-blur">
          <div className="motion-surface flex w-80 items-center gap-3 rounded-lg bg-muted px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar empresas, contatos e negócios..."
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="motion-surface rounded-lg p-2 transition-colors hover:bg-muted"
                  aria-label="Selecionar tema"
                  title="Selecionar tema"
                >
                  {selectedTheme === "light" && <Sun className="h-5 w-5 text-muted-foreground" />}
                  {selectedTheme === "dark" && <Moon className="h-5 w-5 text-muted-foreground" />}
                  {selectedTheme === "system" && <Monitor className="h-5 w-5 text-muted-foreground" />}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Tema</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={selectedTheme} onValueChange={(value) => onChangeTheme(value as ThemeMode)}>
                  <DropdownMenuRadioItem value="light">Claro</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="dark">Escuro</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="system">Sistema (automático)</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu onOpenChange={onOpenNotificationMenu}>
              <DropdownMenuTrigger asChild>
                <button
                  className="motion-surface relative rounded-lg p-2 transition-colors hover:bg-muted"
                  aria-label="Notificações"
                  title="Notificações"
                >
                  <Bell className="h-5 w-5 text-muted-foreground" />
                  {unreadCount > 0 ? (
                    <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-semibold text-destructive-foreground">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  ) : (
                    <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent" />
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-96">
                <div className="flex items-center justify-between px-2 pb-1">
                  <DropdownMenuLabel className="p-0">Notificações</DropdownMenuLabel>
                  <button
                    type="button"
                    onClick={onClearNotifications}
                    className="rounded px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    Limpar
                  </button>
                </div>
                <DropdownMenuSeparator />
                <div className="max-h-96 space-y-2 overflow-y-auto px-1 py-1">
                  {recentNotifications.length === 0 && (
                    <p className="rounded-md px-2 py-4 text-center text-sm text-muted-foreground">Nenhuma notificação registrada.</p>
                  )}
                  {recentNotifications.map((notification) => (
                    <article key={notification.id} className="rounded-md border border-border bg-background px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", notificationTone[notification.type])}>
                          {notificationLabel[notification.type]}
                        </span>
                        <span className="text-[11px] text-muted-foreground">{formatNotificationDate(notification.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-sm font-medium text-foreground">{notification.title}</p>
                      {notification.description && <p className="mt-0.5 text-xs text-muted-foreground">{notification.description}</p>}
                    </article>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6 animate-soft-in">{children}</main>
      </div>
    </div>
  );
};

export default Layout;
