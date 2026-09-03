"use client";

import { useState, useTransition } from "react";
import { updateSchoolSettings, saveAdminSignature } from "./actions";
import SignaturePad from "@/components/SignaturePad";

type Settings = {
  schoolName: string;
  schoolNameEnglish: string;
  address: string;
  phone: string;
  fax: string;
  email: string;
  directorName: string;
  logoUrl: string | null;
  stampUrl: string | null;
  directorSignatureUrl: string | null;
};

export default function SettingsForm({ settings }: { settings: Settings }) {
  const [schoolName, setSchoolName] = useState(settings.schoolName);
  const [schoolNameEnglish, setSchoolNameEnglish] = useState(settings.schoolNameEnglish ?? "");
  const [address, setAddress] = useState(settings.address);
  const [phone, setPhone] = useState(settings.phone);
  const [fax, setFax] = useState(settings.fax ?? "");
  const [email, setEmail] = useState(settings.email);
  const [directorName, setDirectorName] = useState(settings.directorName);
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState(settings.logoUrl);
  const [stamp, setStamp] = useState<File | null>(null);
  const [stampPreview, setStampPreview] = useState(settings.stampUrl);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [sigError, setSigError] = useState("");
  const [sigSuccess, setSigSuccess] = useState(false);
  const [sigUrl, setSigUrl] = useState(settings.directorSignatureUrl);
  const [isPending, startTransition] = useTransition();
  const [isSigPending, startSigTransition] = useTransition();

  function handleFile(
    e: React.ChangeEvent<HTMLInputElement>,
    setFile: (f: File) => void,
    setPreview: (u: string) => void
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFile(file);
    setPreview(URL.createObjectURL(file));
  }

  function handleSignatureSave(blob: Blob) {
    setSigError("");
    setSigSuccess(false);
    const fd = new FormData();
    fd.set("signature", new File([blob], "signature.png", { type: "image/png" }));
    startSigTransition(async () => {
      const res = await saveAdminSignature(fd);
      if (res?.error) { setSigError(res.error); return; }
      setSigSuccess(true);
      if (res.url) setSigUrl(res.url);
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    const fd = new FormData();
    fd.set("schoolName", schoolName);
    fd.set("schoolNameEnglish", schoolNameEnglish);
    fd.set("address", address);
    fd.set("phone", phone);
    fd.set("fax", fax);
    fd.set("email", email);
    fd.set("directorName", directorName);
    if (logo) fd.set("logo", logo);
    if (stamp) fd.set("stamp", stamp);
    startTransition(async () => {
      const res = await updateSchoolSettings(fd);
      if (res?.error) { setError(res.error); return; }
      setSuccess(true);
      setLogo(null);
      setStamp(null);
    });
  }

  return (
    <div className="space-y-6">
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="rounded-lg border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">Settings saved successfully.</div>
      )}

      {/* School Info */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 space-y-5">
        <div>
          <h2 className="font-semibold text-gray-900">School Information</h2>
          <p className="mt-1 text-sm text-gray-500">Used on all printed documents and certificates.</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">School Name (Amharic)</label>
            <input
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              placeholder="ሌቭል አፕ ኢንተርናሽናል ኃላፊነቱ የተወሰነ የግል ማህበር"
              required
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">School Name (English)</label>
            <input
              value={schoolNameEnglish}
              onChange={(e) => setSchoolNameEnglish(e.target.value)}
              placeholder="LEVEL UP INTERNATIONAL P.L.C. A.D.M No. 1"
              required
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Director Name</label>
            <input
              value={directorName}
              onChange={(e) => setDirectorName(e.target.value)}
              placeholder="Full name of school director"
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Phone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="09XXXXXXXX"
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Fax</label>
            <input
              value={fax}
              onChange={(e) => setFax(e.target.value)}
              placeholder="(058) 220 25 50"
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="school@example.com"
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Address</label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street, City, Ethiopia"
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10"
            />
          </div>
        </div>
      </section>

      {/* Branding */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 space-y-5">
        <div>
          <h2 className="font-semibold text-gray-900">Branding</h2>
          <p className="mt-1 text-sm text-gray-500">Logo and stamp appear on printed documents. Max 2MB each.</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <ImageUpload
            label="School Logo"
            preview={logoPreview}
            onChange={(e) => handleFile(e, setLogo, setLogoPreview)}
          />
          <ImageUpload
            label="Official Stamp"
            preview={stampPreview}
            onChange={(e) => handleFile(e, setStamp, setStampPreview)}
          />
        </div>
      </section>

      <button
        disabled={isPending}
        className="rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Saving..." : "Save Settings"}
      </button>
    </form>

    {/* Director Signature */}
    <section className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
      <div>
        <h2 className="font-semibold text-gray-900">Director Signature</h2>
        <p className="mt-1 text-sm text-gray-500">Appears on certificates and official documents.</p>
      </div>
      {sigError && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{sigError}</div>
      )}
      {sigSuccess && (
        <div className="rounded-lg border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">Signature saved.</div>
      )}
      <SignaturePad onSave={handleSignatureSave} existingUrl={sigUrl} isPending={isSigPending} />
    </section>
    </div>
  );
}

function ImageUpload({
  label,
  preview,
  onChange,
}: {
  label: string;
  preview: string | null;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex items-center gap-4">
        <div className="h-20 w-20 shrink-0 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
          {preview ? (
            <img src={preview} alt={label} className="h-full w-full object-contain p-1" />
          ) : (
            <span className="text-xs text-gray-400">No image</span>
          )}
        </div>
        <label className="inline-flex cursor-pointer rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Upload
          <input type="file" accept="image/*" onChange={onChange} className="hidden" />
        </label>
      </div>
    </div>
  );
}
