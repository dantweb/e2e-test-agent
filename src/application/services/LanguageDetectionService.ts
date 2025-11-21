export interface Language {
  code: string;
  name: string;
}

export class LanguageDetectionService {
  private readonly languageNames: Record<string, string> = {
    en: 'English',
    de: 'German',
    fr: 'French',
    es: 'Spanish',
    it: 'Italian',
    nl: 'Dutch',
    pl: 'Polish',
    pt: 'Portuguese',
    ru: 'Russian',
    zh: 'Chinese',
    ja: 'Japanese',
  };

  private readonly translations: Record<string, Record<string, string>> = {
    de: {
      Login: 'Anmelden',
      Logout: 'Abmelden',
      'Add to Cart': 'In den Warenkorb',
      Checkout: 'Zur Kasse',
      Continue: 'Weiter',
      Back: 'Zurück',
      Submit: 'Absenden',
      Search: 'Suchen',
      Password: 'Passwort',
      Email: 'E-Mail',
      Username: 'Benutzername',
      Cart: 'Warenkorb',
      Order: 'Bestellung',
      Payment: 'Zahlung',
      Shipping: 'Versand',
      Total: 'Gesamt',
      Price: 'Preis',
      Quantity: 'Menge',
      Remove: 'Entfernen',
      Update: 'Aktualisieren',
    },
    fr: {
      Login: 'Connexion',
      Logout: 'Déconnexion',
      'Add to Cart': 'Ajouter au panier',
      Checkout: 'Commander',
      Continue: 'Continuer',
      Back: 'Retour',
      Submit: 'Soumettre',
      Search: 'Rechercher',
      Password: 'Mot de passe',
      Email: 'E-mail',
      Username: "Nom d'utilisateur",
      Cart: 'Panier',
      Order: 'Commande',
      Payment: 'Paiement',
      Shipping: 'Livraison',
      Total: 'Total',
      Price: 'Prix',
      Quantity: 'Quantité',
      Remove: 'Supprimer',
      Update: 'Mettre à jour',
    },
    es: {
      Login: 'Iniciar sesión',
      Logout: 'Cerrar sesión',
      'Add to Cart': 'Añadir al carrito',
      Checkout: 'Pagar',
      Continue: 'Continuar',
      Back: 'Volver',
      Submit: 'Enviar',
      Search: 'Buscar',
      Password: 'Contraseña',
      Email: 'Correo electrónico',
      Username: 'Nombre de usuario',
      Cart: 'Carrito',
      Order: 'Pedido',
      Payment: 'Pago',
      Shipping: 'Envío',
      Total: 'Total',
      Price: 'Precio',
      Quantity: 'Cantidad',
      Remove: 'Eliminar',
      Update: 'Actualizar',
    },
  };

  /**
   * Detects the language of a website from HTML
   *
   * Priority:
   * 1. <html lang="...">
   * 2. <meta http-equiv="content-language" content="...">
   * 3. Fallback to English
   */
  detectLanguage(html: string): Language {
    // Try <html lang="de"> or <html lang="de-DE">
    const htmlLangMatch = html.match(/<html[^>]+lang=["']([a-z]{2})(-[A-Z]{2})?["']/i);
    if (htmlLangMatch) {
      const langCode = htmlLangMatch[1].toLowerCase();
      return {
        code: langCode,
        name: this.languageNames[langCode] || langCode.toUpperCase(),
      };
    }

    // Try <meta http-equiv="content-language" content="de">
    const metaLangMatch = html.match(/<meta[^>]+content-language[^>]+content=["']([a-z]{2})["']/i);
    if (metaLangMatch) {
      const langCode = metaLangMatch[1].toLowerCase();
      return {
        code: langCode,
        name: this.languageNames[langCode] || langCode.toUpperCase(),
      };
    }

    // Fallback to English
    return { code: 'en', name: 'English' };
  }

  /**
   * Gets language context string for LLM prompts
   *
   * Returns empty string for English (default language),
   * or detailed translation context for other languages
   */
  getLanguageContext(language: Language): string {
    if (language.code === 'en') {
      return ''; // English is default, no context needed
    }

    const translations = this.translations[language.code];

    if (!translations) {
      // Generic context for unsupported languages
      return `IMPORTANT: The website is in ${language.name}. You MUST use ${language.name} text for selectors, not English.

When generating commands:
- Use ${language.name} text for text selectors
- Use ${language.name} text for placeholders
- Check the provided HTML for exact ${language.name} text
- Do NOT use English text`;
    }

    // Detailed context with translations
    const translationList = Object.entries(translations)
      .map(([english, translated]) => `  - "${english}" = "${translated}"`)
      .join('\n');

    return `IMPORTANT: The website is in ${language.name}. You MUST use ${language.name} text for selectors, not English.

Common UI element translations:
${translationList}

When generating commands:
- Use ${language.name} text for text selectors (text="Anmelden", not "Login")
- Use ${language.name} text for placeholders
- Check the provided HTML for exact ${language.name} text
- Do NOT use English text like "Login", "Add to Cart", etc.`;
  }
}
