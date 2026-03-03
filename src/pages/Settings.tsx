import { FormEvent, useEffect, useState } from "react";
import { Building2, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { DEFAULT_CRM_SETTINGS, type CrmSettings } from "@/lib/crm-settings";
import { fetchCrmSettings, saveCrmSettings } from "@/lib/crm-db";

const Settings = () => {
  const [formData, setFormData] = useState<CrmSettings>(DEFAULT_CRM_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const settings = await fetchCrmSettings();
        setFormData(settings);
      } catch (error) {
        toast.error("Nao foi possivel carregar configuracoes", {
          description: error instanceof Error ? error.message : "Tente novamente.",
        });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    try {
      const payload: CrmSettings = {
        companyName: formData.companyName.trim() || DEFAULT_CRM_SETTINGS.companyName,
        commercialEmail: formData.commercialEmail.trim() || DEFAULT_CRM_SETTINGS.commercialEmail,
        adminName: formData.adminName.trim() || DEFAULT_CRM_SETTINGS.adminName,
      };

      const saved = await saveCrmSettings(payload);
      setFormData(saved);
      window.dispatchEvent(new CustomEvent("crm-settings-updated", { detail: saved }));

      toast.success("Alteracoes salvas com sucesso", {
        description: "Dados persistidos no banco de dados.",
        duration: 3000,
      });
    } catch (error) {
      toast.error("Falha ao salvar configuracoes", {
        description: error instanceof Error ? error.message : "Tente novamente.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Configuracoes</h1>
        <p className="mt-1 text-sm text-muted-foreground">Dados da operacao comercial e administracao.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5 rounded-xl bg-card p-6 shadow-card">
        <div className="flex items-center gap-4">
          <div className="gradient-primary flex h-14 w-14 items-center justify-center rounded-xl">
            <Building2 className="h-7 w-7 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-display text-lg font-semibold text-card-foreground">{formData.companyName}</h3>
            <p className="text-sm text-muted-foreground">Plano Professional - Ativo</p>
          </div>
        </div>

        <div className="space-y-4 border-t border-border pt-4">
          <div>
            <label className="text-sm font-medium text-card-foreground">Nome da empresa</label>
            <input
              type="text"
              value={formData.companyName}
              disabled={loading}
              onChange={(event) => setFormData((prev) => ({ ...prev, companyName: event.target.value }))}
              className="mt-1.5 w-full rounded-lg bg-muted px-4 py-2.5 text-sm text-foreground outline-none transition-all focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-card-foreground">E-mail comercial</label>
            <input
              type="email"
              value={formData.commercialEmail}
              disabled={loading}
              onChange={(event) => setFormData((prev) => ({ ...prev, commercialEmail: event.target.value }))}
              className="mt-1.5 w-full rounded-lg bg-muted px-4 py-2.5 text-sm text-foreground outline-none transition-all focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-card-foreground">Responsavel admin</label>
            <input
              type="text"
              value={formData.adminName}
              disabled={loading}
              onChange={(event) => setFormData((prev) => ({ ...prev, adminName: event.target.value }))}
              className="mt-1.5 w-full rounded-lg bg-muted px-4 py-2.5 text-sm text-foreground outline-none transition-all focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
            />
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <button
            type="submit"
            disabled={loading || saving}
            className="gradient-primary inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-primary-glow transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar alteracoes
          </button>
        </div>
      </form>
    </div>
  );
};

export default Settings;
