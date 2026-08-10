// frontend/data/translations.js
//
// UI translation strings. Each language is a flat key -> string map so
// components can call t("newChat") etc. Missing keys in a non-English
// language automatically fall back to the English string (see
// LanguageProvider's t() function) so partial translation coverage
// never shows a blank or a raw key on screen.

export const LANGUAGES = [

  { code: "en-US", label: "English (US)", flag: "🇺🇸" },
  { code: "en-GB", label: "English (UK)", flag: "🇬🇧" },
  { code: "hi", label: "हिन्दी", flag: "🇮🇳" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "ko", label: "한국어", flag: "🇰🇷" },

];

export const DEFAULT_LANGUAGE = "en-US";

// Maps each language code to the plain English language name the backend
// expects in ChatRequest.language (e.g. "Hindi", "Spanish") — the AI's
// system prompt is built in English regardless of UI language, so it
// needs the English name of the target language, not the language code.
export const LANGUAGE_NAMES = {

  "en-US": "English",
  "en-GB": "English",
  "hi": "Hindi",
  "es": "Spanish",
  "fr": "French",
  "de": "German",
  "ja": "Japanese",
  "zh": "Chinese",
  "ru": "Russian",
  "ko": "Korean",

};

const en_US = {

  newChat: "New Chat",
  chats: "Chats",
  analytics: "Analytics",
  archivedChats: "Archived Chats",
  recentlyDeletedChats: "Recently Deleted Chats",
  searchChats: "Search Chats",
  recents: "Recents",
  results: "Results",
  noResultsFound: "No results found",
  noDeletedConversations: "No deleted conversations",
  archiveAll: "Archive all chats",
  deleteAll: "Delete all chats",
  unarchiveAll: "Unarchive all chats",
  restoreAll: "Restore all chats",
  deletePermanently: "Delete permanently",

  signedInAs: "Signed in as",
  settings: "Settings",
  language: "Language",
  getHelp: "Get Help",
  logOut: "Log out",
  resetHistory: "Reset History",
  deleteAccountPermanently: "Delete Account Permanently",

  accountAndProfile: "Account & Profile",
  notifications: "Notifications",
  privacyAndSecurity: "Privacy & Security",
  changePassword: "Change Password",

  emailSupport: "Email Support",
  callSupport: "Call 1-800-TECHMART",
  liveChat: "Live Chat",
  documentation: "Documentation",
  reportABug: "Report a Bug",

  typeYourMessage: "Type your message...",
  send: "Send",
  attachFile: "Attach file",
  voiceInput: "Voice input",
  rateThisConversation: "Rate this conversation",
  humanAgent: "Talk to a human agent",
  exportConversation: "Export conversation",
  toggleDarkMode: "Toggle dark mode",
  backToChat: "Back to Chat",
  exportCSV: "Export CSV",

  cancel: "Cancel",
  confirm: "Confirm",
  save: "Save",
  skipForNow: "Skip for now",

  freePlan: "Free plan",

  customerSupport: "Customer Support",

  poweredByMultiAgentRAG: "Powered by Multi-Agent AI + RAG",
  last30Days: "Last 30 days",
  welcomeTitle: "Welcome to TechMart AI Support",
  welcomeSubtitle: "I'm here to help with billing, technical issues, product info, and more. Ask me anything!",
  footerTagline: "TechMart AI Support · Powered by Multi-Agent RAG System",

  suggestionReturnPolicy: "What is your return policy?",
  suggestionLaptopWontTurnOn: "My laptop won't turn on",
  suggestionUltraBook: "Tell me about the UltraBook Pro 15",
  suggestionCancelSubscription: "I want to cancel my subscription",
  suggestionTrackOrder: "Track my order",
  suggestionCarePricing: "TechMart Care pricing",

};

