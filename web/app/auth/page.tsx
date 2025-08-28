// app/auth/page.tsx
import { Suspense } from "react";
import AuthRequestClient from "./request-client";

export const dynamic = "force-dynamic"; // чтобы Next не пытался пререндерить

export default function Page() {
  return (
    <Suspense fallback={<div />}>
      <AuthRequestClient />
    </Suspense>
  );
}