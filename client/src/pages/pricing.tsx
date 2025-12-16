import { useState } from "react";
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
import { Check, X, ArrowLeft, Lock, Shield, CheckCircle, Loader2 } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Link } from "wouter";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function PricingPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  /**
   * Handle Stripe checkout for a plan
   */
  async function handleCheckout(
    plan: 'starter' | 'pro' | 'business',
    e?: React.MouseEvent
  ) {
    e?.preventDefault();
    e?.stopPropagation();

    setLoadingPlan(plan);

    try {
      const { url } = await api.createCheckoutSession(plan);
      
      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (error: any) {
      console.error('❌ [STRIPE] Checkout error:', error);
      toast({
        title: t('common.error', 'Erreur'),
        description: error.message || t('pricing.checkoutError'),
        variant: 'destructive',
      });
      setLoadingPlan(null);
    }
  }

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
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-6 py-3 mb-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-green-800 font-medium">
              {t('pricing.trial.noCreditCard')}
            </span>
          </div>
          <p className="text-gray-600 text-sm">
            {t('pricing.trial.cancelAnytime')}
          </p>
        </div>
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
            
            <CardFooter className="flex flex-col">
              <Button 
                variant="outline" 
                className="w-full" 
                asChild
                data-testid="button-plan-free-cta"
              >
                <a href="/register">{t("pricing.plans.free.cta")}</a>
              </Button>
              <p className="text-xs text-gray-500 mt-2">
                {t('pricing.trial.noCommitment')}
              </p>
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
            
            <CardFooter className="flex flex-col">
              <Button 
                className="w-full" 
                onClick={(e) => handleCheckout('starter', e)}
                disabled={loadingPlan !== null}
                data-testid="button-plan-starter-cta"
              >
                {loadingPlan === 'starter' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('common.loading')}
                  </>
                ) : (
                  t("pricing.plans.starter.cta")
                )}
              </Button>
              <p className="text-xs text-gray-500 mt-2">
                {t('pricing.trial.noCommitment')}
              </p>
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
            
            <CardFooter className="flex flex-col">
              <Button 
                variant="default"
                className="w-full" 
                onClick={(e) => handleCheckout('pro', e)}
                disabled={loadingPlan !== null}
                data-testid="button-plan-pro-cta"
              >
                {loadingPlan === 'pro' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('common.loading')}
                  </>
                ) : (
                  t("pricing.plans.pro.cta")
                )}
              </Button>
              <p className="text-xs text-gray-500 mt-2">
                {t('pricing.trial.noCommitment')}
              </p>
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
            
            <CardFooter className="flex flex-col">
              <Button 
                variant="default"
                className="w-full" 
                onClick={(e) => handleCheckout('business', e)}
                disabled={loadingPlan !== null}
                data-testid="button-plan-business-cta"
              >
                {loadingPlan === 'business' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('common.loading')}
                  </>
                ) : (
                  t("pricing.plans.business.cta")
                )}
              </Button>
              <p className="text-xs text-gray-500 mt-2">
                {t('pricing.trial.noCommitment')}
              </p>
            </CardFooter>
          </Card>

        </div>

        <div className="bg-gray-50 border-t border-gray-200 py-8 mt-12 rounded-lg">
          <div className="max-w-4xl mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center justify-center md:justify-between gap-6">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-green-600" />
                <span className="text-sm text-gray-700">{t('pricing.security.gdpr')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                <span className="text-sm text-gray-700">{t('pricing.security.payment')}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-indigo-600" />
                <span className="text-sm text-gray-700">{t('pricing.security.cancel')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section Pourquoi choisir Peppol Light */}
      <section className="py-16 bg-gradient-to-br from-blue-50 to-white">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4">
            {t("pricing.why.title")}
          </h2>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            {t("pricing.why.subtitle")}
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Avantage 1 */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-[#1E5AA8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">{t("pricing.why.cards.simple.title")}</h3>
              <p className="text-gray-600">
                {t("pricing.why.cards.simple.desc")}
              </p>
            </div>

            {/* Avantage 2 */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-[#FF6B35]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">{t("pricing.why.cards.transparent.title")}</h3>
              <p className="text-gray-600">
                {t("pricing.why.cards.transparent.desc")}
              </p>
            </div>

            {/* Avantage 3 */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">{t("pricing.why.cards.compliance.title")}</h3>
              <p className="text-gray-600">
                {t("pricing.why.cards.compliance.desc")}
              </p>
            </div>

            {/* Avantage 4 */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-[#1E5AA8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m0 0l2-2m-2 2V6m0 6h6" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">{t("pricing.why.cards.ubl.title")}</h3>
              <p className="text-gray-600">
                {t("pricing.why.cards.ubl.desc")}
              </p>
            </div>

            {/* Avantage 5 */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">{t("pricing.why.cards.history.title")}</h3>
              <p className="text-gray-600">
                {t("pricing.why.cards.history.desc")}
              </p>
            </div>

            {/* Avantage 6 */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-[#FF6B35]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16h6m2 4H7a4 4 0 01-4-4V8a4 4 0 014-4h10a4 4 0 014 4v8a4 4 0 01-4 4z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">{t("pricing.why.cards.support.title")}</h3>
              <p className="text-gray-600">
                {t("pricing.why.cards.support.desc")}
              </p>
            </div>
          </div>
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

      <footer className="mt-16 border-t border-gray-200 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-gray-500">
          <a
            href="https://peppollight.com/privacy"
            target="_blank"
            rel="noreferrer"
            className="hover:underline"
          >
            Politique de confidentialité
          </a>
          <span className="mx-3">•</span>
          <a
            href="https://peppollight.com/terms"
            target="_blank"
            rel="noreferrer"
            className="hover:underline"
          >
            Conditions d'utilisation
          </a>
        </div>
      </footer>
    </div>
  );
}