const hi = {

  newChat: "नई चैट",
  chats: "चैट्स",
  analytics: "एनालिटिक्स",
  archivedChats: "आर्काइव की गई चैट्स",
  recentlyDeletedChats: "हाल ही में हटाई गई चैट्स",
  searchChats: "चैट खोजें",
  recents: "हाल की चैट्स",
  results: "परिणाम",
  noResultsFound: "कोई परिणाम नहीं मिला",
  noDeletedConversations: "कोई हटाई गई बातचीत नहीं",
  archiveAll: "सभी चैट्स आर्काइव करें",
  deleteAll: "सभी चैट्स हटाएं",
  unarchiveAll: "सभी चैट्स अनआर्काइव करें",
  restoreAll: "सभी चैट्स पुनर्स्थापित करें",
  deletePermanently: "स्थायी रूप से हटाएं",

  signedInAs: "इस रूप में साइन इन",
  settings: "सेटिंग्स",
  language: "भाषा",
  getHelp: "मदद लें",
  logOut: "लॉग आउट",
  resetHistory: "इतिहास रीसेट करें",
  deleteAccountPermanently: "खाता स्थायी रूप से हटाएं",

  accountAndProfile: "खाता और प्रोफ़ाइल",
  notifications: "सूचनाएं",
  privacyAndSecurity: "गोपनीयता और सुरक्षा",
  changePassword: "पासवर्ड बदलें",

  emailSupport: "ईमेल सहायता",
  callSupport: "कॉल करें 1-800-TECHMART",
  liveChat: "लाइव चैट",
  documentation: "दस्तावेज़",
  reportABug: "बग की रिपोर्ट करें",

  typeYourMessage: "अपना संदेश लिखें...",
  send: "भेजें",
  attachFile: "फ़ाइल संलग्न करें",
  voiceInput: "वॉइस इनपुट",
  rateThisConversation: "इस बातचीत को रेट करें",
  humanAgent: "किसी एजेंट से बात करें",
  exportConversation: "बातचीत निर्यात करें",
  toggleDarkMode: "डार्क मोड टॉगल करें",
  backToChat: "चैट पर वापस जाएं",
  exportCSV: "CSV निर्यात करें",

  cancel: "रद्द करें",
  confirm: "पुष्टि करें",
  save: "सहेजें",
  skipForNow: "अभी छोड़ें",

  freePlan: "फ्री प्लान",

  customerSupport: "ग्राहक सहायता",

  poweredByMultiAgentRAG: "मल्टी-एजेंट AI + RAG द्वारा संचालित",
  last30Days: "पिछले 30 दिन",
  welcomeTitle: "TechMart AI सहायता में आपका स्वागत है",
  welcomeSubtitle: "मैं बिलिंग, तकनीकी समस्याओं, उत्पाद जानकारी और अधिक में मदद के लिए यहाँ हूँ। मुझसे कुछ भी पूछें!",
  footerTagline: "TechMart AI Support · मल्टी-एजेंट RAG सिस्टम द्वारा संचालित",

  suggestionReturnPolicy: "आपकी वापसी नीति क्या है?",
  suggestionLaptopWontTurnOn: "मेरा लैपटॉप चालू नहीं हो रहा",
  suggestionUltraBook: "मुझे UltraBook Pro 15 के बारे में बताएं",
  suggestionCancelSubscription: "मैं अपनी सदस्यता रद्द करना चाहता हूँ",
  suggestionTrackOrder: "मेरा ऑर्डर ट्रैक करें",
  suggestionCarePricing: "TechMart Care की कीमत",

};

