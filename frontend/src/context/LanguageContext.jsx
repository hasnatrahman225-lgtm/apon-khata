import { createContext, useContext, useEffect, useState } from "react";

export const BUILTIN_TRANSLATIONS = {
  bn: {
    lang_name: "বাংলা",
    lang_code: "bn",
    flag: "🇧🇩",

    // Navigation & Header
    app_title: "আপন খাতা",
    tagline: "সহজ ও নিরাপদ ডিজিটাল হিসাব খাতা",
    nav_dashboard: "ড্যাশবোর্ড",
    nav_customers: "কাস্টমার",
    nav_suppliers: "সাপ্লায়ার",
    nav_stock: "স্টক",
    nav_reports: "রিপোর্ট",
    btn_logout: "লগআউট",
    manage_languages: "ভাষা পরিবর্তন / যোগ করুন",
    custom_languages: "কাস্টম ভাষা",

    // Dashboard Cards
    receivable_label: "পাওনা (গ্রাহকদের কাছে)",
    payable_label: "দেনা (সাপ্লায়ারকে)",
    total_gave_label: "মোট দিয়েছি",
    total_got_label: "মোট পেয়েছি",
    net_balance_label: "নেট হিসাব",
    recent_transactions: "সাম্প্রতিক লেনদেন",
    no_recent_transactions: "এখনো কোনো লেনদেন যোগ করা হয়নি।",
    loading: "লোড হচ্ছে...",

    // Contacts
    customer: "কাস্টমার",
    supplier: "সাপ্লায়ার",
    customer_list: "কাস্টমার তালিকা",
    supplier_list: "সাপ্লায়ার তালিকা",
    new_customer: "+ নতুন কাস্টমার",
    new_supplier: "+ নতুন সাপ্লায়ার",
    name: "নাম",
    phone: "ফোন নম্বর",
    optional: "ঐচ্ছিক",
    no_contacts: "এখনো কোনো তালিকা নেই।",
    no_phone: "ফোন নম্বর নেই",
    status_receivable: "পাওনা",
    status_payable: "জমা আছে",
    status_settled: "সমান",
    has_receivable: "পাওনা আছে",
    has_deposit: "জমা আছে",
    delete_contact_confirm: "মুছে ফেলতে চান? এই গ্রাহক/সাপ্লায়ারের সব লেনদেনও মুছে যাবে।",
    delete_contact_btn: "এই খাতা মুছে ফেলুন",

    // Transactions
    direction_gave: "দিলাম (বাকী / পাওনা)",
    direction_got: "পেলাম (জমা / পরিশোধ)",
    dir_short_gave: "দিলাম",
    dir_short_got: "পেলাম",
    amount: "টাকার পরিমাণ",
    note: "নোট / বিবরণ",
    note_placeholder: "যেমন: মালামাল ক্রয় বা বিল পরিশোধ",
    date: "তারিখ",
    time: "সময়",
    select_date: "তারিখ নির্বাচন করুন (পেছনের তারিখও সিলেক্ট করা যাবে)",
    category: "লেনদেন / খরচের খাত",
    btn_add_entry: "এন্ট্রি যোগ করুন",
    tx_history: "লেনদেনের ইতিহাস",
    no_tx: "এখনো কোনো এন্ট্রি নেই।",
    edit_tx: "এডিট",
    delete_tx: "মুছে ফেলুন",
    save_changes: "সংরক্ষণ করুন",
    cancel: "বাতিল",
    edit_transaction_title: "লেনদেন এডিট করুন",
    delete_tx_confirm: "আপনি কি নিশ্চিত যে এই লেনদেনটি মুছে ফেলতে চান?",

    // Categories
    cat_sale: "বিক্রি",
    cat_purchase: "ক্রয়",
    cat_expense: "খরচ",
    cat_due: "বাকী",
    cat_deposit: "জমা",
    cat_general: "সাধারণ",

    // Reports
    reports_title: "হিসাব ও খরচের খাতের রিপোর্ট",
    filter_all_categories: "সকল খাত",
    filter_all_types: "সকল পক্ষ (কাস্টমার ও সাপ্লায়ার)",
    filter_from_date: "শুরু তারিখ",
    filter_to_date: "শেষ তারিখ",
    filter_apply: "ফিল্টার",
    filter_reset: "রিসেট",
    download_csv: "CSV ডাউনলোড",
    print_report: "প্রিন্ট / PDF",
    col_date: "তারিখ",
    col_contact: "কার সাথে / গ্রাহক / সাপ্লায়ার",
    col_direction: "প্রকৃতি (পাওনা / দেনা)",
    col_category: "খরচের খাত",
    col_note: "নোট / বিবরণ",
    col_amount: "পরিমাণ",
    col_actions: "অ্যাকশন",
    summary_by_category: "খাতভিত্তিক সারসংক্ষেপ",
    total_expense: "মোট খরচ",
    total_sales: "মোট বিক্রি",
    total_entries: "মোট এন্ট্রি",

    // Stock
    stock_title: "স্টক / পণ্যের তালিকা",
    new_stock: "+ নতুন পণ্য",
    stock_name: "পণ্যের নাম",
    stock_qty: "পরিমাণ",
    stock_price: "একক মূল্য (৳)",
    stock_unit: "একক (যেমন: কেজি, পিস)",
    delete_stock_confirm: "এই পণ্যটি মুছে ফেলতে চান?",

    // Language modal
    lang_modal_title: "ভাষা সেটিংস ও ভাষা প্যাক",
    download_template_btn: "ভাষা টেমপ্লেট ডাউনলোড করুন (.JSON)",
    download_template_desc: "এই ফাইলটি ডাউনলোড করে যেকোনো ভাষায় অনুবাদ করে আবার আপলোড করতে পারবেন।",
    upload_lang_btn: "নতুন ভাষা ফাইল আপলোড করুন",
    upload_lang_prompt: "অনূদিত JSON ফাইলটি নির্বাচন করুন:",
    installed_custom_langs: "ইনস্টল করা কাস্টম ভাষা:",
    no_custom_langs: "কোনো কাস্টম ভাষা যোগ করা হয়নি।",
    delete_lang: "মুছে দিন",
  },
  en: {
    lang_name: "English",
    lang_code: "en",
    flag: "🇬🇧",

    // Navigation & Header
    app_title: "Aapon Khata",
    tagline: "Simple & Secure Digital Ledger",
    nav_dashboard: "Dashboard",
    nav_customers: "Customers",
    nav_suppliers: "Suppliers",
    nav_stock: "Stock",
    nav_reports: "Reports",
    btn_logout: "Logout",
    manage_languages: "Language Settings / Add Language",
    custom_languages: "Custom Languages",

    // Dashboard Cards
    receivable_label: "Receivable (From Customers)",
    payable_label: "Payable (To Suppliers)",
    total_gave_label: "Total Given",
    total_got_label: "Total Received",
    net_balance_label: "Net Balance",
    recent_transactions: "Recent Transactions",
    no_recent_transactions: "No transactions added yet.",
    loading: "Loading...",

    // Contacts
    customer: "Customer",
    supplier: "Supplier",
    customer_list: "Customer List",
    supplier_list: "Supplier List",
    new_customer: "+ New Customer",
    new_supplier: "+ New Supplier",
    name: "Name",
    phone: "Phone Number",
    optional: "Optional",
    no_contacts: "No contacts found.",
    no_phone: "No phone number",
    status_receivable: "Receivable",
    status_payable: "Advance/Deposit",
    status_settled: "Settled",
    has_receivable: "Owes You",
    has_deposit: "Advance Given",
    delete_contact_confirm: "Are you sure? All transaction history for this contact will be permanently deleted.",
    delete_contact_btn: "Delete this Khata",

    // Transactions
    direction_gave: "Gave (Due / Credit Given)",
    direction_got: "Received (Payment / Deposit)",
    dir_short_gave: "Gave",
    dir_short_got: "Got",
    amount: "Amount",
    note: "Note / Details",
    note_placeholder: "e.g. Grocery purchase or bill payment",
    date: "Date",
    time: "Time",
    select_date: "Select Date (back-dating supported)",
    category: "Category / Purpose",
    btn_add_entry: "Add Entry",
    tx_history: "Transaction History",
    no_tx: "No entries yet.",
    edit_tx: "Edit",
    delete_tx: "Delete",
    save_changes: "Save Changes",
    cancel: "Cancel",
    edit_transaction_title: "Edit Transaction",
    delete_tx_confirm: "Are you sure you want to delete this transaction?",

    // Categories
    cat_sale: "Sale",
    cat_purchase: "Purchase",
    cat_expense: "Expense",
    cat_due: "Due",
    cat_deposit: "Deposit",
    cat_general: "General",

    // Reports
    reports_title: "Ledger & Expense Category Reports",
    filter_all_categories: "All Categories",
    filter_all_types: "All Parties (Customer & Supplier)",
    filter_from_date: "From Date",
    filter_to_date: "To Date",
    filter_apply: "Filter",
    filter_reset: "Reset",
    download_csv: "Download CSV",
    print_report: "Print / PDF",
    col_date: "Date",
    col_contact: "Party / Customer / Supplier",
    col_direction: "Type (Gave/Got)",
    col_category: "Expense / Ledger Category",
    col_note: "Note / Description",
    col_amount: "Amount",
    col_actions: "Actions",
    summary_by_category: "Summary by Category",
    total_expense: "Total Expense",
    total_sales: "Total Sales",
    total_entries: "Total Entries",

    // Stock
    stock_title: "Inventory / Stock List",
    new_stock: "+ New Item",
    stock_name: "Item Name",
    stock_qty: "Quantity",
    stock_price: "Unit Price (৳)",
    stock_unit: "Unit (e.g. pcs, kg)",
    delete_stock_confirm: "Delete this item from stock?",

    // Language modal
    lang_modal_title: "Language Settings & Packs",
    download_template_btn: "Download Language Template (.JSON)",
    download_template_desc: "Download this JSON file, translate the values to any language, and upload it back here.",
    upload_lang_btn: "Upload Language Pack (.json)",
    upload_lang_prompt: "Select translated JSON file:",
    installed_custom_langs: "Installed Custom Languages:",
    no_custom_langs: "No custom languages installed yet.",
    delete_lang: "Delete",
  },
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [currentLang, setCurrentLang] = useState(() => {
    return localStorage.getItem("khata_language") || "bn";
  });

  const [customLangs, setCustomLangs] = useState(() => {
    try {
      const raw = localStorage.getItem("khata_custom_languages");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem("khata_language", currentLang);
  }, [currentLang]);

  useEffect(() => {
    localStorage.setItem("khata_custom_languages", JSON.stringify(customLangs));
  }, [customLangs]);

  function getAllTranslations() {
    return { ...BUILTIN_TRANSLATIONS, ...customLangs };
  }

  function t(key, fallback = "") {
    const all = getAllTranslations();
    const active = all[currentLang] || all.bn || {};
    if (active[key] !== undefined) return active[key];
    // Fallback to Bangla, then English, then given fallback
    if (all.bn && all.bn[key] !== undefined) return all.bn[key];
    if (all.en && all.en[key] !== undefined) return all.en[key];
    return fallback || key;
  }

  function getCategoryLabel(catKey) {
    const map = {
      sale: t("cat_sale", "বিক্রি"),
      purchase: t("cat_purchase", "ক্রয়"),
      expense: t("cat_expense", "খরচ"),
      due: t("cat_due", "বাকী"),
      deposit: t("cat_deposit", "জমা"),
      general: t("cat_general", "সাধারণ"),
    };
    return map[catKey] || catKey;
  }

  function downloadLanguageTemplate() {
    const template = {
      lang_code: "custom",
      lang_name: "My Language",
      flag: "🌐",
      ...BUILTIN_TRANSLATIONS.en,
    };
    const jsonStr = JSON.stringify(template, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "khatabook-language-template.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function importCustomLanguage(parsedJson) {
    if (!parsedJson || typeof parsedJson !== "object") {
      throw new Error("Invalid JSON file.");
    }
    const code = (parsedJson.lang_code || `lang_${Date.now()}`).toLowerCase().replace(/[^a-z0-9_-]/g, "");
    const name = parsedJson.lang_name || `Custom (${code})`;
    const pack = {
      ...BUILTIN_TRANSLATIONS.en,
      ...parsedJson,
      lang_code: code,
      lang_name: name,
      flag: parsedJson.flag || "🌐",
    };

    setCustomLangs((prev) => ({
      ...prev,
      [code]: pack,
    }));
    setCurrentLang(code);
    return pack;
  }

  function removeCustomLanguage(code) {
    setCustomLangs((prev) => {
      const next = { ...prev };
      delete next[code];
      return next;
    });
    if (currentLang === code) {
      setCurrentLang("bn");
    }
  }

  return (
    <LanguageContext.Provider
      value={{
        currentLang,
        setCurrentLang,
        t,
        getCategoryLabel,
        downloadLanguageTemplate,
        importCustomLanguage,
        removeCustomLanguage,
        customLangs,
        availableLanguages: Object.entries(getAllTranslations()).map(([code, data]) => ({
          code,
          name: data.lang_name || code,
          flag: data.flag || "🌐",
          isCustom: !BUILTIN_TRANSLATIONS[code],
        })),
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return ctx;
}
