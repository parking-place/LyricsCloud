import Link from "next/link";
import type { ReactNode } from "react";
import { Brand } from "./auth-screen.js";

export function LegalPage({ title, children }: { title: string; children: ReactNode }) { return <main className="legal-page"><Brand /><article><p className="eyebrow">정책 버전 2026-09-04</p><h1>{title}</h1>{children}<Link className="back-link" href="/auth">로그인 화면으로 돌아가기</Link></article></main>; }