const es = {

  newChat: "Nuevo chat",
  chats: "Chats",
  analytics: "Analítica",
  archivedChats: "Chats archivados",
  recentlyDeletedChats: "Chats eliminados recientemente",
  searchChats: "Buscar chats",
  recents: "Recientes",
  results: "Resultados",
  noResultsFound: "No se encontraron resultados",
  noDeletedConversations: "No hay conversaciones eliminadas",
  archiveAll: "Archivar todos los chats",
  deleteAll: "Eliminar todos los chats",
  unarchiveAll: "Desarchivar todos los chats",
  restoreAll: "Restaurar todos los chats",
  deletePermanently: "Eliminar permanentemente",

  signedInAs: "Sesión iniciada como",
  settings: "Configuración",
  language: "Idioma",
  getHelp: "Obtener ayuda",
  logOut: "Cerrar sesión",
  resetHistory: "Restablecer historial",
  deleteAccountPermanently: "Eliminar cuenta permanentemente",

  accountAndProfile: "Cuenta y perfil",
  notifications: "Notificaciones",
  privacyAndSecurity: "Privacidad y seguridad",
  changePassword: "Cambiar contraseña",

  emailSupport: "Soporte por correo",
  callSupport: "Llamar al 1-800-TECHMART",
  liveChat: "Chat en vivo",
  documentation: "Documentación",
  reportABug: "Reportar un error",

  typeYourMessage: "Escribe tu mensaje...",
  send: "Enviar",
  attachFile: "Adjuntar archivo",
  voiceInput: "Entrada de voz",
  rateThisConversation: "Califica esta conversación",
  humanAgent: "Hablar con un agente humano",
  exportConversation: "Exportar conversación",
  toggleDarkMode: "Alternar modo oscuro",
  backToChat: "Volver al chat",
  exportCSV: "Exportar CSV",

  cancel: "Cancelar",
  confirm: "Confirmar",
  save: "Guardar",
  skipForNow: "Omitir por ahora",

  freePlan: "Plan gratuito",

  customerSupport: "Atención al Cliente",

  poweredByMultiAgentRAG: "Desarrollado con IA multiagente + RAG",
  last30Days: "Últimos 30 días",
  welcomeTitle: "Bienvenido a TechMart AI Support",
  welcomeSubtitle: "Estoy aquí para ayudar con facturación, problemas técnicos, información de productos y más. ¡Pregúntame lo que sea!",
  footerTagline: "TechMart AI Support · Desarrollado con sistema RAG multiagente",

  suggestionReturnPolicy: "¿Cuál es su política de devoluciones?",
  suggestionLaptopWontTurnOn: "Mi portátil no enciende",
  suggestionUltraBook: "Cuéntame sobre el UltraBook Pro 15",
  suggestionCancelSubscription: "Quiero cancelar mi suscripción",
  suggestionTrackOrder: "Rastrear mi pedido",
  suggestionCarePricing: "Precios de TechMart Care",

};

const fr = {

  newChat: "Nouvelle discussion",
  chats: "Discussions",
  analytics: "Analytique",
  archivedChats: "Discussions archivées",
  recentlyDeletedChats: "Discussions récemment supprimées",
  searchChats: "Rechercher des discussions",
  recents: "Récentes",
  results: "Résultats",
  noResultsFound: "Aucun résultat trouvé",
  noDeletedConversations: "Aucune conversation supprimée",
  archiveAll: "Archiver toutes les discussions",
  deleteAll: "Supprimer toutes les discussions",
  unarchiveAll: "Désarchiver toutes les discussions",
  restoreAll: "Restaurer toutes les discussions",
  deletePermanently: "Supprimer définitivement",

  signedInAs: "Connecté en tant que",
  settings: "Paramètres",
  language: "Langue",
  getHelp: "Obtenir de l'aide",
  logOut: "Se déconnecter",
  resetHistory: "Réinitialiser l'historique",
  deleteAccountPermanently: "Supprimer le compte définitivement",

  accountAndProfile: "Compte et profil",
  notifications: "Notifications",
  privacyAndSecurity: "Confidentialité et sécurité",
  changePassword: "Changer le mot de passe",

  emailSupport: "Support par e-mail",
  callSupport: "Appeler le 1-800-TECHMART",
  liveChat: "Chat en direct",
  documentation: "Documentation",
  reportABug: "Signaler un bug",

  typeYourMessage: "Tapez votre message...",
  send: "Envoyer",
  attachFile: "Joindre un fichier",
  voiceInput: "Entrée vocale",
  rateThisConversation: "Évaluer cette conversation",
  humanAgent: "Parler à un agent humain",
  exportConversation: "Exporter la conversation",
  toggleDarkMode: "Basculer le mode sombre",
  backToChat: "Retour au chat",
  exportCSV: "Exporter en CSV",

  cancel: "Annuler",
  confirm: "Confirmer",
  save: "Enregistrer",
  skipForNow: "Ignorer pour l'instant",

  freePlan: "Plan gratuit",

  customerSupport: "Support Client",

  poweredByMultiAgentRAG: "Propulsé par l'IA multi-agents + RAG",
  last30Days: "30 derniers jours",
  welcomeTitle: "Bienvenue sur TechMart AI Support",
  welcomeSubtitle: "Je suis là pour vous aider avec la facturation, les problèmes techniques, les informations produits et plus encore. Demandez-moi ce que vous voulez !",
  footerTagline: "TechMart AI Support · Propulsé par un système RAG multi-agents",

  suggestionReturnPolicy: "Quelle est votre politique de retour ?",
  suggestionLaptopWontTurnOn: "Mon ordinateur portable ne s'allume pas",
  suggestionUltraBook: "Parlez-moi de l'UltraBook Pro 15",
  suggestionCancelSubscription: "Je veux annuler mon abonnement",
  suggestionTrackOrder: "Suivre ma commande",
  suggestionCarePricing: "Tarifs TechMart Care",

};

