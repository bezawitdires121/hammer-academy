export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-gray-900">
          Access Denied
        </h1>
        <p className="mt-2 text-gray-600">
          You do not have permission to view this page.
        </p>
      </div>
    </div>
  );
}