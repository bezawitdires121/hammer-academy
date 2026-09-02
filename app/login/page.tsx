"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

type LoginType =
| "ADMIN"
| "TEACHER"
| "STUDENT"
| "LIBRARIAN"
| "HEALTH";

function EyeIcon({ open }: { open: boolean }) {
return open ? ( <svg
   xmlns="http://www.w3.org/2000/svg"
   viewBox="0 0 24 24"
   fill="none"
   stroke="currentColor"
   strokeWidth="2"
   className="h-5 w-5"
 > <path d="M2.062 12.348a1 1 0 0 1 0-.696C3.51 7.228 7.5 4 12 4s8.49 3.228 9.938 7.652a1 1 0 0 1 0 .696C20.49 16.772 16.5 20 12 20s-8.49-3.228-9.938-7.652Z" /> <circle cx="12" cy="12" r="3" /> </svg>
) : ( <svg
   xmlns="http://www.w3.org/2000/svg"
   viewBox="0 0 24 24"
   fill="none"
   stroke="currentColor"
   strokeWidth="2"
   className="h-5 w-5"
 > <path d="M3 3l18 18" /> <path d="M10.584 10.587a2 2 0 0 0 2.829 2.829" /> <path d="M9.363 5.365A9.466 9.466 0 0 1 12 5c4.5 0 8.49 3.228 9.938 7.652a1 1 0 0 1 0 .696 10.15 10.15 0 0 1-4.132 5.117" /> <path d="M6.228 6.228A10.16 10.16 0 0 0 2.062 11.652a1 1 0 0 0 0 .696C3.51 16.772 7.5 20 12 20a9.46 9.46 0 0 0 2.637-.365" /> </svg>
);
}

function LoginForm() {
const [loginType, setLoginType] = useState<LoginType>("STUDENT");
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [fullName, setFullName] = useState("");
const [loginId, setLoginId] = useState("");
const [error, setError] = useState("");
const [loading, setLoading] = useState(false);
const [showPassword, setShowPassword] = useState(false);
const [showLoginId, setShowLoginId] = useState(true);

const router = useRouter();
const searchParams = useSearchParams();
const callbackUrl = searchParams.get("callbackUrl");

const isAdmin = loginType === "ADMIN";

async function handleSubmit(e: React.FormEvent) {
e.preventDefault();


setError("");
setLoading(true);

const result = await signIn("credentials", {
  loginType,
  email: isAdmin ? email : "",
  password: isAdmin ? password : "",
  fullName: isAdmin ? "" : fullName,
  loginId: isAdmin ? "" : loginId,
  redirect: false,
});

setLoading(false);

if (result?.error) {
  setError("Invalid credentials. Please check and try again.");
  return;
}

const safeDestination =
  callbackUrl && callbackUrl.startsWith("/")
    ? callbackUrl
    : "/dashboard";

router.push(safeDestination);
router.refresh();


}

const loginIdLabel =
loginType === "TEACHER"
? "Teacher Login ID"
: loginType === "STUDENT"
? "Student Login ID"
: "Employee Login ID";

const loginIdPlaceholder =
loginType === "TEACHER"
? "TCH-ABC123"
: loginType === "STUDENT"
? "LUA-5A-023"
: loginType === "LIBRARIAN"
? "LIB-ABC123"
: "HLT-ABC123";

return ( <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-brand-primary px-4 py-12">
<div
className="pointer-events-none absolute inset-0 opacity-10"
style={{
backgroundImage:
"radial-gradient(circle at 1px 1px, white 1px, transparent 1px)",
backgroundSize: "28px 28px",
}}
/>

```
  <div className="relative w-full max-w-md">
    <div className="mb-8 flex flex-col items-center text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white font-serif text-xl font-bold text-brand-primary shadow-lg">
        LUA
      </div>

      <h1 className="mt-4 text-2xl font-semibold text-white">
        Level Up Academy
      </h1>

      <p className="mt-1 text-sm text-white/60">
        Portal Login
      </p>

      <a
        href="/"
        className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white/70 transition hover:bg-white/20"
      >
        ← Back to website
      </a>
    </div>

    <div className="rounded-2xl border border-white/10 bg-white p-8 shadow-xl">
      <div className="mb-6 grid grid-cols-5 gap-1 rounded-lg bg-gray-100 p-1">
        {(
          [
            "STUDENT",
            "TEACHER",
            "ADMIN",
            "LIBRARIAN",
            "HEALTH",
          ] as LoginType[]
        ).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => {
              setLoginType(type);
              setError("");
              setEmail("");
              setPassword("");
              setFullName("");
              setLoginId("");
              setShowPassword(false);
              setShowLoginId(true);
            }}
            className={`rounded-md py-1.5 text-xs font-medium transition ${
              loginType === type
                ? "bg-brand-primary text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {type.charAt(0) + type.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-brand-danger">
            {error}
          </p>
        )}

        {isAdmin ? (
          <>
            {/* ADMIN EMAIL */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Email
              </label>

              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/10"
              />
            </div>

            {/* ADMIN PASSWORD */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Password
              </label>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 pr-12 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/10"
                />

                <button
                  type="button"
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  onClick={() =>
                    setShowPassword((s) => !s)
                  }
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* FULL NAME */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Full Name
              </label>

              <input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/10"
              />
            </div>

            {/* LOGIN ID */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                {loginIdLabel}
              </label>

              <div className="relative">
                <input
                  required
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  placeholder={loginIdPlaceholder}
                  type={showLoginId ? "text" : "password"}
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 pr-12 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/10"
                />

                <button
                  type="button"
                  aria-label={
                    showLoginId
                      ? "Hide login ID"
                      : "Show login ID"
                  }
                  onClick={() =>
                    setShowLoginId((s) => !s)
                  }
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
                >
                  <EyeIcon open={showLoginId} />
                </button>
              </div>
            </div>
          </>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-brand-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-primary-hover disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </div>
  </div>
</div>


);
}

export default function LoginPage() {
return (
<Suspense
fallback={ <div className="flex min-h-screen items-center justify-center bg-brand-primary text-white">
Loading... </div>
}
> <LoginForm /> </Suspense>
);
}