const de = {

  newChat: "Neuer Chat",
  chats: "Chats",
  analytics: "Analytik",
  archivedChats: "Archivierte Chats",
  recentlyDeletedChats: "Kürzlich gelöschte Chats",
  searchChats: "Chats durchsuchen",
  recents: "Zuletzt verwendet",
  results: "Ergebnisse",
  noResultsFound: "Keine Ergebnisse gefunden",
  noDeletedConversations: "Keine gelöschten Unterhaltungen",
  archiveAll: "Alle Chats archivieren",
  deleteAll: "Alle Chats löschen",
  unarchiveAll: "Alle Chats wiederherstellen",
  restoreAll: "Alle Chats wiederherstellen",
  deletePermanently: "Endgültig löschen",

  signedInAs: "Angemeldet als",
  settings: "Einstellungen",
  language: "Sprache",
  getHelp: "Hilfe erhalten",
  logOut: "Abmelden",
  resetHistory: "Verlauf zurücksetzen",
  deleteAccountPermanently: "Konto endgültig löschen",

  accountAndProfile: "Konto & Profil",
  notifications: "Benachrichtigungen",
  privacyAndSecurity: "Datenschutz & Sicherheit",
  changePassword: "Passwort ändern",

  emailSupport: "E-Mail-Support",
  callSupport: "Anrufen 1-800-TECHMART",
  liveChat: "Live-Chat",
  documentation: "Dokumentation",
  reportABug: "Fehler melden",

  typeYourMessage: "Nachricht eingeben...",
  send: "Senden",
  attachFile: "Datei anhängen",
  voiceInput: "Spracheingabe",
  rateThisConversation: "Diese Unterhaltung bewerten",
  humanAgent: "Mit einem Mitarbeiter sprechen",
  exportConversation: "Unterhaltung exportieren",
  toggleDarkMode: "Dunkelmodus umschalten",
  backToChat: "Zurück zum Chat",
  exportCSV: "CSV exportieren",

  cancel: "Abbrechen",
  confirm: "Bestätigen",
  save: "Speichern",
  skipForNow: "Vorerst überspringen",

  freePlan: "Kostenloser Plan",

  customerSupport: "Kundensupport",

  poweredByMultiAgentRAG: "Unterstützt durch Multi-Agent-KI + RAG",
  last30Days: "Letzte 30 Tage",
  welcomeTitle: "Willkommen beim TechMart AI Support",
  welcomeSubtitle: "Ich helfe Ihnen gerne bei Rechnungen, technischen Problemen, Produktinformationen und mehr. Fragen Sie mich einfach!",
  footerTagline: "TechMart AI Support · Unterstützt durch Multi-Agent-RAG-System",

  suggestionReturnPolicy: "Wie lautet Ihre Rückgaberichtlinie?",
  suggestionLaptopWontTurnOn: "Mein Laptop lässt sich nicht einschalten",
  suggestionUltraBook: "Erzählen Sie mir mehr über das UltraBook Pro 15",
  suggestionCancelSubscription: "Ich möchte mein Abonnement kündigen",
  suggestionTrackOrder: "Meine Bestellung verfolgen",
  suggestionCarePricing: "TechMart Care Preise",

};

