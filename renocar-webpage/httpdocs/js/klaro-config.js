var klaroConfig = {
  lang: 'pl',
  acceptAll: true,
  mustConsent: false,
  privacyPolicy: '/polityka-prywatnosci/',
  cookieName: 'renocar-consent',
  translations: {
    pl: {
      consentNotice: {
        description: 'Używamy plików cookies: niezbędnych do działania strony oraz — za Twoją zgodą — statystycznych (Google Analytics). Możesz zaakceptować wszystkie lub wybrać ustawienia.',
        learnMore: 'Ustawienia'
      },
      consentModal: {
        title: 'Ustawienia prywatności',
        description: 'Tutaj możesz zdecydować, które usługi mogą być używane na tej stronie.'
      },
      purposes: { analytics: 'Statystyka' },
      ok: 'Akceptuję wszystkie',
      decline: 'Odrzucam',
      acceptSelected: 'Zapisz wybór'
    }
  },
  services: [
    {
      name: 'google-analytics',
      title: 'Google Analytics 4',
      purposes: ['analytics'],
      cookies: [/^_ga(_.*)?/],
      required: false,
      default: false
    }
  ]
};
