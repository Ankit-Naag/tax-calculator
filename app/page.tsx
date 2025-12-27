"use client";

import { useMemo, useState } from "react";
import stateTaxData from "./data/stateTaxData.json";

type TaxBracket = {
  min: number;
  max: number | null;
  rate: number;
};

type Deduction = {
  key: string;
  label: string;
  max_percentage: number;
};

type StateConfig = {
  state_code: string;
  state_name: string;
  standard_deduction: number;
  self_employment_tax_rate: number;
  income_tax_brackets: TaxBracket[];
  deductions: Deduction[];
};

const federalBrackets: TaxBracket[] = [
  { min: 0, max: 11000, rate: 0.1 },
  { min: 11001, max: 44725, rate: 0.12 },
  { min: 44726, max: 95375, rate: 0.22 },
  { min: 95376, max: 182100, rate: 0.24 },
  { min: 182101, max: 231250, rate: 0.32 },
  { min: 231251, max: 578125, rate: 0.35 },
  { min: 578126, max: null, rate: 0.37 },
];

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

const calcProgressiveTax = (income: number, brackets: TaxBracket[]) => {
  let tax = 0;
  for (const bracket of brackets) {
    if (income <= bracket.min) continue;
    const upper = bracket.max ?? income;
    const taxableAtRate = Math.min(income, upper) - bracket.min;
    tax += taxableAtRate * bracket.rate;
  }
  return Math.max(tax, 0);
};

const PieChart = ({
  segments,
  size = 140,
}: {
  segments: { value: number; color: string; label: string }[];
  size?: number;
}) => {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const radius = size / 2 - 8;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="14"
        />
        {segments.map((segment) => {
          const value = total === 0 ? 0 : (segment.value / total) * circumference;
          const dasharray = `${value} ${circumference - value}`;
          const circle = (
            <circle
              key={segment.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth="14"
              strokeDasharray={dasharray}
              strokeDashoffset={-offset}
              strokeLinecap="round"
            />
          );
          offset += value;
          return circle;
        })}
      </g>
    </svg>
  );
};

const states = (stateTaxData as { states: StateConfig[] }).states;