const ja = {

  newChat: "新しいチャット",
  chats: "チャット",
  analytics: "分析",
  archivedChats: "アーカイブ済みチャット",
  recentlyDeletedChats: "最近削除したチャット",
  searchChats: "チャットを検索",
  recents: "最近の項目",
  results: "結果",
  noResultsFound: "結果が見つかりません",
  noDeletedConversations: "削除された会話はありません",
  archiveAll: "すべてのチャットをアーカイブ",
  deleteAll: "すべてのチャットを削除",
  unarchiveAll: "すべてのチャットのアーカイブを解除",
  restoreAll: "すべてのチャットを復元",
  deletePermanently: "完全に削除",

  signedInAs: "サインイン中",
  settings: "設定",
  language: "言語",
  getHelp: "ヘルプ",
  logOut: "ログアウト",
  resetHistory: "履歴をリセット",
  deleteAccountPermanently: "アカウントを完全に削除",

  accountAndProfile: "アカウントとプロフィール",
  notifications: "通知",
  privacyAndSecurity: "プライバシーとセキュリティ",
  changePassword: "パスワードを変更",

  emailSupport: "メールサポート",
  callSupport: "電話する 1-800-TECHMART",
  liveChat: "ライブチャット",
  documentation: "ドキュメント",
  reportABug: "バグを報告",

  typeYourMessage: "メッセージを入力...",
  send: "送信",
  attachFile: "ファイルを添付",
  voiceInput: "音声入力",
  rateThisConversation: "この会話を評価する",
  humanAgent: "担当者と話す",
  exportConversation: "会話をエクスポート",
  toggleDarkMode: "ダークモード切り替え",
  backToChat: "チャットに戻る",
  exportCSV: "CSVをエクスポート",

  cancel: "キャンセル",
  confirm: "確認",
  save: "保存",
  skipForNow: "今はスキップ",

  freePlan: "無料プラン",

  customerSupport: "カスタマーサポート",

  poweredByMultiAgentRAG: "マルチエージェントAI + RAG搭載",
  last30Days: "過去30日間",
  welcomeTitle: "TechMart AI サポートへようこそ",
  welcomeSubtitle: "請求、技術的な問題、製品情報など、何でもお気軽にお尋ねください！",
  footerTagline: "TechMart AI Support · マルチエージェントRAGシステム搭載",

  suggestionReturnPolicy: "返品ポリシーは何ですか？",
  suggestionLaptopWontTurnOn: "ノートパソコンの電源が入りません",
  suggestionUltraBook: "UltraBook Pro 15について教えてください",
  suggestionCancelSubscription: "サブスクリプションを解約したいです",
  suggestionTrackOrder: "注文を追跡する",
  suggestionCarePricing: "TechMart Careの料金",

};

