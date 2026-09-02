"use client";

import { useState } from "react";
import { submitTeacherApplication } from "./actions";

export default function TeacherApplyPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const [requestedRole, setRequestedRole] =
    useState("TEACHER");

  const [libraryLevel, setLibraryLevel] =
    useState<string | null>(null);

  function handlePhotoChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please upload a valid image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Photo must be under 5MB.");
      return;
    }

    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    setError("");
  }

  function validateForm() {
    if (!fullName.trim()) {
      return "Please enter your full name.";
    }

    if (!email.trim()) {
      return "Please enter your email.";
    }

    if (!phone.trim()) {
      return "Please enter your phone number.";
    }

    if (!photo) {
      return "Please upload your photo.";
    }

    if (
      requestedRole === "LIBRARIAN" &&
      !libraryLevel
    ) {
      return "Please select your library level.";
    }

    return "";
  }

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setError("");

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setIsPending(true);

    try {
      const formData = new FormData();

      formData.set(
        "fullName",
        fullName.trim()
      );

      formData.set(
        "email",
        email.trim()
      );

      formData.set(
        "phone",
        phone.trim()
      );

      formData.set(
        "requestedRole",
        requestedRole
      );

      if (
        requestedRole === "LIBRARIAN" &&
        libraryLevel
      ) {
        formData.set(
          "clubType",
          libraryLevel
        );
      }

      if (photo) {
        formData.set("photo", photo);
      }

      const result =
        await submitTeacherApplication(formData);

      if (result?.error) {
        setError(result.error);
        return;
      }

      setSuccess(true);
    } catch {
      setError(
        "Something went wrong. Please try again."
      );
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f9fb]">
      {/* HERO */}
      <div className="relative overflow-hidden bg-[#0f2a47] py-14 text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />

        <div className="relative mx-auto max-w-2xl px-6 text-center">
          <a
            href="/"
            className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white/70 transition hover:bg-white/20"
          >
            ← Back to website
          </a>

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-white/10 text-xl font-black text-white shadow-lg">
            LUA
          </div>

          <h1 className="mt-4 text-3xl font-black text-white">
            Staff Application
          </h1>

          <p className="mt-2 text-sm text-white/60">
            Apply to join the Level UP Academy team.
            All applications are reviewed by the
            school administration.
          </p>
        </div>
      </div>

      {/* CONTENT */}
      <div className="mx-auto max-w-md px-6 py-12">
        {success ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
              <svg
                className="h-7 w-7 text-green-700"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 12.75l6 6 9-13.5"
                />
              </svg>
            </div>

            <h2 className="text-xl font-semibold text-gray-900">
              Application Submitted
            </h2>

            <p className="mt-2 text-sm leading-relaxed text-gray-500">
              Your application has been submitted
              successfully.
            </p>

            <div className="mt-5 rounded-lg bg-gray-50 px-4 py-4 text-left text-sm text-gray-600">
              <p>
                Your application is now waiting for
                admin review.
              </p>

              <p className="mt-3">
                If your application is accepted, the
                system will automatically create your
                staff account and generate your unique
                Login ID.
              </p>

              <p className="mt-3 font-medium text-[#0f2a47]">
                You will log in using your Full Name
                and the Login ID provided by the
                school.
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div>
              <h2 className="text-xl font-black text-[#0f2a47]">
                Your Application
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Fill in your details below. Your
                application will be reviewed by the
                school administration.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="mt-7 space-y-5"
            >
              {/* ERROR */}
              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-3 text-sm text-red-700">
                  <svg
                    className="mt-0.5 h-5 w-5 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10A8 8 0 112 10a8 8 0 0116 0zm-7-4a1 1 0 10-2 0 1 1 0 002 0zM9 9a1 1 0 000 2v3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>

                  <span>{error}</span>
                </div>
              )}

              {/* PHOTO */}
              <div className="flex flex-col items-center gap-3 border-b border-gray-100 pb-5">
                <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-gray-300 bg-gray-50">
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt="Photo preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <svg
                      className="h-8 w-8 text-gray-300"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 01-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
                      />
                    </svg>
                  )}
                </div>

                <label className="cursor-pointer text-sm font-medium text-[#0f2a47] underline underline-offset-4 hover:text-[#1b4b75]">
                  {photo
                    ? "Change photo"
                    : "Upload your photo"}

                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>

                <p className="text-xs text-gray-400">
                  JPG, PNG or other image · Maximum 5MB
                </p>
              </div>

              {/* FULL NAME */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Full Name
                </label>

                <input
                  required
                  value={fullName}
                  onChange={(e) =>
                    setFullName(e.target.value)
                  }
                  placeholder="e.g. Dawit Alemu Belay"
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#0f2a47] focus:outline-none focus:ring-2 focus:ring-[#0f2a47]/10"
                />
              </div>

              {/* EMAIL */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Email
                </label>

                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#0f2a47] focus:outline-none focus:ring-2 focus:ring-[#0f2a47]/10"
                />
              </div>

              {/* PHONE */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Phone Number
                </label>

                <input
                  required
                  value={phone}
                  onChange={(e) =>
                    setPhone(e.target.value)
                  }
                  placeholder="09XXXXXXXX"
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#0f2a47] focus:outline-none focus:ring-2 focus:ring-[#0f2a47]/10"
                />
              </div>

              {/* ROLE */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Applying For
                </label>

                <select
                  value={requestedRole}
                  onChange={(e) => {
                    setRequestedRole(
                      e.target.value
                    );

                    if (
                      e.target.value !==
                      "LIBRARIAN"
                    ) {
                      setLibraryLevel(null);
                    }
                  }}
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 focus:border-[#0f2a47] focus:outline-none focus:ring-2 focus:ring-[#0f2a47]/10"
                >
                  <option value="TEACHER">
                    Teacher
                  </option>

                  <option value="LIBRARIAN">
                    Librarian
                  </option>

                  <option value="HEALTH">
                    Health Staff
                  </option>

                  <option value="CLEANER">
                    Cleaner
                  </option>

                  <option value="SECURITY">
                    Security
                  </option>

                  <option value="SECRETARY">
                    Secretary
                  </option>

                  <option value="OTHER">
                    Other
                  </option>
                </select>

                {/* LIBRARY LEVEL */}
                {requestedRole ===
                  "LIBRARIAN" && (
                  <div className="mt-3">
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Library Level
                    </label>

                    <select
                      value={
                        libraryLevel ?? ""
                      }
                      onChange={(e) =>
                        setLibraryLevel(
                          e.target.value ||
                            null
                        )
                      }
                      className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm"
                    >
                      <option value="">
                        -- Select Level --
                      </option>

                      <option value="KG 1-4">
                        KG 1-4
                      </option>

                      <option value="5-8">
                        Grades 5-8
                      </option>

                      <option value="9-12">
                        Grades 9-12
                      </option>

                      <option value="ALL">
                        All Grades
                      </option>
                    </select>
                  </div>
                )}
              </div>

              {/* LOGIN INFORMATION */}
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                <div className="flex gap-3">
                  <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-[#0f2a47]">
                    i
                  </div>

                  <div>
                    

                

                    <p className="mt-2 text-xs leading-relaxed text-gray-600">
                      If the administrator accepts
                      your application, Level UP
                      Academy will automatically
                      create your staff account and
                      generate a unique Login ID.
                    </p>

                    <p className="mt-2 text-xs font-medium leading-relaxed text-[#0f2a47]">
                      You will log in with your Full
                      Name and your generated Login
                      ID.
                    </p>
                  </div>
                </div>
              </div>

              {/* SUBMIT */}
              <button
                type="submit"
                disabled={isPending}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0f2a47] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#163d61] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? (
                  "Submitting..."
                ) : (
                  <>
                    Submit Application

                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3"
                      />
                    </svg>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}