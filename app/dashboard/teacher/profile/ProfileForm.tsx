"use client";

import { useState, useTransition } from "react";
import { changeTeacherPassword, updateTeacherProfile, saveTeacherSignature } from "./actions";
import SignaturePad from "@/components/SignaturePad";

type ProfileData = {
  fullName: string;
  email: string;
  phone: string;
  photoUrl: string | null;
  signatureUrl: string | null;
};

export default function ProfileForm({ profile }: { profile: ProfileData }) {
  const [fullName, setFullName] = useState(profile.fullName);
  const [phone, setPhone] = useState(profile.phone);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState(profile.photoUrl);

  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const [sigError, setSigError] = useState("");
  const [sigSuccess, setSigSuccess] = useState(false);
  const [sigUrl, setSigUrl] = useState(profile.signatureUrl);
  const [isProfilePending, startProfileTransition] = useTransition();
  const [isPasswordPending, startPasswordTransition] = useTransition();
  const [isSigPending, startSigTransition] = useTransition();

  function handlePhotoChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setProfileError("Photo must be an image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setProfileError("Photo must be under 5MB.");
      return;
    }

    setProfileError("");
    setProfileSuccess(false);
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  }

  function handleProfileSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setProfileError("");
    setProfileSuccess(false);

    const formData = new FormData();

    formData.set("fullName", fullName);
    formData.set("phone", phone);

    if (photo) {
      formData.set("photo", photo);
    }

    startProfileTransition(async () => {
      const result = await updateTeacherProfile(formData);

      if (result?.error) {
        setProfileError(result.error);
        return;
      }

      setProfileSuccess(true);
      setPhoto(null);
    });
  }

  function handleSignatureSave(blob: Blob) {
    setSigError("");
    setSigSuccess(false);
    const fd = new FormData();
    fd.set("signature", new File([blob], "signature.png", { type: "image/png" }));
    startSigTransition(async () => {
      const res = await saveTeacherSignature(fd);
      if (res?.error) { setSigError(res.error); return; }
      setSigSuccess(true);
      if (res.url) setSigUrl(res.url);
    });
  }

  function handlePasswordSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setPasswordError("");
    setPasswordSuccess(false);

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    const formData = new FormData();

    formData.set("currentPassword", currentPassword);
    formData.set("newPassword", newPassword);
    formData.set("confirmPassword", confirmPassword);

    startPasswordTransition(async () => {
      const result = await changeTeacherPassword(formData);

      if (result?.error) {
        setPasswordError(result.error);
        return;
      }

      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    });
  }

  return (
    <div className="space-y-6">
      {/* Profile */}
      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-5">
          <h2 className="text-lg font-semibold text-gray-900">
            Profile
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Update your personal information.
          </p>
        </div>

        <form
          onSubmit={handleProfileSubmit}
          className="space-y-6 p-6"
        >
          {profileError && (
            <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {profileError}
            </div>
          )}

          {profileSuccess && (
            <div className="rounded-lg border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">
              Profile updated successfully.
            </div>
          )}

          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-2 border-brand-accent/30 bg-brand-primary">
              {preview ? (
                <img
                  src={preview}
                  alt={fullName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-white">
                  {fullName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div>
              <label className="inline-flex cursor-pointer rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Change photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </label>

              <p className="mt-2 text-xs text-gray-400">
                JPG, PNG or other image. Maximum 5MB.
              </p>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Full Name
              </label>

              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Email
              </label>

              <input
                value={profile.email}
                disabled
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-500"
              />

              <p className="mt-1 text-xs text-gray-400">
                Email cannot be changed here.
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Phone
              </label>

              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="09XXXXXXXX"
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Role
              </label>

              <input
                value="Teacher"
                disabled
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-500"
              />
            </div>
          </div>

          <button
            disabled={isProfilePending}
            className="rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isProfilePending ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </section>

      {/* Signature */}
      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-5">
          <h2 className="text-lg font-semibold text-gray-900">Signature</h2>
          <p className="mt-1 text-sm text-gray-500">Used on printed documents and reports.</p>
        </div>
        <div className="p-6">
          {sigError && (
            <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{sigError}</div>
          )}
          {sigSuccess && (
            <div className="mb-4 rounded-lg border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">Signature saved.</div>
          )}
          <SignaturePad onSave={handleSignatureSave} existingUrl={sigUrl} isPending={isSigPending} />
        </div>
      </section>

      {/* Password */}
      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-5">
          <h2 className="text-lg font-semibold text-gray-900">
            Password
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Change your account password.
          </p>
        </div>

        <form
          onSubmit={handlePasswordSubmit}
          className="space-y-5 p-6"
        >
          {passwordError && (
            <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {passwordError}
            </div>
          )}

          {passwordSuccess && (
            <div className="rounded-lg border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">
              Password changed successfully.
            </div>
          )}

          <PasswordInput
            label="Current Password"
            value={currentPassword}
            onChange={setCurrentPassword}
            visible={showCurrent}
            onToggle={() => setShowCurrent((v) => !v)}
          />

          <PasswordInput
            label="New Password"
            value={newPassword}
            onChange={setNewPassword}
            visible={showNew}
            onToggle={() => setShowNew((v) => !v)}
          />

          <PasswordInput
            label="Confirm New Password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            visible={showConfirm}
            onToggle={() => setShowConfirm((v) => !v)}
          />

          <button
            disabled={isPasswordPending}
            className="rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPasswordPending ? "Changing..." : "Change Password"}
          </button>
        </form>
      </section>
    </div>
  );
}

function PasswordInput({
  label,
  value,
  onChange,
  visible,
  onToggle,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}
      </label>

      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          minLength={8}
          className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 pr-11 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10"
        />

        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? (
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 3l18 18M10.58 10.58a2 2 0 102.83 2.83M9.88 4.24A10.05 10.05 0 0112 4c5 0 9.27 3.11 10.5 8a10.8 10.8 0 01-4.1 5.68M6.61 6.61A10.8 10.8 0 003.5 12c.54 2.1 1.78 3.87 3.5 5.1"
              />
            </svg>
          ) : (
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"
              />
              <circle cx="12" cy="12" r="2.5" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}