export default function Home() {
  const [earnings, setEarnings] = useState("85000");
  const [stateCode, setStateCode] = useState("CA");

  const selectedState = useMemo(
    () => states.find((state) => state.state_code === stateCode) ?? states[0],
    [stateCode]
  );

  const grossIncome = Number(earnings) || 0;
  const deductionRate = selectedState.deductions.reduce(
    (sum, deduction) => sum + deduction.max_percentage,
    0
  );
  const deductionCapRate = 0.35;
  const rawDeductions = grossIncome * deductionRate;
  const cappedDeductions = Math.min(rawDeductions, grossIncome * deductionCapRate);
  const taxableIncome = Math.max(grossIncome - cappedDeductions, 0);
  const stateTaxableIncome = Math.max(
    taxableIncome - selectedState.standard_deduction,
    0
  );

  const federalTax = calcProgressiveTax(taxableIncome, federalBrackets);
  const stateTax = calcProgressiveTax(
    stateTaxableIncome,
    selectedState.income_tax_brackets
  );
  const selfEmploymentTax = grossIncome * selectedState.self_employment_tax_rate;
  const totalTax = federalTax + stateTax + selfEmploymentTax;
  const takeHomeIncome = Math.max(grossIncome - totalTax, 0);

  const taxSegments = [
    { label: "Federal", value: federalTax, color: "#f59e0b" },
    { label: "State", value: stateTax, color: "#38bdf8" },
    { label: "Self-Employment", value: selfEmploymentTax, color: "#f472b6" },
  ];

  const incomeSegments = [
    { label: "Deductions", value: cappedDeductions, color: "#0f766e" },
    { label: "Taxes", value: totalTax, color: "#b45309" },
    { label: "Take-home", value: takeHomeIncome, color: "#22c55e" },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff4d1,transparent_55%),radial-gradient(circle_at_top_left,#e6f6f3,transparent_50%),linear-gradient(135deg,#f7f1e8,#f4efe6)] text-[#1f1a17]">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-32 top-16 h-72 w-72 rounded-full bg-[radial-gradient(circle,#f59e0b55,transparent_70%)] blur-2xl float-slow" />
        <div className="pointer-events-none absolute -left-24 top-32 h-80 w-80 rounded-full bg-[radial-gradient(circle,#0f766e55,transparent_70%)] blur-2xl float-delay" />
        <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-12 px-6 py-16 lg:py-24">
          <header className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div className="space-y-5">
              <p className="text-sm uppercase tracking-[0.35em] text-[#b45309]">
                Tax & Deduction Prototype
              </p>
              <h1 className="text-4xl font-semibold leading-tight text-[#1f1a17] md:text-5xl font-[var(--font-display)]">
                Estimate your real take-home from platform earnings.
              </h1>
              <p className="max-w-xl text-lg text-[#4b433e]">
                A streamlined estimator for service providers. Tune for your
                state, see deductions, and preview federal, state, and
                self-employment tax totals in one place.
              </p>
            </div>
            <div className="glass-panel rounded-3xl border border-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.12)]">
              <h2 className="text-lg font-semibold text-[#1f1a17]">
                Quick snapshot
              </h2>
              <div className="mt-4 space-y-3 text-sm text-[#4b433e]">
                <div className="flex items-center justify-between">
                  <span>State selection</span>
                  <span className="font-semibold text-[#0f766e]">
                    {selectedState.state_name}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Deduction cap</span>
                  <span className="font-semibold">
                    {percent(deductionCapRate)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Self-employment tax</span>
                  <span className="font-semibold">
                    {percent(selectedState.self_employment_tax_rate)}
                  </span>
                </div>
              </div>
            </div>
          </header>

          <section className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="glass-panel rounded-3xl border border-white/80 p-7 shadow-[0_25px_65px_rgba(15,23,42,0.12)]">
              <h2 className="text-xl font-semibold text-[#1f1a17]">
                Inputs
              </h2>
              <div className="mt-6 grid gap-6">
                <label className="grid gap-2 text-sm font-medium text-[#4b433e]">
                  Total annual earnings
                  <input
                    type="number"
                    min="0"
                    inputMode="decimal"
                    value={earnings}
                    onChange={(event) => setEarnings(event.target.value)}
                    className="h-12 rounded-2xl border border-white/90 bg-white/90 px-4 text-base text-[#1f1a17] shadow-sm outline-none transition focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e33]"
                    placeholder="Enter gross earnings"
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium text-[#4b433e]">
                  State
                  <select
                    value={stateCode}
                    onChange={(event) => setStateCode(event.target.value)}
                    className="h-12 rounded-2xl border border-white/90 bg-white/90 px-4 text-base text-[#1f1a17] shadow-sm outline-none transition focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e33]"
                  >
                    {states.map((state) => (
                      <option key={state.state_code} value={state.state_code}>
                        {state.state_name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-8 rounded-2xl border border-white/80 bg-white/70 p-5">
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#b45309]">
                  Deduction assumptions
                </h3>
                <p className="mt-2 text-sm text-[#4b433e]">
                  Uses the state-configured deduction percentages. Total
                  deductions are capped at {percent(deductionCapRate)} of gross
                  income.
                </p>
                <div className="mt-4 grid gap-3 text-sm text-[#1f1a17]">
                  {selectedState.deductions.map((deduction) => (
                    <div
                      key={deduction.key}
                      className="flex items-center justify-between"
                    >
                      <span>{deduction.label}</span>
                      <span className="font-semibold text-[#0f766e]">
                        {percent(deduction.max_percentage)} ·{" "}
                        {currency.format(grossIncome * deduction.max_percentage)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="glass-panel rounded-3xl border border-white/80 p-7 shadow-[0_25px_65px_rgba(15,23,42,0.12)]">
                <h2 className="text-xl font-semibold text-[#1f1a17]">
                  Estimated results
                </h2>
                <div className="mt-6 grid gap-4 text-sm text-[#4b433e]">
                  <div className="flex items-center justify-between text-base font-semibold text-[#1f1a17]">
                    <span>Gross earnings</span>
                    <span>{currency.format(grossIncome)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Total estimated deductions</span>
                    <span className="font-semibold text-[#0f766e]">
                      {currency.format(cappedDeductions)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Taxable income (after deductions)</span>
                    <span className="font-semibold">
                      {currency.format(taxableIncome)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>State standard deduction</span>
                    <span className="font-semibold">
                      {currency.format(selectedState.standard_deduction)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-white/70 pt-4">
                    <span>Total estimated taxes</span>
                    <span className="text-lg font-semibold text-[#b45309]">
                      {currency.format(totalTax)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/80 bg-[#0f172a] p-7 text-white shadow-[0_30px_80px_rgba(15,23,42,0.3)]">
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#f59e0b]">
                  Tax breakdown
                </h3>
                <div className="mt-5 grid gap-6 md:grid-cols-[140px_1fr] md:items-center">
                  <div className="flex items-center justify-center">
                    <PieChart segments={taxSegments} />
                  </div>
                  <div className="grid gap-4 text-sm text-white/80">
                    <div className="flex items-center justify-between text-base font-semibold text-white">
                      <span>Federal tax</span>
                      <span>{currency.format(federalTax)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>State income tax</span>
                      <span className="font-semibold text-white">
                        {currency.format(stateTax)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Self-employment tax</span>
                      <span className="font-semibold text-white">
                        {currency.format(selfEmploymentTax)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t border-white/20 pt-4 text-base font-semibold text-white">
                      <span>Estimated take-home</span>
                      <span>{currency.format(takeHomeIncome)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="glass-panel rounded-3xl border border-white/80 p-7 shadow-[0_25px_65px_rgba(15,23,42,0.12)]">
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0f766e]">
                  Income allocation
                </h3>
                <div className="mt-5 grid gap-6 md:grid-cols-[140px_1fr] md:items-center">
                  <div className="flex items-center justify-center">
                    <PieChart segments={incomeSegments} />
                  </div>
                  <div className="grid gap-3 text-sm text-[#4b433e]">
                    {incomeSegments.map((segment) => (
                      <div
                        key={segment.label}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: segment.color }}
                          />
                          <span>{segment.label}</span>
                        </div>
                        <span className="font-semibold text-[#1f1a17]">
                          {currency.format(segment.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <p className="text-xs uppercase tracking-[0.3em] text-[#4b433e]">
                Estimates only.
              </p>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
