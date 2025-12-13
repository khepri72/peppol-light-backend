import { useTranslation } from "react-i18next";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Check, X, ArrowLeft } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Link } from "wouter";

export default function PricingPage() {
  const { t } = useTranslation();

  const emailSubjects = {
    starter: "Activation Plan STARTER - Peppol Light",
    pro: "Activation Plan PRO - Peppol Light",
    business: "Demande Partenariat BUSINESS - Peppol Light",
  };

  const emailBodies = {
    starter: `Bonjour,%0D%0A%0D%0AJe souhaite activer le plan STARTER (14,90€/mois - 30 factures/mois).%0D%0A%0D%0AMon email : [VOTRE EMAIL]%0D%0AMon entreprise : [NOM]%0D%0ANuméro TVA : [BE0...]%0D%0A%0D%0AMerci !`,
    pro: `Bonjour,%0D%0A%0D%0AJe souhaite activer le plan PRO (29,90€/mois - 200 factures/mois).%0D%0A%0D%0AMon email : [VOTRE EMAIL]%0D%0AMon entreprise : [NOM]%0D%0ANuméro TVA : [BE0...]%0D%0A%0D%0AMerci !`,
    business: `Bonjour,%0D%0A%0D%0AJe suis intéressé par le plan BUSINESS (79,90€/mois - factures illimitées) et souhaiterais discuter d'un partenariat.%0D%0A%0D%0AMon email : [VOTRE EMAIL]%0D%0AMon entreprise : [NOM]%0D%0ANuméro TVA : [BE0...]%0D%0ANombre de dossiers clients estimé : [X]%0D%0A%0D%0AMerci !`,
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      {/* Navigation Header */}
      <div className="border-b bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" asChild data-testid="button-back-dashboard">
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('nav.dashboard')}
            </Link>
          </Button>
          <LanguageSwitcher />
        </div>
      </div>

      {/* Header */}
      <header className="text-center py-12 px-4">
        <h1 className="text-4xl font-bold mb-4" data-testid="text-pricing-title">
          {t("pricing.title")}
        </h1>
        <p className="text-lg text-muted-foreground" data-testid="text-pricing-subtitle">
          {t("pricing.subtitle")}
        </p>
      </header>

      {/* Pricing Cards Grid */}
      <div className="max-w-7xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Plan GRATUIT */}
          <Card data-testid="card-plan-free" className="flex flex-col">
            <CardHeader>
              <Badge variant="secondary" className="w-fit" data-testid="badge-plan-free">
                {t("pricing.plans.free.badge")}
              </Badge>
              <h3 className="text-2xl font-bold mt-4" data-testid="text-plan-free-name">
                {t("pricing.plans.free.name")}
              </h3>
              <div className="mt-4">
                <span className="text-4xl font-bold" data-testid="text-plan-free-price">
                  {t("pricing.plans.free.price")}
                </span>
                <span className="text-muted-foreground">/{t("pricing.monthly")}</span>
              </div>
            </CardHeader>
            
            <CardContent className="flex-1">
              <ul className="space-y-3" data-testid="list-plan-free-features">
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{t("pricing.plans.free.features.invoices")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{t("pricing.plans.free.features.score")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{t("pricing.plans.free.features.pdf")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{t("pricing.plans.free.features.history")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{t("pricing.plans.free.features.support")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground">{t("pricing.plans.free.features.noUbl")}</span>
                </li>
              </ul>
            </CardContent>
            
            <CardFooter>
              <Button 
                variant="outline" 
                className="w-full" 
                asChild
                data-testid="button-plan-free-cta"
              >
                <a href="/register">{t("pricing.plans.free.cta")}</a>
              </Button>
            </CardFooter>
          </Card>

          {/* Plan STARTER */}
          <Card data-testid="card-plan-starter" className="flex flex-col">
            <CardHeader>
              <Badge className="w-fit" data-testid="badge-plan-starter">
                {t("pricing.plans.starter.badge")}
              </Badge>
              <h3 className="text-2xl font-bold mt-4" data-testid="text-plan-starter-name">
                {t("pricing.plans.starter.name")}
              </h3>
              <div className="mt-4">
                <span className="text-4xl font-bold" data-testid="text-plan-starter-price">
                  {t("pricing.plans.starter.price")}
                </span>
                <span className="text-muted-foreground">/{t("pricing.monthly")}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {t("pricing.yearlyDiscount", { price: t("pricing.plans.starter.priceYearly") })}
              </p>
            </CardHeader>
            
            <CardContent className="flex-1">
              <ul className="space-y-3" data-testid="list-plan-starter-features">
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{t("pricing.plans.starter.features.invoices")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{t("pricing.plans.starter.features.ubl")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{t("pricing.plans.starter.features.ai")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{t("pricing.plans.starter.features.history")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{t("pricing.plans.starter.features.support")}</span>
                </li>
              </ul>
            </CardContent>
            
            <CardFooter>
              <Button 
                className="w-full" 
                asChild
                data-testid="button-plan-starter-cta"
              >
                <a href={`mailto:contact@peppollight.com?subject=${emailSubjects.starter}&body=${emailBodies.starter}`}>
                  {t("pricing.plans.starter.cta")}
                </a>
              </Button>
            </CardFooter>
          </Card>

          {/* Plan PRO (HIGHLIGHT) */}
          <Card 
            data-testid="card-plan-pro" 
            className="flex flex-col border-2 border-primary shadow-lg relative"
          >
            <CardHeader>
              <Badge className="w-fit bg-primary text-primary-foreground" data-testid="badge-plan-pro">
                {t("pricing.plans.pro.badge")}
              </Badge>
              <h3 className="text-2xl font-bold mt-4 text-primary" data-testid="text-plan-pro-name">
                {t("pricing.plans.pro.name")}
              </h3>
              <div className="mt-4">
                <span className="text-4xl font-bold text-primary" data-testid="text-plan-pro-price">
                  {t("pricing.plans.pro.price")}
                </span>
                <span className="text-muted-foreground">/{t("pricing.monthly")}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {t("pricing.yearlyDiscount", { price: t("pricing.plans.pro.priceYearly") })}
              </p>
            </CardHeader>
            
            <CardContent className="flex-1">
              <ul className="space-y-3" data-testid="list-plan-pro-features">
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm font-semibold">{t("pricing.plans.pro.features.invoices")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{t("pricing.plans.pro.features.aiAdvanced")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{t("pricing.plans.pro.features.dashboard")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{t("pricing.plans.pro.features.autoSend")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{t("pricing.plans.pro.features.history")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{t("pricing.plans.pro.features.support")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{t("pricing.plans.pro.features.users")}</span>
                </li>
              </ul>
            </CardContent>
            
            <CardFooter>
              <Button 
                variant="default"
                className="w-full" 
                asChild
                data-testid="button-plan-pro-cta"
              >
                <a href={`mailto:contact@peppollight.com?subject=${emailSubjects.pro}&body=${emailBodies.pro}`}>
                  {t("pricing.plans.pro.cta")}
                </a>
              </Button>
            </CardFooter>
          </Card>

          {/* Plan BUSINESS */}
          <Card data-testid="card-plan-business" className="flex flex-col">
            <CardHeader>
              <Badge variant="secondary" className="w-fit" data-testid="badge-plan-business">
                {t("pricing.plans.business.badge")}
              </Badge>
              <h3 className="text-2xl font-bold mt-4" data-testid="text-plan-business-name">
                {t("pricing.plans.business.name")}
              </h3>
              <div className="mt-4">
                <span className="text-4xl font-bold" data-testid="text-plan-business-price">
                  {t("pricing.plans.business.price")}
                </span>
                <span className="text-muted-foreground">/{t("pricing.monthly")}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {t("pricing.yearlyDiscount", { price: t("pricing.plans.business.priceYearly") })}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("pricing.plans.business.clientsIncluded")}
              </p>
            </CardHeader>
            
            <CardContent className="flex-1">
              <ul className="space-y-3" data-testid="list-plan-business-features">
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm font-semibold">{t("pricing.plans.business.features.invoices")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{t("pricing.plans.business.features.clients")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{t("pricing.plans.business.features.addClients")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{t("pricing.plans.business.features.api")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{t("pricing.plans.business.features.whiteLabel")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{t("pricing.plans.business.features.phone")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{t("pricing.plans.business.features.manager")}</span>
                </li>
              </ul>
            </CardContent>
            
            <CardFooter>
              <Button 
                variant="outline" 
                className="w-full" 
                asChild
                data-testid="button-plan-business-cta"
              >
                <a href={`mailto:contact@peppollight.com?subject=${emailSubjects.business}&body=${emailBodies.business}`}>
                  {t("pricing.plans.business.cta")}
                </a>
              </Button>
            </CardFooter>
          </Card>

        </div>
      </div>

      {/* Comparison Table */}
      <section className="max-w-5xl mx-auto my-16 px-4">
        <h2 className="text-3xl font-bold text-center mb-8" data-testid="text-comparison-title">
          {t("pricing.comparison.title")}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full border border-border rounded-md">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 border-b border-border font-semibold">
                  {t("pricing.comparison.criteria.model")}
                </th>
                <th className="text-center p-4 border-b border-border font-semibold">
                  ABCinvoice
                </th>
                <th className="text-center p-4 border-b border-border font-semibold bg-primary/10">
                  Peppol Light
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-4 border-b border-border font-medium">
                  {t("pricing.comparison.criteria.model")}
                </td>
                <td className="p-4 border-b border-border text-center">
                  {t("pricing.comparison.abcinvoice.model")}
                </td>
                <td className="p-4 border-b border-border text-center bg-primary/5">
                  {t("pricing.comparison.peppollight.model")}
                </td>
              </tr>
              <tr>
                <td className="p-4 border-b border-border font-medium">
                  {t("pricing.comparison.criteria.unlimited")}
                </td>
                <td className="p-4 border-b border-border text-center">
                  {t("pricing.comparison.abcinvoice.unlimited")}
                </td>
                <td className="p-4 border-b border-border text-center bg-primary/5">
                  {t("pricing.comparison.peppollight.unlimited")}
                </td>
              </tr>
              <tr>
                <td className="p-4 border-b border-border font-medium">
                  {t("pricing.comparison.criteria.score")}
                </td>
                <td className="p-4 border-b border-border text-center">
                  {t("pricing.comparison.abcinvoice.score")}
                </td>
                <td className="p-4 border-b border-border text-center bg-primary/5">
                  {t("pricing.comparison.peppollight.score")}
                </td>
              </tr>
              <tr>
                <td className="p-4 border-b border-border font-medium">
                  {t("pricing.comparison.criteria.ai")}
                </td>
                <td className="p-4 border-b border-border text-center">
                  {t("pricing.comparison.abcinvoice.ai")}
                </td>
                <td className="p-4 border-b border-border text-center bg-primary/5">
                  {t("pricing.comparison.peppollight.ai")}
                </td>
              </tr>
              <tr>
                <td className="p-4 font-medium">
                  {t("pricing.comparison.criteria.language")}
                </td>
                <td className="p-4 text-center">
                  {t("pricing.comparison.abcinvoice.language")}
                </td>
                <td className="p-4 text-center bg-primary/5">
                  {t("pricing.comparison.peppollight.language")}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-4xl mx-auto my-16 px-4 pb-16">
        <h2 className="text-3xl font-bold text-center mb-8" data-testid="text-faq-title">
          {t("pricing.faq.title")}
        </h2>
        <Accordion type="single" collapsible className="w-full" data-testid="accordion-faq">
          <AccordionItem value="why">
            <AccordionTrigger data-testid="button-faq-why">
              {t("pricing.faq.questions.why.q")}
            </AccordionTrigger>
            <AccordionContent data-testid="text-faq-why-answer">
              {t("pricing.faq.questions.why.a")}
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="change">
            <AccordionTrigger data-testid="button-faq-change">
              {t("pricing.faq.questions.change.q")}
            </AccordionTrigger>
            <AccordionContent data-testid="text-faq-change-answer">
              {t("pricing.faq.questions.change.a")}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="lifetime">
            <AccordionTrigger data-testid="button-faq-lifetime">
              {t("pricing.faq.questions.lifetime.q")}
            </AccordionTrigger>
            <AccordionContent data-testid="text-faq-lifetime-answer">
              {t("pricing.faq.questions.lifetime.a")}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="payment">
            <AccordionTrigger data-testid="button-faq-payment">
              {t("pricing.faq.questions.payment.q")}
            </AccordionTrigger>
            <AccordionContent data-testid="text-faq-payment-answer">
              {t("pricing.faq.questions.payment.a")}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="trial">
            <AccordionTrigger data-testid="button-faq-trial">
              {t("pricing.faq.questions.trial.q")}
            </AccordionTrigger>
            <AccordionContent data-testid="text-faq-trial-answer">
              {t("pricing.faq.questions.trial.a")}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>
    </div>
  );
}
