import { getSchoolSettings } from "./actions";
import SettingsForm from "./SettingsForm";

export default async function AdminSettingsPage() {
  const settings = await getSchoolSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-brand-primary">Settings</h1>
        <p className="text-sm text-gray-500">Manage school information used across the system and on printed documents.</p>
      </div>

      <SettingsForm settings={settings} />
    </div>
  );
}
