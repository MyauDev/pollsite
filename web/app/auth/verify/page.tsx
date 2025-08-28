// app/auth/verify/page.tsx
import { Suspense } from "react";
import VerifyClient from "./verify-client";

export const dynamic = "force-dynamic"; // убираем SSG для надёжности

export default function Page() {
  return (
    <Suspense fallback={<div />}>
      <VerifyClient />
    </Suspense>
  );
}