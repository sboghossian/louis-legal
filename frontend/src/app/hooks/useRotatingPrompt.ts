"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "@/contexts/LocaleContext";

/**
 * useRotatingPrompt — pick a placeholder sample for the composer that
 * matches the user's current locale, and rotate it on a slow tick when
 * the input is empty. Locales we don't have curated samples for fall
 * back to a generic English list.
 *
 * Keyed by `locale` so the moment a user switches language, the
 * suggestions retune too. Samples lean on real legal tasks: drafting,
 * review, research, jurisdiction-flavored questions.
 */

const SAMPLES_BY_LOCALE: Record<string, string[]> = {
    en: [
        "Review this SPA for hidden indemnity caps and flag any unusual MAC carve-outs.",
        "Draft a mutual NDA between Acme and Globex governed by English law.",
        "Summarize the 12 most important changes between v3 and v7 of this MSA.",
        "What's the statutory notice period for terminating an employment contract in the UAE?",
        "Compare the data-protection clauses across these three vendor agreements.",
        "Extract every payment milestone from the construction contract and flag the ambiguous ones.",
        "Draft a cease-and-desist letter for trademark infringement of our brand 'Helios'.",
        "Find every clause in this lease that limits assignment and explain the practical effect.",
        "Build a redline of the supplier T&Cs against our standard playbook.",
        "Map the conditions precedent in this loan agreement to a closing checklist.",
    ],
    fr: [
        "Rédige un NDA mutuel entre Acme et Globex régi par le droit français.",
        "Compare les clauses de protection des données de ces trois contrats fournisseurs.",
        "Extrais toutes les échéances de paiement de ce contrat de construction.",
        "Quelle est la période de préavis légale pour rompre un CDI en France ?",
        "Résume les 12 changements les plus importants entre les versions v3 et v7 de ce contrat-cadre.",
    ],
    ar: [
        "اصِغ اتفاقية عدم إفصاح متبادلة بين شركتين خاضعة للقانون الإماراتي.",
        "ما هي فترة الإشعار القانونية لإنهاء عقد عمل في المملكة العربية السعودية؟",
        "استخرج كل المعالم المالية من هذا العقد وأشر إلى الغامض منها.",
        "قارن بنود حماية البيانات في هذه الاتفاقيات الثلاث مع المورّدين.",
        "اعمل تعديلًا مقترحًا (redline) على شروط المورّد مقارنةً بسياسة الشركة.",
    ],
    es: [
        "Redacta un NDA mutuo entre dos empresas regido por el derecho español.",
        "Compara las cláusulas de protección de datos de estos tres contratos con proveedores.",
        "Extrae cada hito de pago del contrato de construcción y marca los ambiguos.",
        "¿Cuál es el preaviso legal para terminar un contrato indefinido en España?",
    ],
    de: [
        "Entwirf eine gegenseitige Vertraulichkeitsvereinbarung nach deutschem Recht.",
        "Welche gesetzliche Kündigungsfrist gilt für unbefristete Arbeitsverträge in Deutschland?",
        "Vergleiche die Datenschutzklauseln dieser drei Lieferantenverträge.",
    ],
    it: [
        "Redigi un NDA reciproco tra due aziende, soggetto al diritto italiano.",
        "Estrai ogni scadenza di pagamento dal contratto di costruzione.",
        "Confronta le clausole sulla protezione dei dati nei tre contratti fornitore.",
    ],
    pt: [
        "Redija um NDA mútuo entre duas empresas regido pelo direito brasileiro.",
        "Qual é o prazo legal de aviso prévio para rescindir um contrato CLT?",
        "Compare as cláusulas de proteção de dados nos três contratos com fornecedores.",
    ],
    zh: [
        "为两家公司起草一份适用中国法律的双向保密协议。",
        "提取建筑合同中的所有付款里程碑,并标记其中含糊不清的部分。",
        "比较三份供应商合同中的数据保护条款。",
    ],
    ja: [
        "日本法準拠の相互秘密保持契約のドラフトを作成してください。",
        "建設契約からすべての支払いマイルストーンを抽出し、曖昧なものを指摘してください。",
        "3社のベンダー契約のデータ保護条項を比較してください。",
    ],
    ru: [
        "Составь взаимное соглашение о неразглашении по российскому праву.",
        "Извлеки все этапы платежей из строительного контракта и отметь спорные.",
        "Сравни положения о защите данных в этих трёх договорах с поставщиками.",
    ],
    tr: [
        "İki şirket arasında Türk hukukuna tabi karşılıklı bir gizlilik sözleşmesi taslağı hazırla.",
        "İnşaat sözleşmesindeki tüm ödeme kilometre taşlarını çıkar ve belirsiz olanları işaretle.",
        "Üç tedarikçi sözleşmesindeki veri koruma maddelerini karşılaştır.",
    ],
};

export function useRotatingPrompt({
    enabled = true,
    intervalMs = 6500,
}: {
    enabled?: boolean;
    intervalMs?: number;
} = {}): string {
    const { locale } = useLocale();
    const samples = useMemo(
        () => SAMPLES_BY_LOCALE[locale] ?? SAMPLES_BY_LOCALE.en,
        [locale],
    );
    const [index, setIndex] = useState(() => Math.floor(Math.random() * samples.length));

    useEffect(() => {
        // Reset to a random offset when the locale changes so the user
        // doesn't see the same index from a different language.
        setIndex(Math.floor(Math.random() * samples.length));
    }, [samples]);

    useEffect(() => {
        if (!enabled) return;
        if (samples.length <= 1) return;
        const t = setInterval(() => {
            setIndex((i) => (i + 1) % samples.length);
        }, intervalMs);
        return () => clearInterval(t);
    }, [enabled, samples, intervalMs]);

    return samples[index];
}
