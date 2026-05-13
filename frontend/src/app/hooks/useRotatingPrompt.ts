"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "@/contexts/LocaleContext";

/**
 * useRotatingPrompt — pick a placeholder sample for the composer that
 * matches the user's current locale (and, where we have them, the
 * user's primary jurisdiction), rotating on a slow tick when the input
 * is empty.
 *
 * Decision #53: rotating sample prompts should match the user's
 * jurisdiction. We layer that on top of locale by sorting samples that
 * mention the user's jurisdiction in the sample text to the front of
 * the queue. Falls back to the generic locale samples (or English)
 * when nothing matches.
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

// Jurisdiction tokens that, if present in a sample, mark it as
// jurisdiction-relevant for that selector. Keyed loosely so a profile
// jurisdiction of "UAE" / "DIFC" / "ADGM" / "Dubai" all hit the same
// UAE-flavoured samples without needing per-jurisdiction sample lists.
const JURISDICTION_TOKENS: Record<string, RegExp> = {
    UAE: /\b(UAE|DIFC|ADGM|Dubai|Emirat)\b/i,
    KSA: /\b(KSA|Saudi)\b/i,
    Bahrain: /\bBahrain\b/i,
    Qatar: /\bQatar\b/i,
    Oman: /\bOman\b/i,
    Kuwait: /\bKuwait\b/i,
    Egypt: /\bEgypt\b/i,
    Lebanon: /\bLebanon\b/i,
    France: /\b(France|français|french)\b/i,
    UK: /\b(UK|English law|United Kingdom)\b/i,
    EU: /\b(EU|European)\b/i,
    Germany: /\b(Germany|german|deutsch)\b/i,
    Spain: /\b(Spain|spanish|españ)\b/i,
    Italy: /\b(Italy|italian|italiano)\b/i,
    Brazil: /\b(Brazil|brazilian|brasil)\b/i,
    China: /\b(China|chinese)\b/i,
    Japan: /\b(Japan|japanese|日本)\b/i,
    Russia: /\b(Russia|russian|росси)\b/i,
    Turkey: /\b(Turkey|türk)\b/i,
};

function sortByJurisdiction(samples: string[], jurisdictions: string[]): string[] {
    if (!jurisdictions.length) return samples;
    const tokens = jurisdictions
        .map((j) => JURISDICTION_TOKENS[j])
        .filter((rx): rx is RegExp => !!rx);
    if (!tokens.length) return samples;
    const matches: string[] = [];
    const rest: string[] = [];
    for (const s of samples) {
        if (tokens.some((rx) => rx.test(s))) matches.push(s);
        else rest.push(s);
    }
    return matches.length ? [...matches, ...rest] : samples;
}

export function useRotatingPrompt({
    enabled = true,
    intervalMs = 6500,
    jurisdictions = [],
}: {
    enabled?: boolean;
    intervalMs?: number;
    /** User profile jurisdictions (e.g. ["UAE", "KSA"]). Matching
     *  samples get sorted to the front of the rotation queue. */
    jurisdictions?: string[];
} = {}): string {
    const { locale } = useLocale();
    const samples = useMemo(() => {
        const base = SAMPLES_BY_LOCALE[locale] ?? SAMPLES_BY_LOCALE.en;
        return sortByJurisdiction(base, jurisdictions);
    }, [locale, jurisdictions]);
    const [index, setIndex] = useState(() => 0);

    useEffect(() => {
        // Reset to the top when locale or jurisdictions change so the
        // first thing the user sees is a jurisdiction-relevant sample,
        // not a random offset that buries the match.
        setIndex(0);
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