const zh = {

  newChat: "新建聊天",
  chats: "聊天",
  analytics: "分析",
  archivedChats: "已归档聊天",
  recentlyDeletedChats: "最近删除的聊天",
  searchChats: "搜索聊天",
  recents: "最近",
  results: "结果",
  noResultsFound: "未找到结果",
  noDeletedConversations: "没有已删除的对话",
  archiveAll: "归档所有聊天",
  deleteAll: "删除所有聊天",
  unarchiveAll: "取消归档所有聊天",
  restoreAll: "恢复所有聊天",
  deletePermanently: "永久删除",

  signedInAs: "登录身份",
  settings: "设置",
  language: "语言",
  getHelp: "获取帮助",
  logOut: "退出登录",
  resetHistory: "重置历史记录",
  deleteAccountPermanently: "永久删除账户",

  accountAndProfile: "账户与个人资料",
  notifications: "通知",
  privacyAndSecurity: "隐私与安全",
  changePassword: "修改密码",

  emailSupport: "邮件支持",
  callSupport: "致电 1-800-TECHMART",
  liveChat: "在线客服",
  documentation: "文档",
  reportABug: "报告问题",

  typeYourMessage: "输入您的消息...",
  send: "发送",
  attachFile: "附加文件",
  voiceInput: "语音输入",
  rateThisConversation: "评价此对话",
  humanAgent: "联系人工客服",
  exportConversation: "导出对话",
  toggleDarkMode: "切换深色模式",
  backToChat: "返回聊天",
  exportCSV: "导出CSV",

  cancel: "取消",
  confirm: "确认",
  save: "保存",
  skipForNow: "暂时跳过",

  freePlan: "免费套餐",

  customerSupport: "客户支持",

  poweredByMultiAgentRAG: "由多智能体AI + RAG驱动",
  last30Days: "过去30天",
  welcomeTitle: "欢迎使用TechMart AI支持",
  welcomeSubtitle: "我可以帮助您解决账单、技术问题、产品信息等。请随时问我任何问题！",
  footerTagline: "TechMart AI Support · 由多智能体RAG系统驱动",

  suggestionReturnPolicy: "你们的退货政策是什么？",
  suggestionLaptopWontTurnOn: "我的笔记本电脑无法开机",
  suggestionUltraBook: "介绍一下UltraBook Pro 15",
  suggestionCancelSubscription: "我想取消我的订阅",
  suggestionTrackOrder: "追踪我的订单",
  suggestionCarePricing: "TechMart Care定价",

};

const ru = {

  newChat: "Новый чат",
  chats: "Чаты",
  analytics: "Аналитика",
  archivedChats: "Архивные чаты",
  recentlyDeletedChats: "Недавно удалённые чаты",
  searchChats: "Поиск чатов",
  recents: "Недавние",
  results: "Результаты",
  noResultsFound: "Результаты не найдены",
  noDeletedConversations: "Нет удалённых разговоров",
  archiveAll: "Архивировать все чаты",
  deleteAll: "Удалить все чаты",
  unarchiveAll: "Разархивировать все чаты",
  restoreAll: "Восстановить все чаты",
  deletePermanently: "Удалить навсегда",

  signedInAs: "Вы вошли как",
  settings: "Настройки",
  language: "Язык",
  getHelp: "Получить помощь",
  logOut: "Выйти",
  resetHistory: "Сбросить историю",
  deleteAccountPermanently: "Удалить аккаунт навсегда",

  accountAndProfile: "Аккаунт и профиль",
  notifications: "Уведомления",
  privacyAndSecurity: "Конфиденциальность и безопасность",
  changePassword: "Изменить пароль",

  emailSupport: "Поддержка по email",
  callSupport: "Позвонить 1-800-TECHMART",
  liveChat: "Онлайн-чат",
  documentation: "Документация",
  reportABug: "Сообщить об ошибке",

  typeYourMessage: "Введите сообщение...",
  send: "Отправить",
  attachFile: "Прикрепить файл",
  voiceInput: "Голосовой ввод",
  rateThisConversation: "Оцените этот разговор",
  humanAgent: "Связаться с оператором",
  exportConversation: "Экспортировать разговор",
  toggleDarkMode: "Переключить тёмный режим",
  backToChat: "Вернуться в чат",
  exportCSV: "Экспорт в CSV",

  cancel: "Отмена",
  confirm: "Подтвердить",
  save: "Сохранить",
  skipForNow: "Пропустить пока",

  freePlan: "Бесплатный план",

  customerSupport: "Поддержка клиентов",

  poweredByMultiAgentRAG: "На основе мультиагентного ИИ + RAG",
  last30Days: "Последние 30 дней",
  welcomeTitle: "Добро пожаловать в TechMart AI Support",
  welcomeSubtitle: "Я помогу с вопросами по оплате, техническими проблемами, информацией о товарах и многим другим. Спрашивайте что угодно!",
  footerTagline: "TechMart AI Support · На основе мультиагентной системы RAG",

  suggestionReturnPolicy: "Какова ваша политика возврата?",
  suggestionLaptopWontTurnOn: "Мой ноутбук не включается",
  suggestionUltraBook: "Расскажите об UltraBook Pro 15",
  suggestionCancelSubscription: "Я хочу отменить подписку",
  suggestionTrackOrder: "Отследить мой заказ",
  suggestionCarePricing: "Цены на TechMart Care",

};

const ko = {

  newChat: "새 채팅",
  chats: "채팅",
  analytics: "분석",
  archivedChats: "보관된 채팅",
  recentlyDeletedChats: "최근 삭제된 채팅",
  searchChats: "채팅 검색",
  recents: "최근 항목",
  results: "결과",
  noResultsFound: "결과를 찾을 수 없습니다",
  noDeletedConversations: "삭제된 대화가 없습니다",
  archiveAll: "모든 채팅 보관",
  deleteAll: "모든 채팅 삭제",
  unarchiveAll: "모든 채팅 보관 해제",
  restoreAll: "모든 채팅 복원",
  deletePermanently: "영구 삭제",

  signedInAs: "로그인됨",
  settings: "설정",
  language: "언어",
  getHelp: "도움말",
  logOut: "로그아웃",
  resetHistory: "기록 초기화",
  deleteAccountPermanently: "계정 영구 삭제",

  accountAndProfile: "계정 및 프로필",
  notifications: "알림",
  privacyAndSecurity: "개인정보 및 보안",
  changePassword: "비밀번호 변경",

  emailSupport: "이메일 지원",
  callSupport: "전화하기 1-800-TECHMART",
  liveChat: "실시간 채팅",
  documentation: "문서",
  reportABug: "버그 신고",

  typeYourMessage: "메시지를 입력하세요...",
  send: "보내기",
  attachFile: "파일 첨부",
  voiceInput: "음성 입력",
  rateThisConversation: "이 대화 평가하기",
  humanAgent: "상담원과 대화",
  exportConversation: "대화 내보내기",
  toggleDarkMode: "다크 모드 전환",
  backToChat: "채팅으로 돌아가기",
  exportCSV: "CSV 내보내기",

  cancel: "취소",
  confirm: "확인",
  save: "저장",
  skipForNow: "나중에 하기",

  freePlan: "무료 플랜",

  customerSupport: "고객 지원",

  poweredByMultiAgentRAG: "멀티 에이전트 AI + RAG 기반",
  last30Days: "최근 30일",
  welcomeTitle: "TechMart AI 지원에 오신 것을 환영합니다",
  welcomeSubtitle: "청구, 기술 문제, 제품 정보 등 무엇이든 도와드리겠습니다. 무엇이든 물어보세요!",
  footerTagline: "TechMart AI Support · 멀티 에이전트 RAG 시스템 기반",

  suggestionReturnPolicy: "반품 정책이 어떻게 되나요?",
  suggestionLaptopWontTurnOn: "제 노트북이 켜지지 않아요",
  suggestionUltraBook: "UltraBook Pro 15에 대해 알려주세요",
  suggestionCancelSubscription: "구독을 취소하고 싶습니다",
  suggestionTrackOrder: "주문 추적",
  suggestionCarePricing: "TechMart Care 가격",

};

const en_GB = { ...en_US };

export const TRANSLATIONS = {

  "en-US": en_US,
  "en-GB": en_GB,
  "hi": hi,
  "es": es,
  "fr": fr,
  "de": de,
  "ja": ja,
  "zh": zh,
  "ru": ru,
  "ko": ko,

};